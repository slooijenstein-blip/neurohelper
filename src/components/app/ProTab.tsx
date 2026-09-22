import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { useCalendarStore } from "@/lib/calendar/store";
import { cn } from "@/lib/utils";

import { LibraryTab } from "./calendar/LibraryTab";
import { PatientsTab } from "./calendar/PatientsTab";
import { PeopleTab } from "./calendar/PeopleTab";
import { TodayTab } from "./calendar/TodayTab";

type Section = "plans" | "today" | "share";

const SECTIONS: Array<{ id: Section; labelKey: string }> = [
  { id: "plans", labelKey: "pro.plans" },
  { id: "today", labelKey: "pro.today" },
  { id: "share", labelKey: "pro.share" },
];

/** Therapist caseload, catalog plans, and parent invites — inside the Pro tab only. */
export function ProTab() {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [section, setSection] = useState<Section>("plans");
  const child = cal.selectedChild;

  if (!child) {
    return (
      <PatientsTab
        onOpenChild={() => {
          setSection("plans");
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border bg-card px-4 py-3 md:px-8">
        <button
          type="button"
          data-testid="pro-back"
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          onClick={() => cal.selectChild(null)}
        >
          <ArrowLeft className="size-4" />
          {t("pro.back")}
        </button>
        <p className="mt-1 text-sm font-semibold">
          {t("pro.forPatient", { name: child.displayName })}
        </p>
        <p className="text-[11px] text-muted-foreground">{t("pro.intro")}</p>
        <div
          className="mt-2 flex gap-1 rounded-xl bg-muted p-1"
          role="tablist"
          aria-label={t("nav.pro")}
        >
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              data-testid={`pro-section-${item.id}`}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-semibold",
                section === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {section === "plans" ? (
          <LibraryTab />
        ) : section === "today" ? (
          <TodayTab onOpenLibrary={() => setSection("plans")} />
        ) : (
          <PeopleTab />
        )}
      </div>
    </div>
  );
}
