'use client';

import { useActionState, useState, useSyncExternalStore } from 'react';
import { createGroupAction, joinGroupAction, type ActionState } from '@/lib/actions/groups';
import { Button, Card, FormError, Input, Label } from '@/components/ui';

const GOAL_PRESETS = [15, 30, 45, 60];

// The device timezone never changes mid-session, so there is nothing to watch.
const subscribeToNothing = () => () => {};

export function CreateGroupForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createGroupAction,
    null,
  );
  const [goal, setGoal] = useState(30);

  // The streak day rolls over at the group's local midnight, so seed the group
  // with the creator's timezone rather than guessing UTC. This is a
  // browser-only value, so it renders as UTC on the server and resolves on
  // hydration instead of causing a mismatch.
  const timezone = useSyncExternalStore(
    subscribeToNothing,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    () => 'UTC',
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">Start a group</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        You&apos;ll start solo. Share the invite code afterwards to grow to a
        duo, trio, or squad of four.
      </p>

      <form action={action} className="mt-6 space-y-5">
        <input type="hidden" name="timezone" value={timezone} />

        <div>
          <Label htmlFor="name">Group name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultName}
            maxLength={60}
            required
            placeholder="Morning grind"
          />
        </div>

        <div>
          <Label htmlFor="daily_goal_minutes">Shared daily goal</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOAL_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setGoal(m)}
                className={
                  goal === m
                    ? 'rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'
                    : 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }
              >
                {m} min
              </button>
            ))}
          </div>
          <Input
            id="daily_goal_minutes"
            name="daily_goal_minutes"
            type="number"
            min={5}
            max={480}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            One goal for the whole group. Everyone has to show up each day or
            the shared streak is at risk. Day rolls over at midnight in{' '}
            <span className="font-medium">{timezone}</span>.
          </p>
        </div>

        <FormError>{state?.error}</FormError>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating…' : 'Create group'}
        </Button>
      </form>
    </Card>
  );
}

export function JoinGroupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    joinGroupAction,
    null,
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">Join with a code</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Someone already started a group? Paste the code they shared.
      </p>

      <form action={action} className="mt-6 space-y-5">
        <div>
          <Label htmlFor="invite_code">Invite code</Label>
          <Input
            id="invite_code"
            name="invite_code"
            required
            maxLength={8}
            placeholder="A1B2C3D4"
            className="font-mono uppercase tracking-[0.2em]"
          />
        </div>

        <FormError>{state?.error}</FormError>

        <Button type="submit" variant="secondary" disabled={pending} className="w-full">
          {pending ? 'Joining…' : 'Join group'}
        </Button>
      </form>
    </Card>
  );
}
