import { CheckCircle2, Circle, Library, PencilLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { canEditPlan, canMarkDone } from "@/lib/calendar/permissions";
import { toDateKey, useCalendarStore } from "@/lib/calendar/store";
import { cn } from "@/lib/utils";
import { ScreenHeader } from "../ui-bits";
import { WeekStrip } from "./WeekStrip";

export function TodayTab({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [date, setDate] = useState(toDateKey(new Date()));
  const child = cal.selectedChild;
  const role = cal.roleOnSelected;
  const plan = child ? cal.getDayPlan(child.id, date) : null;
  const isToday = date === toDateKey(new Date());

  if (!child) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ScreenHeader title={t("calendar.today.title")} subtitle={t("calendar.today.pickChild")} />
        <div className="flex flex-1 items-center justify-center bg-surface px-6 text-center text-sm text-muted-foreground">
          {t("calendar.today.pickChildHint")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={isToday ? t("calendar.today.title") : t("calendar.today.dayTitle")}
        subtitle={t("calendar.today.forChild", { name: child.displayName })}
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        <WeekStrip selectedDate={date} onSelect={setDate} />

        <div className="flex flex-wrap gap-2">
          {canEditPlan(role) ? (
            <>
              <Button type="button" size="sm" onClick={onOpenLibrary}>
                <Library className="mr-1 size-4" />
                {plan ? t("calendar.today.changePlan") : t("calendar.today.useFromLibrary")}
              </Button>
              {plan?.tweaked ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const saved = cal.saveDayBackToLibrary(child.id, date);
                    if (saved) toast.success(t("calendar.today.savedBack"));
                  }}
                >
                  <PencilLine className="mr-1 size-4" />
                  {t("calendar.today.saveBack")}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>

        {!plan ? (
          <div className="rounded-2xl bg-card p-5 text-center ring-1 ring-border">
            <p className="text-sm font-semibold text-foreground">{t("calendar.today.emptyTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("calendar.today.emptyBody")}</p>
            {canEditPlan(role) ? (
              <Button type="button" className="mt-4" onClick={onOpenLibrary}>
                {t("calendar.today.useFromLibrary")}
              </Button>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">{t("calendar.today.helperEmpty")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-base font-semibold">{plan.name}</h3>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {plan.steps.filter((s) => s.done).length}/{plan.steps.length} {t("calendar.today.done")}
              </span>
            </div>
            {plan.tweaked ? (
              <p className="text-[11px] font-semibold text-warm-foreground">{t("calendar.today.tweaked")}</p>
            ) : null}
            <ol className="space-y-2">
              {plan.steps.map((step, index) => (
                <li key={step.id}>
                  <button
                    type="button"
                    disabled={!canMarkDone(role)}
                    onClick={() => cal.toggleStepDone(child.id, date, step.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-border transition-colors",
                      step.done && "bg-success/10 ring-success/30",
                      canMarkDone(role) && "hover:bg-muted/60",
                    )}
                  >
                    <span className="mt-0.5 shrink-0 text-primary">
                      {step.done ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {t("calendar.today.step", { n: index + 1 })}
                        {step.minutes ? ` · ${step.minutes}m` : ""}
                      </span>
                      <span
                        className={cn(
                          "block text-sm font-semibold",
                          step.done && "text-muted-foreground line-through",
                        )}
                      >
                        {step.title}
                      </span>
                      {step.notes ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{step.notes}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
