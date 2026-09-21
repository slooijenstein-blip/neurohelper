/** Slice 2 family sharing — child PII is display name + age band only. */

export const AGE_BANDS = [
  { id: "1-2", label: "1–2 years" },
  { id: "3-5", label: "3–5 years" },
  { id: "6-8", label: "6–8 years" },
  { id: "9-12", label: "9–12 years" },
] as const;

export type AgeBand = (typeof AGE_BANDS)[number]["id"];

export const FAMILY_ROLES = ["parent", "therapist", "caregiver"] as const;
export type FamilyRole = (typeof FAMILY_ROLES)[number];

export type Actor = {
  userId: string;
  email: string;
  name: string;
};

export type MemberRecord = {
  userId: string;
  email: string;
  name: string;
  role: FamilyRole;
};

export type InviteRecord = {
  id: string;
  email: string;
  role: FamilyRole;
  createdAt: string;
  invitedByUserId: string;
};

export type TimeBlock = {
  id: string;
  start: string;
  minutes: number;
  title: string;
  notes: string;
  done: boolean;
  activityId?: string;
};

export type DayPlan = {
  id: string;
  date: string;
  updatedAt: string;
  updatedByUserId: string;
  blocks: TimeBlock[];
};

export type ChildRecord = {
  id: string;
  displayName: string;
  ageBand: AgeBand;
  createdAt: string;
  ownerUserId: string;
  members: MemberRecord[];
  invites: InviteRecord[];
  plans: Record<string, DayPlan>;
};

export type MembershipRef = {
  childId: string;
  ownerUserId: string;
  role: FamilyRole;
};

export type FamilyDoc = {
  v: 1;
  children: ChildRecord[];
  memberships: MembershipRef[];
};

export type ChildSummary = {
  id: string;
  displayName: string;
  ageBand: AgeBand;
  myRole: FamilyRole;
  isOwner: boolean;
  memberCount: number;
  pendingInviteCount: number;
};

export type PublicMember = {
  userId: string;
  name: string;
  role: FamilyRole;
  email?: string;
};

export type ChildDetail = {
  id: string;
  displayName: string;
  ageBand: AgeBand;
  myRole: FamilyRole;
  isOwner: boolean;
  ownerUserId: string;
  members: PublicMember[];
  invites: InviteRecord[];
};

export type InvitePreview = {
  childDisplayName: string;
  role: FamilyRole;
  invitedEmail: string;
};

export type FamilyStore = {
  getDoc(userId: string): Promise<FamilyDoc>;
  putDoc(userId: string, doc: FamilyDoc): Promise<void>;
};

export type TokenSigner = {
  sign(ownerUserId: string, inviteId: string): string;
  parse(token: string): { ownerUserId: string; inviteId: string } | null;
};

export class FamilyError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "FamilyError";
    this.status = status;
    this.code = code;
  }
}

export function emptyDoc(): FamilyDoc {
  return { v: 1, children: [], memberships: [] };
}

export function isAgeBand(value: string): value is AgeBand {
  return AGE_BANDS.some((band) => band.id === value);
}

export function isFamilyRole(value: string): value is FamilyRole {
  return (FAMILY_ROLES as readonly string[]).includes(value);
}

export function ageBandLabel(band: AgeBand): string {
  return AGE_BANDS.find((item) => item.id === band)?.label ?? band;
}

export function nid(prefix: string): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `${prefix}_${raw.slice(0, 16)}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function emptyPlan(date: string, actorUserId: string): DayPlan {
  return {
    id: nid("pl"),
    date,
    updatedAt: new Date().toISOString(),
    updatedByUserId: actorUserId,
    blocks: [],
  };
}
