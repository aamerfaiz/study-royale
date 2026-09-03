import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireGroup } from '@/lib/group-context';
import { PageBody } from '@/components/page-header';
import { StudyLauncher } from '@/components/study-launcher';
import { StreakTile, LevelTile } from '@/components/stats';
import { Avatar, Card, Meter, SectionTitle } from '@/components/ui';
import { relativeTime, startOfLocalDay } from '@/lib/dates';

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { group, members, me, userId } = await requireGroup(id);
  const supabase = await createClient();

  const dayStart = startOfLocalDay(new Date(), group.timezone);

  const [{ data: todaySessions }, { data: recent }, { data: streakRows }, { data: groupRoadmap }] =
    await Promise.all([
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
        .limit(6),
      supabase
        .from('group_streaks')
        .select('date, hit_goal')
        .eq('group_id', id)
        .order('date', { ascending: false })
        .limit(400),
      supabase
        .from('group_roadmaps')
        .select('id, current_section_index, roadmaps(title)')
        .eq('group_id', id)
        .maybeSingle(),
    ]);

  const minutesToday = new Map<string, number>();
  for (const s of todaySessions ?? []) {
    minutesToday.set(s.user_id, (minutesToday.get(s.user_id) ?? 0) + s.duration_minutes);
  }

  // Consecutive hit days ending at the most recent evaluated day.
  let streak = 0;
  for (const row of streakRows ?? []) {
    if (!row.hit_goal) break;
    streak++;
  }

  const myMinutes = minutesToday.get(userId) ?? 0;
  const goal = group.daily_goal_minutes;
  const goalMet = myMinutes >= goal;
  const showedUp = members.filter((m) => minutesToday.has(m.user_id)).length;
  const nameById = new Map(members.map((m) => [m.user_id, m.display_name]));

  const course = Array.isArray(groupRoadmap?.roadmaps)
    ? groupRoadmap?.roadmaps[0]
    : groupRoadmap?.roadmaps;

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-5 pt-6 sm:px-6">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold tracking-[0.02em] text-ink-muted uppercase">
            {group.name}
          </p>
          <h1 className="font-display mt-0.5 truncate text-[22px] font-semibold">
            Hey {me.display_name.split(' ')[0]} 👋
          </h1>
        </div>
        <div className="flex shrink-0 pl-2">
          {members.map((m) => (
            <Avatar
              key={m.user_id}
              name={m.display_name}
              src={m.avatar_url}
              seed={m.user_id}
              size={34}
              ring={minutesToday.has(m.user_id) ? '#12B76A' : '#ffffff'}
              className="-ml-2"
            />
          ))}
        </div>
      </header>

      <PageBody>
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 gap-2.5">
              <StreakTile days={streak} freezes={me.streak_freezes_remaining} />
              <LevelTile totalXp={me.total_xp} />
            </div>

            <Card>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <SectionTitle>Today&apos;s goal</SectionTitle>
                {goalMet ? (
                  <span className="rounded-full bg-success-tint px-2.5 py-1 text-[11px] font-bold text-success-ink">
                    Done ✓
                  </span>
                ) : (
                  <span className="rounded-full bg-sunken px-2.5 py-1 text-[11px] font-bold text-ink-muted">
                    {goal - myMinutes} min left
                  </span>
                )}
              </div>
              <Meter value={myMinutes / goal} height={10} />
              <p className="mt-2.5 text-[12px] text-ink-muted">
                {myMinutes} of {goal} minutes studied today
              </p>
              <StudyLauncher
                groupId={group.id}
                className="mt-3 w-full"
                label={goalMet ? 'Log another session' : 'Start studying'}
              />
            </Card>

            {groupRoadmap && course && (
              <Link href={`/groups/${group.id}/roadmap`} className="block">
                <div className="rounded-card bg-night p-4 text-white transition hover:opacity-95 sm:p-5">
                  <p className="text-[11px] font-bold tracking-[0.03em] text-night-eyebrow uppercase">
                    Continue · Phase {groupRoadmap.current_section_index + 1}
                  </p>
                  <p className="font-display mt-1 text-[16px] font-semibold">
                    {course.title}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-[12px] text-night-ink">
                      Pick up where the squad is
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </div>
                </div>
              </Link>
            )}

            <div>
              <SectionTitle className="mb-2.5 text-ink-strong">
                Group activity
              </SectionTitle>
              {recent && recent.length > 0 ? (
                <ul className="space-y-2.5">
                  {recent.map((s) => (
                    <li key={s.id} className="flex items-start gap-2.5">
                      <Avatar
                        name={nameById.get(s.user_id) ?? '?'}
                        seed={s.user_id}
                        size={28}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-ink-strong">
                          <span className="font-semibold">
                            {nameById.get(s.user_id)}
                          </span>{' '}
                          logged {s.duration_minutes} min
                          {s.subject ? ` · ${s.subject}` : ''}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-faint">
                          {relativeTime(s.started_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Card>
                  <p className="text-[13px] text-ink-muted">
                    Nothing logged yet. Be the one who starts it.
                  </p>
                </Card>
              )}
            </div>
          </div>

          <Card className="lg:sticky lg:top-6">
            <div className="flex items-baseline justify-between gap-3">
              <SectionTitle>Today</SectionTitle>
              <span className="text-[12px] text-ink-muted">
                {showedUp} of {members.length} showed up
              </span>
            </div>

            <ul className="mt-3.5 space-y-3">
              {members.map((m) => {
                const mins = minutesToday.get(m.user_id) ?? 0;
                return (
                  <li key={m.user_id} className="flex items-center gap-2.5">
                    <Avatar
                      name={m.display_name}
                      src={m.avatar_url}
                      seed={m.user_id}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[13px] font-semibold">
                          {m.display_name}
                          {m.user_id === userId && (
                            <span className="ml-1.5 text-[11px] font-normal text-ink-faint">
                              you
                            </span>
                          )}
                        </p>
                        <p
                          className={
                            mins > 0
                              ? 'text-[11.5px] tabular-nums text-ink-muted'
                              : 'text-[11.5px] font-semibold text-gold-ink'
                          }
                        >
                          {mins > 0 ? `${mins} min` : 'not yet'}
                        </p>
                      </div>
                      <Meter
                        value={mins / goal}
                        height={6}
                        className="mt-1.5"
                        barClassName={mins >= goal ? 'bg-success' : undefined}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {showedUp < members.length && (
              <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">
                Everyone has to log something today or the group streak is at risk.
              </p>
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}
