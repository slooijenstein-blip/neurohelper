import { CheckCircle2, Circle, UserPlus } from "lucide-react";
import { useState } from "react";
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
import { presentPlanName, presentPlanStep } from "@/lib/activity-locale";
import {
  canInvite,
  canRemoveMember,
  inviteRolesFor,
  membershipOnChild,
} from "@/lib/calendar/permissions";
import { toDateKey, useCalendarStore } from "@/lib/calendar/store";
import type { DayPlan } from "@/lib/calendar/types";
import { sharedTemplateId } from "@/lib/my-calendar";
import { withBasePath } from "@/lib/paths";
import { cn } from "@/lib/utils";

import { AddToMyCalendarButton } from "./AddToMyCalendarButton";
import { PatientAge } from "./calendar/PatientsTab";
import { StepDetailDialog } from "./calendar/StepDetailDialog";
import { WeekStrip } from "./calendar/WeekStrip";

function plansForDay(plans: DayPlan[], childId: string, date: string): DayPlan[] {
  return plans.filter((plan) => plan.childId === childId && plan.date === date);
}

/**
 * Plans a professional shared with this caregiver.
 * Lives on the existing Schedule tab — parents never get the caseload.
 */
export function SharedPlansPanel() {
  const { t, locale } = useI18n();
  const cal = useCalendarStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [pendingHelper, setPendingHelper] = useState<{
    id: string;
    name: string;
    childName: string;
  } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});

  const sharedChildren = cal.myChildren.filter((child) => {
    const role = membershipOnChild(cal.state.memberships, child.id, cal.activePerson.id)?.role;
    return role === "caregiver" || role === "helper";
  });
  if (!cal.hydrated || sharedChildren.length === 0) return null;

  const today = toDateKey(new Date());

  const send = () => {
    if (!childId) return;
    const invite = cal.createInvite(childId, email, "helper", name);
    if (!invite) {
      toast.error(t("calendar.people.inviteFailed"));
      return;
    }
    const next = `${window.location.origin}${withBasePath(`/invite/${invite.token}`)}`;
    setLink(next);
    setEmail("");
    setName("");
    if (cal.shareMode !== "live") {
      toast.success(t("shared.sent"));
      return;
    }
    toast.message(t("share.sending"));
    void cal.emailFor(invite.id).then((delivery) => {
      if (delivery.sent) toast.success(t("share.emailSent"));
      else if (delivery.code === "already_user") toast.message(t("share.emailExists"));
      else
        toast.message(
          t("share.emailSaved", { reason: delivery.message || t("share.notConfigured") }),
        );
    });
  };

  const selectedId =
    sharedChildren.find((child) => child.id === cal.state.selectedChildId)?.id ??
    sharedChildren[0]?.id;
  const shownChildren =
    sharedChildren.length > 1
      ? sharedChildren.filter((child) => child.id === selectedId)
      : sharedChildren;

  const detail = shownChildren
    .flatMap((child) => plansForDay(cal.state.dayPlans, child.id, dates[child.id] ?? today))
    .flatMap((plan) => plan.steps)
    .find((step) => step.id === detailId);
  const detailPlan = shownChildren
    .flatMap((child) =>
      plansForDay(cal.state.dayPlans, child.id, dates[child.id] ?? today).map((plan) => ({
        childId: child.id,
        plan,
      })),
    )
    .find((item) => item.plan.steps.some((step) => step.id === detailId));

  return (
    <section className="flex w-full min-w-0 flex-col gap-4" data-testid="shared-plans">
      {sharedChildren.length > 1 ? (
        <div role="tablist" aria-label={t("children.switch")} className="flex flex-wrap gap-2">
          {sharedChildren.map((child) => {
            const active = child.id === selectedId;
            return (
              <button
                key={child.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`child-switch-${child.id}`}
                onClick={() => cal.selectChild(child.id)}
                className={
                  active
                    ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    : "rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border"
                }
              >
                {child.displayName}
                <span className="ml-1 font-normal opacity-80">
                  <PatientAge child={child} />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {shownChildren.map((child) => {
        const role =
          cal.state.memberships.find(
            (membership) =>
              membership.childId === child.id &&
              membership.personId === cal.activePerson.id &&
              membership.status === "active",
          )?.role ?? null;
        const date = dates[child.id] ?? today;
        const days = plansForDay(cal.state.dayPlans, child.id, date);
        const people = cal.peopleForChild(child.id);
        const canShare = canInvite(role) && inviteRolesFor(role).includes("helper");

        return (
          <article
            key={child.id}
            data-testid={`shared-plan-${child.id}`}
            className="relative w-full min-w-0 overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-border"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              {t("shared.title")}
            </p>
            <h2 className="mt-1 text-base font-semibold leading-tight">{child.displayName}</h2>
            <p className="text-[11px] text-muted-foreground" data-testid={`shared-age-${child.id}`}>
              <PatientAge child={child} />
            </p>

            <div className="mt-3">
              <WeekStrip
                selectedDate={date}
                onSelect={(next) => setDates((prev) => ({ ...prev, [child.id]: next }))}
              />
            </div>

            {days.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("shared.emptyDay")}</p>
            ) : (
              days.map((day) => (
                <div key={day.id} className="mt-3 min-w-0" data-testid={`shared-day-${day.id}`}>
                  <h3 className="text-sm font-semibold leading-tight">
                    {presentPlanName(day, (key) => t(key))}
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {day.steps.map((step, index) => {
                      const shown = presentPlanStep(step, locale);
                      return (
                        <li key={step.id} className="flex items-start gap-2">
                          <button
                            type="button"
                            className="mt-0.5 shrink-0"
                            aria-pressed={step.done}
                            data-testid={`shared-step-${child.id}-${index}`}
                            aria-label={
                              step.done
                                ? t("calendar.stepDetail.markUndone")
                                : t("calendar.stepDetail.markDone")
                            }
                            onClick={() => cal.toggleStepDone(child.id, date, step.id)}
                          >
                            {step.done ? (
                              <CheckCircle2 className="size-5 text-success" />
                            ) : (
                              <Circle className="size-5 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setDetailId(step.id)}
                          >
                            <p
                              className={cn(
                                "text-sm font-semibold",
                                step.done && "text-muted-foreground line-through",
                              )}
                            >
                              {shown.title}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {shown.description}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <AddToMyCalendarButton
                    className="mt-3 w-full"
                    testId={`add-shared-calendar-${child.id}-${day.id}`}
                    date={date}
                    idleLabel={t("schedule.addToMyCalendar")}
                    routine={{
                      templateId: sharedTemplateId(day.libraryPlanId ?? day.id),
                      name: presentPlanName(day, (key) => t(key)),
                      items: day.steps.map((step) => {
                        const shown = presentPlanStep(step, locale);
                        return {
                          activityId: step.activityId || "shared-step",
                          title: shown.title,
                          description: shown.description,
                          minutes: step.minutes || 10,
                        };
                      }),
                    }}
                  />
                </div>
              ))
            )}

            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("shared.people")}
              </p>
              <ul className="mt-1 space-y-2">
                {people.map((person) => {
                  const removable =
                    person.kind === "member" &&
                    person.membershipId &&
                    canRemoveMember(role, person.role);
                  return (
                    <li
                      key={person.id}
                      className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <span className="min-w-0">
                        {person.name} · {t(`calendar.roles.${person.role}`)} ·{" "}
                        {person.status === "active"
                          ? t("calendar.people.active")
                          : t("calendar.people.pending")}
                      </span>
                      {removable ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 text-destructive"
                          data-testid={`remove-helper-${person.membershipId}`}
                          onClick={() =>
                            setPendingHelper({
                              id: person.membershipId!,
                              name: person.name,
                              childName: child.displayName,
                            })
                          }
                        >
                          {t("shared.removeHelper")}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            {canShare ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                data-testid="share-helper"
                onClick={() => {
                  setChildId(child.id);
                  setLink(null);
                  setInviteOpen(true);
                }}
              >
                <UserPlus className="mr-1 size-4" /> {t("shared.shareHelper")}
              </Button>
            ) : null}
          </article>
        );
      })}

      <StepDetailDialog
        step={detail ?? null}
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        canEdit={false}
        {...(detail && detailPlan
          ? {
              onToggleDone: () =>
                cal.toggleStepDone(detailPlan.childId, detailPlan.plan.date, detail.id),
            }
          : {})}
      />

      <Dialog
        open={Boolean(pendingHelper)}
        onOpenChange={(open) => !open && setPendingHelper(null)}
      >
        <DialogContent className="sm:max-w-md" data-testid="remove-helper-dialog">
          <DialogHeader>
            <DialogTitle>{t("calendar.people.removeTitle")}</DialogTitle>
            <DialogDescription>
              {t("calendar.people.removeBody", { name: pendingHelper?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setPendingHelper(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="flex-1"
              data-testid="remove-helper-confirm"
              onClick={() => {
                if (!pendingHelper) return;
                cal.removeMember(pendingHelper.id);
                setPendingHelper(null);
                toast.success(t("calendar.people.removed"));
              }}
            >
              {t("calendar.people.removeConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("shared.shareTitle")}</DialogTitle>
            <DialogDescription>{t("shared.shareBody")}</DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("shared.namePlaceholder")}
          />
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("shared.emailPlaceholder")}
            inputMode="email"
          />
          <p className="text-[11px] text-muted-foreground">{t("calendar.roles.helperBlurb")}</p>
          <Button type="button" className="w-full" onClick={send}>
            {t("shared.send")}
          </Button>
          {link ? (
            <p className="break-all text-[11px] text-muted-foreground" data-testid="invite-link">
              {link}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
