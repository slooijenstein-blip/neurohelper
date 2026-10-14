import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppStore } from "@/lib/app-store";
import type { RoutineDraft } from "@/lib/my-calendar";
import { cn } from "@/lib/utils";

export function AddToMyCalendarButton({
  routine,
  date,
  testId,
  idleLabel,
  className,
}: {
  routine: RoutineDraft;
  date: string;
  testId?: string;
  idleLabel: string;
  className?: string;
}) {
  const { t } = useI18n();
  const { routineOnCalendar, toggleRoutineOnCalendar } = useAppStore();
  const added = routineOnCalendar(routine.templateId, date);

  return (
    <Button
      type="button"
      size="sm"
      variant={added ? "outline" : "default"}
      aria-pressed={added}
      data-testid={testId}
      className={cn("h-8", className)}
      onClick={() => {
        toggleRoutineOnCalendar(routine, date);
        toast.success(
          added ? t("schedule.removedFromMyCalendar") : t("schedule.addedToMyCalendar"),
        );
      }}
    >
      {added ? t("schedule.addedToMyCalendar") : idleLabel}
    </Button>
  );
}
