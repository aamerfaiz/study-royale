-- Study Royale — function hardening (Supabase security advisor findings)
--
-- 1. Postgres grants EXECUTE on new functions to PUBLIC by default, so every
--    security-definer RPC above was reachable by the anon role. Revoke, then
--    grant back only to `authenticated`.
-- 2. Pure helpers were missing an explicit search_path.
--
-- Note: quiz_questions intentionally has RLS on with no policy (the advisor
-- reports this as INFO). That is the mechanism keeping correct_option_index
-- away from clients — reads go through get_quiz_questions()/submit_quiz_attempt().

alter function public.session_xp(integer) set search_path = public;
alter function public.level_for_xp(integer) set search_path = public;

-- Trigger functions: never callable over the REST API by anyone.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_group_capacity() from public, anon, authenticated;
revoke all on function public.sync_group_type() from public, anon, authenticated;

-- Internal helpers: called by security-definer RPCs, never by a client.
revoke all on function public.refresh_user_xp(uuid) from public, anon, authenticated;
revoke all on function public.config_value(text) from public, anon, authenticated;
revoke all on function public.group_local_date(uuid, timestamptz) from public, anon, authenticated;

-- RLS predicate helpers: `authenticated` must keep EXECUTE because policy
-- expressions are evaluated as the calling role. anon never needs them.
revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_owner(uuid) from public, anon;
revoke all on function public.shares_group_with(uuid) from public, anon;
revoke all on function public.can_access_group_roadmap(uuid) from public, anon;
revoke all on function public.roadmap_is_readable(uuid) from public, anon;
revoke all on function public.section_is_readable(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
grant execute on function public.can_access_group_roadmap(uuid) to authenticated;
grant execute on function public.roadmap_is_readable(uuid) to authenticated;
grant execute on function public.section_is_readable(uuid) to authenticated;

-- Client-facing RPCs: signed-in users only.
revoke all on function public.create_group(text, integer, text) from public, anon;
revoke all on function public.join_group_by_invite(text) from public, anon;
revoke all on function public.preview_group_by_invite(text) from public, anon;
revoke all on function public.log_study_session(uuid, integer, text, uuid, timestamptz) from public, anon;
revoke all on function public.get_quiz_questions(uuid) from public, anon;
revoke all on function public.submit_quiz_attempt(uuid, uuid, jsonb) from public, anon;
grant execute on function public.create_group(text, integer, text) to authenticated;
grant execute on function public.join_group_by_invite(text) to authenticated;
grant execute on function public.preview_group_by_invite(text) to authenticated;
grant execute on function public.log_study_session(uuid, integer, text, uuid, timestamptz) to authenticated;
grant execute on function public.get_quiz_questions(uuid) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, uuid, jsonb) to authenticated;

-- Pure math helpers stay open to signed-in users (no data access).
revoke all on function public.session_xp(integer) from public, anon;
revoke all on function public.level_for_xp(integer) from public, anon;
grant execute on function public.session_xp(integer) to authenticated;
grant execute on function public.level_for_xp(integer) to authenticated;
