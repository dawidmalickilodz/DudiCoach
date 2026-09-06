import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard } from "@/lib/utils/clipboard";

describe("copyToClipboard", () => {
  const originalNavigator = { ...navigator };

  beforeEach(() => {
    vi.stubGlobal("document", {
      ...document,
      execCommand: vi.fn().mockReturnValue(true),
      createElement: vi.fn().mockReturnValue({
        value: "",
        style: {},
        select: vi.fn(),
      }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...originalNavigator,
      clipboard: { writeText },
    });

    const result = await copyToClipboard("ABC234");
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith("ABC234");
  });

  it("falls back to execCommand when clipboard API throws", async () => {
    vi.stubGlobal("navigator", {
      ...originalNavigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const result = await copyToClipboard("ABC234");
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("falls back to execCommand when clipboard API is unavailable", async () => {
    vi.stubGlobal("navigator", {
      ...originalNavigator,
      clipboard: undefined,
    });

    const result = await copyToClipboard("ABC234");
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("returns false when both methods fail", async () => {
    vi.stubGlobal("navigator", {
      ...originalNavigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    (document.execCommand as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const result = await copyToClipboard("ABC234");
    expect(result).toBe(false);
  });
});
