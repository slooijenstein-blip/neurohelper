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
import { canInvite, inviteRolesFor } from "@/lib/calendar/permissions";
import { toDateKey, useCalendarStore } from "@/lib/calendar/store";
import type { DayPlan } from "@/lib/calendar/types";
import { withBasePath } from "@/lib/paths";
import { cn } from "@/lib/utils";

import { StepDetailDialog } from "./calendar/StepDetailDialog";

function planForChild(plans: DayPlan[], childId: string, today: string): DayPlan | null {
  return (
    plans.find((plan) => plan.childId === childId && plan.date === today) ??
    plans
      .filter((plan) => plan.childId === childId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0] ??
    null
  );
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
  const [detailId, setDetailId] = useState<string | null>(null);

  if (!cal.hydrated || cal.activePerson.appRole === "therapist") return null;
  if (cal.myChildren.length === 0) return null;

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

  return (
    <section className="space-y-3" data-testid="shared-plans">
      {cal.myChildren.map((child) => {
        const role =
          cal.state.memberships.find(
            (membership) =>
              membership.childId === child.id &&
              membership.personId === cal.activePerson.id &&
              membership.status === "active",
          )?.role ?? null;
        const day = planForChild(cal.state.dayPlans, child.id, today);
        const detail = day?.steps.find((step) => step.id === detailId) ?? null;
        const people = cal.peopleForChild(child.id);
        const canShare = canInvite(role) && inviteRolesFor(role).includes("helper");

        return (
          <div
            key={child.id}
            data-testid="shared-plan"
            className="rounded-2xl bg-card p-4 ring-1 ring-border"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              {t("shared.title")}
            </p>
            <h2 className="mt-1 text-sm font-semibold">
              {day ? presentPlanName(day, (key) => t(key)) : t("shared.emptyToday")}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {t("shared.subtitle", { name: child.displayName })}
            </p>

            {day ? (
              <ul className="mt-3 space-y-2">
                {day.steps.map((step) => {
                  const shown = presentPlanStep(step, locale);
                  return (
                    <li key={step.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        className="mt-0.5 shrink-0"
                        aria-label={
                          step.done
                            ? t("calendar.stepDetail.markUndone")
                            : t("calendar.stepDetail.markDone")
                        }
                        onClick={() => cal.toggleStepDone(child.id, day.date, step.id)}
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
            ) : null}

            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("shared.people")}
              </p>
              <ul className="mt-1 space-y-1">
                {people.map((person) => (
                  <li key={person.id} className="text-xs text-muted-foreground">
                    {person.name} · {t(`calendar.roles.${person.role}`)} ·{" "}
                    {person.status === "active"
                      ? t("calendar.people.active")
                      : t("calendar.people.pending")}
                  </li>
                ))}
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

            <StepDetailDialog
              step={detail}
              open={Boolean(detail)}
              onOpenChange={(open) => {
                if (!open) setDetailId(null);
              }}
              canEdit={false}
              {...(day && detail
                ? {
                    onToggleDone: () => cal.toggleStepDone(child.id, day.date, detail.id),
                  }
                : {})}
            />
          </div>
        );
      })}

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
