"use client";

import { useRouter } from "next/navigation";

import { pl } from "@/lib/i18n/pl";
import { useRealtimeAthlete } from "@/lib/hooks/use-realtime-athlete";
import type { AthletePublic } from "@/lib/types/athlete-public";
import SyncIndicator from "./SyncIndicator";
import AthleteProfileView from "./AthleteProfileView";

interface AthletePanelProps {
  shareCode: string;
  initialData: AthletePublic;
}

/**
 * Top-level client component for the athlete panel.
 * Owns the realtime subscription and renders profile + sync status.
 *
 * Disconnect navigates back to the home page (clears any stored access).
 */
export default function AthletePanel({
  shareCode,
  initialData,
}: AthletePanelProps) {
  const router = useRouter();
  const { athlete, connectionStatus } = useRealtimeAthlete({
    shareCode,
    initialData,
  });

  function handleDisconnect() {
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-foreground text-xl font-semibold">
          {pl.athletePanel.loginTitle}
        </h1>
        <SyncIndicator status={connectionStatus} />
      </header>

      <AthleteProfileView athlete={athlete} />

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleDisconnect}
          className="text-muted-foreground hover:text-foreground rounded-pill border border-border px-4 py-1.5 text-xs font-medium transition-colors"
        >
          {pl.athletePanel.disconnect}
        </button>
      </div>
    </div>
  );
}
