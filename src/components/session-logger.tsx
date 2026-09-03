'use client';

import { useActionState, useEffect, useState } from 'react';
import { logSessionAction, type LogSessionState } from '@/lib/actions/sessions';
import { Button, Card, FormError, Input, Label } from '@/components/ui';
import { sessionXp } from '@/lib/gamification';

const QUICK_MINUTES = [15, 25, 30, 45, 60];

function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function SessionLogger({
  groupId,
  nodeId,
  nodeTitle,
}: {
  groupId: string;
  nodeId?: string;
  nodeTitle?: string;
}) {
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const [minutes, setMinutes] = useState(30);
  const [subject, setSubject] = useState('');

  // The timer is anchored to a start timestamp plus the seconds banked by
  // earlier pause/resume cycles, never a tick counter: a backgrounded tab
  // throttles setInterval, and a counter would undercount real study time.
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [bankedSeconds, setBankedSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const [state, action, pending] = useActionState<LogSessionState, FormData>(
    logSessionAction,
    null,
  );

  useEffect(() => {
    if (runningSince === null) return;
    const id = setInterval(
      () => setElapsed(bankedSeconds + Math.floor((Date.now() - runningSince) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [runningSince, bankedSeconds]);

  // Derived state reacting to a new action result rather than a side effect of
  // one, so React wants this in render, not an effect.
  const [clearedSession, setClearedSession] = useState<string | null>(null);
  if (state?.ok && state.result.session_id !== clearedSession) {
    setClearedSession(state.result.session_id);
    setRunningSince(null);
    setBankedSeconds(0);
    setElapsed(0);
    setSubject('');
  }

  const running = runningSince !== null;

  function toggleTimer() {
    if (runningSince !== null) {
      setBankedSeconds(elapsed);
      setRunningSince(null);
    } else {
      setRunningSince(Date.now());
    }
  }

  const timedMinutes = Math.max(1, Math.round(elapsed / 60));
  const submitMinutes = mode === 'timer' ? timedMinutes : minutes;
  const preview = sessionXp(submitMinutes);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Log a session</h2>
          {nodeTitle && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Counts toward <span className="font-medium">{nodeTitle}</span>
            </p>
          )}
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['timer', 'manual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                mode === m
                  ? 'rounded-md bg-white px-3 py-1 text-xs font-medium capitalize text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                  : 'rounded-md px-3 py-1 text-xs font-medium capitalize text-slate-600 dark:text-slate-400'
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'timer' ? (
        <div className="mt-6 text-center">
          <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
            {formatClock(elapsed)}
          </p>
          <Button
            type="button"
            onClick={toggleTimer}
            variant={running ? 'secondary' : 'primary'}
            className="mt-4 w-40"
          >
            {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start studying'}
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <Label htmlFor="duration">Minutes studied</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={
                  minutes === m
                    ? 'rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'
                    : 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }
              >
                {m}
              </button>
            ))}
          </div>
          <Input
            id="duration"
            type="number"
            min={1}
            max={1440}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </div>
      )}

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="group_id" value={groupId} />
        <input type="hidden" name="duration_minutes" value={submitMinutes} />
        {nodeId && <input type="hidden" name="roadmap_node_id" value={nodeId} />}

        <div>
          <Label htmlFor="subject">What did you study? (optional)</Label>
          <Input
            id="subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={80}
            placeholder={nodeTitle ?? 'Retrieval-augmented generation'}
          />
        </div>

        <FormError>{state?.ok === false ? state.error : null}</FormError>

        {state?.ok && (
          <div className="rounded-xl bg-emerald-50 p-4 text-sm dark:bg-emerald-950/50">
            <p className="font-medium text-emerald-900 dark:text-emerald-200">
              +{state.result.xp_awarded + state.result.daily_bonus} XP logged
            </p>
            <p className="mt-1 text-emerald-800 dark:text-emerald-300">
              {state.result.xp_awarded} XP for the session
              {state.result.daily_bonus > 0 &&
                ` · +${state.result.daily_bonus} for showing up today`}
              {' · '}
              level {state.result.new_level}, {state.result.new_total_xp.toLocaleString()} XP total
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={pending || (mode === 'timer' && elapsed < 60)}
          className="w-full"
        >
          {pending
            ? 'Saving…'
            : mode === 'timer' && elapsed < 60
              ? 'Study for at least a minute'
              : `Log ${submitMinutes} min · +${preview} XP`}
        </Button>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          XP grows with the square root of time, so short daily sessions beat one
          long cram.
        </p>
      </form>
    </Card>
  );
}
