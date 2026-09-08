'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { submitQuizAction, type QuizSubmitState } from '@/lib/actions/quiz';
import { Button, FormError } from '@/components/ui';
import type { QuizGradedQuestion, QuizQuestionForClient } from '@/lib/types';

export function QuizRunner({
  quizId,
  quizTitle,
  groupId,
  groupRoadmapId,
  passingScorePct,
  questions,
}: {
  quizId: string;
  quizTitle: string;
  groupId: string;
  groupRoadmapId: string;
  passingScorePct: number;
  questions: QuizQuestionForClient[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [state, action, pending] = useActionState<QuizSubmitState, FormData>(
    submitQuizAction,
    null,
  );

  const question = questions[index];
  const selected = question ? answers[question.id] : undefined;
  const isLast = index === questions.length - 1;
  const answeredAll = questions.every((q) => answers[q.id] !== undefined);

  if (state?.ok) {
    return (
      <Results
        result={state.result}
        questions={questions}
        groupId={groupId}
        passingScorePct={passingScorePct}
        onRetry={() => {
          setAnswers({});
          setIndex(0);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="flex items-center gap-3 px-5 pt-5 sm:px-6">
        <Link
          href={`/groups/${groupId}/roadmap`}
          aria-label="Leave quiz"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-strong transition hover:bg-hairline"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <div className="flex flex-1 gap-1.5">
          {questions.map((q, i) => (
            <span
              key={q.id}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background:
                  answers[q.id] !== undefined
                    ? '#7C5CFF'
                    : i === index
                      ? 'oklch(80% 0.06 290)'
                      : 'oklch(93% 0.01 80)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-5 sm:px-6">
        <p className="text-[11.5px] font-bold tracking-[0.03em] text-accent uppercase">
          Question {index + 1} of {questions.length}
        </p>
        <h1 className="font-display mt-2 text-[18px] leading-snug font-semibold sm:text-[20px]">
          {question.question_text}
        </h1>

        <div className="mt-5 space-y-2.5">
          {question.options.map((option, i) => {
            const active = selected === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [question.id]: i }))}
                className={
                  active
                    ? 'w-full rounded-control border-[1.5px] border-accent bg-accent-tint px-4 py-3.5 text-left text-[13.5px] font-semibold text-ink'
                    : 'w-full rounded-control border-[1.5px] border-hairline-strong bg-surface px-4 py-3.5 text-left text-[13.5px] font-semibold text-ink-strong transition hover:border-accent/40'
                }
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-8">
          <FormError>{state?.ok === false ? state.error : null}</FormError>

          <div className="flex gap-2.5">
            {index > 0 && (
              <Button variant="secondary" onClick={() => setIndex((i) => i - 1)} className="flex-1">
                Back
              </Button>
            )}

            {isLast ? (
              <form action={action} className="flex-1">
                <input type="hidden" name="quiz_id" value={quizId} />
                <input type="hidden" name="group_id" value={groupId} />
                <input type="hidden" name="group_roadmap_id" value={groupRoadmapId} />
                <input type="hidden" name="answers" value={JSON.stringify(answers)} />
                <Button type="submit" className="w-full" disabled={!answeredAll || pending}>
                  {pending ? 'Scoring…' : answeredAll ? 'Submit quiz' : 'Answer every question'}
                </Button>
              </form>
            ) : (
              <Button
                className="flex-1"
                disabled={selected === undefined}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next
              </Button>
            )}
          </div>

          <p className="mt-3 text-center text-[11.5px] text-ink-muted">
            {quizTitle} · {passingScorePct}% to pass · retake as often as you like
          </p>
        </div>
      </div>
    </div>
  );
}

function Results({
  result,
  questions,
  groupId,
  passingScorePct,
  onRetry,
}: {
  result: { score_pct: number; passed: boolean; first_pass: boolean; xp_awarded: number; results: QuizGradedQuestion[] };
  questions: QuizQuestionForClient[];
  groupId: string;
  passingScorePct: number;
  onRetry: () => void;
}) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const correct = result.results.filter((r) => r.correct).length;

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 84,
              height: 84,
              background: result.passed ? 'oklch(94% 0.06 155)' : 'oklch(96% 0.05 85)',
            }}
          >
            {result.passed ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l7 7L20 6" />
              </svg>
            ) : (
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#B7791F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v5M12 17h.01" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </div>

          <h1 className="font-display mt-5 text-[22px] font-semibold">
            {result.passed ? 'Phase cleared!' : 'Not quite yet'}
          </h1>
          <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
            {result.passed
              ? 'Your part of this phase is done. The group moves on once everyone clears it.'
              : `You need ${passingScorePct}% to pass. Read back through the explanations below, then try again — retakes are free.`}
          </p>

          <div className="mt-6 w-full rounded-tile bg-surface p-5 shadow-card">
            <p className="font-display text-[28px] font-bold">
              {correct}/{result.results.length}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              correct · {result.score_pct}%
            </p>
          </div>

          {result.xp_awarded > 0 && (
            <p className="mt-3 w-full rounded-control bg-gold-tint px-3 py-3 text-[12.5px] font-bold text-gold-ink">
              +{result.xp_awarded} XP for passing
            </p>
          )}

          <div className="mt-6 flex w-full gap-2.5">
            {!result.passed && (
              <Button className="flex-1" onClick={onRetry}>
                Retry quiz
              </Button>
            )}
            <Link href={`/groups/${groupId}/roadmap`} className="flex-1">
              <Button variant={result.passed ? 'primary' : 'secondary'} className="w-full">
                Back to roadmap
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-9 space-y-3">
          <p className="text-[11.5px] font-bold tracking-[0.02em] text-ink-muted uppercase">
            Review
          </p>
          {result.results.map((r) => {
            const q = byId.get(r.question_id);
            if (!q) return null;
            return (
              <div key={r.question_id} className="rounded-tile bg-surface p-4 shadow-card">
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: r.correct ? '#12B76A' : '#E5484D' }}
                  >
                    {r.correct ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    )}
                  </span>
                  <p className="text-[13.5px] font-semibold text-ink-strong">
                    {q.question_text}
                  </p>
                </div>

                {!r.correct && (
                  <p className="mt-2.5 pl-7.5 text-[12.5px] text-ink-muted">
                    You picked{' '}
                    <span className="font-semibold text-danger">
                      {r.selected_option_index !== null
                        ? q.options[r.selected_option_index]
                        : 'nothing'}
                    </span>
                    . The answer is{' '}
                    <span className="font-semibold text-success">
                      {q.options[r.correct_option_index]}
                    </span>
                    .
                  </p>
                )}

                {r.explanation && (
                  <p className="mt-2.5 rounded-tile bg-sunken p-3 text-[12.5px] leading-relaxed text-ink-muted">
                    {r.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
