-- High Noon - schema complet et idempotent.
-- A executer dans le SQL Editor Supabase, sur une base neuve comme existante.

create table if not exists public.profiles (
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
  shots_fired integer not null default 0,
  shots_hit integer not null default 0,
  headshots integer not null default 0,
  win_streak integer not null default 0,
  best_streak integer not null default 0,
  last_opp uuid,
  last_opp_at timestamptz,
  same_opp_count integer not null default 0,
  accessories text[] not null default '{}',
  weapon text not null default 'iron',
  created_at timestamptz not null default now(),
  constraint pseudo_format check (pseudo ~ '^[A-Za-z0-9_ .-]{3,16}$')
);

alter table public.profiles
  add column if not exists shots_fired integer not null default 0,
  add column if not exists shots_hit integer not null default 0,
  add column if not exists headshots integer not null default 0,
  add column if not exists win_streak integer not null default 0,
  add column if not exists best_streak integer not null default 0,
  add column if not exists last_opp uuid,
  add column if not exists last_opp_at timestamptz,
  add column if not exists same_opp_count integer not null default 0,
  add column if not exists accessories text[] not null default '{}',
  add column if not exists weapon text not null default 'iron';

create unique index if not exists profiles_pseudo_unique on public.profiles (lower(pseudo));
create index if not exists profiles_elo_idx on public.profiles (elo desc);

create table if not exists public.skins (
  id text primary key,
  price integer not null,
  weight integer not null default 3
);

alter table public.skins add column if not exists weight integer not null default 3;

insert into public.skins (id, price, weight) values
  ('drifter', 0, 0),
  ('sheriff', 150, 3),
  ('bandit', 200, 3),
  ('poncho', 250, 3),
  ('cavalry', 350, 3),
  ('undertaker', 500, 3),
  ('ghost', 650, 3),
  ('golden', 900, 3)
on conflict (id) do nothing;

update public.skins set weight = 0 where id = 'drifter';

create table if not exists public.profile_skins (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skin_id text not null references public.skins(id),
  primary key (profile_id, skin_id)
);

create table if not exists public.accessories (
  id text primary key,
  slot text not null,
  weight integer not null
);

insert into public.accessories (id, slot, weight) values
  ('mustache', 'face', 14),
  ('beard', 'face', 10),
  ('cigar', 'mouth', 14),
  ('eyepatch', 'eyes', 10),
  ('star', 'chest', 6),
  ('poncho', 'back', 8),
  ('feather', 'hat', 10)
on conflict (id) do nothing;

create table if not exists public.profile_accessories (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  accessory_id text not null references public.accessories(id),
  primary key (profile_id, accessory_id)
);

create table if not exists public.weapons (
  id text primary key,
  price integer not null,
  weight integer not null
);

insert into public.weapons (id, price, weight) values
  ('iron', 0, 0),
  ('silver', 200, 3),
  ('ivory', 300, 3),
  ('ranger', 400, 3),
  ('rose', 550, 3),
  ('golden', 850, 3)
on conflict (id) do nothing;

create table if not exists public.profile_weapons (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  weapon_id text not null references public.weapons(id),
  primary key (profile_id, weapon_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee)
);

alter table public.profiles enable row level security;
alter table public.skins enable row level security;
alter table public.profile_skins enable row level security;
alter table public.accessories enable row level security;
alter table public.profile_accessories enable row level security;
alter table public.weapons enable row level security;
alter table public.profile_weapons enable row level security;
alter table public.friendships enable row level security;

grant select on public.profiles to anon, authenticated;
grant select on public.skins to anon, authenticated;
grant select on public.profile_skins to authenticated;
grant select on public.accessories to anon, authenticated;
grant select on public.profile_accessories to authenticated;
grant select on public.weapons to anon, authenticated;
grant select on public.profile_weapons to authenticated;
grant select on public.friendships to authenticated;

drop policy if exists "profiles readable by all" on public.profiles;
create policy "profiles readable by all" on public.profiles
  for select using (true);

drop policy if exists "skins readable by all" on public.skins;
create policy "skins readable by all" on public.skins
  for select using (true);

drop policy if exists "own skins readable" on public.profile_skins;
create policy "own skins readable" on public.profile_skins
  for select using (auth.uid() = profile_id);

drop policy if exists "accessories readable by all" on public.accessories;
create policy "accessories readable by all" on public.accessories
  for select using (true);

drop policy if exists "own accessories readable" on public.profile_accessories;
create policy "own accessories readable" on public.profile_accessories
  for select using (auth.uid() = profile_id);

drop policy if exists "weapons readable by all" on public.weapons;
create policy "weapons readable by all" on public.weapons
  for select using (true);

drop policy if exists "own weapons readable" on public.profile_weapons;
create policy "own weapons readable" on public.profile_weapons
  for select using (auth.uid() = profile_id);

drop policy if exists "own friendships readable" on public.friendships;
create policy "own friendships readable" on public.friendships
  for select using (auth.uid() = requester or auth.uid() = addressee);

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
  insert into profile_weapons (profile_id, weapon_id) values (uid, 'iron');
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

create or replace function public.equip_weapon(p_weapon text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if not exists (select 1 from profile_weapons where profile_id = uid and weapon_id = p_weapon) then
    raise exception 'weapon not owned';
  end if;
  update profiles set weapon = p_weapon where id = uid;
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

create or replace function public.report_result(p_won boolean, p_ranked boolean, p_opp_elo integer, p_opp_id uuid)
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
  prev_opp uuid;
  prev_at timestamptz;
  same_count integer;
  track boolean;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select elo, last_opp, last_opp_at, same_opp_count
  into my_elo, prev_opp, prev_at, same_count
  from profiles where id = uid;
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
  track := p_ranked and p_opp_id is not null;
  if track then
    if prev_opp = p_opp_id and prev_at > now() - interval '24 hours' then
      same_count := same_count + 1;
    else
      same_count := 1;
    end if;
    if same_count = 2 then
      delta := delta / 2;
      gained := greatest(2, gained / 2);
    elsif same_count >= 3 then
      delta := 0;
      gained := 2;
    end if;
  end if;
  update profiles set
    elo = greatest(0, elo + delta),
    coins = coins + gained,
    wins = wins + (case when p_won then 1 else 0 end),
    losses = losses + (case when p_won then 0 else 1 end),
    ranked_wins = ranked_wins + (case when p_won and p_ranked then 1 else 0 end),
    ranked_losses = ranked_losses + (case when not p_won and p_ranked then 1 else 0 end),
    last_opp = case when track then p_opp_id else last_opp end,
    last_opp_at = case when track then now() else last_opp_at end,
    same_opp_count = case when track then same_count else same_opp_count end
  where id = uid
  returning elo, coins into new_elo, new_coins;
  perform public.bump_challenge('played', 1);
  if p_won then
    perform public.bump_challenge('won', 1);
  end if;
  if p_won and p_ranked then
    perform public.bump_challenge('ranked_won', 1);
  end if;
  return json_build_object('elo', new_elo, 'coins', new_coins, 'elo_delta', delta, 'coins_delta', gained);
end;
$$;

create or replace function public.report_result(p_won boolean, p_ranked boolean, p_opp_elo integer)
returns json
language sql
security definer
set search_path = public
as $$
  select public.report_result(p_won, p_ranked, p_opp_elo, null::uuid);
$$;

create or replace function public.record_stats(p_shots integer, p_hits integer, p_heads integer, p_won boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  update profiles set
    shots_fired = shots_fired + greatest(0, least(200, p_shots)),
    shots_hit = shots_hit + greatest(0, least(200, p_hits)),
    headshots = headshots + greatest(0, least(200, p_heads)),
    win_streak = case when p_won then win_streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when p_won then win_streak + 1 else 0 end)
  where id = uid;
  perform public.bump_challenge('shots', greatest(0, least(200, p_shots)));
  perform public.bump_challenge('hits', greatest(0, least(200, p_hits)));
  perform public.bump_challenge('heads', greatest(0, least(200, p_heads)));
end;
$$;

create table if not exists public.challenge_progress (
  profile_id uuid references public.profiles(id) on delete cascade,
  period text not null,
  period_key text not null,
  counters jsonb not null default '{}'::jsonb,
  claimed jsonb not null default '[]'::jsonb,
  primary key (profile_id, period)
);

alter table public.challenge_progress enable row level security;

drop policy if exists challenge_self_read on public.challenge_progress;
create policy challenge_self_read on public.challenge_progress
  for select using (auth.uid() = profile_id);

create or replace function public.hn_period_key(p_period text)
returns text
language sql
stable
as $$
  select case when p_period = 'weekly'
    then to_char((now() at time zone 'utc'), 'IYYY"W"IW')
    else to_char((now() at time zone 'utc'), 'YYYY-MM-DD')
  end;
$$;

create or replace function public.challenge_defs(p_period text, p_key text)
returns jsonb
language plpgsql
stable
as $$
declare
  pool jsonb;
  n integer;
  roff integer;
  i integer;
  elem jsonb;
  acc jsonb := '[]'::jsonb;
begin
  if p_period = 'weekly' then
    pool := '[
      {"stat":"played","goal":25,"reward":120},
      {"stat":"won","goal":12,"reward":170},
      {"stat":"ranked_won","goal":8,"reward":220},
      {"stat":"heads","goal":30,"reward":160},
      {"stat":"hits","goal":90,"reward":150}
    ]'::jsonb;
  else
    pool := '[
      {"stat":"played","goal":4,"reward":30},
      {"stat":"won","goal":2,"reward":45},
      {"stat":"ranked_won","goal":1,"reward":40},
      {"stat":"heads","goal":5,"reward":50},
      {"stat":"hits","goal":12,"reward":35}
    ]'::jsonb;
  end if;
  n := jsonb_array_length(pool);
  roff := ((hashtext(p_period || ':' || p_key) % n) + n) % n;
  for i in 0..2 loop
    elem := pool -> ((roff + i) % n);
    elem := jsonb_set(elem, '{id}', to_jsonb(i));
    acc := acc || jsonb_build_array(elem);
  end loop;
  return acc;
end;
$$;

create or replace function public.bump_challenge(p_stat text, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  per text;
  pk text;
  cur_key text;
  cur integer;
begin
  uid := auth.uid();
  if uid is null or p_amount <= 0 then
    return;
  end if;
  foreach per in array array['daily', 'weekly'] loop
    pk := public.hn_period_key(per);
    insert into public.challenge_progress(profile_id, period, period_key, counters, claimed)
    values (uid, per, pk, '{}'::jsonb, '[]'::jsonb)
    on conflict (profile_id, period) do nothing;
    select period_key into cur_key from public.challenge_progress where profile_id = uid and period = per;
    if cur_key <> pk then
      update public.challenge_progress set period_key = pk, counters = '{}'::jsonb, claimed = '[]'::jsonb
      where profile_id = uid and period = per;
    end if;
    select coalesce((counters ->> p_stat)::integer, 0) into cur
    from public.challenge_progress where profile_id = uid and period = per;
    update public.challenge_progress set counters = jsonb_set(counters, array[p_stat], to_jsonb(cur + p_amount))
    where profile_id = uid and period = per;
  end loop;
end;
$$;

create or replace function public.challenge_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  per text;
  pk text;
  cur_key text;
  cnt jsonb;
  clm jsonb;
  result jsonb := '{}'::jsonb;
begin
  uid := auth.uid();
  if uid is null then
    return null;
  end if;
  foreach per in array array['daily', 'weekly'] loop
    pk := public.hn_period_key(per);
    insert into public.challenge_progress(profile_id, period, period_key, counters, claimed)
    values (uid, per, pk, '{}'::jsonb, '[]'::jsonb)
    on conflict (profile_id, period) do nothing;
    select period_key, counters, claimed into cur_key, cnt, clm
    from public.challenge_progress where profile_id = uid and period = per;
    if cur_key <> pk then
      update public.challenge_progress set period_key = pk, counters = '{}'::jsonb, claimed = '[]'::jsonb
      where profile_id = uid and period = per;
      cnt := '{}'::jsonb;
      clm := '[]'::jsonb;
    end if;
    result := jsonb_set(result, array[per], jsonb_build_object(
      'defs', public.challenge_defs(per, pk),
      'counters', cnt,
      'claimed', clm
    ));
  end loop;
  return result;
end;
$$;

create or replace function public.claim_challenge(p_period text, p_index integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  pk text;
  cur_key text;
  cnt jsonb;
  clm jsonb;
  defs jsonb;
  def jsonb;
  stat text;
  goal integer;
  reward integer;
  cur integer;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_period <> 'daily' and p_period <> 'weekly' then
    raise exception 'bad period';
  end if;
  pk := public.hn_period_key(p_period);
  select period_key, counters, claimed into cur_key, cnt, clm
  from public.challenge_progress where profile_id = uid and period = p_period;
  if cur_key is null or cur_key <> pk then
    raise exception 'not ready';
  end if;
  defs := public.challenge_defs(p_period, pk);
  def := defs -> p_index;
  if def is null then
    raise exception 'bad index';
  end if;
  if clm @> to_jsonb(p_index) then
    raise exception 'already claimed';
  end if;
  stat := def ->> 'stat';
  goal := (def ->> 'goal')::integer;
  reward := (def ->> 'reward')::integer;
  cur := coalesce((cnt ->> stat)::integer, 0);
  if cur < goal then
    raise exception 'not complete';
  end if;
  update public.profiles set coins = coins + reward where id = uid returning coins into new_coins;
  update public.challenge_progress set claimed = claimed || to_jsonb(p_index) where profile_id = uid and period = p_period;
  return json_build_object('coins', new_coins, 'reward', reward, 'period', p_period, 'index', p_index);
end;
$$;

create or replace function public.spin_wheel()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  new_coins integer;
  total integer;
  pick integer;
  item_kind text;
  item_ref text;
  cursor_weight integer := 0;
  row record;
  duplicate boolean := false;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  update profiles set coins = coins - 50
  where id = uid and coins >= 50
  returning coins into new_coins;
  if new_coins is null then
    raise exception 'not enough coins';
  end if;
  select coalesce(sum(weight), 0) into total from (
    select weight from skins where weight > 0
    union all
    select weight from weapons where weight > 0
    union all
    select weight from accessories
  ) pool;
  pick := floor(random() * total) + 1;
  for row in
    select 'skin' as kind, id, weight from skins where weight > 0
    union all
    select 'weapon' as kind, id, weight from weapons where weight > 0
    union all
    select 'accessory' as kind, id, weight from accessories
  loop
    cursor_weight := cursor_weight + row.weight;
    if pick <= cursor_weight then
      item_kind := row.kind;
      item_ref := row.id;
      exit;
    end if;
  end loop;
  if item_kind = 'skin' then
    if exists (select 1 from profile_skins where profile_id = uid and skin_id = item_ref) then
      duplicate := true;
    else
      insert into profile_skins (profile_id, skin_id) values (uid, item_ref);
    end if;
  elsif item_kind = 'weapon' then
    if exists (select 1 from profile_weapons where profile_id = uid and weapon_id = item_ref) then
      duplicate := true;
    else
      insert into profile_weapons (profile_id, weapon_id) values (uid, item_ref);
    end if;
  else
    if exists (select 1 from profile_accessories where profile_id = uid and accessory_id = item_ref) then
      duplicate := true;
    else
      insert into profile_accessories (profile_id, accessory_id) values (uid, item_ref);
    end if;
  end if;
  if duplicate then
    update profiles set coins = coins + 25 where id = uid returning coins into new_coins;
  end if;
  return json_build_object('kind', item_kind, 'ref', item_ref, 'duplicate', duplicate, 'coins', new_coins);
end;
$$;

create or replace function public.set_accessories(p_list text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  item text;
  seen_slots text[] := '{}';
  item_slot text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if array_length(p_list, 1) > 8 then
    raise exception 'too many accessories';
  end if;
  foreach item in array p_list loop
    if not exists (select 1 from profile_accessories where profile_id = uid and accessory_id = item) then
      raise exception 'accessory not owned';
    end if;
    select slot into item_slot from accessories where id = item;
    if item_slot = any(seen_slots) then
      raise exception 'slot conflict';
    end if;
    seen_slots := array_append(seen_slots, item_slot);
  end loop;
  update profiles set accessories = p_list where id = uid;
end;
$$;

create or replace function public.send_friend_request(p_pseudo text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  target uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select id into target from profiles where lower(pseudo) = lower(trim(p_pseudo));
  if target is null then
    raise exception 'not found';
  end if;
  if target = uid then
    raise exception 'self';
  end if;
  if exists (
    select 1 from friendships
    where (requester = uid and addressee = target) or (requester = target and addressee = uid)
  ) then
    raise exception 'already exists';
  end if;
  insert into friendships (requester, addressee) values (uid, target);
  return json_build_object('ok', true, 'target', target);
end;
$$;

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if p_accept then
    update friendships set status = 'accepted'
    where id = p_id and addressee = uid and status = 'pending';
  else
    delete from friendships where id = p_id and addressee = uid;
  end if;
end;
$$;

create or replace function public.remove_friend(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from friendships
  where id = p_id and (requester = auth.uid() or addressee = auth.uid());
end;
$$;

create or replace function public.list_friends()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  result json;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select coalesce(json_agg(entry), '[]'::json) into result from (
    select json_build_object(
      'fid', f.id,
      'status', f.status,
      'incoming', f.addressee = uid,
      'id', p.id,
      'pseudo', p.pseudo,
      'elo', p.elo,
      'skin', p.skin,
      'accessories', p.accessories,
      'weapon', p.weapon,
      'cg_username', p.cg_username,
      'wins', p.wins,
      'losses', p.losses
    ) as entry
    from friendships f
    join profiles p on p.id = case when f.requester = uid then f.addressee else f.requester end
    where f.requester = uid or f.addressee = uid
    order by f.created_at desc
  ) rows;
  return result;
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
grant execute on function public.equip_weapon(text) to authenticated;
grant execute on function public.buy_skin(text) to authenticated;
grant execute on function public.report_result(boolean, boolean, integer) to authenticated;
grant execute on function public.report_result(boolean, boolean, integer, uuid) to authenticated;
grant execute on function public.record_stats(integer, integer, integer, boolean) to authenticated;
grant execute on function public.challenge_state() to authenticated;
grant execute on function public.claim_challenge(text, integer) to authenticated;
grant select on public.challenge_progress to authenticated;
grant execute on function public.spin_wheel() to authenticated;
grant execute on function public.set_accessories(text[]) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.reward_ad() to authenticated;
