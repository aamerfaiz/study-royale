import { redirect } from 'next/navigation';

/** Invite links land here; the join form lives on the onboarding screen. */
export default async function JoinRedirect({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  redirect(code ? `/groups/new?code=${encodeURIComponent(code)}` : '/groups/new');
}
