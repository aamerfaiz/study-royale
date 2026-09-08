'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SubmitQuizResult } from '@/lib/types';

export type QuizSubmitState =
  | { ok: true; result: SubmitQuizResult }
  | { ok: false; error: string }
  | null;

export async function submitQuizAction(
  _prev: QuizSubmitState,
  formData: FormData,
): Promise<QuizSubmitState> {
  const supabase = await createClient();

  const quizId = String(formData.get('quiz_id') ?? '');
  const groupId = String(formData.get('group_id') ?? '');
  const groupRoadmapId = String(formData.get('group_roadmap_id') ?? '');

  let answers: Record<string, number>;
  try {
    answers = JSON.parse(String(formData.get('answers') ?? '{}'));
  } catch {
    return { ok: false, error: 'Could not read your answers. Please try again.' };
  }

  // Grading happens in the database: the answer key never reaches the client
  // until the attempt has been submitted and scored.
  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: quizId,
    p_group_roadmap_id: groupRoadmapId,
    p_answers: answers,
  });

  if (error) return { ok: false, error: error.message };

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return { ok: false, error: 'The attempt was not recorded.' };

  await supabase.rpc('evaluate_achievements', {});

  revalidatePath(`/groups/${groupId}/roadmap`);
  revalidatePath(`/groups/${groupId}/leaders`);
  return { ok: true, result: result as SubmitQuizResult };
}
