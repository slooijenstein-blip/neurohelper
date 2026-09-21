import type { ChildRecord, FamilyRole } from "./types";

export function roleOnChild(child: ChildRecord, userId: string): FamilyRole | null {
  return child.members.find((member) => member.userId === userId)?.role ?? null;
}

export function isOwner(child: ChildRecord, userId: string): boolean {
  return child.ownerUserId === userId;
}

export function canView(role: FamilyRole | null): boolean {
  return role === "parent" || role === "therapist" || role === "caregiver";
}

/** Parents own invites and resharing. Therapists cannot invite strangers in v1. */
export function canInvite(role: FamilyRole | null): boolean {
  return role === "parent";
}

export function canEditChildProfile(role: FamilyRole | null): boolean {
  return role === "parent";
}

export function canDeleteChild(role: FamilyRole | null, owner: boolean): boolean {
  return role === "parent" && owner;
}

/** Parents and therapists can create/edit time blocks. Caregivers cannot. */
export function canEditPlan(role: FamilyRole | null): boolean {
  return role === "parent" || role === "therapist";
}

/** Only a parent can delete the day's plan. Caregivers never can. */
export function canDeletePlan(role: FamilyRole | null): boolean {
  return role === "parent";
}

/** Optional check-off is available to every invited role. */
export function canCheckOff(role: FamilyRole | null): boolean {
  return canView(role);
}

export function canSeeInvites(role: FamilyRole | null): boolean {
  return role === "parent";
}

export function canSeeMemberEmails(role: FamilyRole | null): boolean {
  return role === "parent";
}

export function canRemoveMember(
  actorRole: FamilyRole | null,
  actorIsOwner: boolean,
  targetUserId: string,
  child: ChildRecord,
): boolean {
  if (actorRole !== "parent") return false;
  if (targetUserId === child.ownerUserId) return false;
  if (targetUserId === child.members.find((m) => m.userId === child.ownerUserId)?.userId)
    return false;
  if (!actorIsOwner && targetUserId === child.ownerUserId) return false;
  return true;
}

export function familyRoleLabel(role: FamilyRole): string {
  if (role === "parent") return "Parent";
  if (role === "therapist") return "Therapist";
  return "Caregiver";
}

export function familyRoleBlurb(role: FamilyRole): string {
  if (role === "parent") return "Can edit the plan and invite others.";
  if (role === "therapist") return "Can create and edit the shared plan.";
  return "Can see the plan and tick activities as done.";
}
