import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { InviteCode } from '@/components/invite-code';
import { Avatar, Card } from '@/components/ui';
import { levelProgress } from '@/lib/gamification';

const GROUP_TYPE_LABEL: Record<string, string> = {
  solo: 'Solo',
  duo: 'Duo',
  trio: 'Trio',
  squad: 'Squad',
};

export default async function GroupPage({
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

  // RLS returns nothing here unless the viewer is a member of this group.
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, type, max_members, daily_goal_minutes, timezone, invite_code, created_by')
    .eq('id', id)
    .maybeSingle();

  if (!group) notFound();

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, users(id, display_name, avatar_url, total_xp, level, current_streak)')
    .eq('group_id', id)
    .order('joined_at', { ascending: true });

  const me = members?.find((m) => m.user_id === user.id);
  const myProfile = Array.isArray(me?.users) ? me?.users[0] : me?.users;
  const isOwner = me?.role === 'owner';
  const memberCount = members?.length ?? 0;
  const progress = levelProgress(myProfile?.total_xp ?? 0);

  return (
    <>
      <AppHeader
        displayName={myProfile?.display_name ?? 'You'}
        avatarUrl={myProfile?.avatar_url ?? null}
        level={myProfile?.level ?? 0}
        totalXp={myProfile?.total_xp ?? 0}
      />

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {GROUP_TYPE_LABEL[group.type] ?? group.type} · {memberCount} of{' '}
              {group.max_members}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {group.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Shared goal: {group.daily_goal_minutes} min a day · day resets at
              midnight {group.timezone}
            </p>
          </div>

          {isOwner && (
            <Link
              href={`/groups/${group.id}/settings`}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Group settings
            </Link>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold">Members</h2>
            <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {members?.map((m) => {
                const profile = Array.isArray(m.users) ? m.users[0] : m.users;
                if (!profile) return null;
                return (
                  <li key={m.user_id} className="flex items-center gap-4 py-3.5">
                    <Avatar src={profile.avatar_url} name={profile.display_name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {profile.display_name}
                        {m.user_id === user.id && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                            you
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Level {profile.level} · {profile.total_xp.toLocaleString()} XP
                        {profile.current_streak > 0 &&
                          ` · ${profile.current_streak} day streak`}
                      </p>
                    </div>
                    {m.role === 'owner' && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Owner
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {memberCount < group.max_members && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60">
                <p className="text-sm font-medium">Invite someone</p>
                <p className="mb-3 mt-1 text-xs text-slate-600 dark:text-slate-400">
                  A group of two is far harder to skip than studying alone.
                </p>
                <InviteCode code={group.invite_code} full={false} />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">Your progress</h2>
            <p className="mt-4 text-3xl font-semibold tabular-nums">
              Level {progress.level}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${Math.min(progress.fraction * 100, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {progress.xpToNext.toLocaleString()} XP to level {progress.level + 1}
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
