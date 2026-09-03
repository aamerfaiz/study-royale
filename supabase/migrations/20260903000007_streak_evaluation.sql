-- Study Royale — streak evaluation (docs/04-groups-and-streaks.md)
--
-- Deviation from docs/10, deliberate: that doc proposed an Edge Function
-- triggered by pg_cron. The evaluation makes no external calls and needs no
-- secrets, so it lives in Postgres instead — one transaction, no network hop,
-- no service-role key in flight. pg_cron calls it directly.
--
-- It runs hourly rather than nightly because the day boundary is each group's
-- local midnight, so "yesterday ended" happens at a different UTC instant for
-- every timezone. Each (group, day) is evaluated at most once: a row in
-- group_streaks is the marker, which also makes the job safe to re-run.

-- Which Monday-week a user's freeze allowance was last reset for.
alter table public.users
  add column streak_freeze_week date;

create index study_sessions_user_started_desc_idx
  on public.study_sessions (user_id, started_at desc);

create or replace function public.evaluate_group_streaks(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  m record;
  tz text;
  target date;
  group_start date;
  everyone_ok boolean;
  covered boolean;
  week_start date;
  freezes integer;
  last_week date;
  streak integer;
  expected date;
  d date;
  evaluated integer := 0;
begin
  for g in select id, timezone, created_at from public.groups loop
    tz := coalesce(g.timezone, 'UTC');

    -- The most recently completed local day for this group.
    target := ((p_now at time zone tz)::date) - 1;
    group_start := (g.created_at at time zone tz)::date;

    -- Nothing to judge before the group existed, and never re-judge a day.
    if target < group_start
       or exists (select 1 from public.group_streaks s
                   where s.group_id = g.id and s.date = target) then
      continue;
    end if;

    everyone_ok := true;

    for m in
      select gm.user_id, u.streak_freezes_remaining, u.streak_freeze_week
        from public.group_members gm
        join public.users u on u.id = gm.user_id
       where gm.group_id = g.id
         and (gm.joined_at at time zone tz)::date <= target
    loop
      -- "Showing up" is any session that day, with no minimum duration
      -- (docs/04). The goal minutes are a target, not a gate on the streak.
      if exists (
        select 1 from public.study_sessions s
         where s.user_id = m.user_id
           and (s.started_at at time zone tz)::date = target
      ) then
        continue;
      end if;

      -- Missed. Spend a freeze if one is available this calendar week.
      week_start := date_trunc('week', target::timestamp)::date; -- Monday
      freezes := m.streak_freezes_remaining;
      last_week := m.streak_freeze_week;

      if last_week is distinct from week_start then
        freezes := 1; -- weekly reset, Monday (docs/04)
      end if;

      covered := freezes > 0;

      update public.users
         set streak_freezes_remaining = case when covered then freezes - 1 else freezes end,
             streak_freeze_week = week_start
       where id = m.user_id;

      if not covered then
        everyone_ok := false;
      end if;
    end loop;

    insert into public.group_streaks (group_id, date, hit_goal)
    values (g.id, target, everyone_ok)
    on conflict (group_id, date) do update set hit_goal = excluded.hit_goal;

    evaluated := evaluated + 1;

    -- Refresh each member's personal streak: consecutive local days with a
    -- session, counting back from the day just evaluated.
    for m in select gm.user_id from public.group_members gm where gm.group_id = g.id loop
      streak := 0;
      expected := target;

      for d in
        select distinct (s.started_at at time zone tz)::date as day
          from public.study_sessions s
         where s.user_id = m.user_id
           and (s.started_at at time zone tz)::date <= target
         order by day desc
      loop
        exit when d <> expected;
        streak := streak + 1;
        expected := expected - 1;
      end loop;

      update public.users set current_streak = streak where id = m.user_id;
    end loop;
  end loop;

  return evaluated;
end;
$$;

revoke all on function public.evaluate_group_streaks(timestamptz) from public, anon, authenticated;

-- Schedule: hourly, on the hour.
create extension if not exists pg_cron;

select cron.schedule(
  'evaluate-group-streaks',
  '0 * * * *',
  $$select public.evaluate_group_streaks();$$
);
