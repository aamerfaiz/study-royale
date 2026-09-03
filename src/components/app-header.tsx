import Link from 'next/link';
import { Avatar } from '@/components/ui';

export function AppHeader({
  displayName,
  avatarUrl,
  level,
  totalXp,
}: {
  displayName: string;
  avatarUrl: string | null;
  level: number;
  totalXp: number;
}) {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Study Royale
        </Link>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Level {level} · {totalXp.toLocaleString()} XP
            </p>
          </div>
          <Avatar src={avatarUrl} name={displayName} />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
