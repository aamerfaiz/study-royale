'use client';

import { useState } from 'react';

export function InviteCode({ code, full }: { code: string; full: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/join?code=${code}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied permission). The code is
      // on screen either way, so there's nothing to recover from.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-display text-[20px] font-bold tracking-[0.06em] text-accent">
        {code}
      </span>
      <button
        onClick={copy}
        disabled={full}
        className="shrink-0 rounded-full border-[1.5px] border-accent px-3.5 py-1.5 text-[12px] font-bold text-accent transition hover:bg-accent-tint disabled:border-hairline-strong disabled:text-ink-faint"
      >
        {full ? 'Group full' : copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
