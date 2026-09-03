import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreateGroupForm, JoinGroupForm } from './group-forms';

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const firstName = (profile?.display_name ?? '').split(' ')[0];

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-6 lg:py-20">
      <header>
        <h1 className="font-display text-[26px] leading-tight font-semibold sm:text-[30px]">
          Studying alone is easy to skip.
        </h1>
        <p className="mt-2.5 max-w-prose text-[14px] leading-relaxed text-ink-muted">
          Studying with people who notice when you don&apos;t show up is much
          harder to skip. Start a group, or join one you&apos;ve been invited to.
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:items-start">
        <CreateGroupForm defaultName={firstName ? `${firstName}'s group` : ''} />
        <JoinGroupForm defaultCode={code ?? ''} />
      </div>
    </main>
  );
}
