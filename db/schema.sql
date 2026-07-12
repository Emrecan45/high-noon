create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null,
  elo integer not null default 100,
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

alter table public.friendships replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'friendships'
     ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end
$$;

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
  perform ensure_season(uid);
  perform ensure_friend_code(uid);
  select * into row_profile from profiles where id = uid;
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
  opp_bounty integer;
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
  perform ensure_season(uid);
  select elo, last_opp, last_opp_at, same_opp_count
  into my_elo, prev_opp, prev_at, same_count
  from profiles where id = uid;
  if my_elo is null then
    raise exception 'no profile';
  end if;
  delta := 0;
  if p_ranked then
    opp_bounty := greatest(100, least(100000, p_opp_elo));
    if p_won then
      delta := 20 + round(opp_bounty * 0.15);
      gained := 40;
    else
      delta := -round(my_elo * 0.10);
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
    elo = greatest(100, elo + delta),
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
  perform grant_xp(uid, case
    when p_ranked and p_won then 45
    when p_ranked then 18
    when p_won then 22
    else 9
  end);
  if gained > 0 then
    update profiles set last_gain = gained, last_gain_doubled = false where id = uid;
  end if;
  return json_build_object('elo', new_elo, 'coins', new_coins, 'elo_delta', new_elo - my_elo, 'coins_delta', gained, 'xp', (select xp from public.profiles where id = uid));
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
  perform grant_xp(uid, reward);
  select coins into new_coins from public.profiles where id = uid;
  update public.challenge_progress set claimed = claimed || to_jsonb(p_index) where profile_id = uid and period = p_period;
  return json_build_object('coins', new_coins, 'xp_gained', reward, 'period', p_period, 'index', p_index);
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
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.reward_ad() to authenticated;

alter table public.profiles add column if not exists season_key integer not null default 0;
alter table public.profiles add column if not exists friend_code text;
alter table public.profiles add column if not exists xp integer not null default 0;

create unique index if not exists profiles_friend_code_unique on public.profiles (friend_code);

create table if not exists public.season_history (
  profile_id uuid references public.profiles(id) on delete cascade,
  season integer not null,
  elo integer not null,
  rank integer,
  seen boolean not null default true,
  primary key (profile_id, season)
);

alter table public.season_history add column if not exists rank integer;
alter table public.season_history add column if not exists seen boolean not null default true;

alter table public.season_history enable row level security;
drop policy if exists season_history_read on public.season_history;
create policy season_history_read on public.season_history for select using (true);
grant select on public.season_history to anon, authenticated;

create table if not exists public.pass_claims (
  profile_id uuid references public.profiles(id) on delete cascade,
  season integer not null,
  level integer not null,
  primary key (profile_id, season, level)
);

alter table public.pass_claims enable row level security;
drop policy if exists pass_claims_read on public.pass_claims;
create policy pass_claims_read on public.pass_claims for select using (auth.uid() = profile_id);
grant select on public.pass_claims to authenticated;

create or replace function public.current_season()
returns integer
language sql
stable
as $$
  select (floor((extract(epoch from now()) / 86400 - 20630) / 30) + 1)::integer;
$$;

create table if not exists public.season_badges (
  profile_id uuid references public.profiles(id) on delete cascade,
  season integer not null,
  rank integer not null,
  seen boolean not null default false,
  primary key (profile_id, season)
);

alter table public.season_badges enable row level security;
drop policy if exists season_badges_read on public.season_badges;
create policy season_badges_read on public.season_badges for select using (auth.uid() = profile_id);
grant select on public.season_badges to authenticated;

create or replace function public.ensure_season(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur integer;
  old_key integer;
  old_elo integer;
  old_rank integer;
  badge_id text;
begin
  cur := current_season();
  select season_key, elo into old_key, old_elo from profiles where id = p_uid;
  if old_key is null or old_key = cur then
    return;
  end if;
  if old_key > 0 then
    select 1
      + (select count(*) from profiles where season_key = old_key and id <> p_uid and elo > old_elo)
      + (select count(*) from season_history where season = old_key and profile_id <> p_uid and elo > old_elo)
    into old_rank;
    insert into season_history (profile_id, season, elo, rank, seen)
    values (p_uid, old_key, old_elo, old_rank, false)
    on conflict (profile_id, season) do update set elo = excluded.elo, rank = excluded.rank, seen = excluded.seen;
    if old_rank <= 10 and old_elo > 100 then
      badge_id := 'sbadge-s' || old_key || '-r' || old_rank;
      insert into accessories (id, slot, weight) values (badge_id, 'badge', 0)
      on conflict (id) do nothing;
      insert into profile_accessories (profile_id, accessory_id) values (p_uid, badge_id)
      on conflict do nothing;
      insert into season_badges (profile_id, season, rank) values (p_uid, old_key, old_rank)
      on conflict (profile_id, season) do nothing;
    end if;
  end if;
  update profiles set season_key = cur, elo = 100, xp = 0 where id = p_uid;
end;
$$;

create or replace function public.grant_xp(p_uid uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform ensure_season(p_uid);
  update profiles set xp = xp + greatest(0, p_amount) where id = p_uid;
end;
$$;

create or replace function public.ensure_friend_code(p_uid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  tries integer := 0;
begin
  select friend_code into code from profiles where id = p_uid;
  if code is not null then
    return code;
  end if;
  loop
    tries := tries + 1;
    code := upper(substr(md5(gen_random_uuid()::text), 1, 4) || '-' || substr(md5(gen_random_uuid()::text), 1, 4));
    begin
      update profiles set friend_code = code where id = p_uid;
      return code;
    exception when unique_violation then
      if tries > 8 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

create or replace function public.season_info()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  cur integer;
  top_prev uuid;
  hist json;
  code text;
  b_season integer;
  b_rank integer;
  badge json := null;
  p_season integer;
  p_elo integer;
  p_rank integer;
  prev json := null;
begin
  uid := auth.uid();
  if uid is null then
    return null;
  end if;
  perform ensure_season(uid);
  cur := current_season();
  select profile_id into top_prev from season_history where season = cur - 1 order by elo desc limit 1;
  select coalesce(json_agg(json_build_object('season', season, 'elo', elo) order by season desc), '[]'::json)
  into hist from season_history where profile_id = uid;
  code := ensure_friend_code(uid);
  select season, rank into b_season, b_rank from season_badges
  where profile_id = uid and seen = false order by season desc limit 1;
  if b_season is not null then
    update season_badges set seen = true where profile_id = uid and season = b_season;
    badge := json_build_object('season', b_season, 'rank', b_rank);
  end if;
  select season, elo, rank into p_season, p_elo, p_rank from season_history
  where profile_id = uid and seen = false order by season desc limit 1;
  if p_season is not null then
    update season_history set seen = true where profile_id = uid and seen = false;
    prev := json_build_object('season', p_season, 'elo', p_elo, 'rank', p_rank);
  end if;
  return json_build_object('season', cur, 'prev_top', top_prev, 'code', code, 'history', hist, 'badge', badge, 'prev', prev,
    'elo', (select elo from profiles where id = uid), 'xp', (select xp from profiles where id = uid));
end;
$$;

create or replace function public.leaderboard_top()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select coalesce(json_agg(entry), '[]'::json) into result from (
    select json_build_object('pseudo', pseudo, 'elo', elo, 'skin', skin, 'ranked_wins', ranked_wins, 'ranked_losses', ranked_losses) as entry
    from profiles
    where season_key = current_season() and (ranked_wins > 0 or ranked_losses > 0)
    order by elo desc
    limit 20
  ) rows;
  return result;
end;
$$;

create or replace function public.pass_reward(p_season integer, p_level integer)
returns json
language plpgsql
stable
set search_path = public
as $$
declare
  h integer;
  kind text;
  ref text;
begin
  h := abs(hashtext(p_season::text || ':' || p_level::text));
  if p_level % 5 = 0 then
    if h % 3 = 0 then
      select id into ref from skins where weight > 0 order by id offset (h / 7) % (select count(*) from skins where weight > 0) limit 1;
      kind := 'skin';
    elsif h % 3 = 1 then
      select id into ref from weapons where weight > 0 order by id offset (h / 7) % (select count(*) from weapons where weight > 0) limit 1;
      kind := 'weapon';
    else
      select id into ref from accessories where weight > 0 order by id offset (h / 7) % (select count(*) from accessories where weight > 0) limit 1;
      kind := 'accessory';
    end if;
    return json_build_object('kind', kind, 'ref', ref);
  end if;
  return json_build_object('kind', 'coins', 'amount', 25 + (h % 5) * 10 + p_level * 3);
end;
$$;

create or replace function public.pass_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  cur integer;
  my_xp integer;
  claimed json;
  rewards jsonb := '[]'::jsonb;
  i integer;
begin
  uid := auth.uid();
  if uid is null then
    return null;
  end if;
  perform ensure_season(uid);
  cur := current_season();
  select xp into my_xp from profiles where id = uid;
  select coalesce(json_agg(level), '[]'::json) into claimed from pass_claims where profile_id = uid and season = cur;
  for i in 1..30 loop
    rewards := rewards || jsonb_build_array(pass_reward(cur, i)::jsonb);
  end loop;
  return json_build_object('season', cur, 'xp', my_xp, 'claimed', claimed, 'rewards', rewards);
end;
$$;

create or replace function public.claim_pass_level(p_level integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  cur integer;
  my_xp integer;
  reward json;
  new_coins integer;
  dup boolean := false;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_level < 1 or p_level > 30 then
    raise exception 'bad level';
  end if;
  perform ensure_season(uid);
  cur := current_season();
  select xp into my_xp from profiles where id = uid;
  if my_xp < p_level * 200 then
    raise exception 'not reached';
  end if;
  if exists (select 1 from pass_claims where profile_id = uid and season = cur and level = p_level) then
    raise exception 'already claimed';
  end if;
  insert into pass_claims (profile_id, season, level) values (uid, cur, p_level);
  reward := pass_reward(cur, p_level);
  if reward ->> 'kind' = 'coins' then
    update profiles set coins = coins + (reward ->> 'amount')::integer where id = uid returning coins into new_coins;
  elsif reward ->> 'kind' = 'skin' then
    if exists (select 1 from profile_skins where profile_id = uid and skin_id = reward ->> 'ref') then
      dup := true;
    else
      insert into profile_skins (profile_id, skin_id) values (uid, reward ->> 'ref');
    end if;
  elsif reward ->> 'kind' = 'weapon' then
    if exists (select 1 from profile_weapons where profile_id = uid and weapon_id = reward ->> 'ref') then
      dup := true;
    else
      insert into profile_weapons (profile_id, weapon_id) values (uid, reward ->> 'ref');
    end if;
  else
    if exists (select 1 from profile_accessories where profile_id = uid and accessory_id = reward ->> 'ref') then
      dup := true;
    else
      insert into profile_accessories (profile_id, accessory_id) values (uid, reward ->> 'ref');
    end if;
  end if;
  if dup then
    update profiles set coins = coins + 40 where id = uid returning coins into new_coins;
  end if;
  if new_coins is null then
    select coins into new_coins from profiles where id = uid;
  end if;
  return json_build_object('kind', reward ->> 'kind', 'ref', reward ->> 'ref', 'amount', reward ->> 'amount', 'duplicate', dup, 'coins', new_coins);
end;
$$;

drop function if exists public.send_friend_request(text);

create function public.send_friend_request(p_code text)
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
  select id into target from profiles where friend_code = upper(trim(p_code));
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

insert into public.skins (id, price, weight) values
  ('marshal', 300, 3),
  ('outlaw', 250, 3),
  ('rangercoat', 350, 3),
  ('gambler', 400, 2),
  ('vaquero', 300, 3),
  ('preacher', 450, 2),
  ('miner', 200, 3),
  ('tracker', 250, 3),
  ('duchess', 500, 2),
  ('kid', 200, 3),
  ('mariachi', 550, 2),
  ('sombra', 600, 1),
  ('bounty', 650, 1),
  ('bluecoat', 350, 3),
  ('nightowl', 700, 1),
  ('eldorado', 950, 1)
on conflict (id) do nothing;

insert into public.weapons (id, price, weight) values
  ('navy', 250, 3),
  ('peacemaker', 350, 3),
  ('serpent', 450, 2),
  ('coyote', 300, 3),
  ('midnight', 550, 2),
  ('bone', 500, 2),
  ('scarlet', 650, 1),
  ('deputy', 400, 2)
on conflict (id) do nothing;

insert into public.accessories (id, slot, weight) values
  ('monocle', 'eyes', 8),
  ('scarf', 'back', 10),
  ('bandolier', 'chest', 8),
  ('goldtooth', 'mouth', 6),
  ('pipe', 'mouth', 8),
  ('skullbadge', 'chest', 5),
  ('hatband', 'hat', 7),
  ('sideburns', 'face', 12),
  ('warpaint', 'face', 6)
on conflict (id) do nothing;

grant execute on function public.current_season() to anon, authenticated;
grant execute on function public.season_info() to authenticated;
grant execute on function public.leaderboard_top() to anon, authenticated;
grant execute on function public.pass_state() to authenticated;
grant execute on function public.claim_pass_level(integer) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;

alter table public.profiles add column if not exists ad_streak integer not null default 0;
alter table public.profiles add column if not exists ad_day date;
alter table public.profiles add column if not exists ad_case_day date;
alter table public.profiles add column if not exists ad_case_count integer not null default 0;
alter table public.profiles add column if not exists ad_xp_day date;
alter table public.profiles add column if not exists last_gain integer not null default 0;
alter table public.profiles add column if not exists last_gain_doubled boolean not null default true;

create table if not exists public.ad_unlocks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  ref text not null,
  watched integer not null default 0,
  primary key (profile_id, kind, ref)
);

alter table public.ad_unlocks enable row level security;

drop policy if exists "ad_unlocks_select_own" on public.ad_unlocks;
create policy "ad_unlocks_select_own" on public.ad_unlocks for select using (auth.uid() = profile_id);

create or replace function public.ad_item_needed(p_kind text, p_ref text)
returns integer
language sql
immutable
as $$
  select case
    when p_kind = 'accessory' and p_ref = 'goldtooth' then 3
    when p_kind = 'weapon' and p_ref = 'peacemaker' then 5
    when p_kind = 'skin' and p_ref = 'mariachi' then 6
    when p_kind = 'skin' and p_ref = 'eldorado' then 10
    else null
  end;
$$;

create or replace function public.ad_owns_item(p_uid uuid, p_kind text, p_ref text)
returns boolean
language sql
stable
as $$
  select case
    when p_kind = 'skin' then exists (select 1 from public.profile_skins where profile_id = p_uid and skin_id = p_ref)
    when p_kind = 'weapon' then exists (select 1 from public.profile_weapons where profile_id = p_uid and weapon_id = p_ref)
    else exists (select 1 from public.profile_accessories where profile_id = p_uid and accessory_id = p_ref)
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
  prev_day date;
  streak integer;
  gained integer;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select last_ad_at, ad_day, ad_streak into last_at, prev_day, streak from profiles where id = uid;
  if last_at is not null and now() - last_at < interval '45 seconds' then
    raise exception 'too soon';
  end if;
  if prev_day = current_date then
    raise exception 'already claimed';
  end if;
  if prev_day = current_date - 1 then
    streak := streak + 1;
  else
    streak := 1;
  end if;
  gained := 50;
  update profiles set ad_day = current_date, ad_streak = streak where id = uid;
  update profiles set coins = coins + gained, last_ad_at = now()
  where id = uid
  returning coins into new_coins;
  return json_build_object('coins', new_coins, 'coins_delta', gained, 'streak', streak);
end;
$$;

create or replace function public.ad_case()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  case_day date;
  case_count integer;
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
  select ad_case_day, ad_case_count, coins into case_day, case_count, new_coins from profiles where id = uid;
  if case_day is distinct from current_date then
    case_count := 0;
  end if;
  if case_count >= 1 then
    raise exception 'no case left';
  end if;
  update profiles set ad_case_day = current_date, ad_case_count = case_count + 1 where id = uid;
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
    update profiles set coins = coins + 15 where id = uid returning coins into new_coins;
  end if;
  return json_build_object('kind', item_kind, 'ref', item_ref, 'duplicate', duplicate, 'coins', new_coins, 'left', 0);
end;
$$;

create or replace function public.ad_double()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  gain integer;
  doubled boolean;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select last_gain, last_gain_doubled into gain, doubled from profiles where id = uid;
  if doubled or gain is null or gain <= 0 then
    raise exception 'nothing to double';
  end if;
  update profiles set coins = coins + gain, last_gain_doubled = true
  where id = uid
  returning coins into new_coins;
  return json_build_object('coins', new_coins, 'gained', gain);
end;
$$;

drop function if exists public.ad_pass_xp();

create or replace function public.ad_watch_item(p_kind text, p_ref text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  needed integer;
  cur integer;
  unlocked boolean := false;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  needed := ad_item_needed(p_kind, p_ref);
  if needed is null then
    raise exception 'not an ad item';
  end if;
  if ad_owns_item(uid, p_kind, p_ref) then
    raise exception 'already owned';
  end if;
  insert into ad_unlocks (profile_id, kind, ref, watched) values (uid, p_kind, p_ref, 1)
  on conflict (profile_id, kind, ref) do update set watched = ad_unlocks.watched + 1
  returning watched into cur;
  if cur >= needed then
    unlocked := true;
    if p_kind = 'skin' then
      insert into profile_skins (profile_id, skin_id) values (uid, p_ref) on conflict do nothing;
    elsif p_kind = 'weapon' then
      insert into profile_weapons (profile_id, weapon_id) values (uid, p_ref) on conflict do nothing;
    else
      insert into profile_accessories (profile_id, accessory_id) values (uid, p_ref) on conflict do nothing;
    end if;
  end if;
  return json_build_object('watched', cur, 'needed', needed, 'unlocked', unlocked);
end;
$$;

create or replace function public.ad_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  p record;
  next_gain integer;
  case_left integer;
  items jsonb := '[]'::jsonb;
  it record;
begin
  uid := auth.uid();
  if uid is null then
    return null;
  end if;
  select ad_streak, ad_day, ad_case_day, ad_case_count, last_gain, last_gain_doubled
  into p from profiles where id = uid;
  next_gain := 50;
  if p.ad_case_day is distinct from current_date then
    case_left := 1;
  else
    case_left := greatest(0, 1 - p.ad_case_count);
  end if;
  for it in
    select * from (values
      ('accessory', 'goldtooth'),
      ('weapon', 'peacemaker'),
      ('skin', 'mariachi'),
      ('skin', 'eldorado')
    ) as v(kind, ref)
  loop
    items := items || jsonb_build_object(
      'kind', it.kind,
      'ref', it.ref,
      'needed', ad_item_needed(it.kind, it.ref),
      'watched', coalesce((select watched from ad_unlocks where profile_id = uid and kind = it.kind and ref = it.ref), 0),
      'owned', ad_owns_item(uid, it.kind, it.ref)
    );
  end loop;
  return json_build_object(
    'streak', p.ad_streak,
    'next_gain', next_gain,
    'case_left', case_left,
    'daily_done', (p.ad_day = current_date),
    'can_double', (not p.last_gain_doubled and p.last_gain > 0),
    'last_gain', p.last_gain,
    'items', items
  );
end;
$$;

grant execute on function public.reward_ad() to authenticated;
grant execute on function public.ad_case() to authenticated;
grant execute on function public.ad_double() to authenticated;
grant execute on function public.ad_watch_item(text, text) to authenticated;
grant execute on function public.ad_state() to authenticated;
grant select on public.ad_unlocks to authenticated;

alter table public.profiles add column if not exists mg_day date;
alter table public.profiles add column if not exists mg_count integer not null default 0;

create or replace function public.minigame_xp(p_kind text, p_score integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  day date;
  cnt integer;
  gained integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_kind not in ('birds', 'coach') then
    raise exception 'bad kind';
  end if;
  perform ensure_season(uid);
  select mg_day, mg_count into day, cnt from profiles where id = uid;
  if day is distinct from current_date then
    day := current_date;
    cnt := 0;
  end if;
  if cnt >= 10 then
    update profiles set mg_day = day, mg_count = cnt where id = uid;
    return json_build_object('xp_gained', 0, 'xp', (select xp from profiles where id = uid));
  end if;
  gained := least(40, greatest(0, least(p_score, 60)) * 2);
  update profiles set mg_day = day, mg_count = cnt + 1 where id = uid;
  perform grant_xp(uid, gained);
  return json_build_object('xp_gained', gained, 'xp', (select xp from profiles where id = uid));
end;
$$;

grant execute on function public.minigame_xp(text, integer) to authenticated;

alter table public.profiles alter column elo set default 100;

alter table public.profiles add column if not exists story_mask integer not null default 0;
alter table public.profiles add column if not exists story_claimed boolean not null default false;

create or replace function public.story_xp(p_chapter integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  mask integer;
  bit integer;
  r_kind text := null;
  r_ref text := null;
  r_coins integer := 0;
  dup boolean := false;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_chapter < 0 or p_chapter > 5 then
    raise exception 'bad chapter';
  end if;
  perform ensure_season(uid);
  select story_mask into mask from profiles where id = uid;
  bit := 1 << p_chapter;
  if (mask & bit) <> 0 then
    return json_build_object('xp_gained', 0, 'xp', (select xp from profiles where id = uid));
  end if;
  update profiles set story_mask = mask | bit where id = uid;
  perform grant_xp(uid, 60);
  if p_chapter = 0 then
    r_kind := 'coins'; r_coins := 80;
  elsif p_chapter = 1 then
    r_kind := 'accessory'; r_ref := 'star';
  elsif p_chapter = 2 then
    r_kind := 'coins'; r_coins := 120;
  elsif p_chapter = 3 then
    r_kind := 'coins'; r_coins := 200;
  elsif p_chapter = 4 then
    r_kind := 'weapon'; r_ref := 'silver';
  end if;
  if r_kind = 'coins' then
    update profiles set coins = coins + r_coins where id = uid;
  elsif r_kind = 'accessory' then
    if exists (select 1 from profile_accessories where profile_id = uid and accessory_id = r_ref) then
      dup := true;
      r_coins := 100;
      update profiles set coins = coins + r_coins where id = uid;
    else
      insert into profile_accessories (profile_id, accessory_id) values (uid, r_ref);
    end if;
  elsif r_kind = 'weapon' then
    if exists (select 1 from profile_weapons where profile_id = uid and weapon_id = r_ref) then
      dup := true;
      r_coins := 150;
      update profiles set coins = coins + r_coins where id = uid;
    else
      insert into profile_weapons (profile_id, weapon_id) values (uid, r_ref);
    end if;
  end if;
  return json_build_object(
    'xp_gained', 60,
    'xp', (select xp from profiles where id = uid),
    'reward_kind', r_kind,
    'reward_ref', r_ref,
    'reward_coins', r_coins,
    'duplicate', dup,
    'coins', (select coins from profiles where id = uid)
  );
end;
$$;

create or replace function public.story_reward()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  claimed boolean;
  dup boolean := false;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select story_claimed into claimed from profiles where id = uid;
  if claimed then
    raise exception 'already claimed';
  end if;
  update profiles set story_claimed = true where id = uid;
  if exists (select 1 from profile_skins where profile_id = uid and skin_id = 'undertaker') then
    dup := true;
    update profiles set coins = coins + 400 where id = uid returning coins into new_coins;
  else
    insert into profile_skins (profile_id, skin_id) values (uid, 'undertaker');
    update profiles set coins = coins + 150 where id = uid returning coins into new_coins;
  end if;
  perform grant_xp(uid, 250);
  return json_build_object('skin', 'undertaker', 'duplicate', dup, 'coins', new_coins);
end;
$$;

grant execute on function public.story_xp(integer) to authenticated;
grant execute on function public.story_reward() to authenticated;

create table if not exists public.app_meta (
  key text primary key,
  value text not null
);

alter table public.app_meta enable row level security;

do $$
begin
  if not exists (select 1 from public.app_meta where key = 'bounty_migration') then
    update public.profiles set elo = greatest(100, elo - 900);
    update public.season_history set elo = greatest(100, elo - 900);
    insert into public.app_meta (key, value) values ('bounty_migration', 'done');
  end if;
end
$$;
