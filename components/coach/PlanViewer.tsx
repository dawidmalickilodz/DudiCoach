"use client";

import { useState } from "react";

import type { TrainingPlan } from "@/lib/api/plans";
import PlanHeader from "./PlanHeader";
import WeekNavigation from "./WeekNavigation";
import WeekView from "./WeekView";
import PlanFooter from "./PlanFooter";

interface PlanViewerProps {
  plan: TrainingPlan;
}

/**
 * Renders a single training plan: header, week navigation, week view, footer.
 * Manages the active week selection (default: week 1).
 *
 * Resets to week 1 implicitly when a different plan is selected — handled by
 * React unmounting/remounting via the parent's `key={plan.id}` prop.
 */
export default function PlanViewer({ plan }: PlanViewerProps) {
  const [activeWeek, setActiveWeek] = useState(1);

  const week = plan.plan_json.weeks.find((w) => w.weekNumber === activeWeek);

  return (
    <div className="space-y-5">
      <div className="bg-card border-border rounded-card border p-5">
        <PlanHeader plan={plan} />
      </div>

      <WeekNavigation activeWeek={activeWeek} onWeekChange={setActiveWeek} />

      {week && <WeekView week={week} />}

      <PlanFooter plan={plan.plan_json} />
    </div>
  );
}
