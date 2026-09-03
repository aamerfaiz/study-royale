import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { InviteCode } from '@/components/invite-code';
import { SessionLogger } from '@/components/session-logger';
import { Avatar, Card } from '@/components/ui';
import { levelProgress } from '@/lib/gamification';
import { relativeTime, startOfLocalDay } from '@/lib/dates';

const GROUP_TYPE_LABEL: Record<string, string> = {
  solo: 'Solo',
  duo: 'Duo',
  trio: 'Trio',
  squad: 'Squad',
};

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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
    .select('id, name, type, max_members, daily_goal_minutes, timezone, invite_code')
    .eq('id', id)
    .maybeSingle();

  if (!group) notFound();

  const dayStart = startOfLocalDay(new Date(), group.timezone);

  const [{ data: members }, { data: todaySessions }, { data: recent }] =
    await Promise.all([
      supabase
        .from('group_members')
        .select(
          'user_id, role, joined_at, users(id, display_name, avatar_url, total_xp, level, current_streak)',
        )
        .eq('group_id', id)
        .order('joined_at', { ascending: true }),
      supabase
        .from('study_sessions')
        .select('user_id, duration_minutes')
        .eq('group_id', id)
        .gte('started_at', dayStart.toISOString()),
      supabase
        .from('study_sessions')
        .select('id, user_id, duration_minutes, subject, started_at')
        .eq('group_id', id)
        .order('started_at', { ascending: false })
        .limit(8),
    ]);

  const me = members?.find((m) => m.user_id === user.id);
  const myProfile = one<Profile>(me?.users ?? null);
  const isOwner = me?.role === 'owner';
  const memberCount = members?.length ?? 0;
  const progress = levelProgress(myProfile?.total_xp ?? 0);

  // "Showed up today" is any session at all — the streak rule doesn't set a
  // minimum duration (docs/04). The goal minutes are a target, not a gate.
  const minutesToday = new Map<string, number>();
  for (const s of todaySessions ?? []) {
    minutesToday.set(s.user_id, (minutesToday.get(s.user_id) ?? 0) + s.duration_minutes);
  }
  const showedUpCount = (members ?? []).filter((m) => minutesToday.has(m.user_id)).length;
  const nameById = new Map(
    (members ?? []).map((m) => [m.user_id, one<Profile>(m.users)?.display_name ?? 'Someone']),
  );

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
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{group.name}</h1>
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

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold">Today</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {showedUpCount} of {memberCount} showed up
                </p>
              </div>

              <ul className="mt-4 space-y-3">
                {members?.map((m) => {
                  const profile = one<Profile>(m.users);
                  if (!profile) return null;
                  const mins = minutesToday.get(m.user_id) ?? 0;
                  const hitGoal = mins >= group.daily_goal_minutes;
                  const pct = Math.min((mins / group.daily_goal_minutes) * 100, 100);

                  return (
                    <li key={m.user_id} className="flex items-center gap-3">
                      <Avatar src={profile.avatar_url} name={profile.display_name} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {profile.display_name}
                            {m.user_id === user.id && (
                              <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                                you
                              </span>
                            )}
                          </p>
                          <p
                            className={
                              mins > 0
                                ? 'text-xs tabular-nums text-slate-600 dark:text-slate-400'
                                : 'text-xs text-amber-600 dark:text-amber-500'
                            }
                          >
                            {mins > 0 ? `${mins} min` : 'not yet'}
                          </p>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={
                              hitGoal
                                ? 'h-full rounded-full bg-emerald-500'
                                : 'h-full rounded-full bg-indigo-500'
                            }
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {showedUpCount < memberCount && (
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Everyone has to log something today or the group streak is at
                  risk.
                </p>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">Recent activity</h2>
              {recent && recent.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {recent.map((s) => (
                    <li key={s.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{nameById.get(s.user_id)}</span>{' '}
                        <span className="text-slate-600 dark:text-slate-400">
                          logged {s.duration_minutes} min
                          {s.subject ? ` · ${s.subject}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {relativeTime(s.started_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  Nothing logged yet. Be the one who starts it.
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <SessionLogger groupId={group.id} />

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

            {memberCount < group.max_members && (
              <Card>
                <h2 className="text-lg font-semibold">Invite someone</h2>
                <p className="mb-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
                  A group of two is far harder to skip than studying alone.
                </p>
                <InviteCode code={group.invite_code} full={false} />
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
