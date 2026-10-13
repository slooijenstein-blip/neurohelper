import { useI18n } from "@/i18n/I18nProvider";
import { membershipOnChild } from "@/lib/calendar/permissions";
import { useCalendarStore } from "@/lib/calendar/store";

import { SharedPlansPanel } from "./SharedPlansPanel";
import { ScreenHeader } from "./ui-bits";

/** Non-Pro view of each linked child: first name, age, and the shared schedule. */
export function ChildrenTab() {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const linked = cal.myChildren.filter((child) => {
    const role = membershipOnChild(cal.state.memberships, child.id, cal.activePerson.id)?.role;
    return role === "caregiver" || role === "helper";
  });

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="children-tab">
      <ScreenHeader title={t("children.title")} subtitle={t("children.subtitle")} />
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface px-5 py-4 md:max-w-3xl md:px-8">
        {linked.length === 0 ? (
          <div className="rounded-2xl bg-card p-5 text-center ring-1 ring-border">
            <p className="text-sm font-semibold">{t("children.emptyTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("children.emptyBody")}</p>
          </div>
        ) : (
          <SharedPlansPanel />
        )}
      </div>
    </div>
  );
}
