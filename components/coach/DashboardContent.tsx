"use client";

import { useState } from "react";

import { pl } from "@/lib/i18n/pl";
import { useAthletes } from "@/lib/hooks/use-athletes";
import type { Athlete } from "@/lib/api/athletes";
import AthleteCard from "./AthleteCard";
import AthleteStatsBar from "./AthleteStatsBar";
import FloatingActionButton from "./FloatingActionButton";
import CreateAthleteDialog from "./CreateAthleteDialog";

interface DashboardContentProps {
  /** Initial data from the RSC page for instant render without loading state */
  initialAthletes: Athlete[];
}

/**
 * Client-side dashboard content.
 * Uses TanStack Query initialized with server-fetched data (no loading flash).
 * Manages the create-athlete dialog state.
 */
export default function DashboardContent({
  initialAthletes,
}: DashboardContentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: athletes = [], isError } = useAthletes(initialAthletes);

  if (isError) {
    return (
      <div className="bg-card border-border rounded-card border px-6 py-12 text-center">
        <p className="text-destructive text-sm">{pl.common.error}</p>
      </div>
    );
  }

  return (
    <>
      {athletes.length > 0 ? (
        <>
          <AthleteStatsBar count={athletes.length} />

          {/* Responsive grid: 1 col on mobile, 2 on sm+, 3 on lg+ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {athletes.map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="bg-card border-border rounded-card border px-6 py-12 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            {pl.coach.dashboard.noAthletes}
          </p>
          <p className="text-muted-foreground text-sm">
            {pl.coach.dashboard.noAthletesCta}
          </p>
        </div>
      )}

      {/* FAB — always visible on dashboard */}
      <FloatingActionButton onClick={() => setIsDialogOpen(true)} />

      {/* Create athlete dialog */}
      <CreateAthleteDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
