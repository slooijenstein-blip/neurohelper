import { useState } from "react";
import { toast } from "sonner";
import { Baby, Mail, Plus, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScreenHeader } from "./ui-bits";
import { familyCopy } from "@/lib/family/copy";
import { useFamilyStore } from "@/lib/family/family-context";
import {
  FamilyError,
  AGE_BANDS,
  ageBandLabel,
  type AgeBand,
  type ChildDetail,
  type FamilyRole,
} from "@/lib/family/types";
import {
  canDeleteChild,
  canInvite,
  familyRoleBlurb,
  familyRoleLabel,
} from "@/lib/family/permissions";
import { cn } from "@/lib/utils";

function roleOptions(): FamilyRole[] {
  return ["parent", "therapist", "caregiver"];
}

export function ChildrenTab() {
  const family = useFamilyStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("3-5");
  const [detail, setDetail] = useState<ChildDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const openChild = async (id: string) => {
    if (!family.client) return;
    family.setSelectedChildId(id);
    try {
      setDetail(await family.client.getChild(id));
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not open this child.");
    }
  };

  const createChild = async () => {
    if (!family.client) return;
    setBusy(true);
    try {
      const child = await family.client.createChild({ displayName: name, ageBand });
      setName("");
      setAdding(false);
      await family.refresh();
      family.setSelectedChildId(child.id);
      setDetail(child);
      toast.success(`${child.displayName} is ready.`);
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not add this child.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={detail ? detail.displayName : familyCopy.childrenTitle}
        subtitle={detail ? ageBandLabel(detail.ageBand) : familyCopy.childrenSubtitle}
        right={
          detail ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground"
              onClick={() => setDetail(null)}
            >
              All children
            </button>
          ) : undefined
        }
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        {family.mode === "local" ? (
          <p className="rounded-xl bg-warm/40 px-3 py-2 text-[11px] font-semibold leading-snug text-warm-foreground">
            {familyCopy.localModeBanner}
          </p>
        ) : null}

        {detail ? (
          <ChildDetailCard
            detail={detail}
            onChange={setDetail}
            onDeleted={() => {
              setDetail(null);
              void family.refresh();
            }}
          />
        ) : (
          <>
            {family.children.length === 0 ? (
              <div className="soft-card py-8 text-center">
                <Baby className="mx-auto mb-2 size-8 text-primary" />
                <p className="text-sm text-muted-foreground">{familyCopy.childrenEmpty}</p>
                <Button className="mt-3" onClick={() => setAdding(true)}>
                  <Plus className="mr-1 size-4" /> {familyCopy.addChild}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {family.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => void openChild(child.id)}
                    className={cn(
                      "soft-card flex w-full items-center gap-3 p-4 text-left",
                      family.selectedChildId === child.id && "border-primary",
                    )}
                  >
                    <div className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Baby className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{child.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ageBandLabel(child.ageBand)} · {familyRoleLabel(child.myRole)}
                        {child.pendingInviteCount
                          ? ` · ${child.pendingInviteCount} invite waiting`
                          : ""}
                      </p>
                    </div>
                  </button>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
                  <Plus className="mr-1 size-4" /> {familyCopy.addChild}
                </Button>
              </div>
            )}
          </>
        )}

        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          {familyCopy.privacyNote}
        </p>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{familyCopy.addChild}</DialogTitle>
            <DialogDescription>{familyCopy.childNameHint}</DialogDescription>
          </DialogHeader>
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {familyCopy.childNameLabel}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={familyCopy.childNamePlaceholder}
          />
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {familyCopy.ageBandLabel}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AGE_BANDS.map((band) => (
              <button
                key={band.id}
                type="button"
                onClick={() => setAgeBand(band.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-semibold",
                  ageBand === band.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card",
                )}
              >
                {band.label}
              </button>
            ))}
          </div>
          <Button onClick={() => void createChild()} disabled={busy || !name.trim()}>
            {familyCopy.saveChild}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChildDetailCard({
  detail,
  onChange,
  onDeleted,
}: {
  detail: ChildDetail;
  onChange: (child: ChildDetail) => void;
  onDeleted: () => void;
}) {
  const family = useFamilyStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FamilyRole>("caregiver");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendInvite = async () => {
    if (!family.client) return;
    setBusy(true);
    try {
      const result = await family.client.invite(detail.id, { email, role });
      setInviteUrl(result.inviteUrl);
      setEmail("");
      onChange(await family.client.getChild(detail.id));
      await family.refresh();
      toast.success("Invite ready. Copy the link and send it.");
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not create the invite.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success(familyCopy.linkCopied);
  };

  const removeChild = async () => {
    if (!family.client) return;
    if (
      !window.confirm(`Remove ${detail.displayName} from Synlumae? The shared plan will be gone.`)
    )
      return;
    try {
      await family.client.deleteChild(detail.id);
      toast.success("Child removed.");
      onDeleted();
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not remove this child.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="soft-card p-4">
        <p className="text-sm font-semibold">{detail.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {ageBandLabel(detail.ageBand)} · Your role: {familyRoleLabel(detail.myRole)}
          {detail.isOwner ? ` · ${familyCopy.owner}` : ""}
        </p>
      </div>

      <div className="soft-card space-y-3 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4 text-primary" /> {familyCopy.peopleOnChild}
        </h3>
        <div className="space-y-2">
          {detail.members.map((member) => (
            <div key={member.userId} className="rounded-lg border border-border bg-card px-3 py-2">
              <p className="text-xs font-semibold">
                {member.name}
                {family.actor?.userId === member.userId ? ` (${familyCopy.you})` : ""}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {familyRoleLabel(member.role)}
                {member.email ? ` · ${member.email}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      {canInvite(detail.myRole) ? (
        <div className="soft-card space-y-3 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="size-4 text-primary" /> {familyCopy.inviteTitle}
          </h3>
          <p className="text-[11px] text-muted-foreground">{familyCopy.inviteSubtitle}</p>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
          />
          <div className="space-y-2">
            {roleOptions().map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left",
                  role === option ? "border-primary bg-primary/10" : "border-border bg-card",
                )}
              >
                <p className="text-xs font-semibold">{familyRoleLabel(option)}</p>
                <p className="text-[11px] text-muted-foreground">{familyRoleBlurb(option)}</p>
              </button>
            ))}
          </div>
          <Button onClick={() => void sendInvite()} disabled={busy || !email.trim()}>
            {familyCopy.sendInvite}
          </Button>
          {inviteUrl ? (
            <Button variant="outline" onClick={() => void copyLink()}>
              {familyCopy.copyLink}
            </Button>
          ) : null}
          {detail.invites.length ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {familyCopy.pendingInvites}
              </p>
              {detail.invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-semibold">{invite.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {familyRoleLabel(invite.role)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!family.client) return;
                      onChange(await family.client.cancelInvite(detail.id, invite.id));
                    }}
                  >
                    {familyCopy.cancelInvite}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="px-1 text-[11px] text-muted-foreground">{familyCopy.therapistNoInvite}</p>
      )}

      {canDeleteChild(detail.myRole, detail.isOwner) ? (
        <Button
          variant="outline"
          className="w-full text-destructive"
          onClick={() => void removeChild()}
        >
          <Trash2 className="mr-1 size-4" /> Remove child
        </Button>
      ) : null}
    </div>
  );
}
