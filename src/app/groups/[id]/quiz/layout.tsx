export default function QuizLayout({ children }: { children: React.ReactNode }) {
  // Rendered above the group chrome: taking a quiz is a focused flow, so the
  // bottom nav's clearance padding is dropped here.
  return <div className="-mb-[84px] lg:mb-0">{children}</div>;
}
