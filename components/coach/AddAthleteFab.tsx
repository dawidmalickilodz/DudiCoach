import Link from "next/link";

import { pl } from "@/lib/i18n/pl";

export default function AddAthleteFab() {
  return (
    <Link
      href="/athletes/new"
      aria-label={pl.coach.athlete.newTitle}
      className="fixed right-6 bottom-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-3xl leading-none text-[var(--color-primary-foreground)] shadow-lg transition hover:scale-105"
    >
      +
    </Link>
  );
}

