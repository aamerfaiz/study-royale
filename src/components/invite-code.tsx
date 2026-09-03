'use client';

import { useState } from 'react';

export function InviteCode({ code, full }: { code: string; full: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const link = `${window.location.origin}/groups/new?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — the code is
      // on screen either way, so there's nothing to recover from.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-lg tracking-[0.25em] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
        {code}
      </code>
      <button
        onClick={copy}
        disabled={full}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {copied ? 'Copied' : 'Copy invite link'}
      </button>
      {full && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Group is full
        </span>
      )}
    </div>
  );
}
