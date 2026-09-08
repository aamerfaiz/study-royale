'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { completeNodeAction, type NodeActionState } from '@/lib/actions/roadmap';
import { StudySession } from '@/components/study-session';
import { Lesson } from '@/components/lesson';
import { Avatar, Badge, Button, FormError, Meter } from '@/components/ui';
import { REQUIREMENT_LABEL, REQUIREMENT_TONE } from '@/components/roadmap/node-icons';
import type { RoadmapNodeView } from '@/lib/roadmap';
import { useState } from 'react';

export type PanelMember = { user_id: string; display_name: string; avatar_url: string | null };

export function NodePanel({
  node,
  groupId,
  groupRoadmapId,
  members,
  locked,
  onClose,
}: {
  node: RoadmapNodeView;
  groupId: string;
  groupRoadmapId: string;
  members: PanelMember[];
  locked: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [studying, setStudying] = useState(false);
  const [state, action, pending] = useActionState<NodeActionState, FormData>(
    completeNodeAction,
    null,
  );

  const done = node.status === 'done';
  const statusFor = (userId: string) =>
    node.memberStatus.find((m) => m.user_id === userId)?.status ?? 'not_started';

  if (studying) {
    return (
      <StudySession
        groupId={groupId}
        nodeId={node.id}
        nodeTitle={node.title}
        nodeSubtitle={
          node.requirement_value
            ? `${node.minutesLogged} of ${node.requirement_value} min logged`
            : undefined
        }
        onClose={() => {
          setStudying(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 flex bg-black/35 lg:justify-end"
      onClick={onClose}
    >
      <div
        className="animate-slide-up mt-auto flex max-h-[92dvh] w-full flex-col rounded-t-[24px] bg-surface lg:animate-none lg:mt-0 lg:h-full lg:max-h-none lg:w-[460px] lg:rounded-none lg:border-l lg:border-hairline"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-3 lg:pt-5">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline lg:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={REQUIREMENT_TONE[node.requirement_type]}>
                {REQUIREMENT_LABEL[node.requirement_type]}
              </Badge>
              {node.is_optional && <Badge>Optional</Badge>}
              {done && <Badge tone="success">Done</Badge>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-strong transition hover:bg-hairline"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <h2 className="font-display mt-3 text-[19px] leading-snug font-semibold">
            {node.title}
          </h2>
          {node.description && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              {node.description}
            </p>
          )}
        </div>

        {/* The lesson is the point of the panel, so it gets the scroll area. */}
        <div className="scrollarea min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {node.content ? (
            <Lesson content={node.content} />
          ) : (
            <p className="rounded-tile bg-sunken p-4 text-[13px] leading-relaxed text-ink-muted">
              This one is a checkpoint rather than a lesson — the description
              above is all you need.
            </p>
          )}

          {node.resource_url && (
            <a
              href={node.resource_url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted underline underline-offset-2 transition hover:text-accent"
            >
              Go deeper on this ↗
            </a>
          )}

          <div className="mt-7">
            <p className="text-[11.5px] font-bold tracking-[0.02em] text-ink-muted uppercase">
              Squad progress
            </p>
            <ul className="mt-2.5 space-y-2">
              {members.map((m) => {
                const s = statusFor(m.user_id);
                return (
                  <li key={m.user_id} className="flex items-center gap-2.5">
                    <Avatar name={m.display_name} src={m.avatar_url} seed={m.user_id} size={26} />
                    <span className="flex-1 truncate text-[12.5px] font-semibold">
                      {m.display_name}
                    </span>
                    <span
                      className={
                        s === 'done'
                          ? 'text-[11.5px] font-bold text-success'
                          : s === 'in_progress'
                            ? 'text-[11.5px] font-bold text-accent'
                            : 'text-[11.5px] font-semibold text-ink-faint'
                      }
                    >
                      {s === 'done' ? 'Done' : s === 'in_progress' ? 'In progress' : 'Not started'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="shrink-0 border-t border-hairline px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {node.requirement_type === 'time' && node.requirement_value && !done && (
            <div className="mb-3">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[12px] text-ink-muted">
                  {node.minutesLogged} of {node.requirement_value} min
                </span>
                <span className="text-[12px] text-ink-faint">
                  {Math.max(node.requirement_value - node.minutesLogged, 0)} to go
                </span>
              </div>
              <Meter value={node.minutesLogged / node.requirement_value} height={6} />
            </div>
          )}

          {state && 'error' in state && <FormError>{state.error}</FormError>}

          {locked ? (
            <p className="rounded-control bg-sunken px-3.5 py-3 text-center text-[12.5px] text-ink-muted">
              Unlocks once your group clears the phases before this one.
            </p>
          ) : done ? (
            <Button disabled className="w-full bg-success-tint text-success-ink">
              Completed ✓
            </Button>
          ) : node.requirement_type === 'time' ? (
            <Button className="w-full" onClick={() => setStudying(true)}>
              Study this
            </Button>
          ) : (
            <form action={action}>
              <input type="hidden" name="group_id" value={groupId} />
              <input type="hidden" name="group_roadmap_id" value={groupRoadmapId} />
              <input type="hidden" name="roadmap_node_id" value={node.id} />
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Saving…' : 'Mark as done'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
