'use client';

import { useActionState } from 'react';
import { updateGoalAction, type ActionState } from '@/lib/actions/groups';
import { FormError } from '@/components/ui';

const GOALS = [15, 30, 45, 60];

export function GoalPicker({
  groupId,
  current,
  canEdit,
}: {
  groupId: string;
  current: number;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateGoalAction,
    null,
  );

  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="group_id" value={groupId} />
      <div className="flex gap-2">
        {GOALS.map((g) => (
          <button
            key={g}
            type="submit"
            name="daily_goal_minutes"
            value={g}
            disabled={!canEdit || pending}
            className={
              current === g
                ? 'flex-1 rounded-control border-[1.5px] border-accent bg-accent py-3 text-[13px] font-bold text-white'
                : 'flex-1 rounded-control border-[1.5px] border-hairline-strong bg-surface py-3 text-[13px] font-bold text-ink-muted transition enabled:hover:border-accent/40 disabled:opacity-55'
            }
          >
            {g}m
          </button>
        ))}
      </div>
      <FormError>{state?.error}</FormError>
      <p className="text-[11.5px] leading-relaxed text-ink-muted">
        {canEdit
          ? 'Applies to the whole squad — everyone logs at least this much to keep the streak alive.'
          : 'Only the group owner can change the shared goal.'}
      </p>
    </form>
  );
}
