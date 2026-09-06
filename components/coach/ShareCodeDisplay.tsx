"use client";

import { useState } from "react";

import { pl } from "@/lib/i18n/pl";
import { copyToClipboard } from "@/lib/utils/clipboard";

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
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span
        className="rounded-input border border-border bg-input px-4 py-3 font-mono text-2xl font-bold tracking-widest text-foreground"
        aria-label={pl.coach.athlete.online.accessCodeLabel}
      >
        {code}
      </span>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-input border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {copied ? pl.coach.athlete.online.copied : pl.coach.athlete.online.copy}
      </button>
    </div>
  );
}
