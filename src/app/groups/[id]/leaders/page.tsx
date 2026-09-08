import Link from 'next/link';
import { requireGroup } from '@/lib/group-context';
import { loadRoadmap } from '@/lib/roadmap';
import { createClient } from '@/lib/supabase/server';
import { PageBody, PageHeader } from '@/components/page-header';
import { Avatar, Card, Meter } from '@/components/ui';

type LeaderRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  minutes: number;
};

function CrownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#F5A524">
      <path d="M3 8l4 4 5-7 5 7 4-4-2 10H5z" />
    </svg>
  );
}

export default async function LeadersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const { id } = await params;
  const { phase } = await searchParams;
  const { group, userId } = await requireGroup(id);
  const roadmap = await loadRoadmap(id, userId);

  if (!roadmap) {
    return (
      <>
        <PageHeader eyebrow={group.name} title="Phase leaderboard" />
        <PageBody>
          <Card>
            <p className="text-[13.5px] text-ink-muted">
              Leaderboards rank the XP earned inside each phase of a course.
              Start one to see it fill in.
            </p>
            <Link
              href={`/groups/${id}/courses`}
              className="font-display mt-4 inline-flex rounded-control bg-accent px-4 py-3 text-[14px] font-bold text-white transition hover:bg-accent-hover"
            >
              Browse courses
            </Link>
          </Card>
        </PageBody>
      </>
    );
  }

  const selectedIndex = phase !== undefined ? Number(phase) : roadmap.currentSectionIndex;
  const section =
    roadmap.sections.find((s) => s.order_index === selectedIndex) ??
    roadmap.sections[roadmap.currentSectionIndex];

  const supabase = await createClient();
  const { data } = await supabase.rpc('phase_leaderboard', {
    p_group_id: id,
    p_section_id: section.id,
  });

  const rows = (data ?? []) as LeaderRow[];
  const topXp = Math.max(...rows.map((r) => r.xp), 1);
  const anyXp = rows.some((r) => r.xp > 0);

  return (
    <>
      <PageHeader eyebrow={group.name} title="Phase leaderboard" />

      <PageBody>
        <div className="mx-auto max-w-2xl lg:max-w-3xl">
          <div className="scrollarea -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
            {roadmap.sections.map((s) => {
              const active = s.order_index === section.order_index;
              return (
                <Link
                  key={s.id}
                  href={`/groups/${id}/leaders?phase=${s.order_index}`}
                  scroll={false}
                  className={
                    active
                      ? 'shrink-0 rounded-full border-[1.5px] border-accent bg-accent px-3.5 py-2 text-[12.5px] font-bold text-white'
                      : 'shrink-0 rounded-full border-[1.5px] border-hairline-strong bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink-muted transition hover:border-accent/40'
                  }
                >
                  {s.order_index === 0 ? 'Orientation' : `Phase ${s.order_index}`}
                </Link>
              );
            })}
          </div>

          <p className="mt-4 text-[12.5px] text-ink-muted">{section.title}</p>

          {!section.unlocked ? (
            <div className="py-16 text-center">
              <p className="text-[34px]">🔒</p>
              <p className="font-display mt-2 text-[15px] font-semibold text-ink-strong">
                Not unlocked yet
              </p>
              <p className="mt-1 text-[12.5px] text-ink-muted">
                This phase&apos;s leaderboard fills in once your group starts it.
              </p>
            </div>
          ) : !anyXp ? (
            <Card className="mt-3">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                No XP in this phase yet. Only sessions logged against a topic in
                this phase count here — general study still keeps the streak
                alive, it just doesn&apos;t score the phase.
              </p>
            </Card>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {rows.map((row, i) => {
                const isYou = row.user_id === userId;
                return (
                  <li
                    key={row.user_id}
                    className={
                      isYou
                        ? 'flex items-center gap-3 rounded-tile border-[1.5px] border-accent bg-surface p-3.5'
                        : 'flex items-center gap-3 rounded-tile border-[1.5px] border-transparent bg-surface p-3.5 shadow-card'
                    }
                  >
                    <span className="font-display w-5 text-center text-[15px] font-bold text-ink-muted">
                      {i + 1}
                    </span>

                    <span className="relative">
                      <Avatar
                        name={row.display_name}
                        src={row.avatar_url}
                        seed={row.user_id}
                        size={38}
                      />
                      {i === 0 && row.xp > 0 && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <CrownIcon />
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">
                        {row.display_name}
                        {isYou && (
                          <span className="ml-1.5 text-[11px] font-normal text-ink-faint">
                            you
                          </span>
                        )}
                      </p>
                      <Meter value={row.xp / topXp} height={6} className="mt-1.5" />
                      <p className="mt-1 text-[11px] text-ink-faint">
                        {row.minutes} min in this phase
                      </p>
                    </div>

                    <span className="font-display text-[14px] font-bold">
                      {row.xp.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PageBody>
    </>
  );
}
