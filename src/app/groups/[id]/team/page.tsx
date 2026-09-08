import { requireGroup } from '@/lib/group-context';
import { createClient } from '@/lib/supabase/server';
import { leaveGroupAction, removeMemberAction } from '@/lib/actions/groups';
import { PageBody, PageHeader } from '@/components/page-header';
import { InviteCode } from '@/components/invite-code';
import { Avatar, Button, Card, Eyebrow, SectionTitle } from '@/components/ui';
import { startOfLocalDay } from '@/lib/dates';
import { AchievementGrid, type AchievementView } from '@/components/achievements';
import { GoalPicker } from './goal-picker';

const TYPE_LABEL: Record<string, string> = {
  solo: 'Studying solo',
  duo: 'Duo',
  trio: 'Trio',
  squad: 'Squad of four',
};

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { group, members, isOwner, userId } = await requireGroup(id);
  const supabase = await createClient();

  const dayStart = startOfLocalDay(new Date(), group.timezone);
  const [{ data: todaySessions }, { data: allAchievements }, { data: mine }] =
    await Promise.all([
      supabase
        .from('study_sessions')
        .select('user_id')
        .eq('group_id', id)
        .gte('started_at', dayStart.toISOString()),
      supabase.from('achievements').select('id, key, name, description, icon'),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
    ]);

  const earnedIds = new Set((mine ?? []).map((r) => r.achievement_id));
  const achievements: AchievementView[] = (allAchievements ?? []).map((a) => ({
    key: a.key,
    name: a.name,
    description: a.description,
    icon: a.icon,
    earned: earnedIds.has(a.id),
  }));

  const activeToday = new Set((todaySessions ?? []).map((s) => s.user_id));
  const formed = daysSince(group.created_at);
  const isFull = members.length >= group.max_members;

  return (
    <>
      <PageHeader eyebrow="Your group" title={group.name} />

      <PageBody>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <Card className="flex items-center gap-3.5">
              <div className="flex">
                {members.map((m) => (
                  <Avatar
                    key={m.user_id}
                    name={m.display_name}
                    src={m.avatar_url}
                    seed={m.user_id}
                    size={40}
                    ring="#ffffff"
                    className="-ml-2.5 first:ml-0"
                  />
                ))}
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold">
                  {TYPE_LABEL[group.type] ?? group.type}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {formed === 0 ? 'Formed today' : `Formed ${formed} days ago`}
                </p>
              </div>
            </Card>

            <Card>
              <Eyebrow className="mb-2">Invite code</Eyebrow>
              <InviteCode code={group.invite_code} full={isFull} />
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
                {isFull
                  ? 'Every seat is taken. Groups cap at four for now.'
                  : `Share this so a friend can join as member ${members.length + 1} of ${group.max_members}.`}
              </p>
            </Card>

            <Card>
              <Eyebrow className="mb-2.5">Daily goal</Eyebrow>
              <GoalPicker
                groupId={group.id}
                current={group.daily_goal_minutes}
                canEdit={isOwner}
              />
            </Card>
          </div>

          <div className="space-y-4">
            <div>
              <SectionTitle className="mb-2.5 text-ink-strong">Members</SectionTitle>
              <ul className="space-y-2">
                {members.map((m) => {
                  const here = activeToday.has(m.user_id);
                  return (
                    <li
                      key={m.user_id}
                      className="flex items-center gap-3 rounded-tile bg-surface p-3 shadow-card"
                    >
                      <Avatar
                        name={m.display_name}
                        src={m.avatar_url}
                        seed={m.user_id}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-bold">
                            {m.display_name}
                          </span>
                          {m.role === 'owner' && (
                            <span className="rounded-full bg-sunken px-2 py-0.5 text-[9.5px] font-bold text-ink-muted uppercase">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-ink-muted">
                          Level {m.level} · {m.total_xp.toLocaleString()} XP
                        </p>
                      </div>

                      <span
                        title={here ? 'Studied today' : 'Not yet today'}
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: here ? '#12B76A' : 'oklch(88% 0.01 80)' }}
                      />

                      {isOwner && m.user_id !== userId && (
                        <form action={removeMemberAction}>
                          <input type="hidden" name="group_id" value={group.id} />
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <Button type="submit" variant="danger" size="sm" className="px-2">
                            Remove
                          </Button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <AchievementGrid achievements={achievements} />

            <Card>
              <SectionTitle>Leave group</SectionTitle>
              <p className="mt-1 mb-3 text-[12.5px] leading-relaxed text-ink-muted">
                Your sessions and XP stay with you. Your roadmap progress is kept
                as a record, but you stop counting toward this group&apos;s phase
                gating.
              </p>
              <form action={leaveGroupAction}>
                <input type="hidden" name="group_id" value={group.id} />
                <Button type="submit" variant="danger" className="px-0">
                  Leave {group.name}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
