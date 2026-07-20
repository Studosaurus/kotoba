"use client";

import { BookOpen, Layers, Mic } from "lucide-react";

export type VocabularyView = "capture" | "saved" | "study";

interface ViewTabsProps {
  activeView: VocabularyView;
  savedCount: number;
  dueCount: number;
  onChange(view: VocabularyView): void;
}

const tabs = [
  { id: "capture" as const, label: "Capture", icon: Mic },
  { id: "saved" as const, label: "Saved", icon: Layers },
  { id: "study" as const, label: "Study", icon: BookOpen },
];

export function ViewTabs({ activeView, savedCount, dueCount, onChange }: ViewTabsProps) {
  return (
    <nav className="grid grid-cols-3 gap-1 rounded-[1.25rem] bg-[#101113] p-1" aria-label="Vocabulary views">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className="relative inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold text-[#bdc1c6] outline-none transition focus:ring-4 focus:ring-[#8ab4f8]/25 data-[active=true]:bg-[#202329] data-[active=true]:text-[#f8f9fb]"
          data-active={activeView === tab.id}
        >
          <tab.icon className="h-4 w-4" aria-hidden="true" />
          {tab.label}
          {tab.id === "saved" && savedCount > 0 ? <Badge value={savedCount} /> : null}
          {tab.id === "study" && dueCount > 0 ? <Badge value={dueCount} /> : null}
        </button>
      ))}
    </nav>
  );
}

function Badge({ value }: { value: number }) {
  return (
    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#a8c7fa] px-1 text-[11px] font-bold text-[#062e6f]">
      {value}
    </span>
  );
}
