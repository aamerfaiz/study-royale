'use client';

import { useActionState } from 'react';
import { updateGroupAction, type ActionState } from '@/lib/actions/groups';
import { Button, FormError, Input, Label } from '@/components/ui';

export function SettingsForm({
  groupId,
  name,
  dailyGoalMinutes,
  timezone,
}: {
  groupId: string;
  name: string;
  dailyGoalMinutes: number;
  timezone: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateGroupAction,
    null,
  );

  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="group_id" value={groupId} />

      <div>
        <Label htmlFor="name">Group name</Label>
        <Input id="name" name="name" defaultValue={name} maxLength={60} required />
      </div>

      <div>
        <Label htmlFor="daily_goal_minutes">Shared daily goal (minutes)</Label>
        <Input
          id="daily_goal_minutes"
          name="daily_goal_minutes"
          type="number"
          min={5}
          max={480}
          defaultValue={dailyGoalMinutes}
          required
        />
      </div>

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" defaultValue={timezone} required />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          The streak day rolls over at midnight here, for everyone in the group.
        </p>
      </div>

      <FormError>{state?.error}</FormError>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
