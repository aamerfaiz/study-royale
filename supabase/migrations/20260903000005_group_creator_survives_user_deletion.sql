-- groups.created_by had no ON DELETE action, so deleting a user was blocked by
-- any group they had created — the cascade from auth.users could never complete.
-- Found by the RLS smoke test in Phase 2.
--
-- Real ownership lives in group_members.role, so created_by is only provenance.
-- Null it out on deletion and leave the group standing for its other members
-- (same spirit as docs/10 on a member leaving mid-roadmap: keep the record,
-- stop counting them).
alter table public.groups
  alter column created_by drop not null;

alter table public.groups
  drop constraint groups_created_by_fkey,
  add constraint groups_created_by_fkey
    foreign key (created_by) references public.users(id) on delete set null;

-- Same problem on roadmaps.created_by: an authored course must outlive its author.
alter table public.roadmaps
  drop constraint roadmaps_created_by_fkey,
  add constraint roadmaps_created_by_fkey
    foreign key (created_by) references public.users(id) on delete set null;
