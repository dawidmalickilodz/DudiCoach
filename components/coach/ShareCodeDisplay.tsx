"use client";

import { useState } from "react";

import { pl } from "@/lib/i18n/pl";

interface ShareCodeDisplayProps {
  code: string;
}

/**
 * Renders the 6-char share code in large monospace with a Copy button.
 * Shows "Skopiowano!" inline for 2s after a successful copy.
 */
export default function ShareCodeDisplay({ code }: ShareCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silently ignore
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span
        className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-input)] px-4 py-3 font-mono text-2xl font-bold tracking-widest text-[var(--color-foreground)]"
        aria-label={pl.coach.athlete.online.accessCodeLabel}
      >
        {code}
      </span>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-[6px] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      >
        {copied ? pl.coach.athlete.online.copied : pl.coach.athlete.online.copy}
      </button>
    </div>
  );
}
