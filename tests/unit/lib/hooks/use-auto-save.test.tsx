import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAutoSave } from "@/lib/hooks/use-auto-save";

describe("useAutoSave", () => {
  it("saves changed values after debounce and sets saved state", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);

    let values = { name: "Jan" };
    const { result, rerender } = renderHook(
      ({ currentValues }) =>
        useAutoSave({
          values: currentValues,
          enabled: true,
          onSave,
          debounceMs: 800,
          savedVisibleMs: 1500,
        }),
      { initialProps: { currentValues: values } },
    );

    expect(result.current.status).toBe("idle");

    values = { name: "Jan Kowalski" };
    rerender({ currentValues: values });

    await act(async () => {
      vi.advanceTimersByTime(801);
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("saved");

    act(() => {
      vi.advanceTimersByTime(1501);
    });

    expect(result.current.status).toBe("idle");
    vi.useRealTimers();
  });
});
