'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

type Tab = { href: string; label: string; icon: React.ReactNode };

const iconProps = {
  width: 21,
  height: 21,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function tabsFor(groupId: string): Tab[] {
  const base = `/groups/${groupId}`;
  return [
    {
      href: base,
      label: 'Home',
      icon: (
        <svg {...iconProps}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </svg>
      ),
    },
    {
      href: `${base}/courses`,
      label: 'Courses',
      icon: (
        <svg {...iconProps}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      href: `${base}/team`,
      label: 'Team',
      icon: (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
          <circle cx="17.5" cy="8.5" r="2.6" />
          <path d="M16 14.2c2.6.4 4.5 2.3 4.5 5.3" />
        </svg>
      ),
    },
    {
      href: `${base}/leaders`,
      label: 'Leaders',
      icon: (
        <svg {...iconProps}>
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
          <path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" />
        </svg>
      ),
    },
  ];
}

function useActive(tabs: Tab[]) {
  const pathname = usePathname();
  // Home is the group root, so it must match exactly or every tab lights up.
  return (href: string) =>
    href === tabs[0].href ? pathname === href : pathname.startsWith(href);
}

export function BottomNav({ groupId }: { groupId: string }) {
  const tabs = tabsFor(groupId);
  const isActive = useActive(tabs);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex h-[68px] items-center">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1 py-2 transition',
                active ? 'text-accent' : 'text-ink-faint',
              )}
            >
              {tab.icon}
              <span className="text-[10px] font-bold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const tabs = tabsFor(groupId);
  const isActive = useActive(tabs);

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-hairline bg-surface px-4 py-6 lg:flex">
      <Link href="/" className="px-2">
        <p className="font-display text-[17px] font-semibold">Study Royale</p>
        <p className="mt-0.5 truncate text-[12px] text-ink-muted">{groupName}</p>
      </Link>

      <div className="mt-7 flex flex-col gap-1">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex items-center gap-3 rounded-tile px-3 py-2.5 text-[13.5px] font-bold transition',
                active
                  ? 'bg-accent-tint text-accent'
                  : 'text-ink-muted hover:bg-sunken hover:text-ink',
              )}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form action="/auth/signout" method="post" className="mt-auto px-1">
        <button
          type="submit"
          className="text-[12.5px] font-semibold text-ink-faint transition hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
