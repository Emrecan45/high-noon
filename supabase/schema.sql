create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null,
  elo integer not null default 1000,
  coins integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  ranked_wins integer not null default 0,
  ranked_losses integer not null default 0,
  skin text not null default 'drifter',
  cg_username text,
  last_ad_at timestamptz,
  created_at timestamptz not null default now(),
  constraint pseudo_format check (pseudo ~ '^[A-Za-z0-9_ .-]{3,16}$')
);

create unique index profiles_pseudo_unique on public.profiles (lower(pseudo));
create index profiles_elo_idx on public.profiles (elo desc);

create table public.skins (
  id text primary key,
  price integer not null
);

insert into public.skins (id, price) values
  ('drifter', 0),
  ('sheriff', 150),
  ('bandit', 200),
  ('poncho', 250),
  ('cavalry', 350),
  ('undertaker', 500),
  ('ghost', 650),
  ('golden', 900);

create table public.profile_skins (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skin_id text not null references public.skins(id),
  primary key (profile_id, skin_id)
);

alter table public.profiles enable row level security;
alter table public.skins enable row level security;
alter table public.profile_skins enable row level security;

grant select on public.profiles to anon, authenticated;
grant select on public.skins to anon, authenticated;
grant select on public.profile_skins to authenticated;

create policy "profiles readable by all" on public.profiles
  for select using (true);

create policy "skins readable by all" on public.skins
  for select using (true);

create policy "own skins readable" on public.profile_skins
  for select using (auth.uid() = profile_id);

create or replace function public.create_profile(p_pseudo text, p_cg text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  row_profile profiles;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  insert into profiles (id, pseudo, cg_username)
  values (uid, trim(p_pseudo), p_cg)
  returning * into row_profile;
  insert into profile_skins (profile_id, skin_id) values (uid, 'drifter');
  return row_to_json(row_profile);
end;
$$;

create or replace function public.set_pseudo(p_pseudo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update profiles set pseudo = trim(p_pseudo) where id = auth.uid();
end;
$$;

create or replace function public.set_cg_username(p_cg text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set cg_username = p_cg where id = auth.uid();
end;
$$;

create or replace function public.equip_skin(p_skin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if not exists (select 1 from profile_skins where profile_id = uid and skin_id = p_skin) then
    raise exception 'skin not owned';
  end if;
  update profiles set skin = p_skin where id = uid;
end;
$$;

create or replace function public.buy_skin(p_skin text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  skin_price integer;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select price into skin_price from skins where id = p_skin;
  if skin_price is null then
    raise exception 'unknown skin';
  end if;
  if exists (select 1 from profile_skins where profile_id = uid and skin_id = p_skin) then
    raise exception 'already owned';
  end if;
  update profiles set coins = coins - skin_price
  where id = uid and coins >= skin_price
  returning coins into new_coins;
  if new_coins is null then
    raise exception 'not enough coins';
  end if;
  insert into profile_skins (profile_id, skin_id) values (uid, p_skin);
  return json_build_object('coins', new_coins);
end;
$$;

create or replace function public.report_result(p_won boolean, p_ranked boolean, p_opp_elo integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  my_elo integer;
  opp_elo integer;
  expected double precision;
  score double precision;
  delta integer;
  gained integer;
  new_elo integer;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select elo into my_elo from profiles where id = uid;
  if my_elo is null then
    raise exception 'no profile';
  end if;
  delta := 0;
  if p_ranked then
    opp_elo := greatest(0, least(4000, p_opp_elo));
    expected := 1.0 / (1.0 + power(10.0, (opp_elo - my_elo) / 400.0));
    score := 0.0;
    if p_won then
      score := 1.0;
    end if;
    delta := round(32 * (score - expected));
    if p_won then
      gained := 40;
    else
      gained := 10;
    end if;
  else
    if p_won then
      gained := 8;
    else
      gained := 2;
    end if;
  end if;
  update profiles set
    elo = greatest(0, elo + delta),
    coins = coins + gained,
    wins = wins + (case when p_won then 1 else 0 end),
    losses = losses + (case when p_won then 0 else 1 end),
    ranked_wins = ranked_wins + (case when p_won and p_ranked then 1 else 0 end),
    ranked_losses = ranked_losses + (case when not p_won and p_ranked then 1 else 0 end)
  where id = uid
  returning elo, coins into new_elo, new_coins;
  return json_build_object('elo', new_elo, 'coins', new_coins, 'elo_delta', delta, 'coins_delta', gained);
end;
$$;

create or replace function public.reward_ad()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  last_at timestamptz;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select last_ad_at into last_at from profiles where id = uid;
  if last_at is not null and now() - last_at < interval '45 seconds' then
    raise exception 'too soon';
  end if;
  update profiles set coins = coins + 25, last_ad_at = now()
  where id = uid
  returning coins into new_coins;
  return json_build_object('coins', new_coins, 'coins_delta', 25);
end;
$$;

grant execute on function public.create_profile(text, text) to authenticated;
grant execute on function public.set_pseudo(text) to authenticated;
grant execute on function public.set_cg_username(text) to authenticated;
grant execute on function public.equip_skin(text) to authenticated;
grant execute on function public.buy_skin(text) to authenticated;
grant execute on function public.report_result(boolean, boolean, integer) to authenticated;
grant execute on function public.reward_ad() to authenticated;
