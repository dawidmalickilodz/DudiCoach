/**
 * Client-side fetch functions and TanStack Query key factory for share actions.
 * These functions hit POST /api/athletes/[id]/share.
 */

export type ShareAction = "activate" | "deactivate" | "reset";

export interface ShareActionResult {
  share_code: string;
  share_active: boolean;
}

// ---------------------------------------------------------------------------
// Query key factory (consistent with lib/api/athletes.ts pattern)
// ---------------------------------------------------------------------------

export const shareKeys = {
  all: ["share"] as const,
  detail: (athleteId: string) => [...shareKeys.all, "detail", athleteId] as const,
};

// ---------------------------------------------------------------------------
// Mutation function
// ---------------------------------------------------------------------------

/**
 * Calls POST /api/athletes/[id]/share with the given action.
 * Throws an Error with the server message on non-2xx responses.
 */
export async function shareAction(
  athleteId: string,
  action: ShareAction,
): Promise<ShareActionResult> {
  const res = await fetch(`/api/athletes/${athleteId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Share action failed");
  }

  const json = (await res.json()) as { data: ShareActionResult };
  return json.data;
}
