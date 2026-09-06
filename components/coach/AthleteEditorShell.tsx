"use client";

import { useCallback, useRef, useState } from "react";

import { pl } from "@/lib/i18n/pl";
import type { Athlete } from "@/lib/api/athletes";
import BackButton from "./BackButton";
import TabPills, { type Tab } from "./TabPills";
import AthleteProfileForm from "./AthleteProfileForm";
import type { AthleteProfileFormHandle } from "./AthleteProfileForm";
import OnlineTab from "./OnlineTab";
import PlanTabContent from "./PlanTabContent";
import InjuriesTab from "./InjuriesTab";
import TestsTab from "./TestsTab";
import DiagnosticsTab from "./DiagnosticsTab";
import ProgressionsTab from "./ProgressionsTab";

interface AthleteEditorShellProps {
  athlete: Athlete;
}

const TABS: Tab[] = [
  { key: "profile", label: pl.coach.athlete.tabs.profile, disabled: false },
  { key: "tests", label: pl.coach.athlete.tabs.tests, disabled: false },
  { key: "injuries", label: pl.coach.athlete.tabs.injuries, disabled: false },
  { key: "diagnostics", label: pl.coach.athlete.tabs.diagnostics, disabled: false },
  { key: "progressions", label: pl.coach.athlete.tabs.progressions, disabled: false },
  { key: "plans", label: pl.coach.athlete.tabs.plans, disabled: false },
  { key: "online", label: pl.coach.athlete.tabs.online, disabled: false },
];

/**
 * Editor wrapper for the athlete page.
 * Contains back button, tab navigation, and the active tab's content.
 * Profil/Testy/Kontuzje/Diagnostyka FMS/Plany/Online are active; Progresje
 * and future tabs are visible but disabled.
 */
export default function AthleteEditorShell({ athlete }: AthleteEditorShellProps) {
  const [activeTab, setActiveTab] = useState<string>("profile");
  const profileFormRef = useRef<AthleteProfileFormHandle>(null);

  const handleTabChange = useCallback(
    (tab: string) => {
      // Flush pending auto-save before switching away from profile tab.
      if (activeTab === "profile") {
        profileFormRef.current?.flush();
      }
      setActiveTab(tab);
    },
    [activeTab],
  );

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
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab content */}
      {activeTab === "profile" && <AthleteProfileForm ref={profileFormRef} athlete={athlete} />}
      {activeTab === "tests" && <TestsTab athlete={athlete} />}
      {activeTab === "injuries" && <InjuriesTab athlete={athlete} />}
      {activeTab === "diagnostics" && <DiagnosticsTab athlete={athlete} />}
      {activeTab === "progressions" && <ProgressionsTab athlete={athlete} />}
      {activeTab === "plans" && <PlanTabContent athlete={athlete} />}
      {activeTab === "online" && <OnlineTab athlete={athlete} />}
    </div>
  );
}

