"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { pl } from "@/lib/i18n/pl";
import { useRealtimeAthlete } from "@/lib/hooks/use-realtime-athlete";
import type { AthletePublic } from "@/lib/types/athlete-public";
import type { Injury } from "@/lib/api/injuries";
import type { PublicTrainingPlan } from "@/lib/types/plan-public";
import SyncIndicator from "./SyncIndicator";
import AthleteProfileView from "./AthleteProfileView";
import InjuriesPublicSection from "./InjuriesPublicSection";
import PlanPublicSection from "./PlanPublicSection";

interface AthletePanelProps {
  shareCode: string;
  initialData: AthletePublic;
  initialInjuries: Injury[];
  initialPlan: PublicTrainingPlan | null;
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
  initialInjuries,
  initialPlan,
}: AthletePanelProps) {
  const router = useRouter();
  const [injuries, setInjuries] = useState<Injury[]>(initialInjuries);

  const refreshInjuries = useCallback(async () => {
    try {
      const response = await fetch(`/api/athlete/${shareCode}/injuries`);
      if (!response.ok) return;
      const json = (await response.json()) as { data?: Injury[] };
      if (Array.isArray(json.data)) {
        setInjuries(json.data);
      }
    } catch {
      // Keep current values; next realtime event or reconnect retries.
    }
  }, [shareCode]);

  const { athlete, connectionStatus } = useRealtimeAthlete({
    shareCode,
    initialData,
    onInjuriesChanged: () => {
      void refreshInjuries();
    },
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
      <div className="mt-4">
        <InjuriesPublicSection injuries={injuries} />
      </div>
      <div className="mt-4">
        <PlanPublicSection plan={initialPlan} />
      </div>

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
