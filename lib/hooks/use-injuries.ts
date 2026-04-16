"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createInjury,
  deleteInjury,
  fetchInjuries,
  injuryKeys,
  updateInjury,
  type Injury,
} from "@/lib/api/injuries";
import type {
  CreateInjuryInput,
  UpdateInjuryInput,
} from "@/lib/validation/injury";

export function useInjuries(athleteId: string) {
  return useQuery({
    queryKey: injuryKeys.list(athleteId),
    queryFn: () => fetchInjuries(athleteId),
  });
}

export function useCreateInjury(athleteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInjuryInput) => createInjury(athleteId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: injuryKeys.list(athleteId) });
    },
  });
}

interface UpdateInjuryMutationInput {
  injuryId: string;
  input: UpdateInjuryInput;
}

export function useUpdateInjury(athleteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ injuryId, input }: UpdateInjuryMutationInput) =>
      updateInjury(athleteId, injuryId, input),
    onSuccess: (updated: Injury) => {
      queryClient.setQueryData(
        injuryKeys.list(athleteId),
        (previous: Injury[] | undefined) =>
          previous?.map((injury) =>
            injury.id === updated.id ? updated : injury,
          ) ?? [updated],
      );
    },
  });
}

interface DeleteInjuryMutationInput {
  injuryId: string;
}

export function useDeleteInjury(athleteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ injuryId }: DeleteInjuryMutationInput) =>
      deleteInjury(athleteId, injuryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: injuryKeys.list(athleteId) });
    },
  });
}
