import { BookMarked, CalendarPlus, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/i18n/I18nProvider";
import { ACTIVITIES, SKILLS, type Activity, type Skill } from "@/lib/activities-data";
import { localizedActivity, localizedCatalog, presentPlanName, skillMessageKey } from "@/lib/activity-locale";
import { planStepFromActivity } from "@/lib/calendar/activity-steps";
import { toDateKey, useCalendarStore } from "@/lib/calendar/store";
import { canEditPlan, canManageLibrary } from "@/lib/calendar/permissions";
import { AgeTag, DurationTag, ScreenHeader, SkillTag } from "../ui-bits";
import { cn } from "@/lib/utils";

export function BrowseActivitiesPanel({ onBack }: { onBack?: () => void }) {
  const { t, locale } = useI18n();
  const cal = useCalendarStore();
  const [range, setRange] = useState<number[]>([1, 10]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pickPlanOpen, setPickPlanOpen] = useState(false);

  const role = cal.roleOnSelected;
  const canAddToday = canEditPlan(role);
  const canAddLibrary =
    canManageLibrary(role) || cal.activePerson.appRole === "therapist";
  const libraryPlans = cal.visibleLibrary(cal.selectedChild?.id ?? null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return localizedCatalog(locale)
      .filter((a) => a.maxAge >= (range[0] ?? 1) && a.minAge <= (range[1] ?? 10))
      .filter((a) => (skills.length ? skills.includes(a.skill) : true))
      .filter((a) => {
        if (!q) return true;
        const raw = ACTIVITIES.find((item) => item.id === a.id);
        const haystack = `${a.title} ${a.description} ${raw?.title ?? ""} ${raw?.description ?? ""} ${t(skillMessageKey(a.skill))}`;
        return haystack.toLowerCase().includes(q);
      });
  }, [range, skills, query, locale, t]);

  const detail = useMemo(() => {
    if (!detailId) return null;
    const raw = ACTIVITIES.find((activity) => activity.id === detailId);
    return raw ? localizedActivity(raw, locale) : null;
  }, [detailId, locale]);

  const toggleSkill = (s: Skill) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const addToToday = (a: Activity) => {
    if (!cal.selectedChild) {
      toast.error(t("calendar.library.needChild"));
      return;
    }
    cal.addDayStep(cal.selectedChild.id, toDateKey(new Date()), planStepFromActivity(a));
    toast.success(t("calendar.browse.addedToday", { title: a.title }));
    setDetailId(null);
  };

  const addToPlan = (planId: string, a: Activity) => {
    cal.appendLibraryStep(planId, planStepFromActivity(a));
    const plan = libraryPlans.find((p) => p.id === planId);
    toast.success(
      t("calendar.browse.addedLibrary", {
        title: a.title,
        plan: plan ? presentPlanName(plan, t) : "",
      }),
    );
    setPickPlanOpen(false);
    setDetailId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("calendar.browse.title")}
        subtitle={t("calendar.browse.subtitle", { count: results.length })}
        right={
          onBack ? (
            <button type="button" className="text-xs font-semibold text-primary" onClick={onBack}>
              {t("calendar.browse.backLibrary")}
            </button>
          ) : undefined
        }
      />

      <div className="space-y-3 border-b border-border bg-surface px-5 py-3 md:px-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("activities.search")}
            className="h-9 rounded-full bg-card pl-9 text-sm"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <span>{t("calendar.browse.ageRange")}</span>
            <span className="text-foreground">
              {range[0]} – {range[1]}
            </span>
          </div>
          <Slider min={1} max={10} step={1} value={range} onValueChange={setRange} />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
        >
          <Filter className="size-3.5" />
          {filtersOpen ? t("calendar.browse.hideSkills") : t("calendar.browse.showSkills")}
        </button>
        {filtersOpen ? (
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold",
                  skills.includes(s)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {t(skillMessageKey(s))}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hide-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        {results.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setDetailId(a.id)}
            className="w-full rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-border hover:bg-muted/40"
          >
            <p className="text-sm font-semibold">{a.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <AgeTag>
                {a.minAge}–{a.maxAge}
              </AgeTag>
              <SkillTag skill={a.skill} />
              <DurationTag minMinutes={a.minMinutes} maxMinutes={a.maxMinutes} />
            </div>
          </button>
        ))}
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("calendar.picker.noMatches")}</p>
        ) : null}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
            <DialogDescription>{detail?.description}</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-1.5">
                <AgeTag>
                  {detail.minAge}–{detail.maxAge}
                </AgeTag>
                <SkillTag skill={detail.skill} />
                <DurationTag minMinutes={detail.minMinutes} maxMinutes={detail.maxMinutes} />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("calendar.picker.materials")}
                </p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {detail.materials.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("calendar.picker.howTo")}
                </p>
                <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                  {detail.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
              {canAddToday ? (
                <Button type="button" className="w-full" onClick={() => addToToday(detail)}>
                  <CalendarPlus className="mr-1 size-4" />
                  {t("calendar.browse.addToday")}
                </Button>
              ) : null}
              {canAddLibrary ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setPickPlanOpen(true)}
                >
                  <BookMarked className="mr-1 size-4" />
                  {t("calendar.browse.addLibrary")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={pickPlanOpen} onOpenChange={setPickPlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("calendar.browse.pickPlanTitle")}</DialogTitle>
            <DialogDescription>{t("calendar.browse.pickPlanBody")}</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {libraryPlans.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                onClick={() => detail && addToPlan(p.id, detail)}
              >
                <span>{presentPlanName(p, t)}</span>
                <span className="text-[11px] text-muted-foreground">
                  {t("calendar.library.stepCount", { count: p.steps.length })}
                </span>
              </button>
            ))}
            {libraryPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("calendar.library.empty")}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
