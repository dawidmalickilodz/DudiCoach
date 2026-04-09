import { describe, it, expect } from "vitest";

import { pl } from "@/lib/i18n/pl";

/**
 * Smoke test — verifies that Vitest + path aliases + Polish dictionary all load.
 * Delete or repurpose once real unit tests land in Sprint 1.
 */
describe("smoke", () => {
  it("loads the Polish dictionary", () => {
    expect(pl.common.saved).toBe("✓ Zapisano");
    expect(pl.auth.login.submitButton).toBe("Zaloguj się");
  });
});
