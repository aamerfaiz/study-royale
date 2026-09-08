import { notFound } from 'next/navigation';
import { requireGroup } from '@/lib/group-context';
import { loadRoadmap } from '@/lib/roadmap';
import { createClient } from '@/lib/supabase/server';
import { QuizRunner } from '@/components/quiz-runner';
import type { QuizQuestionForClient } from '@/lib/types';

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;
  const { userId } = await requireGroup(id);

  const roadmap = await loadRoadmap(id, userId);
  if (!roadmap) notFound();

  const section = roadmap.sections.find((s) => s.quiz?.id === quizId);
  if (!section?.quiz) notFound();

  // Only the group's current-or-earlier phases are takeable.
  if (!section.unlocked) notFound();

  const supabase = await createClient();

  // get_quiz_questions() omits correct_option_index — the answer key is not in
  // this payload and never reaches the browser before an attempt is graded.
  const { data: questions } = await supabase.rpc('get_quiz_questions', {
    p_quiz_id: quizId,
  });

  if (!questions || questions.length === 0) notFound();

  type RpcQuestion = {
    id: string;
    order_index: number;
    question_text: string;
    options: unknown;
  };

  const clientQuestions: QuizQuestionForClient[] = (questions as RpcQuestion[]).map((q) => ({
    id: q.id,
    order_index: q.order_index,
    question_text: q.question_text,
    options: (q.options as string[]) ?? [],
  }));

  return (
    <QuizRunner
      quizId={quizId}
      quizTitle={section.quiz.title}
      groupId={id}
      groupRoadmapId={roadmap.groupRoadmapId}
      passingScorePct={section.quiz.passing_score_pct}
      questions={clientQuestions}
    />
  );
}
