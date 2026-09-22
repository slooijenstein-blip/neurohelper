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
import { useI18n } from "@/i18n/I18nProvider";
import { ACTIVITIES } from "@/lib/activities-data";
import { localizedActivity, skillMessageKey } from "@/lib/activity-locale";
import {
  customPlanStep,
  planStepFromActivity,
} from "@/lib/calendar/activity-steps";
import type { PlanStep } from "@/lib/calendar/types";
import { AgeTag, DurationTag, SkillTag } from "../ui-bits";
import { cn } from "@/lib/utils";

type Mode = "catalog" | "custom";

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
  const [mode, setMode] = useState<Mode>("catalog");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customMinutes, setCustomMinutes] = useState("10");
  const [customNotes, setCustomNotes] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTIVITIES.map((activity) => localizedActivity(activity, locale))
      .filter((a) => {
        if (!q) return true;
        const raw = ACTIVITIES.find((item) => item.id === a.id);
        const haystack = `${a.title} ${a.description} ${raw?.title ?? ""} ${raw?.description ?? ""} ${t(skillMessageKey(a.skill))} ${a.skill}`;
        return haystack.toLowerCase().includes(q);
      })
      .slice(0, 40);
  }, [query, locale, t]);

  const preview = useMemo(() => {
    if (!previewId) return null;
    const raw = ACTIVITIES.find((activity) => activity.id === previewId);
    return raw ? localizedActivity(raw, locale) : null;
  }, [previewId, locale]);

  const reset = () => {
    setMode("catalog");
    setQuery("");
    setPreviewId(null);
    setCustomTitle("");
    setCustomMinutes("10");
    setCustomNotes("");
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
                <p className="text-sm text-muted-foreground">{preview.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <AgeTag>
                    {preview.minAge}–{preview.maxAge}
                  </AgeTag>
                  <SkillTag skill={preview.skill} />
                  <DurationTag
                    minMinutes={preview.minMinutes}
                    maxMinutes={preview.maxMinutes}
                  />
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
          <div className="space-y-3 px-5 py-4">
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={t("calendar.picker.customTitle")}
            />
            <Input
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder={t("calendar.picker.customMinutes")}
              inputMode="numeric"
            />
            <Input
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={t("calendar.picker.customNotes")}
            />
            <Button
              type="button"
              className="w-full"
              disabled={!customTitle.trim()}
              onClick={() => {
                const mins = Number.parseInt(customMinutes, 10);
                onPick(
                  customPlanStep(
                    customTitle,
                    Number.isFinite(mins) && mins > 0 ? mins : 10,
                    customNotes,
                  ),
                );
                close(false);
              }}
            >
              <Sparkles className="mr-1 size-4" />
              {t("calendar.picker.addCustom")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
