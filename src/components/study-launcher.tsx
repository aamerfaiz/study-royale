'use client';

import { useState } from 'react';
import { StudySession } from '@/components/study-session';
import { Button } from '@/components/ui';

/**
 * Opens the study-session flow. Kept separate from the flow itself so server
 * components can drop a trigger anywhere without pulling in the timer.
 */
export function StudyLauncher({
  groupId,
  nodeId,
  nodeTitle,
  nodeSubtitle,
  label = 'Start a session',
  variant = 'primary',
  className,
}: {
  groupId: string;
  nodeId?: string;
  nodeTitle?: string;
  nodeSubtitle?: string;
  label?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <StudySession
          groupId={groupId}
          nodeId={nodeId}
          nodeTitle={nodeTitle}
          nodeSubtitle={nodeSubtitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
