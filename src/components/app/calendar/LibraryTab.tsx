import { Copy, MoreHorizontal, Pencil, Plus, Search, Trash2, UserRoundSearch } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { canManageLibrary } from "@/lib/calendar/permissions";
import { thisWeekDates, useCalendarStore } from "@/lib/calendar/store";
import type { LibraryPlan, PlanStep } from "@/lib/calendar/types";
import { ScreenHeader } from "../ui-bits";
import { ActivityPickerDialog } from "./ActivityPickerDialog";
import { BrowseActivitiesPanel } from "./BrowseActivitiesPanel";
import { StepDetailDialog } from "./StepDetailDialog";

export function LibraryTab({
  applyMode,
  onApplied,
}: {
  applyMode?: boolean;
  onApplied?: () => void;
}) {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const child = cal.selectedChild;
  const role = cal.roleOnSelected;
  const plans = cal.visibleLibrary(child?.id ?? null);
  const masters = plans.filter((p) => p.childId === null);
  const childPlans = plans.filter((p) => p.childId != null);

  const [browse, setBrowse] = useState(false);
  const [editor, setEditor] = useState<LibraryPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftSteps, setDraftSteps] = useState<PlanStep[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editStepIndex, setEditStepIndex] = useState<number | null>(null);
  const [detailStep, setDetailStep] = useState<PlanStep | null>(null);
  const [applyTarget, setApplyTarget] = useState<LibraryPlan | null>(null);
  const [patientPicker, setPatientPicker] = useState<LibraryPlan | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [weekdayMask, setWeekdayMask] = useState([true, true, true, true, true, false, false]);

  const canManage = canManageLibrary(role) || cal.activePerson.appRole === "therapist";

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    return cal.myChildren.filter((c) => !q || c.displayName.toLowerCase().includes(q));
  }, [cal.myChildren, patientQuery]);

  if (browse) {
    return <BrowseActivitiesPanel onBack={() => setBrowse(false)} />;
  }

  const openCreate = () => {
    setCreating(true);
    setEditor(null);
    setDraftName("");
    setDraftSteps([]);
  };

  const openEdit = (plan: LibraryPlan) => {
    setCreating(false);
    setEditor(plan);
    setDraftName(plan.name);
    setDraftSteps(plan.steps.map((s) => ({ ...s })));
  };

  const saveEditor = () => {
    const steps = draftSteps.filter((s) => s.title.trim());
    if (!steps.length) {
      toast.error(t("calendar.library.needSteps"));
      return;
    }
    if (editor) {
      cal.updateLibraryPlan(editor.id, { name: draftName, steps });
      toast.success(t("calendar.library.updated"));
    } else {
      cal.createLibraryPlan(
        draftName,
        steps,
        cal.activePerson.appRole === "therapist" && child ? null : (child?.id ?? null),
      );
      toast.success(t("calendar.library.created"));
    }
    setEditor(null);
    setCreating(false);
  };

  const applyPlan = (plan: LibraryPlan) => {
    if (!child) {
      toast.error(t("calendar.library.needChild"));
      return;
    }
    const dates = thisWeekDates(weekdayMask);
    if (!dates.length) {
      toast.error(t("calendar.library.needDays"));
      return;
    }
    cal.applyLibraryPlan(plan.id, child.id, dates);
    toast.success(t("calendar.library.applied", { name: plan.name }));
    setApplyTarget(null);
    onApplied?.();
  };

  const onPickStep = (step: PlanStep) => {
    if (editStepIndex != null) {
      setDraftSteps((prev) => prev.map((s, i) => (i === editStepIndex ? { ...step, id: s.id } : s)));
      setEditStepIndex(null);
    } else {
      setDraftSteps((prev) => [...prev, step]);
    }
  };

  const PlanCard = ({ plan, badge }: { plan: LibraryPlan; badge?: string }) => (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{plan.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("calendar.library.stepCount", { count: plan.steps.length })}
            {badge ? ` · ${badge}` : ""}
          </p>
        </div>
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">{t("calendar.library.menu")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(plan)}>
                <Pencil className="mr-2 size-4" /> {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  cal.duplicateLibraryPlan(plan.id);
                  toast.success(t("calendar.library.duplicated"));
                }}
              >
                <Copy className="mr-2 size-4" /> {t("calendar.library.duplicate")}
              </DropdownMenuItem>
              {cal.activePerson.appRole === "therapist" && plan.childId === null ? (
                <DropdownMenuItem onClick={() => setPatientPicker(plan)}>
                  <UserRoundSearch className="mr-2 size-4" /> {t("calendar.library.useForPatient")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  cal.deleteLibraryPlan(plan.id);
                  toast.success(t("calendar.library.deleted"));
                }}
              >
                <Trash2 className="mr-2 size-4" /> {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <ul className="mt-2 space-y-1">
        {plan.steps.slice(0, 3).map((s) => (
          <li key={s.id} className="truncate text-xs text-muted-foreground">
            · {s.title}
            {s.activityId ? ` (${t("calendar.today.fromCatalog")})` : ""}
          </li>
        ))}
        {plan.steps.length > 3 ? (
          <li className="text-xs text-muted-foreground">
            {t("calendar.library.moreSteps", { count: plan.steps.length - 3 })}
          </li>
        ) : null}
      </ul>
      {child && canManage ? (
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full"
          variant={applyMode ? "default" : "outline"}
          onClick={() => setApplyTarget(plan)}
        >
          {t("calendar.library.apply")}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("calendar.library.title")}
        subtitle={
          cal.activePerson.appRole === "therapist"
            ? t("calendar.library.therapistSubtitle")
            : t("calendar.library.subtitle")
        }
        right={
          canManage ? (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="mr-1 size-4" /> {t("calendar.library.create")}
            </Button>
          ) : undefined
        }
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        <Button type="button" variant="outline" className="w-full" onClick={() => setBrowse(true)}>
          <Search className="mr-1 size-4" />
          {t("calendar.browse.open")}
        </Button>

        {cal.activePerson.appRole === "therapist" ? (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("calendar.library.myTemplates")}
              </h3>
              {masters.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("calendar.library.empty")}</p>
              ) : (
                masters.map((p) => <PlanCard key={p.id} plan={p} />)
              )}
            </section>
            {child ? (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("calendar.library.forPatient", { name: child.displayName })}
                </h3>
                {childPlans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("calendar.library.noPatientCopies")}
                  </p>
                ) : (
                  childPlans.map((p) => (
                    <PlanCard key={p.id} plan={p} badge={t("calendar.library.patientCopy")} />
                  ))
                )}
              </section>
            ) : null}
          </>
        ) : (
          <section className="space-y-2">
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("calendar.library.empty")}</p>
            ) : (
              plans.map((p) => <PlanCard key={p.id} plan={p} />)
            )}
          </section>
        )}
      </div>

      <Dialog
        open={creating || !!editor}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditor(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editor ? t("calendar.library.editTitle") : t("calendar.library.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("calendar.library.editorHintCatalog")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={t("calendar.library.namePlaceholder")}
            />
            <div className="space-y-2">
              {draftSteps.map((step, idx) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setDetailStep(step)}
                  className="w-full rounded-xl bg-muted/50 px-3 py-2 text-left"
                >
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {step.description || step.notes || t("calendar.library.noDetails")}
                    {step.minutes ? ` · ${step.minutes}m` : ""}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-[11px] font-semibold text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditStepIndex(idx);
                        setPickerOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          setEditStepIndex(idx);
                          setPickerOpen(true);
                        }
                      }}
                    >
                      {t("calendar.stepDetail.changeActivity")}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-[11px] font-semibold text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraftSteps((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          setDraftSteps((prev) => prev.filter((_, i) => i !== idx));
                        }
                      }}
                    >
                      {t("common.delete")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditStepIndex(null);
                setPickerOpen(true);
              }}
            >
              <Plus className="mr-1 size-4" /> {t("calendar.library.addFromCatalog")}
            </Button>
            <Button type="button" className="w-full" onClick={saveEditor}>
              {t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ActivityPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={onPickStep}
        title={
          editStepIndex != null
            ? t("calendar.picker.changeTitle")
            : t("calendar.picker.addToPlan")
        }
      />

      <StepDetailDialog
        step={detailStep}
        open={!!detailStep}
        onOpenChange={(o) => !o && setDetailStep(null)}
        canEdit={canManage}
        onChangeActivity={
          detailStep
            ? () => {
                const idx = draftSteps.findIndex((s) => s.id === detailStep.id);
                setEditStepIndex(idx >= 0 ? idx : null);
                setDetailStep(null);
                setPickerOpen(true);
              }
            : undefined
        }
      />

      <Dialog open={!!applyTarget} onOpenChange={(open) => !open && setApplyTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("calendar.library.applyTitle")}</DialogTitle>
            <DialogDescription>
              {t("calendar.library.applyBody", { name: applyTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {[
              "calendar.week.mon",
              "calendar.week.tue",
              "calendar.week.wed",
              "calendar.week.thu",
              "calendar.week.fri",
              "calendar.week.sat",
              "calendar.week.sun",
            ].map((key, i) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setWeekdayMask((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
                }
                className={
                  weekdayMask[i]
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                    : "rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground"
                }
              >
                {t(key)}
              </button>
            ))}
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => applyTarget && applyPlan(applyTarget)}
          >
            {t("calendar.library.applyConfirm")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!patientPicker} onOpenChange={(open) => !open && setPatientPicker(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("calendar.library.useForPatient")}</DialogTitle>
            <DialogDescription>{t("calendar.library.useForPatientBody")}</DialogDescription>
          </DialogHeader>
          <Input
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            placeholder={t("calendar.patients.search")}
          />
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {filteredPatients.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                onClick={() => {
                  if (!patientPicker) return;
                  const copy = cal.useTemplateForPatient(patientPicker.id, c.id);
                  if (copy) {
                    cal.selectChild(c.id);
                    toast.success(
                      t("calendar.library.copiedForPatient", { name: c.displayName }),
                    );
                  }
                  setPatientPicker(null);
                }}
              >
                {c.displayName}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
