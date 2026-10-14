import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundSearch,
} from "lucide-react";
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
import { presentPlanName, presentPlanStep } from "@/lib/activity-locale";
import { canManageLibrary, membershipOnChild } from "@/lib/calendar/permissions";
import { thisWeekDates, useCalendarStore } from "@/lib/calendar/store";
import type { LibraryPlan, PlanStep } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";
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
  const { t, locale } = useI18n();
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<LibraryPlan | null>(null);

  const canManage = canManageLibrary(role) || cal.activePerson.appRole === "therapist";

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    return cal.myChildren.filter((c) => {
      if (q && !c.displayName.toLowerCase().includes(q)) return false;
      if (cal.activePerson.appRole !== "therapist") return true;
      return (
        membershipOnChild(cal.state.memberships, c.id, cal.activePerson.id)?.role === "therapist"
      );
    });
  }, [
    cal.activePerson.appRole,
    cal.activePerson.id,
    cal.myChildren,
    cal.state.memberships,
    patientQuery,
  ]);

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
    setDraftName(presentPlanName(plan, t));
    setDraftSteps(plan.steps.map((s) => ({ ...s })));
  };

  const saveEditor = () => {
    const steps = draftSteps.filter((s) => s.title.trim());
    if (!steps.length) {
      toast.error(t("calendar.library.needSteps"));
      return;
    }
    if (editor) {
      const shown = presentPlanName(editor, t);
      const keepKey = Boolean(editor.nameKey) && draftName.trim() === shown;
      cal.updateLibraryPlan(editor.id, {
        name: keepKey ? editor.name : draftName,
        steps,
      });
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
    toast.success(t("calendar.library.applied", { name: presentPlanName(plan, t) }));
    setApplyTarget(null);
    onApplied?.();
  };

  const onPickStep = (step: PlanStep) => {
    if (editStepIndex != null) {
      setDraftSteps((prev) =>
        prev.map((s, i) => (i === editStepIndex ? { ...step, id: s.id } : s)),
      );
      setEditStepIndex(null);
    } else {
      setDraftSteps((prev) => [...prev, step]);
    }
  };

  const PlanCard = ({ plan, badge }: { plan: LibraryPlan; badge?: string }) => {
    const open = Boolean(expandedIds[plan.id]);
    const totalMinutes = plan.steps.reduce((sum, step) => sum + (step.minutes || 0), 0);
    return (
      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            aria-expanded={open}
            aria-label={t(open ? "calendar.library.collapse" : "calendar.library.expand", {
              name: presentPlanName(plan, t),
            })}
            onClick={() =>
              setExpandedIds((prev) => ({
                ...prev,
                [plan.id]: !prev[plan.id],
              }))
            }
            className="flex min-w-0 flex-1 items-start gap-2 rounded-xl text-left hover:bg-muted/40"
          >
            <ChevronRight
              className={cn(
                "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {presentPlanName(plan, t)}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {t("calendar.library.stepCount", { count: plan.steps.length })}
                {totalMinutes > 0
                  ? ` · ${t("calendar.library.minutesTotal", { count: totalMinutes })}`
                  : ""}
                {badge ? ` · ${badge}` : ""}
              </span>
            </span>
          </button>
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
                    <UserRoundSearch className="mr-2 size-4" />{" "}
                    {t("calendar.library.useForPatient")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setPendingDelete(plan)}
                >
                  <Trash2 className="mr-2 size-4" /> {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {open ? (
          <ol className="mt-3 space-y-1.5 border-t border-border pt-3">
            {plan.steps.map((step, index) => {
              const shown = presentPlanStep(step, locale);
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setDetailStep(step)}
                    className="w-full rounded-xl px-2 py-2 text-left hover:bg-muted/60"
                  >
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t("calendar.today.step", { n: index + 1 })}
                      {step.minutes
                        ? ` · ${t("activities.durationExact", { count: step.minutes })}`
                        : ""}
                      {step.activityId ? ` · ${t("calendar.today.fromCatalog")}` : ""}
                    </span>
                    <span className="block text-sm font-semibold">{shown.title}</span>
                    {shown.description ? (
                      <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                        {shown.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
            {plan.steps.length === 0 ? (
              <li className="px-2 text-xs text-muted-foreground">
                {t("calendar.library.noDetails")}
              </li>
            ) : null}
          </ol>
        ) : null}
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
  };

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
              {draftSteps.map((step, idx) => {
                const shown = presentPlanStep(step, locale);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setDetailStep(step)}
                    className="w-full rounded-xl bg-muted/50 px-3 py-2 text-left"
                  >
                    <p className="text-sm font-semibold">{shown.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {shown.description || t("calendar.library.noDetails")}
                      {step.minutes
                        ? ` · ${t("activities.durationExact", { count: step.minutes })}`
                        : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        {t("calendar.library.minutes")}
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={step.minutes || 10}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            const minutes = Math.min(
                              180,
                              Math.max(1, Number(event.target.value) || 1),
                            );
                            setDraftSteps((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, minutes } : item)),
                            );
                          }}
                          className="h-7 w-14 rounded-md border border-border bg-card px-1 text-xs text-foreground"
                        />
                      </label>
                      <span
                        role="button"
                        tabIndex={0}
                        className="text-[11px] font-semibold text-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (idx === 0) return;
                          setDraftSteps((prev) => {
                            const next = [...prev];
                            const current = next[idx];
                            const previous = next[idx - 1];
                            if (!current || !previous) return prev;
                            next[idx - 1] = current;
                            next[idx] = previous;
                            return next;
                          });
                        }}
                      >
                        {t("calendar.library.moveUp")}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        className="text-[11px] font-semibold text-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDraftSteps((prev) => {
                            if (idx >= prev.length - 1) return prev;
                            const next = [...prev];
                            const current = next[idx];
                            const following = next[idx + 1];
                            if (!current || !following) return prev;
                            next[idx + 1] = current;
                            next[idx] = following;
                            return next;
                          });
                        }}
                      >
                        {t("calendar.library.moveDown")}
                      </span>
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
                );
              })}
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
          editStepIndex != null ? t("calendar.picker.changeTitle") : t("calendar.picker.addToPlan")
        }
      />

      <StepDetailDialog
        step={detailStep}
        open={!!detailStep}
        onOpenChange={(open) => {
          if (!open) setDetailStep(null);
        }}
        canEdit={
          Boolean(detailStep) &&
          (creating || !!editor) &&
          draftSteps.some((s) => s.id === detailStep?.id)
        }
        {...(detailStep && (creating || editor) && draftSteps.some((s) => s.id === detailStep.id)
          ? {
              onChangeActivity: () => {
                const idx = draftSteps.findIndex((s) => s.id === detailStep.id);
                setEditStepIndex(idx >= 0 ? idx : null);
                setDetailStep(null);
                setPickerOpen(true);
              },
            }
          : {})}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md" data-testid="delete-plan-dialog">
          <DialogHeader>
            <DialogTitle>{t("calendar.library.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("calendar.library.deleteBody", {
                name: pendingDelete ? presentPlanName(pendingDelete, t) : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setPendingDelete(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="flex-1"
              data-testid="delete-plan-confirm"
              onClick={() => {
                if (!pendingDelete) return;
                cal.deleteLibraryPlan(pendingDelete.id);
                setPendingDelete(null);
                toast.success(t("calendar.library.deleted"));
              }}
            >
              {t("calendar.library.deleteConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!applyTarget} onOpenChange={(open) => !open && setApplyTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("calendar.library.applyTitle")}</DialogTitle>
            <DialogDescription>
              {t("calendar.library.applyBody", {
                name: applyTarget ? presentPlanName(applyTarget, t) : "",
              })}
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
                onClick={() => setWeekdayMask((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
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
                    toast.success(t("calendar.library.copiedForPatient", { name: c.displayName }));
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
