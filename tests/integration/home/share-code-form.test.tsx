/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ShareCodeForm from "@/components/home/ShareCodeForm";
import { pl } from "@/lib/i18n/pl";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

function renderForm() {
  render(<ShareCodeForm />);
  const input = screen.getByLabelText(pl.home.athletePanelTitle) as HTMLInputElement;
  const button = screen.getByRole("button", { name: pl.athletePanel.connect });
  const form = input.closest("form") as HTMLFormElement;

  return { input, button, form };
}

describe("ShareCodeForm integration", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("normalizes input and enables submit once 6 chars are present", () => {
    const { input, button } = renderForm();

    fireEvent.change(input, { target: { value: "ab c2" } });
    expect(input.value).toBe("ABC2");
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "ab 1c2d" } });
    expect(input.value).toBe("AB1C2D");
    expect(button).not.toBeDisabled();

    fireEvent.change(input, { target: { value: "ab c2d3" } });
    expect(input.value).toBe("ABC2D3");
    expect(button).not.toBeDisabled();
  });

  it("shows format error and does not call fetch when format is invalid", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { input, button } = renderForm();

    fireEvent.change(input, { target: { value: "ab 10o2" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        pl.athletePanel.errorInvalidCodeFormat,
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows loading + disabled state during submit and navigates on success", async () => {
    let resolveFetch!: (value: { ok: boolean; status: number }) => void;
    const fetchPromise = new Promise<{ ok: boolean; status: number }>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(fetchPromise);
    vi.stubGlobal("fetch", fetchMock);

    const { input, button } = renderForm();

    fireEvent.change(input, { target: { value: "ab c2d3" } });
    fireEvent.click(button);

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
    expect(screen.getByRole("button")).toHaveTextContent(pl.athletePanel.connecting);

    resolveFetch({ ok: true, status: 200 });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/ABC2D3");
    });
  });

  it("shows invalid-code error for 404 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    const { input, button } = renderForm();

    fireEvent.change(input, { target: { value: "abc2d3" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(pl.athletePanel.errorInvalidCode);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows lookup error for non-404 server and network failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    const { input, button } = renderForm();

    fireEvent.change(input, { target: { value: "abc2d3" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(pl.athletePanel.errorLookupFailed);
    });

    fireEvent.change(input, { target: { value: "abc2d3" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(pl.athletePanel.errorLookupFailed);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
