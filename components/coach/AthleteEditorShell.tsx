"use client";

import { useState } from "react";

import { pl } from "@/lib/i18n/pl";
import type { Athlete } from "@/lib/api/athletes";
import BackButton from "./BackButton";
import TabPills, { type Tab } from "./TabPills";
import AthleteProfileForm from "./AthleteProfileForm";
import OnlineTab from "./OnlineTab";
import PlanTabContent from "./PlanTabContent";

interface AthleteEditorShellProps {
  athlete: Athlete;
}

const TABS: Tab[] = [
  { key: "profile", label: pl.coach.athlete.tabs.profile, disabled: false },
  { key: "tests", label: pl.coach.athlete.tabs.tests, disabled: true },
  { key: "injuries", label: pl.coach.athlete.tabs.injuries, disabled: true },
  { key: "diagnostics", label: pl.coach.athlete.tabs.diagnostics, disabled: true },
  { key: "progressions", label: pl.coach.athlete.tabs.progressions, disabled: true },
  { key: "plans", label: pl.coach.athlete.tabs.plans, disabled: false },
  { key: "online", label: pl.coach.athlete.tabs.online, disabled: false },
];

/**
 * Editor wrapper for the athlete page.
 * Contains back button, tab navigation, and the active tab's content.
 * Only the "Profil" tab is active in US-003; others are visible but disabled.
 */
export default function AthleteEditorShell({ athlete }: AthleteEditorShellProps) {
  const [activeTab, setActiveTab] = useState<string>("profile");

  return (
    <div>
      {/* Top bar: back button + athlete name */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackButton href="/dashboard" />
        <h1 className="text-foreground truncate text-lg font-semibold">
          {athlete.name}
        </h1>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 overflow-x-auto pb-1">
        <TabPills
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab content */}
      {activeTab === "profile" && <AthleteProfileForm athlete={athlete} />}
      {activeTab === "plans" && <PlanTabContent athlete={athlete} />}
      {activeTab === "online" && <OnlineTab athlete={athlete} />}
    </div>
  );
}

