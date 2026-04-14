import Link from "next/link";

import { pl } from "@/lib/i18n/pl";
import ShareCodeForm from "@/components/home/ShareCodeForm";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
            {pl.home.title}
          </h1>
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            {pl.home.description}
          </p>
        </div>

        <ShareCodeForm />

        <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
          <span className="bg-[var(--color-border)] h-px flex-1" />
          <span>{pl.home.or}</span>
          <span className="bg-[var(--color-border)] h-px flex-1" />
        </div>

        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-[6px] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
        >
          {pl.home.coachLoginCta}
        </Link>
      </div>
    </main>
  );
}
