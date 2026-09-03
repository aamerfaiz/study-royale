import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-6 pb-1 sm:px-6">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold tracking-[0.02em] text-ink-muted uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display mt-0.5 truncate text-[22px] font-semibold">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

/** Page body: single column on phones, a comfortable two-column grid on desktop. */
export function PageBody({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-4 pb-10 sm:px-6">{children}</div>
  );
}
