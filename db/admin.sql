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

revoke execute on function public.assert_admin() from anon, authenticated;
grant execute on function public.admin_list_events() to authenticated;
grant execute on function public.admin_upsert_event(text, text, text, integer, text, text, integer, integer, text) to authenticated;
grant execute on function public.admin_end_event(text) to authenticated;
grant execute on function public.admin_delete_event(text) to authenticated;
grant execute on function public.admin_search_players(text, integer, integer) to authenticated;
grant execute on function public.admin_list_banned() to authenticated;
grant execute on function public.admin_set_ban(uuid, boolean, text) to authenticated;
