"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { pl } from "@/lib/i18n/pl";

const SHARE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Share code entry form on the home page.
 * Athlete enters the 6-char code, hits "Połącz", and is taken to /{code}.
 *
 * Client-side validation:
 *  - Uppercases input on each keystroke
 *  - Trims whitespace
 *  - Validates against SHARE_CODE_REGEX before navigating
 *  - HEAD-checks /api/athlete/{code} so we surface "invalid code" on the
 *    same screen instead of bouncing the athlete to a generic 404 page.
 */
export default function ShareCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(value: string) {
    // Uppercase and strip whitespace as the user types
    setCode(value.toUpperCase().replace(/\s+/g, ""));
    if (error) setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const normalized = code.trim();
    if (!SHARE_CODE_REGEX.test(normalized)) {
      setError(pl.athletePanel.errorInvalidCode);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/athlete/${normalized}`, { method: "GET" });
      if (!res.ok) {
        setError(pl.athletePanel.errorInvalidCode);
        return;
      }
      router.push(`/${normalized}`);
    } catch {
      setError(pl.athletePanel.errorInvalidCode);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label
          htmlFor="share-code-input"
          className="text-foreground mb-1.5 block text-sm font-medium"
        >
          {pl.home.athletePanelTitle}
        </label>
        <p className="text-muted-foreground mb-2 text-xs">
          {pl.home.athletePanelSubtitle}
        </p>
        <input
          id="share-code-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={pl.athletePanel.codePlaceholder}
          maxLength={6}
          aria-invalid={!!error}
          aria-describedby={error ? "share-code-error" : undefined}
          className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none w-full rounded-[6px] border px-3 py-2 text-center font-mono text-lg tracking-[0.4em] uppercase"
        />
      </div>

      {error && (
        <p
          id="share-code-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || code.length !== 6}
        className="bg-primary text-primary-foreground w-full rounded-[6px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? pl.athletePanel.connecting : pl.athletePanel.connect}
      </button>
    </form>
  );
}
