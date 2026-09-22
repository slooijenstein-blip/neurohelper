import { useMemo } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { addDays, startOfWeekMonday, toDateKey } from "@/lib/calendar/types";

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
  const days = useMemo(() => {
    const monday = startOfWeekMonday(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      return { key: toDateKey(d), labelKey: DAY_KEYS[i], dayNum: d.getDate() };
    });
  }, []);

  return (
    <div className="grid grid-cols-7 gap-1" role="listbox" aria-label={t("calendar.week.label")}>
      {days.map((day) => {
        const selected = day.key === selectedDate;
        const isToday = day.key === today;
        return (
          <button
            key={day.key}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(day.key)}
            className={cn(
              "flex flex-col items-center rounded-xl px-1 py-2 text-center transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground ring-1 ring-border hover:bg-muted",
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
              {t(day.labelKey)}
            </span>
            <span className={cn("text-sm font-bold", isToday && !selected && "text-primary")}>
              {day.dayNum}
            </span>
          </button>
        );
      })}
    </div>
  );
}
