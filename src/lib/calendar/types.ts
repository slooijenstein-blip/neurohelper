/** Synlumae Calendar prototype — shared schedule IA (Today / Library / People). */

export const AGE_BANDS = [
  { id: "1-2", labelKey: "calendar.ageBands.1_2" },
  { id: "3-5", labelKey: "calendar.ageBands.3_5" },
  { id: "6-8", labelKey: "calendar.ageBands.6_8" },
  { id: "9-12", labelKey: "calendar.ageBands.9_12" },
] as const;

export type AgeBand = (typeof AGE_BANDS)[number]["id"];

/** Profile-level app mode. Helpers use parent-style shell with limited actions. */
export type AppRole = "therapist" | "caregiver" | "helper";

/** Membership on a child. Therapist invites caregivers; caregivers invite helpers. */
export type ChildRole = "therapist" | "caregiver" | "helper";

export type InviteStatus = "pending" | "active";

export type PlanStep = {
  id: string;
  title: string;
  notes: string;
  minutes: number;
};

export type DayStep = PlanStep & {
  done: boolean;
};

export type LibraryPlan = {
  id: string;
  /** Owner persona id (therapist master or caregiver). */
  ownerId: string;
  name: string;
  steps: PlanStep[];
  /** When set, this is a per-child copy that may diverge from the master. */
  childId: string | null;
  /** Master template this copy came from (therapist → patient). */
  sourceTemplateId: string | null;
  updatedAt: string;
};

export type DayPlan = {
  id: string;
  childId: string;
  date: string;
  name: string;
  libraryPlanId: string | null;
  steps: DayStep[];
  /** True when day-only edits differ from the library source. */
  tweaked: boolean;
  updatedAt: string;
};

export type Person = {
  id: string;
  name: string;
  email: string;
  appRole: AppRole;
};

export type Child = {
  id: string;
  displayName: string;
  ageBand: AgeBand;
  createdAt: string;
  createdById: string;
};

/** Therapist-only desk organization. Never shown to parents/helpers. */
export type TherapistTag = {
  id: string;
  therapistId: string;
  name: string;
};

export type ChildTag = {
  childId: string;
  tagId: string;
};

export type Membership = {
  id: string;
  childId: string;
  personId: string;
  role: ChildRole;
  status: InviteStatus;
};

export type Invite = {
  id: string;
  childId: string;
  email: string;
  role: "caregiver" | "helper";
  status: InviteStatus;
  invitedById: string;
  token: string;
  createdAt: string;
  /** Linked membership once accepted / activated in prototype. */
  membershipId: string | null;
  /** Display name for pending invitee in People list. */
  displayName: string;
};

export type CalendarState = {
  v: 1;
  people: Person[];
  /** Active viewing persona for the prototype walkthrough. */
  activePersonId: string;
  children: Child[];
  memberships: Membership[];
  invites: Invite[];
  libraryPlans: LibraryPlan[];
  dayPlans: DayPlan[];
  therapistTags: TherapistTag[];
  childTags: ChildTag[];
  /** Currently focused child (null = picker / caseload). */
  selectedChildId: string | null;
};

export function isAgeBand(value: string): value is AgeBand {
  return AGE_BANDS.some((band) => band.id === value);
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() + diff);
  return start;
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + n);
  return next;
}

export function nid(prefix: string): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `${prefix}_${raw.slice(0, 12)}`;
}
