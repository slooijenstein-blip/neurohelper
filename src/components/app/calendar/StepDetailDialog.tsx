import { CheckCircle2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { resolveActivity } from "@/lib/calendar/activity-steps";
import type { DayStep, PlanStep } from "@/lib/calendar/types";
import { AgeTag, DurationTag, SkillTag } from "../ui-bits";

export function StepDetailDialog({
  step,
  open,
  onOpenChange,
  canEdit,
  onToggleDone,
  onChangeActivity,
  onRemove,
}: {
  step: (PlanStep & { done?: boolean }) | DayStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  onToggleDone?: () => void;
  onChangeActivity?: () => void;
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const activity = step ? resolveActivity(step.activityId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step?.title ?? t("calendar.stepDetail.title")}</DialogTitle>
          <DialogDescription>
            {activity
              ? t("calendar.stepDetail.fromCatalog")
              : t("calendar.stepDetail.custom")}
          </DialogDescription>
        </DialogHeader>

        {step ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              {activity?.description ?? step.description ?? step.notes}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {activity ? (
                <>
                  <AgeTag>
                    {activity.minAge}–{activity.maxAge}
                  </AgeTag>
                  <SkillTag skill={activity.skill} />
                  <DurationTag
                    minMinutes={activity.minMinutes}
                    maxMinutes={activity.maxMinutes}
                  />
                </>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {step.minutes}m
                </span>
              )}
            </div>

            {activity ? (
              <>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("calendar.picker.materials")}
                  </p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {activity.materials.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("calendar.picker.howTo")}
                  </p>
                  <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                    {activity.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
              </>
            ) : step.notes ? (
              <p className="text-muted-foreground">{step.notes}</p>
            ) : null}

            <div className="flex flex-col gap-2">
              {onToggleDone ? (
                <Button type="button" variant="outline" onClick={onToggleDone}>
                  <CheckCircle2 className="mr-1 size-4" />
                  {"done" in step && step.done
                    ? t("calendar.stepDetail.markUndone")
                    : t("calendar.stepDetail.markDone")}
                </Button>
              ) : null}
              {canEdit && onChangeActivity ? (
                <Button type="button" variant="outline" onClick={onChangeActivity}>
                  <Pencil className="mr-1 size-4" />
                  {t("calendar.stepDetail.changeActivity")}
                </Button>
              ) : null}
              {canEdit && onRemove ? (
                <Button type="button" variant="destructive" onClick={onRemove}>
                  <Trash2 className="mr-1 size-4" />
                  {t("calendar.stepDetail.remove")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
