import { CheckCircle2, Circle, Library, PencilLine, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { canEditPlan, canMarkDone } from "@/lib/calendar/permissions";
import { toDateKey, useCalendarStore } from "@/lib/calendar/store";
import type { DayStep, PlanStep } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";
import { ScreenHeader } from "../ui-bits";
import { ActivityPickerDialog } from "./ActivityPickerDialog";
import { StepDetailDialog } from "./StepDetailDialog";
import { WeekStrip } from "./WeekStrip";

export function TodayTab({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [date, setDate] = useState(toDateKey(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailStep, setDetailStep] = useState<DayStep | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const child = cal.selectedChild;
  const role = cal.roleOnSelected;
  const plan = child ? cal.getDayPlan(child.id, date) : null;
  const isToday = date === toDateKey(new Date());
  const canEdit = canEditPlan(role);

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

  const onPickStep = (step: PlanStep) => {
    if (replacingId) {
      cal.replaceDayStep(child.id, date, replacingId, step);
      toast.success(t("calendar.today.stepUpdated"));
      setReplacingId(null);
    } else {
      cal.addDayStep(child.id, date, step);
      toast.success(t("calendar.today.stepAdded", { title: step.title }));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={isToday ? t("calendar.today.title") : t("calendar.today.dayTitle")}
        subtitle={t("calendar.today.forChild", { name: child.displayName })}
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        <WeekStrip selectedDate={date} onSelect={setDate} />

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <Button type="button" size="sm" onClick={onOpenLibrary}>
                <Library className="mr-1 size-4" />
                {plan ? t("calendar.today.changePlan") : t("calendar.today.useFromLibrary")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplacingId(null);
                  setPickerOpen(true);
                }}
              >
                <Plus className="mr-1 size-4" />
                {t("calendar.today.addActivity")}
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

        {!plan || plan.steps.length === 0 ? (
          <div className="rounded-2xl bg-card p-5 text-center ring-1 ring-border">
            <p className="text-sm font-semibold text-foreground">{t("calendar.today.emptyTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("calendar.today.emptyBody")}</p>
            {canEdit ? (
              <div className="mt-4 flex flex-col gap-2">
                <Button type="button" onClick={onOpenLibrary}>
                  {t("calendar.today.useFromLibrary")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReplacingId(null);
                    setPickerOpen(true);
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  {t("calendar.today.addActivity")}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">{t("calendar.today.helperEmpty")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-base font-semibold">{plan.name}</h3>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {plan.steps.filter((s) => s.done).length}/{plan.steps.length}{" "}
                {t("calendar.today.done")}
              </span>
            </div>
            {plan.tweaked ? (
              <p className="text-[11px] font-semibold text-warm-foreground">
                {t("calendar.today.tweaked")}
              </p>
            ) : null}
            <ol className="space-y-2">
              {plan.steps.map((step, index) => (
                <li key={step.id}>
                  <div
                    className={cn(
                      "flex w-full items-start gap-2 rounded-2xl bg-card px-2 py-2 ring-1 ring-border",
                      step.done && "bg-success/10 ring-success/30",
                    )}
                  >
                    <button
                      type="button"
                      disabled={!canMarkDone(role)}
                      aria-label={t("calendar.stepDetail.markDone")}
                      onClick={() => cal.toggleStepDone(child.id, date, step.id)}
                      className={cn(
                        "mt-1 shrink-0 rounded-lg p-1 text-primary",
                        canMarkDone(role) && "hover:bg-muted/60",
                      )}
                    >
                      {step.done ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailStep(step)}
                      className="min-w-0 flex-1 rounded-xl px-1 py-1 text-left hover:bg-muted/40"
                    >
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {t("calendar.today.step", { n: index + 1 })}
                        {step.minutes ? ` · ${step.minutes}m` : ""}
                        {step.activityId ? ` · ${t("calendar.today.fromCatalog")}` : ""}
                      </span>
                      <span
                        className={cn(
                          "block text-sm font-semibold",
                          step.done && "text-muted-foreground line-through",
                        )}
                      >
                        {step.title}
                      </span>
                      {step.description || step.notes ? (
                        <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                          {step.description || step.notes}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <ActivityPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={onPickStep}
        title={
          replacingId ? t("calendar.picker.changeTitle") : t("calendar.picker.addToToday")
        }
      />

      <StepDetailDialog
        step={detailStep}
        open={!!detailStep}
        onOpenChange={(o) => !o && setDetailStep(null)}
        canEdit={canEdit}
        onToggleDone={
          detailStep && canMarkDone(role)
            ? () => {
                cal.toggleStepDone(child.id, date, detailStep.id);
                setDetailStep((prev) => (prev ? { ...prev, done: !prev.done } : null));
              }
            : undefined
        }
        onChangeActivity={
          detailStep && canEdit
            ? () => {
                setReplacingId(detailStep.id);
                setDetailStep(null);
                setPickerOpen(true);
              }
            : undefined
        }
        onRemove={
          detailStep && canEdit
            ? () => {
                cal.removeDayStep(child.id, date, detailStep.id);
                setDetailStep(null);
                toast.success(t("calendar.today.stepRemoved"));
              }
            : undefined
        }
      />
    </div>
  );
}
