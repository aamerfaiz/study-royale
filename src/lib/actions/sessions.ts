'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { LogSessionResult } from '@/lib/types';

export type LogSessionState =
  | { ok: true; result: LogSessionResult }
  | { ok: false; error: string }
  | null;

export async function logSessionAction(
  _prev: LogSessionState,
  formData: FormData,
): Promise<LogSessionState> {
  const supabase = await createClient();

  const groupId = String(formData.get('group_id') ?? '');
  const minutes = Number(formData.get('duration_minutes') ?? 0);
  const subject = String(formData.get('subject') ?? '').trim();
  const nodeId = String(formData.get('roadmap_node_id') ?? '').trim();

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { ok: false, error: 'How long did you study?' };
  }
  if (minutes > 1440) {
    return { ok: false, error: "That's more than a day — check the number." };
  }

  // XP is computed and written server-side; the client never supplies it.
  const { data, error } = await supabase.rpc('log_study_session', {
    p_group_id: groupId || undefined,
    p_duration_minutes: Math.round(minutes),
    p_subject: subject || undefined,
    p_roadmap_node_id: nodeId || undefined,
  });

  if (error) return { ok: false, error: error.message };

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return { ok: false, error: 'Session was not recorded.' };

  // Unlocks are checked here rather than on a schedule, so a badge earned by
  // this session is available on the very next render.
  await supabase.rpc('evaluate_achievements', {});

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/roadmap`);
  return { ok: true, result: result as LogSessionResult };
}
