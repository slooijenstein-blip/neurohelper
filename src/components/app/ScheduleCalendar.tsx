import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAppStore, toDateKey, WEEKDAYS, type Template } from "@/lib/app-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function monthGrid(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function ScheduleCalendar() {
  const { state, addDayPlan, removeDayPlan, setTemplateRepeat, tryTemplate } = useAppStore();
  const [view, setView] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [repeatFor, setRepeatFor] = useState<Template | null>(null);

  const days = useMemo(() => monthGrid(view), [view]);
  const todayKey = toDateKey(new Date());
  const myTemplates = state.templates.filter((t) => t.ownerId === state.profile?.id || t.isPublic);

  const plansFor = (key: string) => {
    const weekday = new Date(`${key}T00:00:00`).getDay();
    const recurring = state.templates
      .filter((t) => (t.repeatDays ?? []).includes(weekday))
      .map((t) => ({ id: `rec-${t.id}-${key}`, name: t.name, templateId: t.id, recurring: true }));
    const oneOff = state.dayPlans
      .filter((p) => p.date === key)
      .map((p) => ({ id: p.id, name: p.name, templateId: p.templateId, recurring: false }));
    return [...recurring, ...oneOff];
  };

  const selectedPlans = selected ? plansFor(selected) : [];

  return (
    <div className="space-y-3">
      <div className="soft-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-semibold">
            {view.toLocaleString("en-GB", { month: "long", year: "numeric" })}
          </p>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d[0]}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d) => {
            const key = toDateKey(d);
            const inMonth = d.getMonth() === view.getMonth();
            const plans = plansFor(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  "flex h-10 flex-col items-center justify-center rounded-lg text-[11px] transition-colors",
                  inMonth ? "text-foreground" : "text-muted-foreground/40",
                  key === todayKey && "bg-accent font-bold text-accent-foreground",
                  selected === key && "ring-2 ring-primary",
                )}
              >
                {d.getDate()}
                <span className="mt-0.5 flex gap-0.5">
                  {plans.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        p.recurring ? "bg-primary" : "bg-success",
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary" /> Repeating
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-success" /> One-off
          </span>
        </div>
      </div>

      <div className="soft-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Repeat a saved routine</h3>
        <div className="space-y-2">
          {myTemplates.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-card p-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{t.name}</p>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setRepeatFor(t)}>
                  <Repeat className="size-3.5" />
                  {(t.repeatDays ?? []).length
                    ? (t.repeatDays ?? []).map((d) => WEEKDAYS[d]).join(" ")
                    : "Set days"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selected
                ? new Date(`${selected}T00:00:00`).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedPlans.length ? (
              selectedPlans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-2"
                >
                  <div>
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.recurring ? "Repeats weekly" : "One-off"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => {
                        tryTemplate(p.templateId);
                        setSelected(null);
                        toast.success(`${p.name} loaded into today's schedule`);
                      }}
                    >
                      Load
                    </Button>
                    {!p.recurring ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => removeDayPlan(p.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Nothing planned yet for this day.</p>
            )}
          </div>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Apply a routine
          </p>
          <div className="hide-scrollbar max-h-40 space-y-1 overflow-y-auto">
            {myTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (selected) addDayPlan(selected, t.id);
                  toast.success(`${t.name} added to that day`);
                }}
                className="w-full rounded-lg border border-border bg-card p-2 text-left text-xs font-semibold hover:border-primary"
              >
                {t.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!repeatFor} onOpenChange={(o) => !o && setRepeatFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Repeat “{repeatFor?.name}”</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, idx) => {
              const active = (repeatFor?.repeatDays ?? []).includes(idx);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (!repeatFor) return;
                    const current = repeatFor.repeatDays ?? [];
                    const next = active
                      ? current.filter((d) => d !== idx)
                      : [...current, idx].sort();
                    setTemplateRepeat(repeatFor.id, next);
                    setRepeatFor({ ...repeatFor, repeatDays: next });
                  }}
                  className={cn(
                    "tag-base border border-border",
                    active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            The routine will show automatically on every selected weekday in the calendar.
          </p>
          <Button onClick={() => setRepeatFor(null)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
