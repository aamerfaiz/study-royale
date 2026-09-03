-- Achievements (docs/03, docs/10 step 10).
--
-- Milestone unlocks, evaluated after the events that could earn them rather
-- than on a schedule, so a badge appears in the same response that earned it.
--
-- docs/03 leaves open whether achievements grant bonus XP or are purely
-- status. They are status-only here: the XP curve is deliberately tuned for
-- consistency, and a lump of milestone XP would distort it. Adding a reward
-- later is a matter of inserting an xp_event alongside the unlock — the
-- 'achievement' reason is already allowed by the xp_events check constraint.

insert into public.achievements (key, name, description, icon) values
  ('first_session',     'First step',        'Logged your first study session',        '🌱'),
  ('streak_7',          'Week one',          'Held a 7-day personal streak',           '🔥'),
  ('streak_30',         'Month strong',      'Held a 30-day personal streak',          '⚡'),
  ('hours_10',          '10 hours in',       'Studied for 10 hours in total',          '📘'),
  ('hours_50',          '50 hours in',       'Studied for 50 hours in total',          '📚'),
  ('level_5',           'Level 5',           'Reached level 5',                        '⭐'),
  ('level_10',          'Level 10',          'Reached level 10',                       '🌟'),
  ('first_quiz',        'Checked out',       'Passed your first phase quiz',           '✅'),
  ('quiz_perfect',      'Flawless',          'Scored 100% on a phase quiz',            '🎯'),
  ('phase_cleared',     'Phase cleared',     'Cleared a full phase of a course',       '🏁'),
  ('course_complete',   'Course complete',   'Cleared every phase of a course',        '🏆'),
  ('team_player',       'Team player',       'Joined a group with someone else',       '🤝')
on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      icon = excluded.icon;

-- Evaluate every unlock condition for one user and grant what's newly earned.
-- Returns the keys granted by this call, so the UI can celebrate only the new
-- ones rather than re-announcing a badge on every page load.
create or replace function public.evaluate_achievements(p_user_id uuid default auth.uid())
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := coalesce(p_user_id, auth.uid());
  earned text[] := '{}';
  total_minutes integer;
  user_level integer;
  user_streak integer;
begin
  if uid is null then
    return earned;
  end if;

  select coalesce(sum(duration_minutes), 0) into total_minutes
    from public.study_sessions where user_id = uid;

  select level, current_streak into user_level, user_streak
    from public.users where id = uid;

  with candidates as (
    select k from unnest(array[
      case when exists (select 1 from public.study_sessions where user_id = uid)
           then 'first_session' end,
      case when user_streak >= 7  then 'streak_7'  end,
      case when user_streak >= 30 then 'streak_30' end,
      case when total_minutes >= 600  then 'hours_10' end,
      case when total_minutes >= 3000 then 'hours_50' end,
      case when user_level >= 5  then 'level_5'  end,
      case when user_level >= 10 then 'level_10' end,
      case when exists (select 1 from public.quiz_attempts where user_id = uid and passed)
           then 'first_quiz' end,
      case when exists (select 1 from public.quiz_attempts where user_id = uid and score_pct = 100)
           then 'quiz_perfect' end,
      case when exists (
             select 1
               from public.group_members gm
               join public.group_roadmaps gr on gr.group_id = gm.group_id
               join public.roadmap_sections s on s.roadmap_id = gr.roadmap_id
              where gm.user_id = uid
                and public.member_cleared_section(gr.id, s.id, uid)
           ) then 'phase_cleared' end,
      case when exists (
             select 1
               from public.group_members gm
               join public.group_roadmaps gr on gr.group_id = gm.group_id
              where gm.user_id = uid
                and not exists (
                  select 1 from public.roadmap_sections s
                   where s.roadmap_id = gr.roadmap_id
                     and not public.member_cleared_section(gr.id, s.id, uid)
                )
           ) then 'course_complete' end,
      case when exists (
             select 1 from public.group_members mine
              join public.group_members theirs on theirs.group_id = mine.group_id
             where mine.user_id = uid and theirs.user_id <> uid
           ) then 'team_player' end
    ]) as k
    where k is not null
  ),
  inserted as (
    insert into public.user_achievements (user_id, achievement_id)
    select uid, a.id
      from public.achievements a
      join candidates c on c.k = a.key
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id
  )
  select coalesce(array_agg(a.key), '{}')
    into earned
    from inserted i
    join public.achievements a on a.id = i.achievement_id;

  return earned;
end;
$$;

revoke all on function public.evaluate_achievements(uuid) from public, anon;
grant execute on function public.evaluate_achievements(uuid) to authenticated;
