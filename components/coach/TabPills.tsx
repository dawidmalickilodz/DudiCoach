"use client";

import { cn } from "@/lib/utils";

export interface Tab {
  key: string;
  label: string;
  disabled?: boolean;
}

interface TabPillsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

/**
 * Pill-shaped tab navigation.
 * Active pill: bg-primary text-primary-foreground
 * Inactive pill: bg-card text-muted-foreground border-border
 * Disabled pill: opacity-40 cursor-not-allowed (greyed out for future tabs)
 */
export default function TabPills({
  tabs,
  activeTab,
  onTabChange,
}: TabPillsProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className="flex flex-wrap gap-2"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const isDisabled = tab.disabled ?? false;

        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            type="button"
            onClick={() => {
              if (!isDisabled) onTabChange(tab.key);
            }}
            className={cn(
              "rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground",
              isDisabled && "cursor-not-allowed opacity-40",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
