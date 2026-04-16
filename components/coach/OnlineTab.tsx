"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { pl } from "@/lib/i18n/pl";
import { athleteKeys, type Athlete } from "@/lib/api/athletes";
import { shareAction } from "@/lib/api/share";
import ShareCodeDisplay from "./ShareCodeDisplay";
import ShareLink from "./ShareLink";

interface OnlineTabProps {
  athlete: Athlete;
}

/**
 * "Online" tab in the athlete editor.
 * Allows the coach to activate/deactivate sharing and reset the share code.
 *
 * State A (share_active = false): shows inactive state + activate button.
 * State B (share_active = true): shows share code, link, deactivate + reset buttons.
 *
 * After any mutation: invalidates the athlete detail cache so the shell refreshes.
 *
 * See: docs/design/US-004-design.md §9
 */
export default function OnlineTab({ athlete }: OnlineTabProps) {
  const queryClient = useQueryClient();
  const [localShareState, setLocalShareState] = useState(() => ({
    athleteId: athlete.id,
    shareActive: athlete.share_active,
    shareCode: athlete.share_code,
  }));

  const isLocalStateCurrent = localShareState.athleteId === athlete.id;
  const shareActive = isLocalStateCurrent
    ? localShareState.shareActive
    : athlete.share_active;
  const shareCode = isLocalStateCurrent
    ? localShareState.shareCode
    : athlete.share_code;

  function onMutationSuccess(data: { share_active: boolean; share_code: string }) {
    setLocalShareState({
      athleteId: athlete.id,
      shareActive: data.share_active,
      shareCode: data.share_code,
    });
    void queryClient.invalidateQueries({
      queryKey: athleteKeys.detail(athlete.id),
    });
  }

  const activateMutation = useMutation({
    mutationFn: () => shareAction(athlete.id, "activate"),
    onSuccess: onMutationSuccess,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => shareAction(athlete.id, "deactivate"),
    onSuccess: onMutationSuccess,
  });

  const resetMutation = useMutation({
    mutationFn: () => shareAction(athlete.id, "reset"),
    onSuccess: onMutationSuccess,
  });

  const anyPending =
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    resetMutation.isPending;

  const anyError =
    activateMutation.error ?? deactivateMutation.error ?? resetMutation.error;

  function handleReset() {
    if (window.confirm(pl.coach.athlete.online.resetConfirmMessage)) {
      resetMutation.mutate();
    }
  }

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      {!shareActive ? (
        /* State A: sharing inactive */
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              {pl.coach.athlete.online.inactiveTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {pl.coach.athlete.online.inactiveHint}
            </p>
          </div>

          <button
            type="button"
            disabled={anyPending}
            onClick={() => activateMutation.mutate()}
            className="rounded-[6px] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {activateMutation.isPending
              ? pl.coach.athlete.online.activating
              : pl.coach.athlete.online.activate}
          </button>
        </div>
      ) : (
        /* State B: sharing active */
        <div className="space-y-6">
          {/* Share code */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {pl.coach.athlete.online.accessCodeLabel}
            </p>
            <ShareCodeDisplay code={shareCode} />
          </div>

          {/* Share link */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {pl.coach.athlete.online.accessLinkLabel}
            </p>
            <ShareLink shareCode={shareCode} />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={anyPending}
              onClick={() => deactivateMutation.mutate()}
              className="rounded-[6px] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-destructive)] hover:text-[var(--color-destructive)] disabled:opacity-50"
            >
              {deactivateMutation.isPending
                ? pl.coach.athlete.online.deactivating
                : pl.coach.athlete.online.deactivate}
            </button>

            <button
              type="button"
              disabled={anyPending}
              onClick={handleReset}
              className="rounded-[6px] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] disabled:opacity-50"
            >
              {resetMutation.isPending
                ? pl.coach.athlete.online.resetting
                : pl.coach.athlete.online.reset}
            </button>
          </div>
        </div>
      )}

      {/* Error feedback */}
      {anyError && (
        <p
          role="alert"
          className="mt-4 text-sm text-[var(--color-destructive)]"
        >
          {pl.coach.athlete.online.errorGeneric}
        </p>
      )}
    </div>
  );
}
