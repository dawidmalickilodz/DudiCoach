/// <reference types="vitest/globals" />

import { beforeEach, vi } from "vitest";

/**
 * Integration tests for updateSession() in lib/supabase/middleware.ts.
 *
 * Strategy:
 *   - Mock @supabase/ssr so createServerClient() returns a client whose
 *     auth.getUser() reads from a shared variable (set per-test via setMockUser).
 *   - Mock next/server with lightweight implementations so the module loads
 *     and runs in the happy-dom environment without real Next.js internals.
 *
 * We verify the redirect logic only — not cookie machinery.
 *
 * vi.mock factories are hoisted before any variable declarations. All shared
 * state is created via vi.hoisted() so it exists when the factories run.
 */

// ---- Shared state + mock classes, created before vi.mock hoisting ----
const mocks = vi.hoisted(() => {
  // Controls what auth.getUser() returns in each test.
  let _mockUser: object | null = null;

  // Tracks the redirect URL of the last MockNextResponse.redirect() call.
  let _lastRedirectUrl: string | null = null;

  // ---- Minimal NextUrl ----
  class MockNextUrl {
    pathname: string;
    origin: string;
    constructor(url: string) {
      try {
        const p = new URL(url);
        this.pathname = p.pathname;
        this.origin = p.origin;
      } catch {
        this.pathname = url;
        this.origin = "http://localhost";
      }
    }
    clone() {
      return new MockNextUrl(`${this.origin}${this.pathname}`);
    }
    toString() {
      return `${this.origin}${this.pathname}`;
    }
  }

  // ---- Minimal cookie jar ----
  class MockCookieStore {
    private _map: Record<string, string> = {};
    getAll() {
      return Object.entries(this._map).map(([name, value]) => ({ name, value }));
    }
    set(name: string, value: string) {
      this._map[name] = value;
    }
  }

  // ---- Minimal NextResponse ----
  class MockNextResponse {
    readonly cookies = new MockCookieStore();
    readonly headers = new Headers();
    readonly status: number;
    readonly redirectUrl: string | null;

    constructor(status: number, redirectUrl: string | null = null) {
      this.status = status;
      this.redirectUrl = redirectUrl;
    }

    static next(_opts?: unknown): MockNextResponse { // eslint-disable-line @typescript-eslint/no-unused-vars
      _lastRedirectUrl = null;
      return new MockNextResponse(200);
    }

    static redirect(url: MockNextUrl | string): MockNextResponse {
      const s = url instanceof MockNextUrl ? url.toString() : String(url);
      _lastRedirectUrl = s;
      return new MockNextResponse(307, s);
    }
  }

  // ---- Minimal NextRequest ----
  class MockNextRequest {
    readonly nextUrl: MockNextUrl;
    readonly cookies: MockCookieStore;
    constructor(pathname: string) {
      this.nextUrl = new MockNextUrl(`http://localhost${pathname}`);
      this.cookies = new MockCookieStore();
    }
  }

  return {
    MockNextResponse,
    MockNextRequest,
    setMockUser(u: object | null) {
      _mockUser = u;
    },
    getMockUser() {
      return _mockUser;
    },
    getLastRedirectUrl() {
      return _lastRedirectUrl;
    },
    resetState() {
      _mockUser = null;
      _lastRedirectUrl = null;
    },
  };
});

// ---- Module mocks ----

vi.mock("next/server", () => ({
  NextResponse: mocks.MockNextResponse,
  NextRequest: mocks.MockNextRequest,
}));

// The factory is called once when the module is first imported. It returns a
// new object each time createServerClient() is called at test runtime, and
// getUser() reads the live _mockUser via the closure through getMockUser().
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      // Arrow fn re-evaluated each time getUser is called, so picks up the
      // latest _mockUser that the test set via mocks.setMockUser().
      getUser: () => Promise.resolve({ data: { user: mocks.getMockUser() } }),
    },
  })),
}));

// ---- Import the unit under test (after mocks are registered) ----
import { updateSession } from "@/lib/supabase/middleware";

// ---- Tests ----

describe("updateSession middleware", () => {
  beforeEach(() => {
    mocks.resetState();
  });

  it("unauthenticated request to /dashboard redirects to /login", async () => {
    mocks.setMockUser(null);
    const req = new mocks.MockNextRequest("/dashboard");
    await updateSession(req as never);
    expect(mocks.getLastRedirectUrl()).toMatch(/\/login/);
  });

  it("unauthenticated request to /athletes/abc redirects to /login", async () => {
    mocks.setMockUser(null);
    const req = new mocks.MockNextRequest("/athletes/abc");
    await updateSession(req as never);
    expect(mocks.getLastRedirectUrl()).toMatch(/\/login/);
  });

  it("unauthenticated request to /login passes through without redirect", async () => {
    mocks.setMockUser(null);
    const req = new mocks.MockNextRequest("/login");
    await updateSession(req as never);
    expect(mocks.getLastRedirectUrl()).toBeNull();
  });

  it("authenticated request to /login redirects to /dashboard", async () => {
    mocks.setMockUser({ id: "user-1", email: "coach@example.com" });
    const req = new mocks.MockNextRequest("/login");
    await updateSession(req as never);
    expect(mocks.getLastRedirectUrl()).toMatch(/\/dashboard/);
  });

  it("unauthenticated request to / (public page) passes through without redirect", async () => {
    mocks.setMockUser(null);
    const req = new mocks.MockNextRequest("/");
    await updateSession(req as never);
    expect(mocks.getLastRedirectUrl()).toBeNull();
  });
});
