-- Idempotent course seeding.
--
-- Takes one section of the Course Export Schema as jsonb and upserts it, so
-- re-seeding an edited course updates in place instead of duplicating. Nodes
-- are keyed by (section, order_index) and quizzes by section, matching the
-- natural keys the export format already uses.
--
-- security definer because course content is written past RLS: the tables are
-- read-only to clients by design, and only this function (called by an
-- operator, never by the app) writes them.
create or replace function public.seed_course_section(
  p_roadmap jsonb,
  p_section jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  sid uuid;
  qid uuid;
  node jsonb;
  question jsonb;
  idx integer := 0;
begin
  -- Roadmap, keyed by slug so re-runs update rather than duplicate.
  insert into public.roadmaps (title, subject, description, source_type, visibility, is_template, slug)
  values (
    p_roadmap ->> 'title',
    p_roadmap ->> 'subject',
    p_roadmap ->> 'description',
    'official',
    'public',
    true,
    p_roadmap ->> 'slug'
  )
  on conflict (slug) do update
    set title = excluded.title,
        subject = excluded.subject,
        description = excluded.description
  returning id into rid;

  insert into public.roadmap_sections (roadmap_id, order_index, title)
  values (rid, (p_section ->> 'order')::integer, p_section ->> 'title')
  on conflict (roadmap_id, order_index) do update set title = excluded.title
  returning id into sid;

  for node in select * from jsonb_array_elements(p_section -> 'nodes') loop
    insert into public.roadmap_nodes (
      section_id, order_index, title, description, resource_url, content,
      is_optional, requirement_type, requirement_value
    )
    values (
      sid, idx,
      node ->> 'title',
      node ->> 'description',
      node ->> 'resource_url',
      node ->> 'content',
      coalesce((node ->> 'is_optional')::boolean, false),
      node ->> 'requirement_type',
      (node ->> 'requirement_value')::integer
    )
    on conflict (section_id, order_index) do update
      set title = excluded.title,
          description = excluded.description,
          resource_url = excluded.resource_url,
          content = excluded.content,
          is_optional = excluded.is_optional,
          requirement_type = excluded.requirement_type,
          requirement_value = excluded.requirement_value;
    idx := idx + 1;
  end loop;

  -- Drop any nodes left over from a shorter previous version of this section.
  delete from public.roadmap_nodes n where n.section_id = sid and n.order_index >= idx;

  if p_section -> 'quiz' is not null and jsonb_typeof(p_section -> 'quiz') = 'object' then
    insert into public.section_quizzes (section_id, title, passing_score_pct)
    values (
      sid,
      p_section -> 'quiz' ->> 'title',
      coalesce((p_section -> 'quiz' ->> 'passing_score_pct')::integer, 70)
    )
    on conflict (section_id) do update
      set title = excluded.title,
          passing_score_pct = excluded.passing_score_pct
    returning id into qid;

    idx := 0;
    for question in select * from jsonb_array_elements(p_section -> 'quiz' -> 'questions') loop
      insert into public.quiz_questions (
        quiz_id, order_index, question_text, options, correct_option_index, explanation
      )
      values (
        qid, idx,
        question ->> 'question_text',
        question -> 'options',
        (question ->> 'correct_option_index')::integer,
        question ->> 'explanation'
      )
      on conflict (quiz_id, order_index) do update
        set question_text = excluded.question_text,
            options = excluded.options,
            correct_option_index = excluded.correct_option_index,
            explanation = excluded.explanation;
      idx := idx + 1;
    end loop;

    delete from public.quiz_questions q where q.quiz_id = qid and q.order_index >= idx;
  end if;

  return rid;
end;
$$;

revoke all on function public.seed_course_section(jsonb, jsonb) from public, anon, authenticated;
