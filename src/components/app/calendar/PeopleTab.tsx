import { Copy, Link2, Mail, MoreHorizontal, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  canChangeRole,
  canInvite,
  canRemovePerson,
  inviteRolesFor,
} from "@/lib/calendar/permissions";
import { useCalendarStore } from "@/lib/calendar/store";
import type { ChildRole } from "@/lib/calendar/types";
import { withBasePath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { ScreenHeader } from "../ui-bits";

export function PeopleTab() {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const child = cal.selectedChild;
  const role = cal.roleOnSelected;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState<"caregiver" | "helper">("helper");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const allowedRoles = inviteRolesFor(role);

  useEffect(() => {
    const roles = inviteRolesFor(role);
    if (roles.length > 0 && !roles.includes(inviteRole)) {
      setInviteRole(roles[0]!);
    }
  }, [role, inviteRole]);

  if (!child) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ScreenHeader title={t("calendar.people.title")} subtitle={t("calendar.today.pickChild")} />
        <div className="flex flex-1 items-center justify-center bg-surface px-6 text-center text-sm text-muted-foreground">
          {t("calendar.today.pickChildHint")}
        </div>
      </div>
    );
  }

  const people = cal.peopleForChild(child.id);
  const showInvite = canInvite(role);

  const sendInvite = () => {
    if (!allowedRoles.includes(inviteRole)) {
      toast.error(t("calendar.people.roleNotAllowed"));
      return;
    }
    const invite = cal.createInvite(child.id, email, inviteRole, displayName);
    if (!invite) {
      toast.error(t("calendar.people.inviteFailed"));
      return;
    }
    const link = `${window.location.origin}${withBasePath(`/invite/${invite.token}`)}`;
    setLastLink(link);
    setEmail("");
    setDisplayName("");
    if (cal.shareMode !== "live") {
      toast.success(t("calendar.people.inviteSent"));
      return;
    }
    toast.message(t("share.sending"));
    void cal.emailFor(invite.id).then((delivery) => {
      if (delivery.sent) toast.success(t("share.emailSent"));
      else if (delivery.code === "already_user") toast.message(t("share.emailExists"));
      else if (delivery.code === "redirect_blocked") toast.message(t("share.redirectBlocked"));
      else if (delivery.code === "not_configured") toast.message(t("share.notConfigured"));
      else toast.message(t("share.emailSaved", { reason: delivery.message }));
    });
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("calendar.people.linkCopied"));
    } catch {
      toast.message(link);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("calendar.people.title")}
        subtitle={t("calendar.people.forChild", { name: child.displayName })}
        right={
          showInvite ? (
            <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1 size-4" /> {t("calendar.people.invite")}
            </Button>
          ) : undefined
        }
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        {showInvite ? (
          <Button type="button" className="w-full" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1 size-4" /> {t("calendar.people.inviteAlways")}
          </Button>
        ) : (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
            {t("calendar.people.helperReadonly")}
          </p>
        )}

        {people.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-3 rounded-2xl bg-card px-3 py-3 ring-1 ring-border"
          >
            <div className="grid size-10 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {person.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{person.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{person.email}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                  {t(`calendar.roles.${person.role}`)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    person.status === "active"
                      ? "bg-success/15 text-success"
                      : "bg-warm/50 text-warm-foreground",
                  )}
                >
                  {person.status === "active"
                    ? t("calendar.people.active")
                    : t("calendar.people.pending")}
                </span>
              </div>
            </div>
            {(canChangeRole(role) || canRemovePerson(role)) && person.role !== "therapist" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {person.kind === "invite" && person.inviteId ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          const inv = cal.resendInvite(person.inviteId!);
                          if (!inv) return;
                          const link = `${window.location.origin}${withBasePath(`/invite/${inv.token}`)}`;
                          void copyLink(link);
                          if (cal.shareMode !== "live") {
                            toast.success(t("calendar.people.resent"));
                            return;
                          }
                          void cal.emailFor(inv.id).then((delivery) => {
                            if (delivery.sent) toast.success(t("share.emailSent"));
                            else toast.message(t("share.emailSaved", { reason: delivery.message }));
                          });
                        }}
                      >
                        <Mail className="mr-2 size-4" /> {t("calendar.people.resend")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          cal.removeInvite(person.inviteId!);
                          toast.success(t("calendar.people.removed"));
                        }}
                      >
                        {t("calendar.people.remove")}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  {person.kind === "member" && person.membershipId && canChangeRole(role) ? (
                    <>
                      {(["caregiver", "helper"] as ChildRole[]).map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onClick={() => {
                            cal.changeMemberRole(person.membershipId!, r);
                            toast.success(t("calendar.people.roleChanged"));
                          }}
                        >
                          {t("calendar.people.changeRoleTo", { role: t(`calendar.roles.${r}`) })}
                        </DropdownMenuItem>
                      ))}
                      {canRemovePerson(role) ? (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            cal.removeMember(person.membershipId!);
                            toast.success(t("calendar.people.removed"));
                          }}
                        >
                          {t("calendar.people.remove")}
                        </DropdownMenuItem>
                      ) : null}
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ))}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("calendar.people.inviteTitle")}</DialogTitle>
            <DialogDescription>
              {role === "therapist"
                ? t("calendar.people.inviteTherapistHint")
                : t("calendar.people.inviteCaregiverHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("calendar.people.namePlaceholder")}
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("calendar.people.emailPlaceholder")}
            />
            <div className="flex flex-wrap gap-2">
              {allowedRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInviteRole(r)}
                  className={
                    inviteRole === r
                      ? "rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                      : "rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground"
                  }
                >
                  {t(`calendar.roles.${r}`)}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {inviteRole === "caregiver"
                ? t("calendar.roles.caregiverBlurb")
                : t("calendar.roles.helperBlurb")}
            </p>
            <Button type="button" className="w-full" onClick={sendInvite}>
              <Mail className="mr-1 size-4" /> {t("calendar.people.sendInvite")}
            </Button>
            {lastLink ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void copyLink(lastLink)}
              >
                <Link2 className="mr-1 size-4" /> {t("calendar.people.copyLink")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const invite = cal.createInvite(
                    child.id,
                    email || "demo@example.com",
                    inviteRole,
                    displayName || "Guest",
                  );
                  if (!invite) return;
                  const link = `${window.location.origin}${withBasePath(`/invite/${invite.token}`)}`;
                  setLastLink(link);
                  void copyLink(link);
                }}
              >
                <Copy className="mr-1 size-4" /> {t("calendar.people.copyLink")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
