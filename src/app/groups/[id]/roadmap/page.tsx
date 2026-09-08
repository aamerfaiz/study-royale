import Link from 'next/link';
import { requireGroup } from '@/lib/group-context';
import { loadRoadmap } from '@/lib/roadmap';
import { PageBody, PageHeader } from '@/components/page-header';
import { RoadmapCanvas } from '@/components/roadmap/roadmap-view';
import { Card } from '@/components/ui';

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { group, members, userId } = await requireGroup(id);
  const roadmap = await loadRoadmap(id, userId);

  if (!roadmap) {
    return (
      <>
        <PageHeader eyebrow={group.name} title="Your path" />
        <PageBody>
          <Card>
            <p className="text-[13.5px] text-ink-muted">
              Your group hasn&apos;t started a course yet.
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

  const panelMembers = members.map((m) => ({
    user_id: m.user_id,
    display_name: m.display_name,
    avatar_url: m.avatar_url,
  }));

  return (
    <>
      <PageHeader eyebrow={roadmap.title} title="Your path" />
      <PageBody>
        <div className="mx-auto max-w-2xl lg:max-w-3xl">
          <RoadmapCanvas roadmap={roadmap} groupId={id} members={panelMembers} />
        </div>
      </PageBody>
    </>
  );
}
