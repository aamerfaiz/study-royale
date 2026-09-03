import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { leaveGroupAction, removeMemberAction } from '@/lib/actions/groups';
import { Avatar, Button, Card } from '@/components/ui';
import { InviteCode } from '@/components/invite-code';
import { SettingsForm } from './settings-form';

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, daily_goal_minutes, timezone, invite_code, max_members')
    .eq('id', id)
    .maybeSingle();
  if (!group) notFound();

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, role, users(display_name, avatar_url)')
    .eq('group_id', id)
    .order('joined_at', { ascending: true });

  const isOwner = members?.find((m) => m.user_id === user.id)?.role === 'owner';
  const memberCount = members?.length ?? 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href={`/groups/${id}`}
        className="text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        ← Back to {group.name}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Group settings</h1>

      {isOwner ? (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold">Details</h2>
          <SettingsForm
            groupId={group.id}
            name={group.name}
            dailyGoalMinutes={group.daily_goal_minutes}
            timezone={group.timezone}
          />
        </Card>
      ) : (
        <Card className="mt-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Only the group owner can change the name, goal, or timezone.
          </p>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Invite code</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
          {memberCount} of {group.max_members} seats taken.
        </p>
        <InviteCode code={group.invite_code} full={memberCount >= group.max_members} />
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Members</h2>
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {members?.map((m) => {
            const profile = Array.isArray(m.users) ? m.users[0] : m.users;
            if (!profile) return null;
            const isSelf = m.user_id === user.id;
            return (
              <li key={m.user_id} className="flex items-center gap-3 py-3">
                <Avatar src={profile.avatar_url} name={profile.display_name} size={32} />
                <span className="flex-1 truncate text-sm">
                  {profile.display_name}
                  {isSelf && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      you
                    </span>
                  )}
                </span>
                {isOwner && !isSelf && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="group_id" value={group.id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <Button type="submit" variant="danger" className="px-3 py-1.5">
                      Remove
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Leave group</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
          Your logged sessions and XP stay with you. Your roadmap progress is
          kept as a record, but you&apos;ll stop counting toward this group&apos;s
          section gating.
        </p>
        <form action={leaveGroupAction}>
          <input type="hidden" name="group_id" value={group.id} />
          <Button type="submit" variant="danger" className="px-0">
            Leave {group.name}
          </Button>
        </form>
      </Card>
    </main>
  );
}
