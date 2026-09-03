import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreateGroupForm, JoinGroupForm } from './group-forms';

export default async function NewGroupPage() {
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
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Studying alone is easy to skip.
        </h1>
        <p className="mt-2 max-w-prose text-slate-600 dark:text-slate-400">
          Studying with people who notice when you don&apos;t show up is much
          harder to skip. Start a group, or join one you&apos;ve been invited to.
        </p>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <CreateGroupForm defaultName={firstName ? `${firstName}'s group` : ''} />
        <JoinGroupForm />
      </div>
    </main>
  );
}
