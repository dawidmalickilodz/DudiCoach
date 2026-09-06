"use client";

import { useState } from "react";

import { pl } from "@/lib/i18n/pl";
import { copyToClipboard } from "@/lib/utils/clipboard";

interface ShareLinkProps {
  shareCode: string;
}

/**
 * Builds the full athlete panel URL from the share code and displays it
 * with a Copy button. URL is constructed client-side only (safe after hydration).
 */
export default function ShareLink({ shareCode }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  // Build URL client-side — window is only available in the browser
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/${shareCode}`
      : `/${shareCode}`;

  async function handleCopy() {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-muted-foreground truncate font-mono text-sm">{url}</p>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-input shrink-0 border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {copied ? pl.coach.athlete.online.copied : pl.coach.athlete.online.copy}
      </button>
    </div>
  );
}
