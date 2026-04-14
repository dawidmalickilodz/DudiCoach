"use client";

import type { Athlete } from "@/lib/api/athletes";
import AthleteContextInfo from "./AthleteContextInfo";
import GeneratePlanButton from "./GeneratePlanButton";

interface PlanGenerateSectionProps {
  athlete: Athlete;
  planCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
}

/**
 * Top section of the "Plany" tab.
 * Shows athlete context (level, phase, plan count) and the generate button.
 */
export default function PlanGenerateSection({
  athlete,
  planCount,
  isGenerating,
  onGenerate,
}: PlanGenerateSectionProps) {
  return (
    <div className="bg-card border-border rounded-card border p-5 space-y-4">
      <AthleteContextInfo athlete={athlete} planCount={planCount} />
      <GeneratePlanButton
        isGenerating={isGenerating}
        onGenerate={onGenerate}
      />
    </div>
  );
}
