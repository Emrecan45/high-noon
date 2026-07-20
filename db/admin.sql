create table if not exists public.admins (
  uid uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from admins where uid = auth.uid()) then
    raise exception 'not admin';
  end if;
end;
$$;

create or replace function public.admin_list_events()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  perform assert_admin();
  select coalesce(json_agg(row_to_json(e) order by e.starts_at desc), '[]'::json) into result
  from events e;
  return result;
end;
$$;

create or replace function public.admin_upsert_event(
  p_id text,
  p_title text,
  p_stat text,
  p_goal integer,
  p_reward_kind text,
  p_reward_ref text,
  p_reward_amount integer,
  p_days integer,
  p_icon text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assert_admin();
  insert into events (id, title, stat, goal, reward_kind, reward_ref, reward_amount, starts_at, ends_at, icon)
  values (
    p_id, p_title, p_stat, p_goal, p_reward_kind,
    nullif(p_reward_ref, ''), coalesce(p_reward_amount, 0),
    now(), now() + (coalesce(p_days, 7) || ' days')::interval,
    coalesce(nullif(p_icon, ''), '⭐')
  )
  on conflict (id) do update set
    title = excluded.title,
    stat = excluded.stat,
    goal = excluded.goal,
    reward_kind = excluded.reward_kind,
    reward_ref = excluded.reward_ref,
    reward_amount = excluded.reward_amount,
    ends_at = excluded.ends_at,
    icon = excluded.icon;
end;
$$;

create or replace function public.admin_end_event(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assert_admin();
  update events set ends_at = now() where id = p_id;
end;
$$;

create or replace function public.admin_delete_event(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assert_admin();
  delete from events where id = p_id;
end;
$$;

drop function if exists public.admin_search_players(text);

create or replace function public.admin_search_players(p_query text, p_offset integer default 0, p_limit integer default 25)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  q text;
begin
  perform assert_admin();
  q := '%' || coalesce(trim(p_query), '') || '%';
  select coalesce(json_agg(row_to_json(r)), '[]'::json) into result
  from (
    select id, pseudo, prime, coins, wins, losses, ranked_wins, ranked_losses,
           shots_fired, shots_hit, headshots, win_streak, best_streak,
           skin, weapon, friend_code, cg_username, banned, ban_reason,
           created_at, last_result_at, last_seen
    from profiles
    where pseudo ilike q or friend_code ilike q or cg_username ilike q or id::text ilike q
    order by created_at desc
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  ) r;
  return result;
end;
$$;

create or replace function public.admin_list_banned()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  perform assert_admin();
  select coalesce(json_agg(row_to_json(r) order by r.created_at desc), '[]'::json) into result
  from (
    select id, pseudo, prime, coins, wins, losses, ranked_wins, ranked_losses,
           shots_fired, shots_hit, headshots, win_streak, best_streak,
           skin, weapon, friend_code, cg_username, banned, ban_reason,
           created_at, last_result_at, last_seen
    from profiles
    where banned = true
    limit 200
  ) r;
  return result;
end;
$$;

create or replace function public.admin_set_ban(p_id uuid, p_banned boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assert_admin();
  update profiles set banned = p_banned, ban_reason = nullif(p_reason, '') where id = p_id;
end;
$$;

create or replace function public.admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  perform assert_admin();
  select json_build_object(
    'players_total', (select count(*) from profiles),
    'players_cg', (select count(*) from profiles where cg_username is not null and cg_username !~ '^User[0-9]+$'),
    'players_banned', (select count(*) from profiles where banned),
    'new_today', (select count(*) from profiles where created_at >= date_trunc('day', now())),
    'new_7d', (select count(*) from profiles where created_at >= now() - interval '7 days'),
    'new_30d', (select count(*) from profiles where created_at >= now() - interval '30 days'),
    'active_24h', (select count(*) from profiles where last_seen >= now() - interval '24 hours'),
    'active_7d', (select count(*) from profiles where last_seen >= now() - interval '7 days'),
    'active_30d', (select count(*) from profiles where last_seen >= now() - interval '30 days'),
    'played_today', (select count(*) from profiles where last_result_at >= date_trunc('day', now())),
    'played_7d', (select count(*) from profiles where last_result_at >= now() - interval '7 days'),
    'returning', (select count(*) from profiles where last_seen is not null and last_seen > created_at + interval '1 day'),
    'avg_playtime_min', (select coalesce(round((avg(playtime_seconds) filter (where playtime_seconds > 0)) / 60.0, 1), 0) from profiles),
    'duels_total', (select coalesce(sum(wins + losses), 0) from profiles),
    'ranked_total', (select coalesce(sum(ranked_wins + ranked_losses), 0) from profiles),
    'avg_duels', (select coalesce(round(avg(wins + losses)::numeric, 1), 0) from profiles),
    'accuracy_global', (select case when coalesce(sum(shots_fired), 0) > 0 then round(sum(shots_hit)::numeric / sum(shots_fired) * 100, 1) else 0 end from profiles),
    'headshots_total', (select coalesce(sum(headshots), 0) from profiles),
    'prime_avg', (select coalesce(round(avg(prime)::numeric, 0), 0) from profiles),
    'prime_max', (select coalesce(max(prime), 0) from profiles),
    'coins_total', (select coalesce(sum(coins), 0) from profiles),
    'xp_avg', (select coalesce(round(avg(xp)::numeric, 0), 0) from profiles),
    'level_avg', (select coalesce(round(avg(1 + floor(xp / 200))::numeric, 1), 0) from profiles),
    'season', current_season(),
    'top_pseudo', (select pseudo from profiles order by prime desc limit 1),
    'top_prime', (select coalesce(max(prime), 0) from profiles),
    'signups_7d', (
      select coalesce(json_agg(json_build_object('d', to_char(g.day, 'DD/MM'), 'n', coalesce(s.c, 0)) order by g.day), '[]'::json)
      from generate_series(date_trunc('day', now()) - interval '6 days', date_trunc('day', now()), interval '1 day') as g(day)
      left join (
        select date_trunc('day', created_at) as day, count(*) as c
        from profiles
        where created_at >= date_trunc('day', now()) - interval '6 days'
        group by 1
      ) s on s.day = g.day
    )
  ) into result;
  return result;
end;
$$;

revoke execute on function public.assert_admin() from anon, authenticated;
grant execute on function public.admin_list_events() to authenticated;
grant execute on function public.admin_upsert_event(text, text, text, integer, text, text, integer, integer, text) to authenticated;
grant execute on function public.admin_end_event(text) to authenticated;
grant execute on function public.admin_delete_event(text) to authenticated;
grant execute on function public.admin_search_players(text, integer, integer) to authenticated;
grant execute on function public.admin_list_banned() to authenticated;
grant execute on function public.admin_set_ban(uuid, boolean, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
