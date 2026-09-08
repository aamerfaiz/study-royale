'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logSessionAction, type LogSessionState } from '@/lib/actions/sessions';
import { Button, FormError } from '@/components/ui';
import { sessionXp } from '@/lib/gamification';

const DURATIONS = [15, 25, 30, 45];

function clock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-sunken text-ink-strong transition hover:bg-hairline"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

export function StudySession({
  groupId,
  nodeId,
  nodeTitle,
  nodeSubtitle,
  onClose,
}: {
  groupId: string;
  nodeId?: string;
  nodeTitle?: string;
  nodeSubtitle?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [target, setTarget] = useState(25);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [bankedSeconds, setBankedSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage] = useState<'setup' | 'running'>('setup');

  const [state, action, pending] = useActionState<LogSessionState, FormData>(
    logSessionAction,
    null,
  );

  // Anchored to a timestamp, never a tick counter: a backgrounded tab throttles
  // setInterval and would undercount the real study time.
  useEffect(() => {
    if (runningSince === null) return;
    const id = setInterval(
      () => setElapsed(bankedSeconds + Math.floor((Date.now() - runningSince) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [runningSince, bankedSeconds]);

  const paused = stage === 'running' && runningSince === null;
  const targetSeconds = target * 60;
  const ringDeg = Math.min(elapsed / targetSeconds, 1) * 360;
  const loggedMinutes = Math.max(1, Math.round(elapsed / 60));

  function start() {
    setStage('running');
    setRunningSince(Date.now());
  }

  function togglePause() {
    if (runningSince === null) {
      setRunningSince(Date.now());
    } else {
      setBankedSeconds(elapsed);
      setRunningSince(null);
    }
  }

  function finishAndClose() {
    router.refresh();
    onClose();
  }

  if (state?.ok) {
    const { xp_awarded, daily_bonus, new_level } = state.result;
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center px-6 pt-10 pb-6 text-center">
          <div className="flex h-21 w-21 items-center justify-center rounded-full bg-success-tint" style={{ width: 84, height: 84 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l7 7L20 6" />
            </svg>
          </div>
          <h2 className="font-display mt-5 text-[20px] font-semibold">Nice work!</h2>
          <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-ink-muted">
            {daily_bonus > 0
              ? "That's you shown up for today — the group streak is safe on your side."
              : 'Logged. Every session on top of the first one still counts.'}
          </p>

          <div className="mt-6 flex w-full max-w-sm gap-2.5">
            <div className="flex-1 rounded-tile bg-sunken p-3.5">
              <p className="font-display text-[22px] font-bold">{loggedMinutes}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">minutes logged</p>
            </div>
            <div className="flex-1 rounded-tile bg-gold-tint p-3.5">
              <p className="font-display text-[22px] font-bold text-gold-ink">
                +{xp_awarded + daily_bonus}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">XP earned</p>
            </div>
          </div>

          {daily_bonus > 0 && (
            <p className="mt-4 w-full max-w-sm rounded-control bg-accent-tint px-3 py-3 text-[12.5px] font-bold text-accent">
              +{daily_bonus} bonus for your first session today
            </p>
          )}

          <p className="mt-3 text-[12px] text-ink-muted">You&apos;re level {new_level}</p>

          <div className="mt-auto w-full max-w-sm pt-8">
            <Button className="w-full" onClick={finishAndClose}>
              Done
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (stage === 'setup') {
    return (
      <Shell>
        <div className="flex items-center justify-between px-5 pt-5">
          <CloseButton onClick={onClose} />
        </div>
        <div className="flex flex-1 flex-col px-6 pt-2 pb-6">
          <p className="text-[11.5px] font-bold tracking-[0.03em] text-accent uppercase">
            Study session
          </p>
          <h2 className="font-display mt-1 text-[20px] font-semibold">
            {nodeTitle ?? 'Free study'}
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {nodeSubtitle ?? 'Anything you log today keeps the group streak alive.'}
          </p>

          <p className="mt-7 text-[11.5px] font-bold tracking-[0.02em] text-ink-muted uppercase">
            How long are you studying?
          </p>
          <div className="mt-2.5 flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setTarget(d)}
                className={
                  target === d
                    ? 'flex-1 rounded-control border-[1.5px] border-accent bg-accent py-3 text-[13.5px] font-bold text-white'
                    : 'flex-1 rounded-control border-[1.5px] border-hairline-strong bg-surface py-3 text-[13.5px] font-bold text-ink-muted transition hover:border-accent/40'
                }
              >
                {d}m
              </button>
            ))}
          </div>

          <p className="mt-3 text-[11.5px] text-ink-muted">
            A target, not a limit — XP is based on the time you actually log.
          </p>

          <div className="mt-auto pt-8">
            <Button className="w-full" onClick={start}>
              Start studying
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-end px-5 pt-5">
        <CloseButton onClick={onClose} />
      </div>
      <div className="flex flex-1 flex-col items-center px-6 pb-7">
        <p className="text-[11.5px] font-bold tracking-[0.03em] text-accent uppercase">
          {paused ? 'Paused' : 'Studying'}
        </p>
        <h2 className="font-display mt-0.5 text-center text-[17px] font-semibold">
          {nodeTitle ?? 'Free study'}
        </h2>

        <div
          className="mt-8 flex items-center justify-center rounded-full"
          style={{
            width: 220,
            height: 220,
            background: `conic-gradient(#7C5CFF ${ringDeg}deg, oklch(93% 0.01 80) 0deg)`,
          }}
        >
          <div className="flex flex-col items-center justify-center rounded-full bg-surface" style={{ width: 186, height: 186 }}>
            <p className="font-display text-[34px] font-bold tabular-nums">
              {clock(elapsed)}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-muted">of {target}m goal</p>
          </div>
        </div>

        <form action={action} className="mt-auto w-full max-w-sm space-y-3 pt-8">
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="duration_minutes" value={loggedMinutes} />
          {nodeId && <input type="hidden" name="roadmap_node_id" value={nodeId} />}
          {nodeTitle && <input type="hidden" name="subject" value={nodeTitle} />}

          <FormError>{state?.ok === false ? state.error : null}</FormError>

          <div className="flex gap-2.5">
            <Button type="button" variant="secondary" className="flex-1" onClick={togglePause}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button type="submit" className="flex-1" disabled={pending || elapsed < 60}>
              {pending ? 'Saving…' : 'Finish session'}
            </Button>
          </div>
          <p className="text-center text-[11.5px] text-ink-muted">
            {elapsed < 60
              ? 'Study for at least a minute to log it.'
              : `${loggedMinutes} min · +${sessionXp(loggedMinutes)} XP`}
          </p>
        </form>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-pop-in fixed inset-0 z-50 flex flex-col bg-surface lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[440px] lg:border-l lg:border-hairline lg:shadow-lift">
      {children}
    </div>
  );
}
