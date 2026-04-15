import { pl } from "@/lib/i18n/pl";

interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
}

export default function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "saving") {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {pl.common.saving}
      </p>
    );
  }

  if (status === "saved") {
    return (
      <p className="text-sm font-medium text-[var(--color-success)]">
        {pl.common.saved}
      </p>
    );
  }

  return (
    <p className="text-sm font-medium text-[var(--color-destructive)]">
      {pl.common.error}
    </p>
  );
}

