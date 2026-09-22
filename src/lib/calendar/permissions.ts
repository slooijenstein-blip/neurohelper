import type { AppRole, ChildRole, Membership } from "./types.ts";

export function canEditPlan(role: ChildRole | null): boolean {
  return role === "therapist" || role === "caregiver";
}

export function canInvite(role: ChildRole | null): boolean {
  return role === "therapist" || role === "caregiver";
}

/** Therapist invites caregivers; caregivers invite helpers. */
export function inviteRolesFor(actor: ChildRole | null): Array<"caregiver" | "helper"> {
  if (actor === "therapist") return ["caregiver"];
  if (actor === "caregiver") return ["helper"];
  return [];
}

export function canChangeRole(role: ChildRole | null): boolean {
  return role === "therapist" || role === "caregiver";
}

export function canRemovePerson(role: ChildRole | null): boolean {
  return role === "therapist" || role === "caregiver";
}

export function canManageLibrary(role: ChildRole | null): boolean {
  return role === "therapist" || role === "caregiver";
}

export function canMarkDone(role: ChildRole | null): boolean {
  return role === "therapist" || role === "caregiver" || role === "helper";
}

export function canViewLibrary(role: ChildRole | null): boolean {
  return role === "therapist" || role === "caregiver";
}

export function canAddChild(appRole: AppRole): boolean {
  return appRole === "therapist" || appRole === "caregiver";
}

export function shellTabsFor(appRole: AppRole): Array<"today" | "library" | "people" | "patients"> {
  if (appRole === "therapist") return ["patients", "today", "library", "people"];
  if (appRole === "helper") return ["today", "people"];
  return ["today", "library", "people"];
}

export function membershipOnChild(
  memberships: Membership[],
  childId: string,
  personId: string,
): Membership | null {
  return (
    memberships.find(
      (m) => m.childId === childId && m.personId === personId && m.status === "active",
    ) ?? null
  );
}
