import { Baby, Plus, Search } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import {
  childAgeDisplay,
  formatBirthDate,
  monthsFromSliderIndex,
  parseBirthDate,
  sliderIndexFromMonths,
  SLIDER_MAX_INDEX,
  wholeMonths,
} from "@/lib/calendar/child-age";
import { membershipOnChild } from "@/lib/calendar/permissions";
import { toDateKey, useCalendarStore } from "@/lib/calendar/store";
import type { Child, DayPlan } from "@/lib/calendar/types";
import { AGE_BANDS, type AgeBand } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";
import { ScreenHeader } from "../ui-bits";

function formatExactAge(
  t: (key: string, vars?: Record<string, string | number>) => string,
  years: number,
  months: number,
) {
  if (years === 0) return t("calendar.patients.ageMonths", { count: months });
  if (months === 0 && years === 1) return t("calendar.patients.ageYearOne");
  if (months === 0) return t("calendar.patients.ageYears", { count: years });
  if (years === 1) return t("calendar.patients.ageOneAndMonths", { months });
  return t("calendar.patients.ageYearsAndMonths", { years, months });
}

function PatientAge({ child, showBirthDate = false }: { child: Child; showBirthDate?: boolean }) {
  const { t, locale } = useI18n();
  const shown = childAgeDisplay(child);
  if (shown.kind === "band") {
    return t(`calendar.ageBands.${shown.band.replace("-", "_")}`);
  }
  const age = formatExactAge(t, shown.years, shown.months);
  if (!showBirthDate || !shown.born) return age;
  return `${age} · ${t("calendar.patients.born", { date: formatBirthDate(shown.born, locale) })}`;
}

function progressFor(plans: DayPlan[], childId: string, today: string) {
  const plan =
    plans.find((item) => item.childId === childId && item.date === today) ??
    plans.filter((item) => item.childId === childId).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!plan?.steps.length) return null;
  return {
    done: plan.steps.filter((step) => step.done).length,
    total: plan.steps.length,
  };
}

export function PatientsTab({ onOpenChild }: { onOpenChild: () => void }) {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [ageIndex, setAgeIndex] = useState(6);
  const [birthDate, setBirthDate] = useState("");
  const [newTag, setNewTag] = useState("");

  const tags = cal.therapistTagsForActive();
  const today = toDateKey(new Date());

  const patients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cal.myChildren.filter((c) => {
      if (
        membershipOnChild(cal.state.memberships, c.id, cal.activePerson.id)?.role !== "therapist"
      ) {
        return false;
      }
      if (q && !c.displayName.toLowerCase().includes(q)) return false;
      if (tagFilter) {
        const has = cal.state.childTags.some((ct) => ct.childId === c.id && ct.tagId === tagFilter);
        if (!has) return false;
      }
      return true;
    });
  }, [
    cal.activePerson.id,
    cal.myChildren,
    cal.state.childTags,
    cal.state.memberships,
    query,
    tagFilter,
  ]);

  const resetForm = () => {
    setName("");
    setAgeIndex(6);
    setBirthDate("");
  };

  const parsedDob = birthDate.trim() ? parseBirthDate(birthDate) : null;
  const shownMonths = parsedDob ? wholeMonths(parsedDob) : monthsFromSliderIndex(ageIndex);

  const addPatient = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("calendar.patients.nameRequired"));
      return;
    }
    const dobRaw = birthDate.trim();
    if (dobRaw && !parsedDob) {
      toast.error(t("calendar.patients.dobInvalid"));
      return;
    }
    const child = cal.addChild(
      trimmed,
      {
        ageMonths: shownMonths,
        ...(parsedDob ? { birthDate: parsedDob } : {}),
      },
      tagFilter ? [tagFilter] : [],
    );
    if (!child) {
      toast.error(t("share.saveFailed"));
      return;
    }
    setAdding(false);
    resetForm();
    toast.success(t("calendar.patients.added", { name: child.displayName }));
    onOpenChild();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("calendar.patients.title")}
        subtitle={t("calendar.patients.subtitle")}
        right={
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 size-4" /> {t("calendar.patients.add")}
          </Button>
        }
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("calendar.patients.search")}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              !tagFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {t("calendar.patients.all")}
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setTagFilter(tag.id === tagFilter ? null : tag.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                tagFilter === tag.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tag.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder={t("calendar.patients.newTag")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!newTag.trim()) return;
              cal.addTherapistTag(newTag);
              setNewTag("");
              toast.success(t("calendar.patients.tagAdded"));
            }}
          >
            {t("calendar.patients.addTag")}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">{t("calendar.patients.privacyNote")}</p>
        {cal.shareMode === "live" ? (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            {cal.shareStatus === "ready" ? t("share.liveOn") : t("share.notConfigured")}
          </p>
        ) : null}

        <div className="space-y-2">
          {patients.map((child) => {
            const childTagNames = cal.state.childTags
              .filter((ct) => ct.childId === child.id)
              .map((ct) => tags.find((tg) => tg.id === ct.tagId)?.name)
              .filter(Boolean);
            const progress = progressFor(cal.state.dayPlans, child.id, today);
            return (
              <button
                key={child.id}
                type="button"
                data-testid={`patient-${child.id}`}
                onClick={() => {
                  cal.selectChild(child.id);
                  onOpenChild();
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-border transition-colors hover:bg-muted/40"
              >
                <div className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Baby className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{child.displayName}</p>
                  <p
                    className="text-[11px] text-muted-foreground"
                    data-testid={`patient-age-${child.id}`}
                  >
                    <PatientAge child={child} showBirthDate />
                    {childTagNames.length ? ` · ${childTagNames.join(", ")}` : ""}
                  </p>
                  {progress ? (
                    <p
                      className="mt-0.5 text-[11px] font-semibold text-primary"
                      data-testid={`patient-progress-${child.id}`}
                    >
                      {t("calendar.patients.progress", {
                        done: progress.done,
                        total: progress.total,
                      })}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("calendar.patients.empty")}</p>
          ) : null}
        </div>
      </div>

      <Dialog
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="add-patient-dialog">
          <DialogHeader>
            <DialogTitle>{t("calendar.patients.addTitle")}</DialogTitle>
            <DialogDescription>{t("calendar.patients.addBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="patient-name">{t("calendar.patients.namePlaceholder")}</Label>
            <Input
              id="patient-name"
              data-testid="patient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("calendar.patients.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label id="patient-age-label">{t("calendar.patients.ageLabel")}</Label>
              <p className="text-sm font-semibold" data-testid="patient-age-value">
                {formatExactAge(t, Math.floor(shownMonths / 12), shownMonths % 12)}
              </p>
            </div>
            <Slider
              min={0}
              max={SLIDER_MAX_INDEX}
              step={1}
              value={[parsedDob ? sliderIndexFromMonths(shownMonths) : ageIndex]}
              onValueChange={(next) => {
                setAgeIndex(next[0] ?? 0);
                setBirthDate("");
              }}
              thumbClassName="size-8"
              aria-labelledby="patient-age-label"
              data-testid="patient-age"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{formatExactAge(t, 0, 0)}</span>
              <span>{t("calendar.patients.ageYears", { count: 10 })}</span>
            </div>
            {parsedDob ? (
              <p className="text-[11px] text-muted-foreground">
                {t("calendar.patients.ageFromDob")}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="patient-dob">{t("calendar.patients.dobLabel")}</Label>
            <Input
              id="patient-dob"
              data-testid="patient-dob"
              type="date"
              max={today}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">{t("calendar.patients.dobPrivate")}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("calendar.patients.ageOrDob")}</p>
          <Button
            type="button"
            className="w-full"
            data-testid="patient-add-confirm"
            onClick={addPatient}
          >
            {t("calendar.patients.addConfirm")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Caregiver child picker when more than one child. */
export function ChildrenHome({ onOpenChild }: { onOpenChild: () => void }) {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("3-5");
  const canAdd = cal.activePerson.appRole === "caregiver";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("calendar.children.title")}
        subtitle={t("calendar.children.subtitle")}
        right={
          canAdd ? (
            <Button type="button" size="sm" onClick={() => setAdding(true)}>
              <Plus className="mr-1 size-4" /> {t("calendar.children.add")}
            </Button>
          ) : undefined
        }
      />
      <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        {cal.myChildren.map((child) => (
          <button
            key={child.id}
            type="button"
            onClick={() => {
              cal.selectChild(child.id);
              onOpenChild();
            }}
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-border hover:bg-muted/40"
          >
            <div className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
              <Baby className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{child.displayName}</p>
              <p className="text-[11px] text-muted-foreground">
                <PatientAge child={child} />
              </p>
            </div>
          </button>
        ))}
        {cal.myChildren.length === 0 ? (
          <div className="rounded-2xl bg-card p-5 text-center ring-1 ring-border">
            <p className="text-sm font-semibold">
              {canAdd ? t("calendar.children.emptyTitle") : t("calendar.helper.waitingTitle")}
            </p>
            {!canAdd ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("calendar.helper.waitingBody")}
              </p>
            ) : (
              <Button type="button" className="mt-3" onClick={() => setAdding(true)}>
                <Plus className="mr-1 size-4" /> {t("calendar.children.add")}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("calendar.children.add")}</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("calendar.patients.namePlaceholder")}
          />
          <div className="flex flex-wrap gap-2">
            {AGE_BANDS.map((band) => (
              <button
                key={band.id}
                type="button"
                onClick={() => setAgeBand(band.id)}
                className={
                  ageBand === band.id
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                    : "rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground"
                }
              >
                {t(band.labelKey)}
              </button>
            ))}
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              const child = cal.addChild(name, ageBand);
              if (!child) {
                toast.error(t("share.saveFailed"));
                return;
              }
              setAdding(false);
              setName("");
              toast.success(t("calendar.patients.added", { name: child.displayName }));
              onOpenChild();
            }}
          >
            {t("common.save")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
