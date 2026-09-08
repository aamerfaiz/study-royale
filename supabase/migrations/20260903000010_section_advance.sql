-- Section gating and group advancement (docs/05, docs/10 step 7).
--
-- A member clears a section when every required, non-quiz node is done for them
-- AND — if the section has a quiz — they have passed it. Optional nodes never
-- block. Sections with no quiz row skip the quiz half of the check, which is
-- what lets Orientation and Portfolio Projects clear at all.
--
-- The group advances when every *current* member has cleared the current
-- section. Members who left are simply not counted, which is the v1 answer to
-- the open question in docs/10 about mid-roadmap departures: their progress
-- rows stay as a historical record but stop gating the group.

create or replace function public.member_cleared_section(
  p_group_roadmap_id uuid,
  p_section_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- every required node done
    not exists (
      select 1
        from public.roadmap_nodes n
       where n.section_id = p_section_id
         and not n.is_optional
         and n.requirement_type <> 'quiz'
         and not exists (
           select 1 from public.member_node_progress p
            where p.group_roadmap_id = p_group_roadmap_id
              and p.roadmap_node_id = n.id
              and p.user_id = p_user_id
              and p.status = 'done'
         )
    )
    -- and the section quiz passed, when there is one
    and not exists (
      select 1
        from public.section_quizzes q
       where q.section_id = p_section_id
         and not exists (
           select 1 from public.quiz_attempts a
            where a.quiz_id = q.id
              and a.user_id = p_user_id
              and a.passed
         )
    );
$$;

-- Advance the group if everyone has cleared the current section. Returns the
-- section index the group sits on afterwards.
create or replace function public.advance_group_section(p_group_roadmap_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  gr record;
  section_id uuid;
  section_count integer;
  everyone_cleared boolean;
begin
  select gr2.id, gr2.group_id, gr2.roadmap_id, gr2.current_section_index
    into gr
    from public.group_roadmaps gr2
   where gr2.id = p_group_roadmap_id;

  if gr.id is null then
    raise exception 'Unknown group roadmap' using errcode = 'no_data_found';
  end if;

  select count(*) into section_count
    from public.roadmap_sections s where s.roadmap_id = gr.roadmap_id;

  -- Walk forward: clearing one section can unlock the next immediately if the
  -- group had already done its work (e.g. a section with no required nodes).
  loop
    select s.id into section_id
      from public.roadmap_sections s
     where s.roadmap_id = gr.roadmap_id
       and s.order_index = gr.current_section_index;

    exit when section_id is null;

    select bool_and(public.member_cleared_section(gr.id, section_id, gm.user_id))
      into everyone_cleared
      from public.group_members gm
     where gm.group_id = gr.group_id;

    exit when not coalesce(everyone_cleared, false);
    exit when gr.current_section_index >= section_count - 1;

    gr.current_section_index := gr.current_section_index + 1;

    update public.group_roadmaps
       set current_section_index = gr.current_section_index
     where id = gr.id;
  end loop;

  return gr.current_section_index;
end;
$$;

-- Mark a node done for the caller, then re-check group advancement.
create or replace function public.complete_node(
  p_group_roadmap_id uuid,
  p_roadmap_node_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.can_access_group_roadmap(p_group_roadmap_id) then
    raise exception 'Not a member of that group' using errcode = '42501';
  end if;

  -- The node must belong to the roadmap this group is actually doing.
  if not exists (
    select 1
      from public.group_roadmaps gr
      join public.roadmap_sections s on s.roadmap_id = gr.roadmap_id
      join public.roadmap_nodes n on n.section_id = s.id
     where gr.id = p_group_roadmap_id and n.id = p_roadmap_node_id
  ) then
    raise exception 'That node is not part of this roadmap' using errcode = '42501';
  end if;

  insert into public.member_node_progress (group_roadmap_id, roadmap_node_id, user_id, status, completed_at)
  values (p_group_roadmap_id, p_roadmap_node_id, uid, 'done', now())
  on conflict (group_roadmap_id, roadmap_node_id, user_id) do update
    set status = 'done', completed_at = coalesce(public.member_node_progress.completed_at, now());

  return public.advance_group_section(p_group_roadmap_id);
end;
$$;

-- Start a course for a group. Owner-only, mirroring the RLS insert policy.
create or replace function public.start_course(p_group_id uuid, p_roadmap_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not public.is_group_owner(p_group_id) then
    raise exception 'Only the group owner can start a course' using errcode = '42501';
  end if;
  if not public.roadmap_is_readable(p_roadmap_id) then
    raise exception 'Unknown course' using errcode = 'no_data_found';
  end if;

  insert into public.group_roadmaps (group_id, roadmap_id)
  values (p_group_id, p_roadmap_id)
  on conflict (group_id, roadmap_id) do update set group_id = excluded.group_id
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.member_cleared_section(uuid, uuid, uuid) from public, anon;
revoke all on function public.advance_group_section(uuid) from public, anon, authenticated;
revoke all on function public.complete_node(uuid, uuid) from public, anon;
revoke all on function public.start_course(uuid, uuid) from public, anon;
grant execute on function public.member_cleared_section(uuid, uuid, uuid) to authenticated;
grant execute on function public.complete_node(uuid, uuid) to authenticated;
grant execute on function public.start_course(uuid, uuid) to authenticated;
