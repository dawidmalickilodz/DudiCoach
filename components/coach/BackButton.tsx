"use client";

import { useRouter } from "next/navigation";

import { pl } from "@/lib/i18n/pl";

/**
 * Back arrow button — always top-left per UI rules.
 * Navigates to the given href, or calls router.back() if no href provided.
 */
interface BackButtonProps {
  href?: string;
}

export default function BackButton({ href }: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={pl.common.back}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
    >
      <span aria-hidden="true" className="text-base leading-none">
        ←
      </span>
      <span>{pl.common.back}</span>
    </button>
  );
}
