-- Streak evaluation: backfill every unevaluated day, not just yesterday.
--
-- The first version judged only `today - 1`. If the job ever missed a run
-- (downtime, a paused project, a deploy), that day never got a group_streaks
-- row — and since the streak counter walks rows by date, a missing day read as
-- if it had never happened, silently carrying a streak across days the group
-- actually missed. Now each run evaluates from the day after the last recorded
-- one up to the most recently completed local day, so a gap self-heals and the
-- job stays idempotent.
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
  day date;
  first_day date;
  everyone_ok boolean;
  covered boolean;
  week_start date;
  freezes integer;
  streak integer;
  expected date;
  d date;
  evaluated integer := 0;
begin
  for g in select id, timezone, created_at from public.groups loop
    tz := coalesce(g.timezone, 'UTC');

    -- The most recently completed local day for this group.
    target := ((p_now at time zone tz)::date) - 1;

    -- Resume after the last day already on record, else from the group's
    -- first local day. Capped so a long-dormant group can't spin forever.
    first_day := coalesce(
      (select max(s.date) + 1 from public.group_streaks s where s.group_id = g.id),
      (g.created_at at time zone tz)::date
    );
    first_day := greatest(first_day, target - 365);

    day := first_day;
    while day <= target loop
      everyone_ok := true;

      for m in
        select gm.user_id, u.streak_freezes_remaining, u.streak_freeze_week
          from public.group_members gm
          join public.users u on u.id = gm.user_id
         where gm.group_id = g.id
           and (gm.joined_at at time zone tz)::date <= day
      loop
        -- "Showing up" is any session that day, with no minimum duration
        -- (docs/04). The goal minutes are a target, not a gate on the streak.
        if exists (
          select 1 from public.study_sessions s
           where s.user_id = m.user_id
             and (s.started_at at time zone tz)::date = day
        ) then
          continue;
        end if;

        -- Missed. Spend a freeze if one is available this calendar week.
        week_start := date_trunc('week', day::timestamp)::date; -- Monday
        freezes := m.streak_freezes_remaining;

        if m.streak_freeze_week is distinct from week_start then
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
      values (g.id, day, everyone_ok)
      on conflict (group_id, date) do update set hit_goal = excluded.hit_goal;

      evaluated := evaluated + 1;
      day := day + 1;
    end loop;

    -- Refresh each member's personal streak: consecutive local days with a
    -- session, counting back from the most recently completed day.
    for m in select gm.user_id from public.group_members gm where gm.group_id = g.id loop
      streak := 0;
      expected := target;

      for d in
        select distinct (s.started_at at time zone tz)::date as sday
          from public.study_sessions s
         where s.user_id = m.user_id
           and (s.started_at at time zone tz)::date <= target
         order by sday desc
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
