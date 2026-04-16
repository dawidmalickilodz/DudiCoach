/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

import type { Athlete } from "@/lib/api/athletes";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchAthletes = vi.fn<() => Promise<Athlete[]>>();

vi.mock("@/lib/api/athletes", () => ({
  athleteKeys: {
    all: ["athletes"] as const,
    list: () => ["athletes", "list"] as const,
    detail: (id: string) => ["athletes", "detail", id] as const,
  },
  fetchAthletes: (...args: unknown[]) => mockFetchAthletes(...(args as [])),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAthlete(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: "ath-1",
    coach_id: "coach-1",
    name: "Test Athlete",
    age: 25,
    weight_kg: 80,
    height_cm: 180,
    sport: "silownia",
    training_start_date: "2025-01-01",
    training_days_per_week: 4,
    session_minutes: 60,
    current_phase: "base",
    goal: null,
    notes: null,
    share_code: "ABC123",
    share_active: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Disable garbage collection so cache stays around for assertions.
        gcTime: Infinity,
      },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return { Wrapper, queryClient };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Dynamic import so vi.mock is resolved before the module loads.
async function importHook() {
  const mod = await import("@/lib/hooks/use-athletes");
  return mod;
}

describe("useAthletes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAthletes.mockResolvedValue([]);
  });

  it("fetches immediately when no initialData is provided", async () => {
    const serverData = [makeAthlete()];
    mockFetchAthletes.mockResolvedValueOnce(serverData);

    const { Wrapper } = createWrapper();
    const { useAthletes } = await importHook();

    const { result } = renderHook(() => useAthletes(), { wrapper: Wrapper });

    // Should start without data and then fetch.
    await waitFor(() => {
      expect(result.current.data).toEqual(serverData);
    });

    expect(mockFetchAthletes).toHaveBeenCalledTimes(1);
  });

  it("uses initialData immediately and does NOT fetch within stale window", async () => {
    const ssrAthletes = [makeAthlete({ name: "SSR Athlete" })];

    const { Wrapper } = createWrapper();
    const { useAthletes } = await importHook();

    const { result } = renderHook(() => useAthletes(ssrAthletes), {
      wrapper: Wrapper,
    });

    // Data is available synchronously — no loading state.
    expect(result.current.data).toEqual(ssrAthletes);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);

    // queryFn was NOT called — staleTime prevents background refetch.
    expect(mockFetchAthletes).not.toHaveBeenCalled();
  });

  it("returns initialData without overwriting cache with undefined", async () => {
    const ssrAthletes = [
      makeAthlete({ id: "a1", name: "Alice" }),
      makeAthlete({ id: "a2", name: "Bob" }),
    ];

    const { Wrapper } = createWrapper();
    const { useAthletes } = await importHook();

    const { result } = renderHook(() => useAthletes(ssrAthletes), {
      wrapper: Wrapper,
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]?.name).toBe("Alice");
    expect(result.current.data?.[1]?.name).toBe("Bob");
  });

  it("refetches after invalidation even within stale window", async () => {
    const ssrAthletes = [makeAthlete({ name: "SSR" })];
    const freshAthletes = [makeAthlete({ name: "Fresh" })];
    mockFetchAthletes.mockResolvedValueOnce(freshAthletes);

    const { Wrapper, queryClient } = createWrapper();
    const { useAthletes } = await importHook();

    const { result } = renderHook(() => useAthletes(ssrAthletes), {
      wrapper: Wrapper,
    });

    // Initially has SSR data, no fetch yet.
    expect(result.current.data?.[0]?.name).toBe("SSR");
    expect(mockFetchAthletes).not.toHaveBeenCalled();

    // Simulate mutation invalidation (like useCreateAthlete.onSuccess).
    void queryClient.invalidateQueries({ queryKey: ["athletes", "list"] });

    await waitFor(() => {
      expect(result.current.data?.[0]?.name).toBe("Fresh");
    });

    expect(mockFetchAthletes).toHaveBeenCalledTimes(1);
  });
});
