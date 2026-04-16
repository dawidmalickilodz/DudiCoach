import { pl } from "@/lib/i18n/pl";
import { cn } from "@/lib/utils";

export type InjuryStatus = "active" | "healing" | "healed";

interface InjuryStatusBadgeProps {
  status: InjuryStatus;
}

const STATUS_CLASSES: Record<InjuryStatus, string> = {
  active: "bg-destructive/15 text-destructive",
  healing: "bg-yellow/15 text-yellow",
  healed: "bg-success/15 text-success",
};

export default function InjuryStatusBadge({ status }: InjuryStatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs font-semibold",
        STATUS_CLASSES[status],
      )}
    >
      {pl.coach.athlete.injuries.status[status]}
    </span>
  );
}
