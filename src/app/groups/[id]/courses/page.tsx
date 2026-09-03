import Link from 'next/link';
import { requireGroup } from '@/lib/group-context';
import { loadRoadmap } from '@/lib/roadmap';
import { createClient } from '@/lib/supabase/server';
import { startCourseAction } from '@/lib/actions/roadmap';
import { PageBody, PageHeader } from '@/components/page-header';
import { Badge, Button, Card, Eyebrow } from '@/components/ui';

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { group, isOwner, userId } = await requireGroup(id);
  const supabase = await createClient();

  const [roadmap, { data: available }] = await Promise.all([
    loadRoadmap(id, userId),
    supabase
      .from('roadmaps')
      .select('id, title, subject, description, source_type, roadmap_sections(id)')
      .order('created_at', { ascending: true }),
  ]);

  const others = (available ?? []).filter((r) => r.id !== roadmap?.roadmapId);

  const clearedSections = roadmap?.sections.filter((s) => s.clearedByMe).length ?? 0;

  return (
    <>
      <PageHeader eyebrow={group.name} title="Courses" />

      <PageBody>
        <div className="mx-auto max-w-2xl space-y-6 lg:max-w-3xl">
          {roadmap && (
            <section>
              <Eyebrow className="mb-2">In progress</Eyebrow>
              <Link href={`/groups/${id}/roadmap`} className="block">
                <div className="rounded-card bg-night p-5 text-white transition hover:opacity-95">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-bold tracking-[0.03em] text-night-eyebrow uppercase">
                    Official
                  </span>
                  <h2 className="font-display mt-3 text-[17px] font-semibold">
                    {roadmap.title}
                  </h2>
                  {roadmap.description && (
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-night-ink">
                      {roadmap.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="text-[12px] text-night-ink">
                      Phase {roadmap.currentSectionIndex + 1} of {roadmap.sections.length} ·{' '}
                      {clearedSections} cleared by you
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </section>
          )}

          <section>
            <Eyebrow className="mb-2">
              {roadmap ? 'Browse more courses' : 'Start a course'}
            </Eyebrow>

            {others.length === 0 ? (
              <Card>
                <p className="text-[13px] leading-relaxed text-ink-muted">
                  {roadmap
                    ? 'One official course ships today. AI-generated and community courses arrive in a later release.'
                    : 'No courses available yet.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {others.map((course) => (
                  <Card key={course.id}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-[14.5px] font-semibold">
                        {course.title}
                      </h3>
                      {course.source_type === 'official' && <Badge tone="accent">Official</Badge>}
                    </div>
                    {course.description && (
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                        {course.description}
                      </p>
                    )}
                    <p className="mt-2 text-[11.5px] text-ink-faint">
                      {course.subject} · {course.roadmap_sections?.length ?? 0} phases
                    </p>

                    {isOwner ? (
                      <form action={startCourseAction} className="mt-4">
                        <input type="hidden" name="group_id" value={id} />
                        <input type="hidden" name="roadmap_id" value={course.id} />
                        <Button type="submit" className="w-full">
                          Start with {group.name}
                        </Button>
                      </form>
                    ) : (
                      <p className="mt-3 text-[11.5px] text-ink-faint">
                        Only the group owner can start a course.
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </PageBody>
    </>
  );
}
