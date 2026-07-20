create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null,
  prime integer not null default 100,
  coins integer not null default 0,
  xp integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  ranked_wins integer not null default 0,
  ranked_losses integer not null default 0,
  skin text not null default 'drifter',
  weapon text not null default 'iron',
  accessories text[] not null default '{mustache}',
  cg_username text,
  friend_code text,
  season_key integer not null default 0,
  free_draws integer not null default 0,
  shots_fired integer not null default 0,
  shots_hit integer not null default 0,
  headshots integer not null default 0,
  win_streak integer not null default 0,
  best_streak integer not null default 0,
  last_opp uuid,
  last_opp_at timestamptz,
  same_opp_count integer not null default 0,
  last_result_at timestamptz,
  last_ad_at timestamptz,
  ad_streak integer not null default 0,
  ad_day date,
  ad_case_day date,
  ad_case_count integer not null default 0,
  mg_day date,
  mg_count integer not null default 0,
  story_mask integer not null default 0,
  story_claimed boolean not null default false,
  banned boolean not null default false,
  ban_reason text,
  created_at timestamptz not null default now(),
  last_seen timestamptz,
  constraint pseudo_format check (pseudo ~ '^[A-Za-z0-9_ .-]{3,16}$')
);

alter table public.profiles add column if not exists banned boolean not null default false;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.profiles add column if not exists playtime_seconds bigint not null default 0;

create or replace function public.touch_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set last_seen = now() where id = auth.uid();
end;
$$;
grant execute on function public.touch_seen() to authenticated;

create unique index if not exists profiles_pseudo_unique on public.profiles (lower(pseudo));
create unique index if not exists profiles_friend_code_unique on public.profiles (friend_code);
create index if not exists profiles_prime_idx on public.profiles (prime desc);

create table if not exists public.skins (
  id text primary key,
  price integer not null,
  weight integer not null default 3,
  rarity text not null default 'common',
  event_only boolean not null default false
);

create table if not exists public.profile_skins (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skin_id text not null references public.skins(id),
  seen boolean not null default false,
  primary key (profile_id, skin_id)
);

create table if not exists public.accessories (
  id text primary key,
  slot text not null,
  weight integer not null,
  rarity text not null default 'common'
);

create table if not exists public.profile_accessories (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  accessory_id text not null references public.accessories(id),
  seen boolean not null default false,
  primary key (profile_id, accessory_id)
);

create table if not exists public.weapons (
  id text primary key,
  price integer not null,
  weight integer not null,
  rarity text not null default 'common'
);

create table if not exists public.profile_weapons (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  weapon_id text not null references public.weapons(id),
  seen boolean not null default false,
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

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'profiles'
     ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end
$$;

create table if not exists public.challenge_progress (
  profile_id uuid references public.profiles(id) on delete cascade,
  period text not null,
  period_key text not null,
  counters jsonb not null default '{}'::jsonb,
  claimed jsonb not null default '[]'::jsonb,
  primary key (profile_id, period)
);

create table if not exists public.season_history (
  profile_id uuid references public.profiles(id) on delete cascade,
  season integer not null,
  prime integer not null,
  rank integer,
  seen boolean not null default true,
  primary key (profile_id, season)
);

create table if not exists public.season_badges (
  profile_id uuid references public.profiles(id) on delete cascade,
  season integer not null,
  rank integer not null,
  seen boolean not null default false,
  primary key (profile_id, season)
);

create table if not exists public.pass_claims (
  profile_id uuid references public.profiles(id) on delete cascade,
  season integer not null,
  level integer not null,
  primary key (profile_id, season, level)
);

create table if not exists public.ad_unlocks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  ref text not null,
  watched integer not null default 0,
  primary key (profile_id, kind, ref)
);

create table if not exists public.events (
  id text primary key,
  title text not null,
  stat text not null check (stat in ('played', 'won', 'ranked_won', 'shots', 'hits', 'heads')),
  goal integer not null check (goal > 0),
  reward_kind text not null check (reward_kind in ('coins', 'skin', 'weapon', 'accessory')),
  reward_ref text,
  reward_amount integer not null default 0,
  icon text not null default '⭐',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null
);

create table if not exists public.event_progress (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null references public.events(id) on delete cascade,
  counter integer not null default 0,
  claimed boolean not null default false,
  primary key (profile_id, event_id)
);

create table if not exists public.app_meta (
  key text primary key,
  value text not null
);

insert into public.skins (id, price, weight) values
  ('drifter', 0, 0),
  ('sheriff', 150, 3),
  ('bandit', 200, 3),
  ('cavalry', 350, 3),
  ('undertaker', 500, 3),
  ('ghost', 650, 3),
  ('golden', 900, 3),
  ('marshal', 300, 3),
  ('preacher', 450, 2),
  ('duchess', 500, 2),
  ('kid', 200, 3),
  ('mariachi', 550, 2),
  ('sombra', 600, 1),
  ('nightowl', 700, 1),
  ('eldorado', 950, 1)
on conflict (id) do nothing;

insert into public.skins (id, price, weight, rarity, event_only) values
  ('trapper', 0, 0, 'mythic', true),
  ('skeleton', 0, 0, 'mythic', true),
  ('bounty', 0, 0, 'mythic', true),
  ('gambler', 0, 0, 'mythic', true),
  ('calamity', 0, 0, 'mythic', true),
  ('phantom', 0, 0, 'mythic', true)
on conflict (id) do nothing;

delete from public.profile_skins where skin_id in ('poncho', 'outlaw', 'rangercoat', 'vaquero', 'miner', 'tracker', 'bluecoat', 'riverboat', 'prospector');
delete from public.skins where id in ('poncho', 'outlaw', 'rangercoat', 'vaquero', 'miner', 'tracker', 'bluecoat', 'riverboat', 'prospector');
update public.skins set price = 0, weight = 0, event_only = true where id in ('bounty', 'gambler');
update public.skins set price = 0, weight = 0, event_only = true where id = 'nightowl';
update public.skins set price = 700, weight = 1, event_only = false where id = 'calamity';

update public.skins set rarity = case
  when event_only then 'mythic'
  when price >= 600 then 'legendary'
  when price >= 450 then 'epic'
  when price >= 250 then 'rare'
  else 'common'
end;

update public.skins set rarity = 'rare' where id = 'undertaker';
update public.skins set rarity = 'epic' where id = 'trapper';

insert into public.weapons (id, price, weight) values
  ('iron', 0, 0),
  ('silver', 200, 3),
  ('ivory', 300, 3),
  ('ranger', 400, 3),
  ('rose', 550, 3),
  ('golden', 850, 3),
  ('navy', 250, 3),
  ('peacemaker', 350, 3),
  ('serpent', 450, 2),
  ('coyote', 300, 3),
  ('midnight', 550, 2),
  ('bone', 500, 2),
  ('scarlet', 650, 1),
  ('deputy', 400, 2)
on conflict (id) do nothing;

update public.weapons set rarity = case
  when price >= 600 then 'legendary'
  when price >= 450 then 'epic'
  when price >= 250 then 'rare'
  else 'common'
end;

insert into public.accessories (id, slot, weight) values
  ('mustache', 'face', 14),
  ('beard', 'face', 6),
  ('sideburns', 'face', 10),
  ('goatee', 'face', 10),
  ('chinstrap', 'face', 12),
  ('cigar', 'mouth', 10),
  ('goldtooth', 'mouth', 6),
  ('pipe', 'mouth', 10),
  ('toothpick', 'mouth', 13),
  ('cigarette', 'mouth', 13),
  ('eyepatch', 'eyes', 10),
  ('monocle', 'eyes', 10),
  ('shades', 'eyes', 10),
  ('spectacles', 'eyes', 13),
  ('blindfold', 'eyes', 6),
  ('star', 'chest', 10),
  ('bandolier', 'chest', 10),
  ('skullbadge', 'chest', 6),
  ('deputybadge', 'chest', 13),
  ('medallion', 'chest', 6),
  ('feather', 'hat', 13),
  ('hatband', 'hat', 10),
  ('cardband', 'hat', 10),
  ('sheriffpin', 'hat', 6),
  ('bulletband', 'hat', 13),
  ('shorthair', 'hair', 12),
  ('ponytail', 'hair', 10),
  ('longhair', 'hair', 10),
  ('braids', 'hair', 6),
  ('bald', 'hair', 12),
  ('paper-burned', 'posterpaper', 0),
  ('paper-torn', 'posterpaper', 0),
  ('paper-stained', 'posterpaper', 0),
  ('stamp-outlaw', 'posterstamp', 0),
  ('stamp-reward', 'posterstamp', 0),
  ('stamp-nomercy', 'posterstamp', 0),
  ('ink-black', 'posterink', 0),
  ('ink-blood', 'posterink', 0),
  ('ink-blue', 'posterink', 0),
  ('ink-green', 'posterink', 0),
  ('ink-purple', 'posterink', 0),
  ('ink-gold', 'posterink', 0),
  ('pose-draw', 'posterpose', 0),
  ('pose-holster', 'posterpose', 0),
  ('nick-fantasma', 'posternick', 0),
  ('nick-tornado', 'posternick', 0),
  ('nick-vibora', 'posternick', 0)
on conflict (id) do nothing;

delete from public.profile_accessories where accessory_id in (
  'poncho', 'scarf', 'cape', 'duster', 'serape', 'bedroll', 'satchel',
  'warpaint', 'handlebar', 'matchstick', 'rose', 'goggles', 'warstripe',
  'bolotie', 'pocketwatch', 'conchos', 'snakeband'
);
delete from public.accessories where id in (
  'poncho', 'scarf', 'cape', 'duster', 'serape', 'bedroll', 'satchel',
  'warpaint', 'handlebar', 'matchstick', 'rose', 'goggles', 'warstripe',
  'bolotie', 'pocketwatch', 'conchos', 'snakeband'
);

update public.accessories set rarity = case
  when slot = 'badge' then 'mythic'
  when id in ('stamp-nomercy', 'ink-blood', 'ink-gold', 'nick-fantasma', 'nick-tornado', 'nick-vibora') then 'legendary'
  when id in ('braids', 'beard', 'goldtooth', 'blindfold', 'skullbadge', 'medallion', 'sheriffpin', 'paper-burned', 'stamp-outlaw', 'stamp-reward', 'pose-draw', 'monocle', 'ink-purple') then 'epic'
  when id in ('ponytail', 'longhair', 'goatee', 'sideburns', 'pipe', 'cigar', 'eyepatch', 'shades', 'star', 'bandolier', 'hatband', 'cardband', 'paper-torn', 'paper-stained', 'ink-black', 'ink-blue', 'ink-green', 'pose-holster') then 'rare'
  else 'common'
end;

alter table public.profiles enable row level security;
alter table public.skins enable row level security;
alter table public.profile_skins enable row level security;
alter table public.accessories enable row level security;
alter table public.profile_accessories enable row level security;
alter table public.weapons enable row level security;
alter table public.profile_weapons enable row level security;
alter table public.friendships enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.season_history enable row level security;
alter table public.season_badges enable row level security;
alter table public.pass_claims enable row level security;
alter table public.ad_unlocks enable row level security;
alter table public.events enable row level security;
alter table public.event_progress enable row level security;
alter table public.app_meta enable row level security;

grant select on public.profiles to anon, authenticated;
grant select on public.skins to anon, authenticated;
grant select on public.profile_skins to authenticated;
grant select on public.accessories to anon, authenticated;
grant select on public.profile_accessories to authenticated;
grant select on public.weapons to anon, authenticated;
grant select on public.profile_weapons to authenticated;
grant select on public.friendships to authenticated;
grant select on public.challenge_progress to authenticated;
grant select on public.season_history to anon, authenticated;
grant select on public.season_badges to authenticated;
grant select on public.pass_claims to authenticated;
grant select on public.ad_unlocks to authenticated;
grant select on public.events to anon, authenticated;
grant select on public.event_progress to authenticated;

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

drop policy if exists challenge_self_read on public.challenge_progress;
create policy challenge_self_read on public.challenge_progress
  for select using (auth.uid() = profile_id);

drop policy if exists season_history_read on public.season_history;
create policy season_history_read on public.season_history
  for select using (true);

drop policy if exists season_badges_read on public.season_badges;
create policy season_badges_read on public.season_badges
  for select using (auth.uid() = profile_id);

drop policy if exists pass_claims_read on public.pass_claims;
create policy pass_claims_read on public.pass_claims
  for select using (auth.uid() = profile_id);

drop policy if exists ad_unlocks_select_own on public.ad_unlocks;
create policy ad_unlocks_select_own on public.ad_unlocks
  for select using (auth.uid() = profile_id);

drop policy if exists events_read on public.events;
create policy events_read on public.events
  for select using (true);

drop policy if exists event_progress_self_read on public.event_progress;
create policy event_progress_self_read on public.event_progress
  for select using (auth.uid() = profile_id);

do $do$
declare
  anchor integer := floor(extract(epoch from now()) / 86400)::integer;
begin
  execute format(
    $fmt$
      create or replace function public.current_season()
      returns integer language sql stable as $fn$
        select (floor((extract(epoch from now()) / 86400 - %s) / 30) + 1)::integer;
      $fn$
    $fmt$,
    anchor
  );
  execute format(
    $fmt$
      create or replace function public.season_days_left()
      returns integer language sql stable as $fn$
        select (30 - mod((floor(extract(epoch from now()) / 86400)::integer - %s), 30))::integer;
      $fn$
    $fmt$,
    anchor
  );
end
$do$;

create or replace function public.ensure_season(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur integer;
  old_key integer;
  old_prime integer;
  old_rank integer;
  title_id text;
begin
  cur := current_season();
  select season_key, prime into old_key, old_prime from profiles where id = p_uid;
  if old_key is null or old_key = cur then
    return;
  end if;
  if old_key > 0 then
    select 1
      + (select count(*) from profiles where season_key = old_key and id <> p_uid and prime > old_prime)
      + (select count(*) from season_history where season = old_key and profile_id <> p_uid and prime > old_prime)
    into old_rank;
    insert into season_history (profile_id, season, prime, rank, seen)
    values (p_uid, old_key, old_prime, old_rank, false)
    on conflict (profile_id, season) do update set prime = excluded.prime, rank = excluded.rank, seen = excluded.seen;
    if old_rank <= 10 and old_prime > 100 then
      title_id := 'title-s' || old_key || '-r' || old_rank;
      insert into accessories (id, slot, weight, rarity) values (title_id, 'posternick', 0, 'mythic')
      on conflict (id) do nothing;
      insert into profile_accessories (profile_id, accessory_id) values (p_uid, title_id)
      on conflict do nothing;
      insert into season_badges (profile_id, season, rank) values (p_uid, old_key, old_rank)
      on conflict (profile_id, season) do nothing;
    end if;
  end if;
  update profiles set season_key = cur, prime = 100, xp = 0 where id = p_uid;
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

create or replace function public.item_rarity(p_kind text, p_ref text)
returns text
language sql
stable
as $$
  select case
    when p_kind = 'skin' then (select rarity from public.skins where id = p_ref)
    when p_kind = 'weapon' then (select rarity from public.weapons where id = p_ref)
    else (select rarity from public.accessories where id = p_ref)
  end;
$$;

create or replace function public.item_refund(p_kind text, p_ref text)
returns integer
language sql
stable
as $$
  select case public.item_rarity(p_kind, p_ref)
    when 'mythic' then 200
    when 'legendary' then 100
    when 'epic' then 60
    when 'rare' then 30
    else 15
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
  insert into profile_skins (profile_id, skin_id, seen) values (uid, 'drifter', true);
  insert into profile_weapons (profile_id, weapon_id, seen) values (uid, 'iron', true);
  insert into profile_accessories (profile_id, accessory_id, seen) values (uid, 'mustache', true);
  update profiles set accessories = '{mustache}' where id = uid;
  perform ensure_season(uid);
  perform ensure_friend_code(uid);
  if p_cg is not null and exists (select 1 from profiles where cg_username = p_cg and banned and id <> uid) then
    update profiles set banned = true,
      ban_reason = coalesce((select ban_reason from profiles where cg_username = p_cg and banned and id <> uid limit 1), 'Compte banni')
    where id = uid;
  end if;
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
  is_event boolean;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select price, event_only into skin_price, is_event from skins where id = p_skin;
  if skin_price is null then
    raise exception 'unknown skin';
  end if;
  if is_event then
    raise exception 'event only';
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

create or replace function public.mark_item_seen(p_kind text, p_id text)
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
  if p_kind = 'skin' then
    update profile_skins set seen = true where profile_id = uid and skin_id = p_id;
  elsif p_kind = 'weapon' then
    update profile_weapons set seen = true where profile_id = uid and weapon_id = p_id;
  elsif p_kind = 'accessory' then
    update profile_accessories set seen = true where profile_id = uid and accessory_id = p_id;
  end if;
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
  if array_length(p_list, 1) > 14 then
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

create or replace function public.bump_event(p_stat text, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  ev record;
begin
  uid := auth.uid();
  if uid is null or p_amount <= 0 then
    return;
  end if;
  for ev in
    select id from events where stat = p_stat and starts_at <= now() and ends_at > now()
  loop
    insert into event_progress (profile_id, event_id, counter)
    values (uid, ev.id, p_amount)
    on conflict (profile_id, event_id) do update set counter = event_progress.counter + p_amount;
  end loop;
end;
$$;

create or replace function public.bump_playtime(p_seconds integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update profiles
  set playtime_seconds = playtime_seconds + least(greatest(coalesce(p_seconds, 0), 0), 90)
  where id = auth.uid();
end;
$$;

create or replace function public.event_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
  declare
    uid uuid;
    ev record;
    cev record;
    cnt integer;
    clm boolean;
  begin
    uid := auth.uid();
    if uid is null then
      return null;
    end if;

    for cev in select e.* from events e
      join event_progress ep on ep.event_id = e.id
      where ep.profile_id = uid and ep.claimed = false and ep.counter >= e.goal
        and (e.ends_at <= now() or e.id <> (select id from events where starts_at <= now() order by starts_at desc limit 1))
    loop
      update event_progress set claimed = true where profile_id = uid and event_id = cev.id;
      if cev.reward_kind = 'coins' then
        update profiles set coins = coins + cev.reward_amount where id = uid;
      elsif cev.reward_kind = 'skin' then
        if not exists (select 1 from profile_skins where profile_id = uid and skin_id = cev.reward_ref) then
          insert into profile_skins (profile_id, skin_id) values (uid, cev.reward_ref);
        else
          update profiles set coins = coins + public.item_refund('skin', cev.reward_ref) where id = uid;
        end if;
      elsif cev.reward_kind = 'weapon' then
        if not exists (select 1 from profile_weapons where profile_id = uid and weapon_id = cev.reward_ref) then
          insert into profile_weapons (profile_id, weapon_id) values (uid, cev.reward_ref);
        else
          update profiles set coins = coins + public.item_refund('weapon', cev.reward_ref) where id = uid;
        end if;
      elsif cev.reward_kind = 'accessory' then
        if not exists (select 1 from profile_accessories where profile_id = uid and accessory_id = cev.reward_ref) then
          insert into profile_accessories (profile_id, accessory_id) values (uid, cev.reward_ref);
        else
          update profiles set coins = coins + public.item_refund('accessory', cev.reward_ref) where id = uid;
        end if;
      end if;
    end loop;

    select * into ev from events
    where starts_at <= now() and ends_at > now() - interval '1 day'
  order by starts_at desc
  limit 1;
  if ev.id is null then
    return null;
  end if;
  select counter, claimed into cnt, clm from event_progress where profile_id = uid and event_id = ev.id;
  return json_build_object(
    'id', ev.id,
    'title', ev.title,
    'stat', ev.stat,
    'goal', ev.goal,
    'reward_kind', ev.reward_kind,
    'reward_ref', ev.reward_ref,
    'reward_amount', ev.reward_amount,
    'icon', ev.icon,
    'ends_at', to_char(ev.ends_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'counter', coalesce(cnt, 0),
    'claimed', coalesce(clm, false)
  );
end;
$$;

create or replace function public.event_claim(p_event text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  ev record;
  cnt integer;
  clm boolean;
  dup boolean := false;
  refund integer := 0;
  new_coins integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into ev from events where id = p_event;
  if ev.id is null then
    raise exception 'unknown event';
  end if;
  if now() < ev.starts_at or now() > ev.ends_at + interval '7 days' then
    raise exception 'event closed';
  end if;
  select counter, claimed into cnt, clm from event_progress where profile_id = uid and event_id = p_event;
  if coalesce(cnt, 0) < ev.goal then
    raise exception 'not complete';
  end if;
  if coalesce(clm, false) then
    raise exception 'already claimed';
  end if;
  update event_progress set claimed = true where profile_id = uid and event_id = p_event;
  if ev.reward_kind = 'coins' then
    update profiles set coins = coins + ev.reward_amount where id = uid;
  elsif ev.reward_kind = 'skin' then
    if exists (select 1 from profile_skins where profile_id = uid and skin_id = ev.reward_ref) then
      dup := true;
      refund := item_refund('skin', ev.reward_ref);
      update profiles set coins = coins + refund where id = uid;
    else
      insert into profile_skins (profile_id, skin_id) values (uid, ev.reward_ref);
    end if;
  elsif ev.reward_kind = 'weapon' then
    if exists (select 1 from profile_weapons where profile_id = uid and weapon_id = ev.reward_ref) then
      dup := true;
      refund := item_refund('weapon', ev.reward_ref);
      update profiles set coins = coins + refund where id = uid;
    else
      insert into profile_weapons (profile_id, weapon_id) values (uid, ev.reward_ref);
    end if;
  elsif ev.reward_kind = 'accessory' then
    if exists (select 1 from profile_accessories where profile_id = uid and accessory_id = ev.reward_ref) then
      dup := true;
      refund := item_refund('accessory', ev.reward_ref);
      update profiles set coins = coins + refund where id = uid;
    else
      insert into profile_accessories (profile_id, accessory_id) values (uid, ev.reward_ref);
    end if;
  end if;
  select coins into new_coins from profiles where id = uid;
  return json_build_object(
    'reward_kind', ev.reward_kind,
    'reward_ref', ev.reward_ref,
    'reward_amount', ev.reward_amount,
    'duplicate', dup,
    'refund', refund,
    'coins', new_coins
  );
end;
$$;

create or replace function public.report_result(p_won boolean, p_ranked boolean, p_opp_prime integer, p_opp_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  my_prime integer;
  opp_bounty integer;
  real_bounty integer;
  delta integer;
  gained integer;
  new_prime integer;
  new_coins integer;
  prev_opp uuid;
  prev_at timestamptz;
  same_count integer;
  track boolean;
  last_res timestamptz;
  throttled boolean;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if (select banned from profiles where id = uid) then
    raise exception 'banned';
  end if;
  perform ensure_season(uid);
  select prime, last_opp, last_opp_at, same_opp_count, last_result_at
  into my_prime, prev_opp, prev_at, same_count, last_res
  from profiles where id = uid;
  if my_prime is null then
    raise exception 'no profile';
  end if;
  throttled := last_res is not null and last_res > now() - interval '30 seconds';
  delta := 0;
  if p_ranked then
    real_bounty := null;
    if p_opp_id is not null and p_opp_id <> uid then
      select prime into real_bounty from profiles where id = p_opp_id;
    end if;
    opp_bounty := greatest(100, least(100000, coalesce(real_bounty, 100)));
    if p_won then
      delta := 20 + round(opp_bounty * 0.15);
      gained := 10;
    else
      delta := -round(my_prime * 0.10);
      gained := 2;
    end if;
  else
    gained := 0;
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
  if throttled then
    delta := least(delta, 0);
    gained := least(gained, 2);
  end if;
  update profiles set
    prime = greatest(100, prime + delta),
    coins = coins + gained,
    wins = wins + (case when p_won then 1 else 0 end),
    losses = losses + (case when p_won then 0 else 1 end),
    ranked_wins = ranked_wins + (case when p_won and p_ranked then 1 else 0 end),
    ranked_losses = ranked_losses + (case when not p_won and p_ranked then 1 else 0 end),
    last_opp = case when track then p_opp_id else last_opp end,
    last_opp_at = case when track then now() else last_opp_at end,
    same_opp_count = case when track then same_count else same_opp_count end,
    last_result_at = now()
  where id = uid
  returning prime, coins into new_prime, new_coins;
  if p_ranked then
    perform public.bump_challenge('played', 1);
    perform public.bump_event('played', 1);
    if p_won then
      perform public.bump_challenge('won', 1);
      perform public.bump_event('won', 1);
      perform public.bump_challenge('ranked_won', 1);
      perform public.bump_event('ranked_won', 1);
    end if;
  end if;
  perform grant_xp(uid, case
    when throttled then 5
    when p_ranked and p_won then 45
    when p_ranked then 18
    when p_won then 22
    else 9
  end);
  return json_build_object('prime', new_prime, 'coins', new_coins, 'prime_delta', new_prime - my_prime, 'coins_delta', gained, 'xp', (select xp from public.profiles where id = uid));
end;
$$;

create or replace function public.report_result(p_won boolean, p_ranked boolean, p_opp_prime integer)
returns json
language sql
security definer
set search_path = public
as $$
  select public.report_result(p_won, p_ranked, p_opp_prime, null::uuid);
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
  perform public.bump_event('shots', greatest(0, least(200, p_shots)));
  perform public.bump_event('hits', greatest(0, least(200, p_hits)));
  perform public.bump_event('heads', greatest(0, least(200, p_heads)));
end;
$$;

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
  refund integer := 0;
  free_left integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select free_draws into free_left from profiles where id = uid;
  if free_left > 0 then
    update profiles set free_draws = free_draws - 1
    where id = uid
    returning coins into new_coins;
  else
    update profiles set coins = coins - 60
    where id = uid and coins >= 60
    returning coins into new_coins;
    if new_coins is null then
      raise exception 'not enough coins';
    end if;
  end if;
  select coalesce(sum(weight), 0) into total from (
    select weight from skins where weight > 0
    union all
    select weight from weapons where weight > 0
    union all
    select weight from accessories where weight > 0
  ) pool;
  pick := floor(random() * total) + 1;
  for row in
    select 'skin' as kind, id, weight from skins where weight > 0
    union all
    select 'weapon' as kind, id, weight from weapons where weight > 0
    union all
    select 'accessory' as kind, id, weight from accessories where weight > 0
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
    refund := item_refund(item_kind, item_ref);
    update profiles set coins = coins + refund where id = uid returning coins into new_coins;
  end if;
  return json_build_object('kind', item_kind, 'ref', item_ref, 'duplicate', duplicate, 'refund', refund, 'coins', new_coins, 'free_draws', (select free_draws from profiles where id = uid));
end;
$$;

create or replace function public.send_friend_request(p_code text)
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
      'prime', p.prime,
      'skin', p.skin,
      'accessories', p.accessories,
      'weapon', p.weapon,
      'cg_username', p.cg_username,
      'wins', p.wins,
      'losses', p.losses,
      'xp', p.xp,
      'shots_fired', p.shots_fired,
      'shots_hit', p.shots_hit,
      'headshots', p.headshots,
      'win_streak', p.win_streak,
      'best_streak', p.best_streak,
      'friend_code', p.friend_code
    ) as entry
    from friendships f
    join profiles p on p.id = case when f.requester = uid then f.addressee else f.requester end
    where (f.requester = uid or f.addressee = uid) and coalesce(p.banned, false) = false
    order by f.created_at desc
  ) rows;
  return result;
end;
$$;

create or replace function public.ad_item_needed(p_kind text, p_ref text)
returns integer
language sql
immutable
as $$
  select case
    when p_kind = 'accessory' and p_ref = 'cigarette' then 3
    when p_kind = 'weapon' and p_ref = 'peacemaker' then 5
    when p_kind = 'accessory' and p_ref = 'paper-torn' then 6
    when p_kind = 'skin' and p_ref = 'trapper' then 10
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
  gained := 20;
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
  refund integer := 0;
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
    select weight from accessories where weight > 0
  ) pool;
  pick := floor(random() * total) + 1;
  for row in
    select 'skin' as kind, id, weight from skins where weight > 0
    union all
    select 'weapon' as kind, id, weight from weapons where weight > 0
    union all
    select 'accessory' as kind, id, weight from accessories where weight > 0
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
    refund := item_refund(item_kind, item_ref);
    update profiles set coins = coins + refund where id = uid returning coins into new_coins;
  end if;
  return json_build_object('kind', item_kind, 'ref', item_ref, 'duplicate', duplicate, 'refund', refund, 'coins', new_coins, 'left', 0);
end;
$$;

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
  select ad_streak, ad_day, ad_case_day, ad_case_count, last_ad_at
  into p from profiles where id = uid;
  next_gain := 50;
  if p.ad_case_day is distinct from current_date then
    case_left := 1;
  else
    case_left := greatest(0, 1 - p.ad_case_count);
  end if;
  for it in
    select * from (values
      ('accessory', 'cigarette'),
      ('weapon', 'peacemaker'),
      ('accessory', 'paper-torn'),
      ('skin', 'trapper')
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
    'daily_reset_at', case when p.ad_day = current_date and p.last_ad_at is not null then to_char(p.last_ad_at + interval '24 hours', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') else null end,
    'case_reset_at', case when p.ad_case_day = current_date and case_left <= 0 and p.last_ad_at is not null then to_char(p.last_ad_at + interval '24 hours', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') else null end,
    'items', items
  );
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
  p_prime integer;
  p_rank integer;
  prev json := null;
begin
  uid := auth.uid();
  if uid is null then
    return null;
  end if;
  perform ensure_season(uid);
  cur := current_season();
  select profile_id into top_prev from season_history where season = cur - 1 order by prime desc limit 1;
  select coalesce(json_agg(json_build_object('season', season, 'prime', prime) order by season desc), '[]'::json)
  into hist from season_history where profile_id = uid;
  code := ensure_friend_code(uid);
  select season, rank into b_season, b_rank from season_badges
  where profile_id = uid and seen = false order by season desc limit 1;
  if b_season is not null then
    update season_badges set seen = true where profile_id = uid and season = b_season;
    badge := json_build_object('season', b_season, 'rank', b_rank);
  end if;
  select season, prime, rank into p_season, p_prime, p_rank from season_history
  where profile_id = uid and seen = false order by season desc limit 1;
  if p_season is not null then
    update season_history set seen = true where profile_id = uid and seen = false;
    prev := json_build_object('season', p_season, 'prime', p_prime, 'rank', p_rank);
  end if;
  return json_build_object('season', cur, 'prev_top', top_prev, 'code', code, 'history', hist, 'badge', badge, 'prev', prev,
    'days_left', season_days_left(),
    'prime', (select prime from profiles where id = uid), 'xp', (select xp from profiles where id = uid));
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
    select json_build_object('pseudo', pseudo, 'prime', prime, 'skin', skin, 'accessories', accessories, 'ranked_wins', ranked_wins, 'ranked_losses', ranked_losses) as entry
    from profiles
    where season_key = current_season() and (ranked_wins > 0 or ranked_losses > 0) and not banned
    order by prime desc
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
begin
  h := abs(hashtext(p_season::text || ':' || p_level::text));
  if p_level % 5 = 0 then
    return json_build_object('kind', 'draw');
  end if;
  return json_build_object('kind', 'coins', 'amount', least(25, 6 + (h % 5) * 4 + (p_level / 6)));
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
  elsif reward ->> 'kind' = 'draw' then
    update profiles set free_draws = free_draws + 1 where id = uid returning coins into new_coins;
  end if;
  if new_coins is null then
    select coins into new_coins from profiles where id = uid;
  end if;
  return json_build_object('kind', reward ->> 'kind', 'amount', reward ->> 'amount', 'coins', new_coins, 'free_draws', (select free_draws from profiles where id = uid));
end;
$$;

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
  gained := 0;
  update profiles set mg_day = day, mg_count = cnt + 1 where id = uid;
  return json_build_object('xp_gained', gained, 'xp', (select xp from profiles where id = uid));
end;
$$;

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
  r_coins := 0;
  if p_chapter = 1 then
    r_kind := 'accessory'; r_ref := 'deputybadge';
  elsif p_chapter = 3 then
    r_kind := 'weapon'; r_ref := 'ranger';
  end if;
  if r_kind = 'accessory' then
    if exists (select 1 from profile_accessories where profile_id = uid and accessory_id = r_ref) then
      dup := true;
      r_coins := r_coins + 30;
    else
      insert into profile_accessories (profile_id, accessory_id) values (uid, r_ref);
    end if;
  elsif r_kind = 'weapon' then
    if exists (select 1 from profile_weapons where profile_id = uid and weapon_id = r_ref) then
      dup := true;
      r_coins := r_coins + 30;
    else
      insert into profile_weapons (profile_id, weapon_id) values (uid, r_ref);
    end if;
  end if;
  update profiles set coins = coins + r_coins where id = uid;
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
    update profiles set coins = coins + 30 where id = uid returning coins into new_coins;
  else
    insert into profile_skins (profile_id, skin_id) values (uid, 'undertaker');
    new_coins := (select coins from profiles where id = uid);
  end if;
  perform grant_xp(uid, 250);
  return json_build_object('skin', 'undertaker', 'duplicate', dup, 'coins', new_coins);
end;
$$;

grant execute on function public.create_profile(text, text) to authenticated;
grant execute on function public.set_pseudo(text) to authenticated;
grant execute on function public.set_cg_username(text) to authenticated;
grant execute on function public.equip_skin(text) to authenticated;
grant execute on function public.equip_weapon(text) to authenticated;
grant execute on function public.buy_skin(text) to authenticated;
grant execute on function public.mark_item_seen(text, text) to authenticated;
grant execute on function public.set_accessories(text[]) to authenticated;
grant execute on function public.report_result(boolean, boolean, integer) to authenticated;
grant execute on function public.report_result(boolean, boolean, integer, uuid) to authenticated;
grant execute on function public.record_stats(integer, integer, integer, boolean) to authenticated;
grant execute on function public.challenge_state() to authenticated;
grant execute on function public.claim_challenge(text, integer) to authenticated;
grant execute on function public.spin_wheel() to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.reward_ad() to authenticated;
grant execute on function public.ad_case() to authenticated;
grant execute on function public.ad_watch_item(text, text) to authenticated;
grant execute on function public.ad_state() to authenticated;
grant execute on function public.current_season() to anon, authenticated;
grant execute on function public.season_info() to authenticated;
grant execute on function public.leaderboard_top() to anon, authenticated;
grant execute on function public.pass_state() to authenticated;
grant execute on function public.claim_pass_level(integer) to authenticated;
grant execute on function public.minigame_xp(text, integer) to authenticated;
grant execute on function public.story_xp(integer) to authenticated;
grant execute on function public.story_reward() to authenticated;
grant execute on function public.event_state() to authenticated;
grant execute on function public.event_claim(text) to authenticated;
grant execute on function public.bump_playtime(integer) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'events'
     ) then
    alter publication supabase_realtime add table public.events;
  end if;
end
$$;
