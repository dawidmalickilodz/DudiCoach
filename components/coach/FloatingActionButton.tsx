"use client";

import { pl } from "@/lib/i18n/pl";

/**
 * Floating Action Button — fixed bottom-right, opens the create athlete dialog.
 * Only shown on the dashboard (not the editor page).
 */
interface FloatingActionButtonProps {
  onClick: () => void;
}

export default function FloatingActionButton({
  onClick,
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={pl.coach.dashboard.addAthlete}
      className="bg-primary text-primary-foreground fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-light shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span aria-hidden="true">+</span>
    </button>
  );
}
