'use client';

import { useActionState, useState, useSyncExternalStore } from 'react';
import {
  createGroupAction,
  joinGroupAction,
  type ActionState,
} from '@/lib/actions/groups';
import { Button, Card, Eyebrow, FormError, Input, Label } from '@/components/ui';

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
  // browser-only value: it renders as UTC on the server and resolves on
  // hydration instead of causing a mismatch.
  const timezone = useSyncExternalStore(
    subscribeToNothing,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    () => 'UTC',
  );

  return (
    <Card>
      <h2 className="font-display text-[17px] font-semibold">Start a group</h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
        You&apos;ll start solo. Share the invite code afterwards to grow to a
        duo, trio, or squad of four.
      </p>

      <form action={action} className="mt-5 space-y-5">
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
          <Label>Shared daily goal</Label>
          <div className="mt-2 flex gap-2">
            {GOAL_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setGoal(m)}
                className={
                  goal === m
                    ? 'flex-1 rounded-control border-[1.5px] border-accent bg-accent py-3 text-[13px] font-bold text-white'
                    : 'flex-1 rounded-control border-[1.5px] border-hairline-strong bg-surface py-3 text-[13px] font-bold text-ink-muted transition hover:border-accent/40'
                }
              >
                {m}m
              </button>
            ))}
          </div>
          <input type="hidden" name="daily_goal_minutes" value={goal} />
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
            One goal for the whole group. The day resets at midnight in{' '}
            <span className="font-semibold">{timezone}</span>.
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

export function JoinGroupForm({ defaultCode = '' }: { defaultCode?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    joinGroupAction,
    null,
  );

  return (
    <Card>
      <h2 className="font-display text-[17px] font-semibold">Join with a code</h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
        Someone already started a group? Paste the code they shared.
      </p>

      <form action={action} className="mt-5 space-y-5">
        <div>
          <Eyebrow>Invite code</Eyebrow>
          <Input
            name="invite_code"
            required
            maxLength={8}
            defaultValue={defaultCode}
            placeholder="A1B2C3D4"
            autoCapitalize="characters"
            className="font-display text-center text-[18px] tracking-[0.25em] uppercase"
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
