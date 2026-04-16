"use client";

/**
 * TanStack Query hooks for athlete CRUD operations.
 *
 * useAthletes()      — list all athletes
 * useAthlete(id)     — fetch a single athlete by ID
 * useCreateAthlete() — mutation to create a new athlete
 * useUpdateAthlete() — mutation to update (PATCH) an athlete
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  athleteKeys,
  createAthlete,
  fetchAthlete,
  fetchAthletes,
  updateAthlete,
  type Athlete,
} from "@/lib/api/athletes";
import type { UpdateAthleteInput } from "@/lib/validation/athlete";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the full athlete list.
 *
 * When `initialData` is provided (typically from the RSC dashboard page),
 * the query is pre-populated and stays fresh for 30 s — avoiding a redundant
 * background refetch right after hydration.  Explicit invalidation (from
 * mutations like create/update) still overrides the stale window immediately.
 */
export function useAthletes(initialData?: Athlete[]) {
  return useQuery({
    queryKey: athleteKeys.list(),
    queryFn: fetchAthletes,
    initialData,
    staleTime: initialData ? 30_000 : 0,
  });
}

export function useAthlete(id: string) {
  return useQuery({
    queryKey: athleteKeys.detail(id),
    queryFn: () => fetchAthlete(id),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAthlete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: athleteKeys.list() });
    },
  });
}

export function useUpdateAthlete(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAthleteInput) => updateAthlete(id, input),
    onSuccess: (updatedAthlete: Athlete) => {
      // Replace cache entry with the server response (includes updated_at etc.)
      queryClient.setQueryData(athleteKeys.detail(id), updatedAthlete);
      // Invalidate the list so the dashboard reflects any changes
      void queryClient.invalidateQueries({ queryKey: athleteKeys.list() });
    },
    retry: 1,
  });
}
