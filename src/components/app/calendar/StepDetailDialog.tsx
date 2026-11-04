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
import { localizedActivity } from "@/lib/activity-locale";
import { resolveActivity } from "@/lib/calendar/activity-steps";
import { creatorCreditName } from "@/lib/creator/catalog";
import { CreatorCredit } from "../CreatorCredit";
import { useMergedActivities } from "../usePublishedActivities";
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
  const { t, locale } = useI18n();
  useMergedActivities();
  const raw = step ? resolveActivity(step.activityId) : null;
  const activity = raw ? localizedActivity(raw, locale) : null;
  const shown = step
    ? activity
      ? { title: activity.title, description: activity.description }
      : { title: step.title, description: step.description || step.notes || "" }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{shown?.title ?? t("calendar.stepDetail.title")}</DialogTitle>
          <DialogDescription>
            {activity ? t("calendar.stepDetail.fromCatalog") : t("calendar.stepDetail.custom")}
          </DialogDescription>
        </DialogHeader>

        {step ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">{shown?.description}</p>
            {activity && "creatorName" in activity ? (
              <CreatorCredit name={creatorCreditName(activity)} />
            ) : null}

            <div className="flex flex-wrap gap-1.5">
              {activity ? (
                <>
                  <AgeTag>
                    {activity.minAge}–{activity.maxAge}
                  </AgeTag>
                  <SkillTag skill={activity.skill} />
                  <DurationTag minMinutes={activity.minMinutes} maxMinutes={activity.maxMinutes} />
                </>
              ) : (
                <>
                  {step.minAge != null && step.maxAge != null ? (
                    <AgeTag>
                      {step.minAge}–{step.maxAge}
                    </AgeTag>
                  ) : null}
                  {step.skill ? <SkillTag skill={step.skill} /> : null}
                  <DurationTag minMinutes={step.minutes} maxMinutes={step.minutes} />
                </>
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
            ) : (
              <>
                {step.materials?.length ? (
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t("calendar.picker.materials")}
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      {step.materials.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {step.howTo?.length ? (
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t("calendar.picker.howTo")}
                    </p>
                    <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                      {step.howTo.map((item, index) => (
                        <li key={`${index}-${item}`}>{item}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {!step.howTo?.length && step.notes && step.notes !== shown?.description ? (
                  <p className="text-muted-foreground">{step.notes}</p>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  {t("calendar.picker.customHint")}
                </p>
              </>
            )}

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
