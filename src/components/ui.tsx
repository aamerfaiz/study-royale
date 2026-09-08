import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={clsx(
        'rounded-card bg-surface p-4 shadow-card sm:p-5',
        className,
      )}
      {...props}
    />
  );
}

/** The deep violet-black card used for course and "continue" surfaces. */
export function NightCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={clsx('rounded-card bg-night p-4 text-white sm:p-5', className)}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={clsx(
        'text-[11.5px] font-bold tracking-[0.02em] text-ink-muted uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function SectionTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={clsx('font-display text-[15px] font-semibold', className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={clsx(
        'block text-[11.5px] font-bold tracking-[0.02em] text-ink-muted uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={clsx(
        'mt-2 w-full rounded-control border-[1.5px] border-hairline-strong bg-surface px-3.5 py-3 text-[14px] font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-ink-faint focus:border-accent',
        className,
      )}
      {...props}
    />
  );
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'md' | 'sm';
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'font-display inline-flex items-center justify-center gap-2 rounded-control font-bold transition disabled:cursor-not-allowed disabled:opacity-55',
        size === 'md' ? 'px-4 py-3.5 text-[14px]' : 'px-3.5 py-2.5 text-[12.5px]',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-hover',
        variant === 'secondary' &&
          'border-[1.5px] border-hairline-strong bg-surface text-ink-strong hover:bg-sunken',
        variant === 'quiet' && 'text-ink-muted hover:bg-sunken hover:text-ink',
        variant === 'danger' && 'text-danger hover:bg-danger/8',
        className,
      )}
      {...props}
    />
  );
}

/** Pill toggle used for goal presets, durations, and phase filters. */
export function Chip({
  active,
  className,
  ...props
}: ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={clsx(
        'shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[12.5px] font-bold whitespace-nowrap transition',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-hairline-strong bg-surface text-ink-muted hover:border-accent/40',
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & {
  tone?: 'neutral' | 'accent' | 'success' | 'gold' | 'flame';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-[0.03em] uppercase',
        tone === 'neutral' && 'bg-sunken text-ink-muted',
        tone === 'accent' && 'bg-accent-tint text-accent',
        tone === 'success' && 'bg-success-tint text-success-ink',
        tone === 'gold' && 'bg-gold-tint text-gold-ink',
        tone === 'flame' && 'bg-flame-tint text-flame',
        className,
      )}
      {...props}
    />
  );
}

export function Meter({
  value,
  className,
  barClassName,
  height = 8,
}: {
  /** 0..1 */
  value: number;
  className?: string;
  barClassName?: string;
  height?: number;
}) {
  return (
    <div
      className={clsx('overflow-hidden rounded-full bg-hairline', className)}
      style={{ height }}
    >
      <div
        className={clsx('h-full rounded-full bg-accent transition-all', barClassName)}
        style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
      />
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-control bg-danger/10 px-3.5 py-3 text-[12.5px] font-semibold text-danger">
      {children}
    </p>
  );
}

/**
 * Deterministic avatar colour so a member keeps the same colour everywhere
 * without needing a stored value.
 */
const AVATAR_COLORS = [
  '#7C5CFF',
  '#FF6B4A',
  '#12B76A',
  '#2E90FA',
  '#F45B8D',
  '#0BC5C0',
  '#F5A524',
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  src,
  seed,
  size = 36,
  ring,
  className,
}: {
  name: string;
  src?: string | null;
  seed?: string;
  size?: number;
  /** Ring colour, for overlapping avatar stacks. */
  ring?: string;
  className?: string;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    ...(ring ? { border: `2.5px solid ${ring}` } : {}),
  };

  if (src) {
    return (
      // Google avatar URLs are remote and already sized; running them through
      // next/image would add a proxy hop and cost for no visual gain.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={clsx('shrink-0 rounded-full object-cover', className)}
        style={style}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={clsx(
        'font-display flex shrink-0 items-center justify-center rounded-full font-bold text-white',
        className,
      )}
      style={{
        ...style,
        background: avatarColor(seed ?? name),
        fontSize: size * 0.37,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
