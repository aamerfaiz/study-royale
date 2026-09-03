'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ActionState = { error: string } | null;

export async function createGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const name = String(formData.get('name') ?? '').trim();
  const dailyGoal = Number(formData.get('daily_goal_minutes') ?? 30);
  const timezone = String(formData.get('timezone') ?? 'UTC');

  if (!name) return { error: 'Give your group a name.' };
  if (!Number.isFinite(dailyGoal) || dailyGoal < 5 || dailyGoal > 480) {
    return { error: 'Daily goal must be between 5 and 480 minutes.' };
  }

  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_daily_goal_minutes: Math.round(dailyGoal),
    p_timezone: timezone,
  });

  if (error) return { error: error.message };
  redirect(`/groups/${data}`);
}

export async function joinGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const code = String(formData.get('invite_code') ?? '').trim();

  if (!code) return { error: 'Enter an invite code.' };

  const { data, error } = await supabase.rpc('join_group_by_invite', {
    p_invite_code: code,
  });

  if (error) {
    // The capacity trigger and the unknown-code path both surface here.
    if (error.message.includes('Group is full')) {
      return { error: 'That group is already full (4 members max).' };
    }
    if (error.message.includes('No group found')) {
      return { error: "That invite code doesn't match any group." };
    }
    return { error: error.message };
  }

  redirect(`/groups/${data}`);
}

export async function updateGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const groupId = String(formData.get('group_id') ?? '');
  const dailyGoal = Number(formData.get('daily_goal_minutes') ?? 30);

  if (!Number.isFinite(dailyGoal) || dailyGoal < 5 || dailyGoal > 480) {
    return { error: 'Daily goal must be between 5 and 480 minutes.' };
  }

  // RLS restricts this update to the group owner.
  const { error } = await supabase
    .from('groups')
    .update({ daily_goal_minutes: Math.round(dailyGoal) })
    .eq('id', groupId);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`, 'layout');
  return null;
}

export async function renameGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const groupId = String(formData.get('group_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();

  if (!name) return { error: 'Give your group a name.' };

  const { error } = await supabase
    .from('groups')
    .update({ name: name.slice(0, 60) })
    .eq('id', groupId);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`, 'layout');
  return null;
}

export async function leaveGroupAction(formData: FormData) {
  const supabase = await createClient();
  const groupId = String(formData.get('group_id') ?? '');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  redirect('/');
}

export async function removeMemberAction(formData: FormData) {
  const supabase = await createClient();
  const groupId = String(formData.get('group_id') ?? '');
  const userId = String(formData.get('user_id') ?? '');

  // RLS allows this only for the group owner.
  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  revalidatePath(`/groups/${groupId}/settings`);
}
