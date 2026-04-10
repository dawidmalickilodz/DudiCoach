"use client";

import { useFormStatus } from "react-dom";

import { pl } from "@/lib/i18n/pl";
import { signOutAction } from "@/app/(coach)/logout/actions";

function LogoutButtonInner() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pl.auth.logout.confirming : pl.auth.logout.button}
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={signOutAction}>
      <LogoutButtonInner />
    </form>
  );
}
