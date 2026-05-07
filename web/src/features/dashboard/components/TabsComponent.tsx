import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { cn } from "@/src/utils/tailwind";
import { type ReactNode, useState } from "react";

export type TabComponentProps = {
  tabs: {
    tabTitle: string;
    content: ReactNode;
  }[];
};

export const TabComponent = ({ tabs }: TabComponentProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const capture = usePostHogClientCapture();
  return (
    <div>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          选择标签
        </label>
        <select
          id="tabs"
          name="tabs"
          className="border-border bg-white/90 focus:border-primary-accent focus:ring-primary-accent block w-full rounded-xl py-2.5 pr-10 pl-3 text-base shadow-sm focus:outline-hidden sm:text-sm"
          defaultValue={0}
          onChange={(e) => setSelectedIndex(Number(e.target.selectedIndex))}
        >
          {tabs.map((tab) => (
            <option key={tab.tabTitle}>{tab.tabTitle}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-border/70 border-b">
          <nav
            className="-mb-px flex flex-wrap gap-2 md:gap-3"
            aria-label="Tabs"
          >
            {tabs.map((tab, index) => (
              <a
                key={tab.tabTitle}
                className={cn(
                  index === selectedIndex
                    ? "border-primary-accent bg-[#eaf2ff] text-[#1d4ed8] shadow-[inset_0_0_0_1px_rgba(96,165,250,0.35)]"
                    : "text-muted-foreground hover:border-border hover:bg-white/80 hover:text-primary border-transparent",
                  "cursor-pointer rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition-all",
                )}
                aria-current={index === selectedIndex ? "page" : undefined}
                onClick={() => {
                  setSelectedIndex(index);
                  capture("dashboard:chart_tab_switch", {
                    tabLabel: tab.tabTitle,
                  });
                }}
              >
                {tab.tabTitle}
              </a>
            ))}
          </nav>
        </div>
      </div>
      <div className="mt-4 flex flex-col">{tabs[selectedIndex]?.content}</div>
    </div>
  );
};
