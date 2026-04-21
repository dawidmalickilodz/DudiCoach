"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createFitnessTest,
  deleteFitnessTest,
  getFitnessTests,
  fitnessTestKeys,
} from "@/lib/api/fitness-tests";
import type { CreateFitnessTestResultInput } from "@/lib/validation/fitness-test";

export function useFitnessTests(athleteId: string) {
  return useQuery({
    queryKey: fitnessTestKeys.list(athleteId),
    queryFn: () => getFitnessTests(athleteId),
  });
}

export function useCreateFitnessTest(athleteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFitnessTestResultInput) =>
      createFitnessTest(athleteId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: fitnessTestKeys.list(athleteId),
      });
    },
  });
}

interface DeleteFitnessTestMutationInput {
  testId: string;
}

export function useDeleteFitnessTest(athleteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testId }: DeleteFitnessTestMutationInput) =>
      deleteFitnessTest(athleteId, testId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: fitnessTestKeys.list(athleteId),
      });
    },
  });
}
