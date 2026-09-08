'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NodePanel, type PanelMember } from '@/components/roadmap/node-panel';
import { NodeMarker, StarIcon } from '@/components/roadmap/node-icons';
import { Badge, Card, Meter } from '@/components/ui';
import type { RoadmapView, SectionView, RoadmapNodeView } from '@/lib/roadmap';

function PhaseHeader({
  section,
  cleared,
  memberCount,
}: {
  section: SectionView;
  cleared: number;
  memberCount: number;
}) {
  const doneCount = section.nodes.filter((n) => n.status === 'done').length;
  return (
    <div className="flex items-center gap-3">
      <NodeMarker
        status={section.clearedByMe ? 'done' : 'not_started'}
        locked={!section.unlocked}
        size={34}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-ink-strong">{section.title}</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {section.unlocked
            ? `${doneCount} of ${section.nodes.length} done · ${cleared} of ${memberCount} cleared`
            : 'Locked'}
        </p>
      </div>
    </div>
  );
}

function NodeRow({
  node,
  locked,
  isLast,
  onOpen,
}: {
  node: RoadmapNodeView;
  locked: boolean;
  isLast: boolean;
  onOpen: () => void;
}) {
  const done = node.status === 'done';
  const othersDone = node.memberStatus.filter((m) => m.status === 'done').length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full gap-3.5 text-left transition hover:opacity-80"
    >
      <div className="flex flex-col items-center">
        <NodeMarker status={node.status} locked={locked} size={34} />
        {!isLast && (
          <span
            className="w-0.5 flex-1"
            style={{ background: done ? '#12B76A' : 'oklch(93% 0.01 80)', minHeight: 10 }}
          />
        )}
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <p
            className={
              locked
                ? 'text-[13.5px] font-semibold text-ink-faint'
                : 'text-[13.5px] font-semibold text-ink-strong'
            }
          >
            {node.title}
          </p>
          {node.is_optional && (
            <span className="mt-0.5 shrink-0 rounded-full border border-dashed border-hairline-strong px-2 py-0.5 text-[10px] font-bold text-ink-faint uppercase">
              Optional
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px] text-ink-muted">
          {node.requirement_type === 'time' && node.requirement_value
            ? `${node.requirement_value} min${node.minutesLogged > 0 && !done ? ` · ${node.minutesLogged} logged` : ''}`
            : 'Check off when finished'}
          {othersDone > 0 && ` · ${othersDone} done`}
        </p>
      </div>
    </button>
  );
}

function QuizRow({
  section,
  groupId,
  locked,
  eligible,
}: {
  section: SectionView;
  groupId: string;
  locked: boolean;
  eligible: boolean;
}) {
  const quiz = section.quiz!;
  const body = (
    <div className="flex items-center gap-3.5">
      <span
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
        style={{
          background: quiz.passed ? '#12B76A' : 'oklch(96% 0.05 85)',
          border: `2px solid ${quiz.passed ? '#12B76A' : '#F5A524'}`,
        }}
      >
        {quiz.passed ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <StarIcon size={15} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-ink-strong">{quiz.title}</p>
        <p className="mt-0.5 text-[11.5px] text-ink-muted">
          {quiz.passed
            ? `Passed · best ${quiz.bestScore}%`
            : eligible
              ? `${quiz.questionCount} questions · ${quiz.passing_score_pct}% to pass`
              : 'Finish every topic above to unlock'}
        </p>
      </div>
      {quiz.passed && <Badge tone="success">Passed</Badge>}
    </div>
  );

  if (locked || !eligible) {
    return <div className="rounded-tile bg-sunken p-3.5 opacity-70">{body}</div>;
  }

  return (
    <Link
      href={`/groups/${groupId}/quiz/${quiz.id}`}
      className="block rounded-tile border border-gold/30 bg-gold-tint p-3.5 transition hover:opacity-90"
    >
      {body}
    </Link>
  );
}

export function RoadmapCanvas({
  roadmap,
  groupId,
  members,
}: {
  roadmap: RoadmapView;
  groupId: string;
  members: PanelMember[];
}) {
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number[]>([roadmap.currentSectionIndex]);

  const openNode = roadmap.sections
    .flatMap((s) => s.nodes)
    .find((n) => n.id === openNodeId);
  const openSection = roadmap.sections.find((s) =>
    s.nodes.some((n) => n.id === openNodeId),
  );

  function toggle(order: number) {
    setExpanded((cur) =>
      cur.includes(order) ? cur.filter((o) => o !== order) : [...cur, order],
    );
  }

  const current = roadmap.sections.find((s) => s.isCurrent);
  const waitingOn = current
    ? members.filter((m) => !current.clearedBy.has(m.user_id))
    : [];

  return (
    <>
      {current && current.clearedByMe && waitingOn.length > 0 && (
        <Card className="mb-4 bg-gold-tint">
          <p className="text-[12.5px] font-bold text-gold-ink">
            You&apos;re done with {current.title}. Waiting on the rest of the squad.
          </p>
          <ul className="mt-2 space-y-1">
            {waitingOn.map((m) => (
              <li key={m.user_id} className="text-[12px] text-ink-muted">
                {m.display_name} still has work left
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-2.5">
        {roadmap.sections.map((section) => {
          const isOpen = expanded.includes(section.order_index);
          const requiredNodes = section.nodes.filter(
            (n) => !n.is_optional && n.requirement_type !== 'quiz',
          );
          const myDone = requiredNodes.filter((n) => n.status === 'done').length;
          const quizEligible = myDone === requiredNodes.length;

          return (
            <Card key={section.id} className={section.unlocked ? 'p-0' : 'p-0 opacity-60'}>
              <button
                type="button"
                onClick={() => toggle(section.order_index)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <PhaseHeader
                    section={section}
                    cleared={section.clearedBy.size}
                    memberCount={members.length}
                  />
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-ink-faint transition-transform"
                  style={{ transform: `rotate(${isOpen ? 90 : 0}deg)` }}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              {section.unlocked && requiredNodes.length > 0 && (
                <div className="px-4 pb-4">
                  <Meter value={myDone / requiredNodes.length} height={6} />
                </div>
              )}

              {isOpen && (
                <div className="border-t border-hairline px-4 pt-4 pb-4">
                  <div>
                    {section.nodes.map((node, i) => (
                      <NodeRow
                        key={node.id}
                        node={node}
                        locked={!section.unlocked}
                        isLast={i === section.nodes.length - 1}
                        onOpen={() => setOpenNodeId(node.id)}
                      />
                    ))}
                  </div>

                  {section.quiz && (
                    <div className="mt-1">
                      <QuizRow
                        section={section}
                        groupId={groupId}
                        locked={!section.unlocked}
                        eligible={quizEligible}
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {openNode && openSection && (
        <NodePanel
          node={openNode}
          groupId={groupId}
          groupRoadmapId={roadmap.groupRoadmapId}
          members={members}
          locked={!openSection.unlocked}
          onClose={() => setOpenNodeId(null)}
        />
      )}
    </>
  );
}
