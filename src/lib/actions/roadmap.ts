'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type NodeActionState = { error: string } | { ok: true } | null;

export async function completeNodeAction(
  _prev: NodeActionState,
  formData: FormData,
): Promise<NodeActionState> {
  const supabase = await createClient();
  const groupId = String(formData.get('group_id') ?? '');
  const groupRoadmapId = String(formData.get('group_roadmap_id') ?? '');
  const nodeId = String(formData.get('roadmap_node_id') ?? '');

  const { error } = await supabase.rpc('complete_node', {
    p_group_roadmap_id: groupRoadmapId,
    p_roadmap_node_id: nodeId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}/roadmap`);
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function startCourseAction(formData: FormData) {
  const supabase = await createClient();
  const groupId = String(formData.get('group_id') ?? '');
  const roadmapId = String(formData.get('roadmap_id') ?? '');

  const { error } = await supabase.rpc('start_course', {
    p_group_id: groupId,
    p_roadmap_id: roadmapId,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/groups/${groupId}`, 'layout');
}
