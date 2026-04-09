import { pl } from "@/lib/i18n/pl";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-8">
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
          {pl.home.title}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
          {pl.home.description}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-[6px] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
          >
            {pl.home.coachLoginCta}
          </a>
          <p className="text-center text-xs text-[var(--color-muted)]">
            {pl.home.athletePanelComingSoon}
          </p>
        </div>
      </div>
    </main>
  );
}
