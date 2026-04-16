"use client";

import { pl } from "@/lib/i18n/pl";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/lib/hooks/use-realtime-athlete";

interface SyncIndicatorProps {
  status: ConnectionStatus;
}

/**
 * Visual indicator for the realtime connection status.
 * - connected   → green dot + "Zsynchronizowano"
 * - connecting  → pulsing yellow dot + "Łączę..."
 * - disconnected → pulsing red dot + "Łączę..."
 */
export default function SyncIndicator({ status }: SyncIndicatorProps) {
  const label =
    status === "connected"
      ? pl.athletePanel.syncedJustNow
      : pl.athletePanel.syncing;

  const dotClasses = cn(
    "h-2 w-2 rounded-full",
    status === "connected" && "bg-green-500",
    status === "connecting" && "bg-yellow-500 animate-pulse",
    status === "disconnected" && "bg-red-500 animate-pulse",
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <span aria-hidden="true" className={dotClasses} />
      <span>{label}</span>
    </div>
  );
}
