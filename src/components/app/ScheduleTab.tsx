import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Share2,
  Trash2,
  CheckCircle2,
  Circle,
  RotateCcw,
  CalendarDays,
  ListChecks,
} from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import { useAppStore, uid } from "@/lib/app-store";
import { ACTIVITIES, type Activity } from "@/lib/activities-data";
import { SharedPlansPanel } from "./SharedPlansPanel";
import { ScreenHeader } from "./ui-bits";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const WEEKDAY_KEYS = [
  "schedule.weekdays.sun",
  "schedule.weekdays.mon",
  "schedule.weekdays.tue",
  "schedule.weekdays.wed",
  "schedule.weekdays.thu",
  "schedule.weekdays.fri",
  "schedule.weekdays.sat",
] as const;

export function ScheduleTab() {
  const { state, update } = useAppStore();
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");

  const filtered = useMemo(
    () =>
      ACTIVITIES.filter((a: Activity) =>
        query.trim()
          ? a.title.toLowerCase().includes(query.trim().toLowerCase()) ||
            a.skill.toLowerCase().includes(query.trim().toLowerCase())
          : true,
      ),
    [query],
  );

  const toggleDone = (id: string) =>
    update((prev) => ({
      ...prev,
      schedule: prev.schedule.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
      completedCount:
        prev.completedCount + (state.schedule.find((i) => i.id === id)?.done ? -1 : 1),
    }));

  const removeItem = (id: string) =>
    update((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((i) => i.id !== id),
    }));

  const addActivity = (activityId: string) => {
    const act = ACTIVITIES.find((a: Activity) => a.id === activityId);
    if (!act) return;
    const start = state.schedule.reduce((sum, i) => sum + i.minutes, 0);
    update((prev) => ({
      ...prev,
      schedule: [
        ...prev.schedule,
        {
          id: uid(),
          activityId: act.id,
          title: act.title,
          description: act.description,
          time: minutesToTime(8 * 60 + start),
          minutes: act.minMinutes,
          done: false,
        },
      ],
    }));
    setAdding(false);
    toast.success(t("schedule.added", { title: act.title }));
  };

  const saveTemplate = () => {
    if (!templateName.trim() || !state.profile) return;
    const template = {
      id: uid(),
      ownerId: state.profile.id,
      name: templateName.trim(),
      isPublic: false,
      items: state.schedule.map((i) => ({ ...i, id: uid(), done: false })),
      createdAt: new Date().toISOString().slice(0, 10),
      repeatDays: [...repeatDays],
    };
    update((prev) => ({ ...prev, templates: [template, ...prev.templates] }));
    setTemplateName("");
    setRepeatDays([]);
    setSaveOpen(false);
    toast.success(
      repeatDays.length
        ? t("schedule.savedRepeat", {
            days: repeatDays.map((d) => t(WEEKDAY_KEYS[d] ?? "schedule.weekdays.sun")).join(", "),
          })
        : t("schedule.savedTemplate"),
    );
  };

  const addToGoogleCalendar = () => {
    if (!state.schedule.length) return;
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = (mins: number) => {
      const d = new Date(today);
      d.setHours(0, mins, 0, 0);
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    };
    const first = state.schedule[0]!;
    const [sh, sm] = first.time.split(":").map(Number);
    const startMins = (sh ?? 8) * 60 + (sm ?? 0);
    const total = state.schedule.reduce((sum, i) => sum + i.minutes, 0);
    const details = state.schedule
      .map((i) => `${i.time} · ${i.title} (${formatDuration(i.minutes)})`)
      .join("\n");
    const url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent("Synlumae routine")}` +
      `&dates=${stamp(startMins)}/${stamp(startMins + total)}` +
      `&details=${encodeURIComponent(details)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareTemplate = () => {
    if (!postBody.trim() || !state.profile) return;
    const items = state.schedule.map((i) => ({ ...i, id: uid(), done: false }));
    const name = "My Routine";
    const template = {
      id: uid(),
      ownerId: state.profile.id,
      name,
      isPublic: true,
      items,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const body = `${postBody.trim()}\n\n**${name}**\n${items
      .map((i) => `${i.title} (${i.minutes} mins)`)
      .join("\n")}`;
    update((prev) => ({
      ...prev,
      templates: [template, ...prev.templates],
      posts: [
        {
          id: uid(),
          authorId: state.profile!.id,
          authorName: state.profile!.name,
          authorRole: state.profile!.role,
          authorLocation: state.profile!.location,
          kind: "Schedule Share" as const,
          body,
          likes: 0,
          liked: false,
          reactions: {},
          myReactions: [],
          comments: [],
          reposts: [],
          createdAt: new Date().toISOString().slice(0, 10),
          templateId: template.id,
        },

        ...prev.posts,
      ],
    }));
    setPostBody("");
    setShareOpen(false);
    toast.success(t("schedule.shared"));
  };

  const resetSchedule = () => update((prev) => ({ ...prev, schedule: [] }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("schedule.title")}
        subtitle={t("schedule.subtitle")}
        right={
          state.schedule.length ? (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={resetSchedule}
                title={t("common.reset")}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setSaveOpen(true)}
                title={t("common.save")}
              >
                <Save className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setShareOpen(true)}
                title={t("common.share")}
              >
                <Share2 className="size-4" />
              </Button>
            </div>
          ) : null
        }
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface px-5 py-4 md:max-w-3xl md:px-8">
        <SharedPlansPanel />
        <div className="flex gap-1 rounded-xl bg-card p-1">
          {(["list", "calendar"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {v === "list" ? (
                <ListChecks className="size-3.5" />
              ) : (
                <CalendarDays className="size-3.5" />
              )}
              {v === "list" ? t("schedule.today") : t("schedule.calendar")}
            </button>
          ))}
        </div>

        {view === "calendar" ? <ScheduleCalendar /> : null}

        {view === "list" ? (
          <>
            {state.schedule.length ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={addToGoogleCalendar}
                title={t("schedule.calendarHint")}
              >
                <CalendarDays className="mr-1 size-4" /> {t("schedule.addToCalendar")}
              </Button>
            ) : null}
            {state.schedule.length === 0 ? (
              <div className="soft-card py-8 text-center">
                <p className="text-sm text-muted-foreground">{t("schedule.empty")}</p>
                <Button className="mt-3" onClick={() => setAdding(true)}>
                  <Plus className="mr-1 size-4" /> {t("schedule.addActivity")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {state.schedule.map((item) => (
                  <div key={item.id} className="soft-card flex items-center gap-3 p-3">
                    <button type="button" onClick={() => toggleDone(item.id)} className="shrink-0">
                      {item.done ? (
                        <CheckCircle2 className="size-5 text-success" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-semibold",
                          item.done && "text-muted-foreground line-through",
                        )}
                      >
                        {item.time} · {item.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.description} · {formatDuration(item.minutes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
                  <Plus className="mr-1 size-4" /> {t("schedule.addAnother")}
                </Button>
              </div>
            )}

            {state.templates.some((t) => t.ownerId === state.profile?.id && !t.isPublic) ? (
              <div className="soft-card p-4">
                <h3 className="mb-2 text-sm font-semibold">{t("schedule.yourTemplates")}</h3>
                <div className="space-y-2">
                  {state.templates
                    .filter((t) => t.ownerId === state.profile?.id && !t.isPublic)
                    .map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-2"
                      >
                        <p className="text-xs font-semibold">{template.name}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() =>
                            update((prev) => ({
                              ...prev,
                              schedule: template.items.map((item) => ({ ...item, done: false })),
                            }))
                          }
                        >
                          {t("schedule.load")}
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("schedule.addTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("schedule.search")}
          />
          <div className="hide-scrollbar max-h-64 space-y-1 overflow-y-auto">
            {filtered.map((a: Activity) => (
              <button
                key={a.id}
                type="button"
                onClick={() => addActivity(a.id)}
                className="w-full rounded-lg border border-border bg-card p-2 text-left hover:border-primary"
              >
                <p className="text-xs font-semibold">{a.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("schedule.ageLine", {
                    minAge: a.minAge,
                    maxAge: a.maxAge,
                    minMinutes: a.minMinutes,
                    maxMinutes: a.maxMinutes,
                    skill: a.skill,
                  })}
                </p>
              </button>
            ))}
            {!filtered.length ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                {t("schedule.noMatches")}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("schedule.saveTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={t("schedule.templateName")}
          />
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("schedule.repeatOn")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_KEYS.map((labelKey, idx) => {
                const active = repeatDays.includes(idx);
                return (
                  <button
                    key={labelKey}
                    type="button"
                    onClick={() =>
                      setRepeatDays((prev) =>
                        active ? prev.filter((d) => d !== idx) : [...prev, idx].sort(),
                      )
                    }
                    className={cn(
                      "tag-base border border-border",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground",
                    )}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
          <Button onClick={saveTemplate}>{t("schedule.saveTemplate")}</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("schedule.shareTitle")}</DialogTitle>
          </DialogHeader>
          <textarea
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
            placeholder={t("schedule.sharePlaceholder")}
            rows={3}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
          />
          <Button onClick={shareTemplate}>{t("schedule.shareAction")}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
