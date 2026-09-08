-- A group whose last member leaves is unreachable forever: every RLS policy on
-- it keys off membership, so nobody can read or delete it again. Reap it as
-- part of the same trigger that keeps groups.type in sync with headcount.
create or replace function public.sync_group_type()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  gid uuid := coalesce(new.group_id, old.group_id);
  n integer;
begin
  select count(*) into n from public.group_members where group_id = gid;

  if n = 0 then
    delete from public.groups where id = gid;
    return null;
  end if;

  update public.groups
     set type = case when n = 1 then 'solo' when n = 2 then 'duo' when n = 3 then 'trio' else 'squad' end
   where id = gid;
  return null;
end;
$$;

revoke all on function public.sync_group_type() from public, anon, authenticated;

delete from public.groups g
 where not exists (select 1 from public.group_members m where m.group_id = g.id);
