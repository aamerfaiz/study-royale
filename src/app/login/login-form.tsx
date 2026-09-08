'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const failed = params.get('error') === 'auth';
  const next = params.get('next') ?? '/';

  async function signIn() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setPending(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-card bg-surface p-7 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>

        <h1 className="font-display mt-5 text-[24px] leading-tight font-semibold">
          Study a little,
          <br />
          together, every day.
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-muted">
          Studying alone is easy to skip. With one to three people counting on
          you, it isn&apos;t.
        </p>

        {failed && (
          <p className="mt-4 rounded-control bg-danger/10 px-3.5 py-3 text-[12.5px] font-semibold text-danger">
            Sign-in didn&apos;t complete. Please try again.
          </p>
        )}

        <button
          onClick={signIn}
          disabled={pending}
          className="font-display mt-6 flex w-full items-center justify-center gap-3 rounded-control border-[1.5px] border-hairline-strong bg-surface px-4 py-3.5 text-[14px] font-bold text-ink-strong transition hover:bg-sunken disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z" />
          </svg>
          {pending ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5 text-[11.5px] font-semibold text-ink-faint">
        <span>🔥 Shared streaks</span>
        <span>⭐ XP &amp; levels</span>
        <span>📘 Real lessons</span>
      </div>
    </div>
  );
}
