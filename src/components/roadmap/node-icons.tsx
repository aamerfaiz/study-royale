import type { NodeStatus, RequirementType } from '@/lib/types';

export const REQUIREMENT_LABEL: Record<RequirementType, string> = {
  time: 'Time-based',
  checkoff: 'Checkoff',
  quiz: 'Phase quiz',
};

export const REQUIREMENT_TONE: Record<RequirementType, 'accent' | 'flame' | 'gold'> = {
  time: 'accent',
  checkoff: 'flame',
  quiz: 'gold',
};

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function StarIcon({ size = 16, fill = '#F5A524' }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6z" />
    </svg>
  );
}

/** The status bubble on the roadmap timeline. */
export function NodeMarker({
  status,
  locked,
  isQuiz,
  size = 36,
}: {
  status: NodeStatus;
  locked: boolean;
  isQuiz?: boolean;
  size?: number;
}) {
  const done = status === 'done';
  const inProgress = status === 'in_progress';

  const background = done ? '#12B76A' : locked ? 'oklch(93% 0.01 80)' : '#ffffff';
  const border = done
    ? '#12B76A'
    : inProgress
      ? '#7C5CFF'
      : locked
        ? 'oklch(93% 0.01 80)'
        : 'oklch(88% 0.01 80)';

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-ink-faint"
      style={{ width: size, height: size, background, border: `2px solid ${border}` }}
    >
      {done ? (
        <CheckIcon size={size * 0.45} />
      ) : locked ? (
        <LockIcon size={size * 0.4} />
      ) : isQuiz ? (
        <StarIcon size={size * 0.45} />
      ) : inProgress ? (
        <span className="h-2 w-2 rounded-full bg-accent" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-hairline-strong" />
      )}
    </span>
  );
}
