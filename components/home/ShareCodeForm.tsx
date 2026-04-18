"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { pl } from "@/lib/i18n/pl";
import {
  isShareCodeFormatValid,
  normalizeShareCode,
} from "@/lib/validation/share-code";

/**
 * Share code entry form on the home page.
 * Athlete enters a 6-char code and is redirected to /{code}.
 */
export default function ShareCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(value: string) {
    setCode(normalizeShareCode(value));
    if (error) setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const normalized = normalizeShareCode(code.trim());
    if (!isShareCodeFormatValid(normalized)) {
      setError(pl.athletePanel.errorInvalidCodeFormat);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/athlete/${normalized}`, { method: "GET" });
      if (!res.ok) {
        if (res.status === 404) {
          setError(pl.athletePanel.errorInvalidCode);
          return;
        }

        setError(pl.athletePanel.errorLookupFailed);
        return;
      }

      router.push(`/${normalized}`);
    } catch {
      setError(pl.athletePanel.errorLookupFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSubmitDisabled = isSubmitting || code.length !== 6;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      noValidate
      aria-busy={isSubmitting}
    >
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
          disabled={isSubmitting}
          aria-invalid={!!error}
          aria-describedby={error ? "share-code-error" : undefined}
          className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none w-full rounded-[6px] border px-3 py-2 text-center font-mono text-lg tracking-[0.4em] uppercase disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {error && (
        <p id="share-code-error" role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="bg-primary text-primary-foreground w-full rounded-[6px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? pl.athletePanel.connecting : pl.athletePanel.connect}
      </button>
    </form>
  );
}
