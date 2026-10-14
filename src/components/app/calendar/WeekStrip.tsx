import { ChevronLeft, ChevronRight } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { addDays, parseDateKey, startOfWeekMonday, toDateKey } from "@/lib/calendar/types";

const DAY_KEYS = [
  "calendar.week.mon",
  "calendar.week.tue",
  "calendar.week.wed",
  "calendar.week.thu",
  "calendar.week.fri",
  "calendar.week.sat",
  "calendar.week.sun",
] as const;

export function WeekStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const { t } = useI18n();
  const today = toDateKey(new Date());
  const monday = startOfWeekMonday(parseDateKey(selectedDate));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return {
      key: toDateKey(d),
      labelKey: DAY_KEYS[i] ?? "calendar.week.mon",
      dayNum: d.getDate(),
    };
  });

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        data-testid="week-prev"
        aria-label={t("calendar.week.prev")}
        onClick={() => onSelect(toDateKey(addDays(monday, -7)))}
        className="grid w-8 shrink-0 place-items-center rounded-xl bg-card text-foreground ring-1 ring-border"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div
        className="grid min-w-0 flex-1 grid-cols-7 gap-1"
        role="listbox"
        aria-label={t("calendar.week.label")}
      >
        {days.map((day) => {
          const selected = day.key === selectedDate;
          const isToday = day.key === today;
          return (
            <button
              key={day.key}
              type="button"
              role="option"
              aria-selected={selected}
              data-testid={`week-day-${day.key}`}
              onClick={() => onSelect(day.key)}
              className={cn(
                "flex min-w-0 flex-col items-center rounded-xl px-0.5 py-2 text-center transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-muted",
              )}
            >
              <span className="truncate text-[10px] font-bold uppercase tracking-wide opacity-80">
                {t(day.labelKey)}
              </span>
              <span className={cn("text-sm font-bold", isToday && !selected && "text-primary")}>
                {day.dayNum}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        data-testid="week-next"
        aria-label={t("calendar.week.next")}
        onClick={() => onSelect(toDateKey(addDays(monday, 7)))}
        className="grid w-8 shrink-0 place-items-center rounded-xl bg-card text-foreground ring-1 ring-border"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
