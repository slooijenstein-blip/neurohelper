import { Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { SKILLS, type Skill } from "@/lib/activities-data";
import { localizedActivity, skillMessageKey } from "@/lib/activity-locale";
import { creatorCreditName } from "@/lib/creator/catalog";
import { CreatorCredit } from "../CreatorCredit";
import { useMergedActivities } from "../usePublishedActivities";
import { customPlanStep, planStepFromActivity } from "@/lib/calendar/activity-steps";
import type { PlanStep } from "@/lib/calendar/types";
import { AgeTag, DurationTag, SkillTag } from "../ui-bits";
import { cn } from "@/lib/utils";

type Mode = "catalog" | "custom";

const fieldLabelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function lines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const emptyCustom = {
  title: "",
  description: "",
  minAge: "1",
  maxAge: "3",
  skill: "Sensory Play" as Skill,
  minutes: "10",
  materials: "",
  howTo: "",
};

export function ActivityPickerDialog({
  open,
  onOpenChange,
  onPick,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (step: PlanStep) => void;
  title?: string;
}) {
  const { t, locale } = useI18n();
  const catalog = useMergedActivities();
  const [mode, setMode] = useState<Mode>("catalog");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [custom, setCustom] = useState(emptyCustom);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .map((activity) => localizedActivity(activity, locale))
      .filter((a) => {
        if (!q) return true;
        const raw = catalog.find((item) => item.id === a.id);
        const haystack = `${a.title} ${a.description} ${raw?.title ?? ""} ${raw?.description ?? ""} ${creatorCreditName(raw) ?? ""} ${t(skillMessageKey(a.skill))} ${a.skill}`;
        return haystack.toLowerCase().includes(q);
      })
      .slice(0, 40);
  }, [catalog, query, locale, t]);

  const preview = useMemo(() => {
    if (!previewId) return null;
    const raw = catalog.find((activity) => activity.id === previewId);
    return raw ? localizedActivity(raw, locale) : null;
  }, [catalog, previewId, locale]);

  const reset = () => {
    setMode("catalog");
    setQuery("");
    setPreviewId(null);
    setCustom(emptyCustom);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 text-left">
          <DialogTitle>{title ?? t("calendar.picker.title")}</DialogTitle>
          <DialogDescription>{t("calendar.picker.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 gap-2 border-b border-border px-5 py-3">
          <button
            type="button"
            onClick={() => setMode("catalog")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              mode === "catalog"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {t("calendar.picker.fromCatalog")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("custom");
              setPreviewId(null);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              mode === "custom"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {t("calendar.picker.custom")}
          </button>
        </div>

        {mode === "catalog" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-5 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("calendar.picker.search")}
                />
              </div>
            </div>

            {preview ? (
              <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-5">
                <button
                  type="button"
                  className="text-xs font-semibold text-primary"
                  onClick={() => setPreviewId(null)}
                >
                  {t("common.back")}
                </button>
                <h3 className="font-display text-lg font-semibold">{preview.title}</h3>
                {"creatorName" in preview ? (
                  <CreatorCredit name={creatorCreditName(preview)} />
                ) : null}
                <p className="text-sm text-muted-foreground">{preview.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <AgeTag>
                    {preview.minAge}–{preview.maxAge}
                  </AgeTag>
                  <SkillTag skill={preview.skill} />
                  <DurationTag minMinutes={preview.minMinutes} maxMinutes={preview.maxMinutes} />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("calendar.picker.materials")}
                  </p>
                  <ul className="list-inside list-disc text-sm text-muted-foreground">
                    {preview.materials.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("calendar.picker.howTo")}
                  </p>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                    {preview.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    onPick(planStepFromActivity(preview));
                    close(false);
                  }}
                >
                  {t("calendar.picker.useActivity")}
                </Button>
              </div>
            ) : (
              <div className="hide-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {t("calendar.picker.resultCount", { count: results.length })}
                </p>
                {results.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setPreviewId(a.id)}
                    className="w-full rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-border transition-colors hover:bg-muted/50"
                  >
                    <p className="text-sm font-semibold">{a.title}</p>
                    {"creatorName" in a ? <CreatorCredit name={creatorCreditName(a)} /> : null}
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {a.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <SkillTag skill={a.skill} />
                      <DurationTag minMinutes={a.minMinutes} maxMinutes={a.maxMinutes} />
                    </div>
                  </button>
                ))}
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("calendar.picker.noMatches")}</p>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <form
            className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4"
            data-testid="custom-step-form"
            onSubmit={(event) => {
              event.preventDefault();
              const minAge = Number(custom.minAge);
              const maxAge = Number(custom.maxAge);
              const minutes = Number(custom.minutes);
              const howTo = lines(custom.howTo);
              if (
                !custom.title.trim() ||
                !custom.description.trim() ||
                !howTo.length ||
                !Number.isInteger(minAge) ||
                !Number.isInteger(maxAge) ||
                minAge < 0 ||
                maxAge > 6 ||
                minAge > maxAge ||
                !Number.isInteger(minutes) ||
                minutes < 1 ||
                minutes > 180
              ) {
                return;
              }
              onPick(
                customPlanStep({
                  title: custom.title,
                  description: custom.description,
                  minutes,
                  skill: custom.skill,
                  minAge,
                  maxAge,
                  materials: lines(custom.materials),
                  howTo,
                }),
              );
              close(false);
            }}
          >
            <p className="text-xs text-muted-foreground">{t("calendar.picker.customHint")}</p>
            <label className={fieldLabelClass} htmlFor="custom-name">
              {t("creator.name")}
            </label>
            <Input
              id="custom-name"
              data-testid="custom-name"
              value={custom.title}
              maxLength={80}
              onChange={(event) => setCustom((prev) => ({ ...prev, title: event.target.value }))}
            />
            <label className={fieldLabelClass} htmlFor="custom-about">
              {t("creator.about")}
            </label>
            <Textarea
              id="custom-about"
              data-testid="custom-about"
              value={custom.description}
              maxLength={800}
              onChange={(event) =>
                setCustom((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabelClass} htmlFor="custom-age-min">
                  {t("creator.ageMin")}
                </label>
                <Input
                  id="custom-age-min"
                  data-testid="custom-age-min"
                  type="number"
                  min={0}
                  max={6}
                  value={custom.minAge}
                  onChange={(event) =>
                    setCustom((prev) => ({ ...prev, minAge: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="custom-age-max">
                  {t("creator.ageMax")}
                </label>
                <Input
                  id="custom-age-max"
                  data-testid="custom-age-max"
                  type="number"
                  min={0}
                  max={6}
                  value={custom.maxAge}
                  onChange={(event) =>
                    setCustom((prev) => ({ ...prev, maxAge: event.target.value }))
                  }
                />
              </div>
            </div>
            <label className={fieldLabelClass} htmlFor="custom-skill">
              {t("creator.type")}
            </label>
            <select
              id="custom-skill"
              data-testid="custom-skill"
              className={selectClass}
              value={custom.skill}
              onChange={(event) =>
                setCustom((prev) => ({ ...prev, skill: event.target.value as Skill }))
              }
            >
              {SKILLS.map((skill) => (
                <option key={skill} value={skill}>
                  {t(skillMessageKey(skill))}
                </option>
              ))}
            </select>
            <label className={fieldLabelClass} htmlFor="custom-minutes">
              {t("creator.length")}
            </label>
            <Input
              id="custom-minutes"
              data-testid="custom-minutes"
              type="number"
              min={1}
              max={180}
              value={custom.minutes}
              onChange={(event) => setCustom((prev) => ({ ...prev, minutes: event.target.value }))}
            />
            <label className={fieldLabelClass} htmlFor="custom-materials">
              {t("creator.materials")}
            </label>
            <Textarea
              id="custom-materials"
              data-testid="custom-materials"
              value={custom.materials}
              placeholder={t("creator.materialsHint")}
              onChange={(event) =>
                setCustom((prev) => ({ ...prev, materials: event.target.value }))
              }
            />
            <label className={fieldLabelClass} htmlFor="custom-steps">
              {t("creator.steps")}
            </label>
            <Textarea
              id="custom-steps"
              data-testid="custom-steps"
              value={custom.howTo}
              placeholder={t("creator.stepsHint")}
              onChange={(event) => setCustom((prev) => ({ ...prev, howTo: event.target.value }))}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={
                !custom.title.trim() || !custom.description.trim() || !lines(custom.howTo).length
              }
              data-testid="custom-step-submit"
            >
              <Sparkles className="mr-1 size-4" />
              {t("calendar.picker.addCustom")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
