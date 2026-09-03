import { requireGroup } from '@/lib/group-context';
import { BottomNav, SideNav } from '@/components/nav';

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { group } = await requireGroup(id);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <SideNav groupId={group.id} groupName={group.name} />

      {/* Bottom-nav clearance on mobile; the sidebar takes over from lg. */}
      <div className="min-w-0 flex-1 pb-[84px] lg:pb-0">{children}</div>

      <BottomNav groupId={group.id} />
    </div>
  );
}
