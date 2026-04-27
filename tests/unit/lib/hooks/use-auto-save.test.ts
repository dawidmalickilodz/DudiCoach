/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { pl } from "@/lib/i18n/pl";
import type { UseFormWatch, FieldValues } from "react-hook-form";

// ---------------------------------------------------------------------------
// Helpers — build minimal react-hook-form substitutes
// ---------------------------------------------------------------------------

/**
 * Creates a mock `watch` function that records its subscription callback
 * so tests can trigger it manually (simulating a form value change).
 */
function makeMockWatch() {
  let _callback: ((values: Record<string, unknown>) => void) | null = null;
  const unsubscribe = vi.fn();

  const watch = vi.fn((callback: (values: Record<string, unknown>) => void) => {
    _callback = callback;
    return { unsubscribe };
  }) as unknown as UseFormWatch<FieldValues>;

  function triggerChange(values: Record<string, unknown> = { name: "Jan" }) {
    _callback?.(values);
  }

  return { watch, triggerChange, unsubscribe };
}

function makeFormState(hasErrors = false) {
  return {
    errors: hasErrors ? { name: { message: "required" } } : {},
  } as ReturnType<typeof import("react-hook-form").useForm>["formState"];
}

function makeMutableFormState() {
  const state = {
    errors: {},
  } as ReturnType<typeof import("react-hook-form").useForm>["formState"];

  function setErrors(next: Record<string, unknown>) {
    state.errors = next as typeof state.errors;
  }

  return { state, setErrors };
}

function makeSetError() {
  return vi.fn() as ReturnType<typeof import("react-hook-form").useForm>["setError"];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ---- initial state -------------------------------------------------------

  it("starts with isSaving=false, lastSavedAt=null, saveError=null", () => {
    const { watch } = makeMockWatch();
    const { result } = renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn: vi.fn().mockResolvedValue(undefined),
      }),
    );

    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.saveError).toBeNull();
  });

  // ---- first render skip ---------------------------------------------------

  it("does NOT fire mutation on the first watch callback (form load / reset)", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { watch, triggerChange } = makeMockWatch();

    renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
      }),
    );

    // First fire is treated as the initial form load
    act(() => triggerChange());
    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mutationFn).not.toHaveBeenCalled();
  });

  // ---- debounce does not fire before 800ms ---------------------------------

  it("does NOT fire mutation before 800ms have elapsed", () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { watch, triggerChange } = makeMockWatch();

    renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
      }),
    );

    // Skip first-render
    act(() => triggerChange());

    // Second change — should start debounce
    act(() => triggerChange({ name: "Updated" }));

    // Only 799ms elapsed — mutation must NOT have fired
    act(() => {
      vi.advanceTimersByTime(799);
    });

    expect(mutationFn).not.toHaveBeenCalled();
  });

  // ---- debounce fires after 800ms ------------------------------------------

  it("fires mutation after exactly 800ms of silence", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { watch, triggerChange } = makeMockWatch();

    renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
      }),
    );

    // Skip first-render
    act(() => triggerChange());

    // Second change
    act(() => triggerChange({ name: "Updated" }));

    // Advance exactly 800ms
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  // ---- debounce resets on rapid changes ------------------------------------

  it("debounce resets when user types again before 800ms (only fires once after last change)", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { watch, triggerChange } = makeMockWatch();

    renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
      }),
    );

    // Skip first-render
    act(() => triggerChange());

    // Multiple rapid changes
    act(() => triggerChange({ name: "J" }));
    act(() => { vi.advanceTimersByTime(300); });
    act(() => triggerChange({ name: "Ja" }));
    act(() => { vi.advanceTimersByTime(300); });
    act(() => triggerChange({ name: "Jan" }));

    // Still before 800ms from last change
    act(() => { vi.advanceTimersByTime(799); });
    expect(mutationFn).not.toHaveBeenCalled();

    // Now cross the 800ms boundary
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  // ---- custom debounce interval --------------------------------------------

  it("respects custom debounceMs option", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { watch, triggerChange } = makeMockWatch();

    renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
        debounceMs: 1200,
      }),
    );

    // Skip first-render
    act(() => triggerChange());
    // Second change
    act(() => triggerChange({ name: "Updated" }));

    // At 800ms (default) — must NOT have fired yet
    act(() => { vi.advanceTimersByTime(800); });
    expect(mutationFn).not.toHaveBeenCalled();

    // After 1200ms from last change — must fire
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  // ---- skips when form has validation errors --------------------------------

  it("does NOT fire mutation when formState has errors", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { watch, triggerChange } = makeMockWatch();

    renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(true), // has errors
        setError: makeSetError(),
        mutationFn,
      }),
    );

    // Skip first-render
    act(() => triggerChange());
    // Second change with errors present
    act(() => triggerChange({ name: "" }));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mutationFn).not.toHaveBeenCalled();
  });

  it("replaces stale intermediate numeric snapshot and saves the final valid value (60, not 6)", async () => {
    const { watch, triggerChange } = makeMockWatch();
    const { state, setErrors } = makeMutableFormState();
    const setError = makeSetError();
    const mutationFn = vi.fn().mockImplementation(async (payload: Record<string, unknown>) => {
      const weight = payload.weight_kg as number | undefined;
      if (typeof weight === "number" && weight < 30) {
        throw new Error("Validation failed");
      }
      return undefined;
    });

    const { result, rerender } = renderHook(
      ({ formState }) =>
        useAutoSave({
          watch,
          formState,
          setError,
          mutationFn: mutationFn as (data: FieldValues) => Promise<unknown>,
        }),
      { initialProps: { formState: state } },
    );

    // Skip first-render callback.
    act(() => triggerChange({ weight_kg: 75 }));

    // User starts typing "60" and an intermediate "6" appears first.
    act(() => triggerChange({ weight_kg: 6 }));

    // Validation reports the intermediate value as invalid. Next keystroke to
    // "60" arrives while form still has stale error state.
    setErrors({ weight_kg: { message: "too low" } });
    rerender({ formState: state });
    act(() => triggerChange({ weight_kg: 60 }));

    // Validation catches up to the final value before debounce executes.
    // No extra user change is fired here.
    setErrors({});
    rerender({ formState: state });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(mutationFn).toHaveBeenCalledWith(
      expect.objectContaining({ weight_kg: 60 }),
    );
    expect(result.current.saveError).toBeNull();
  });

  it("skips mutation at execution time when form becomes invalid after scheduling", async () => {
    const { watch, triggerChange } = makeMockWatch();
    const { state, setErrors } = makeMutableFormState();
    const mutationFn = vi.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ formState }) =>
        useAutoSave({
          watch,
          formState,
          setError: makeSetError(),
          mutationFn,
        }),
      { initialProps: { formState: state } },
    );

    // Skip first-render callback.
    act(() => triggerChange({ weight_kg: 75 }));

    // Schedule save while valid.
    act(() => triggerChange({ weight_kg: 60 }));

    // Form turns invalid before debounce executes.
    setErrors({ weight_kg: { message: "too low" } });
    rerender({ formState: state });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mutationFn).not.toHaveBeenCalled();
    expect(result.current.saveError).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  // ---- isSaving state -------------------------------------------------------

  it("sets isSaving=true while mutation is in-flight", async () => {
    let resolveMutation!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveMutation = resolve;
    });
    const mutationFn = vi.fn().mockReturnValue(pendingPromise);
    const { watch, triggerChange } = makeMockWatch();

    const { result } = renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
      }),
    );

    // Skip first-render
    act(() => triggerChange());
    // Second change
    act(() => triggerChange({ name: "Jan" }));

    // Advance past debounce to start the mutation
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.isSaving).toBe(true);

    // Resolve the mutation
    await act(async () => {
      resolveMutation();
    });

    expect(result.current.isSaving).toBe(false);
  });

  // ---- lastSavedAt updates after success -----------------------------------

  it("sets lastSavedAt to a Date after successful mutation", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { watch, triggerChange } = makeMockWatch();

    const { result } = renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
      }),
    );

    expect(result.current.lastSavedAt).toBeNull();

    // Skip first-render
    act(() => triggerChange());
    // Second change
    act(() => triggerChange({ name: "Jan" }));

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  // ---- error handling -------------------------------------------------------

  it("sets saveError to pl.common.error (not raw message) when mutation throws and publicErrorMessage is absent", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("Network failure"));
    const setError = makeSetError();
    const { watch, triggerChange } = makeMockWatch();

    const { result } = renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError,
        mutationFn,
        // publicErrorMessage intentionally omitted — hook must NOT leak raw message
      }),
    );

    // Skip first-render
    act(() => triggerChange());
    // Second change
    act(() => triggerChange({ name: "Jan" }));

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // Must use pl.common.error fallback — never the raw Error.message
    expect(result.current.saveError).toBe(pl.common.error);
    expect(result.current.saveError).not.toBe("Network failure");
    expect(result.current.isSaving).toBe(false);
  });

  it("calls setError('root', ...) with pl.common.error when no publicErrorMessage is provided", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("internal DB error"));
    const setError = makeSetError();
    const { watch, triggerChange } = makeMockWatch();

    renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError,
        mutationFn,
      }),
    );

    // Skip first-render
    act(() => triggerChange());
    // Second change
    act(() => triggerChange({ name: "Jan" }));

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(setError).toHaveBeenCalledWith("root", { message: pl.common.error });
  });

  it("returns pl.common.error fallback when thrown value is not an Error instance", async () => {
    const mutationFn = vi.fn().mockRejectedValue("string error");
    const { watch, triggerChange } = makeMockWatch();

    const { result } = renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
      }),
    );

    // Skip first-render
    act(() => triggerChange());
    // Second change
    act(() => triggerChange({ name: "Jan" }));

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.saveError).toBe(pl.common.error);
  });

  it("clears saveError before each new save attempt", async () => {
    let callCount = 0;
    const mutationFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error("First fail"));
      return Promise.resolve(undefined);
    });
    const { watch, triggerChange } = makeMockWatch();

    const { result } = renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn,
      }),
    );

    // First cycle — will fail; saveError must be set to safe fallback (not raw message)
    act(() => triggerChange());         // skip first-render
    act(() => triggerChange({ name: "A" }));
    await act(async () => { vi.advanceTimersByTime(800); });
    expect(result.current.saveError).toBe(pl.common.error);

    // Second cycle — should succeed and clear the error
    act(() => triggerChange({ name: "B" }));
    await act(async () => { vi.advanceTimersByTime(800); });
    expect(result.current.saveError).toBeNull();
  });

  it("uses publicErrorMessage and does not expose raw mutation error", async () => {
    const rawMessage = "DB timeout: relation athletes not found";
    const mutationFn = vi.fn().mockRejectedValue(new Error(rawMessage));
    const setError = makeSetError();
    const { watch, triggerChange } = makeMockWatch();

    const { result } = renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError,
        mutationFn,
        publicErrorMessage: "Nie udało się zapisać zmian.",
      }),
    );

    act(() => triggerChange()); // skip first-render
    act(() => triggerChange({ name: "Jan" }));

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.saveError).toBe("Nie udało się zapisać zmian.");
    expect(setError).toHaveBeenCalledWith("root", {
      message: "Nie udało się zapisać zmian.",
    });
    expect(result.current.saveError).not.toContain("relation athletes");
  });

  // ---- cleanup on unmount ---------------------------------------------------

  it("unsubscribes watch and clears timer on unmount", () => {
    const { watch, unsubscribe } = makeMockWatch();

    const { unmount } = renderHook(() =>
      useAutoSave({
        watch,
        formState: makeFormState(),
        setError: makeSetError(),
        mutationFn: vi.fn().mockResolvedValue(undefined),
      }),
    );

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
