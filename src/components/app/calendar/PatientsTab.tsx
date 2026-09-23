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
import { useI18n } from "@/i18n/I18nProvider";
import { useCalendarStore } from "@/lib/calendar/store";
import { AGE_BANDS, type AgeBand } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";
import { ScreenHeader } from "../ui-bits";

export function PatientsTab({ onOpenChild }: { onOpenChild: () => void }) {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("3-5");
  const [newTag, setNewTag] = useState("");

  const tags = cal.therapistTagsForActive();

  const patients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cal.myChildren.filter((c) => {
      if (q && !c.displayName.toLowerCase().includes(q)) return false;
      if (tagFilter) {
        const has = cal.state.childTags.some((ct) => ct.childId === c.id && ct.tagId === tagFilter);
        if (!has) return false;
      }
      return true;
    });
  }, [cal.myChildren, cal.state.childTags, query, tagFilter]);

  const addPatient = () => {
    const child = cal.addChild(name, ageBand, tagFilter ? [tagFilter] : []);
    if (!child) {
      toast.error(t("share.saveFailed"));
      return;
    }
    setAdding(false);
    setName("");
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
                  <p className="text-[11px] text-muted-foreground">
                    {t(`calendar.ageBands.${child.ageBand.replace("-", "_")}`)}
                    {childTagNames.length ? ` · ${childTagNames.join(", ")}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("calendar.patients.empty")}</p>
          ) : null}
        </div>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("calendar.patients.addTitle")}</DialogTitle>
            <DialogDescription>{t("calendar.patients.addBody")}</DialogDescription>
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
          <Button type="button" className="w-full" onClick={addPatient}>
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
                {t(`calendar.ageBands.${child.ageBand.replace("-", "_")}`)}
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
