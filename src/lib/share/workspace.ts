import { stepsFromCatalog, THERAPIST_TEMPLATE_ACTIVITIES } from "../calendar/seed.ts";
import type { Actor } from "./actions.ts";
import type { AppRole, CalendarState, LibraryPlan, Person } from "../calendar/types.ts";
import { clipDisplayName } from "./names.ts";

export type Workspace = {
  v: 1;
  rev: number;
  ownerUserId: string;
  people: CalendarState["people"];
  children: CalendarState["children"];
  memberships: CalendarState["memberships"];
  invites: CalendarState["invites"];
  libraryPlans: CalendarState["libraryPlans"];
  dayPlans: CalendarState["dayPlans"];
  therapistTags: CalendarState["therapistTags"];
  childTags: CalendarState["childTags"];
};

const TEMPLATE_ROWS: Array<{
  id: string;
  name: keyof typeof THERAPIST_TEMPLATE_ACTIVITIES;
  nameKey: string;
}> = [
  {
    id: "lib_weekday_calm",
    name: "Weekday afternoon calm hour",
    nameKey: "calendar.templates.calmHour",
  },
  { id: "lib_morning_ready", name: "Morning ready routine", nameKey: "calendar.templates.morning" },
  {
    id: "lib_sensory_movement",
    name: "Sensory and movement break",
    nameKey: "calendar.templates.movement",
  },
  {
    id: "lib_homework_winddown",
    name: "Homework wind-down",
    nameKey: "calendar.templates.homework",
  },
  { id: "lib_fine_motor", name: "Fine motor practice", nameKey: "calendar.templates.fineMotor" },
];

export function catalogTemplates(ownerId: string, now: string): LibraryPlan[] {
  return TEMPLATE_ROWS.map((row) => ({
    id: row.id,
    ownerId,
    name: row.name,
    nameKey: row.nameKey,
    steps: stepsFromCatalog(THERAPIST_TEMPLATE_ACTIVITIES[row.name]),
    childId: null,
    sourceTemplateId: null,
    updatedAt: now,
  }));
}

export function createOwnerWorkspace(actor: Actor, now: string): Workspace {
  const person: Person = {
    id: actor.userId,
    name: clipDisplayName(actor.name, "Therapist"),
    email: actor.email,
    appRole: "therapist",
  };
  return {
    v: 1,
    rev: 1,
    ownerUserId: actor.userId,
    people: [person],
    children: [],
    memberships: [],
    invites: [],
    libraryPlans: catalogTemplates(actor.userId, now),
    dayPlans: [],
    therapistTags: [],
    childTags: [],
  };
}

export function stateFromWorkspace(
  ws: Workspace,
  activePersonId: string,
  selectedChildId: string | null = null,
): CalendarState {
  return {
    v: 3,
    activePersonId,
    selectedChildId,
    people: ws.people,
    children: ws.children,
    memberships: ws.memberships,
    invites: ws.invites,
    libraryPlans: ws.libraryPlans,
    dayPlans: ws.dayPlans,
    therapistTags: ws.therapistTags,
    childTags: ws.childTags,
  };
}

export function workspaceFromState(
  state: CalendarState,
  ownerUserId: string,
  rev: number,
): Workspace {
  return {
    v: 1,
    rev,
    ownerUserId,
    people: state.people,
    children: state.children,
    memberships: state.memberships,
    invites: state.invites,
    libraryPlans: state.libraryPlans,
    dayPlans: state.dayPlans,
    therapistTags: state.therapistTags,
    childTags: state.childTags,
  };
}

export function emptyParentState(actor: Actor): CalendarState {
  return blankAccountState({ ...actor, isPro: false });
}

/** Signed-in shell with no demo patients. Used when the share API is unavailable. */
export function blankAccountState(actor: Actor): CalendarState {
  const isPro = actor.isPro;
  return {
    v: 3,
    activePersonId: actor.userId,
    selectedChildId: null,
    people: [
      {
        id: actor.userId,
        name: clipDisplayName(actor.name, isPro ? "Therapist" : "Parent"),
        email: actor.email,
        appRole: isPro ? "therapist" : "caregiver",
      },
    ],
    children: [],
    memberships: [],
    invites: [],
    libraryPlans: [],
    dayPlans: [],
    therapistTags: [],
    childTags: [],
  };
}

/** Parents and helpers only see the children shared with them. */
export function viewFor(ws: Workspace, actor: Actor): CalendarState {
  if (ws.ownerUserId === actor.userId) {
    return stateFromWorkspace(ws, actor.userId, null);
  }
  const mine = ws.memberships.filter(
    (membership) => membership.personId === actor.userId && membership.status === "active",
  );
  const childIds = new Set(mine.map((membership) => membership.childId));
  const children = ws.children.filter((child) => childIds.has(child.id));
  const memberships = ws.memberships.filter(
    (membership) => childIds.has(membership.childId) && membership.status === "active",
  );
  const personIds = new Set<string>([
    actor.userId,
    ...memberships.map((membership) => membership.personId),
  ]);
  const appRole: AppRole = mine.some((membership) => membership.role === "caregiver")
    ? "caregiver"
    : mine[0]?.role === "helper"
      ? "helper"
      : "caregiver";
  const people = ws.people
    .filter((person) => personIds.has(person.id))
    .map((person) => (person.id === actor.userId ? { ...person, appRole } : person));
  if (!people.some((person) => person.id === actor.userId)) {
    people.push({
      id: actor.userId,
      name: clipDisplayName(actor.name, "Parent"),
      email: actor.email,
      appRole,
    });
  }
  return {
    v: 3,
    activePersonId: actor.userId,
    selectedChildId: children.length === 1 ? (children[0]?.id ?? null) : null,
    people,
    children,
    memberships,
    invites: ws.invites.filter((invite) => childIds.has(invite.childId)),
    libraryPlans: ws.libraryPlans.filter(
      (plan) => plan.childId != null && childIds.has(plan.childId),
    ),
    dayPlans: ws.dayPlans.filter((plan) => childIds.has(plan.childId)),
    therapistTags: [],
    childTags: [],
  };
}

export function mergeViews(views: CalendarState[], actor: Actor): CalendarState {
  if (views.length === 0) return emptyParentState(actor);
  if (views.length === 1) return views[0]!;
  const base = emptyParentState(actor);
  const people = new Map(base.people.map((person) => [person.id, person]));
  const children = new Map<string, CalendarState["children"][number]>();
  const memberships = new Map<string, CalendarState["memberships"][number]>();
  const invites = new Map<string, CalendarState["invites"][number]>();
  const libraryPlans = new Map<string, LibraryPlan>();
  const dayPlans = new Map<string, CalendarState["dayPlans"][number]>();
  for (const view of views) {
    for (const person of view.people) people.set(person.id, person);
    for (const child of view.children) children.set(child.id, child);
    for (const membership of view.memberships) memberships.set(membership.id, membership);
    for (const invite of view.invites) invites.set(invite.id, invite);
    for (const plan of view.libraryPlans) libraryPlans.set(plan.id, plan);
    for (const plan of view.dayPlans) dayPlans.set(plan.id, plan);
  }
  const childList = [...children.values()];
  return {
    ...base,
    people: [...people.values()],
    children: childList,
    memberships: [...memberships.values()],
    invites: [...invites.values()],
    libraryPlans: [...libraryPlans.values()],
    dayPlans: [...dayPlans.values()],
    selectedChildId: childList.length === 1 ? (childList[0]?.id ?? null) : null,
  };
}

/** Keep the therapist caseload and add plans shared with that same account. */
export function mergeInbound(own: CalendarState, inbound: CalendarState[]): CalendarState {
  if (inbound.length === 0) return own;
  const people = new Map(own.people.map((person) => [person.id, person]));
  const children = new Map(own.children.map((child) => [child.id, child]));
  const memberships = new Map(own.memberships.map((item) => [item.id, item]));
  const invites = new Map(own.invites.map((item) => [item.id, item]));
  const libraryPlans = new Map(own.libraryPlans.map((item) => [item.id, item]));
  const dayPlans = new Map(own.dayPlans.map((item) => [item.id, item]));
  for (const view of inbound) {
    for (const person of view.people) {
      if (!people.has(person.id)) people.set(person.id, person);
    }
    for (const child of view.children) children.set(child.id, child);
    for (const membership of view.memberships) memberships.set(membership.id, membership);
    for (const invite of view.invites) invites.set(invite.id, invite);
    for (const plan of view.libraryPlans) libraryPlans.set(plan.id, plan);
    for (const plan of view.dayPlans) dayPlans.set(plan.id, plan);
  }
  return {
    ...own,
    people: [...people.values()],
    children: [...children.values()],
    memberships: [...memberships.values()],
    invites: [...invites.values()],
    libraryPlans: [...libraryPlans.values()],
    dayPlans: [...dayPlans.values()],
  };
}

const PLAN_KEEP_DAYS = 60;

export function pruneWorkspace(ws: Workspace, today: Date): Workspace {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - PLAN_KEEP_DAYS);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return {
    ...ws,
    dayPlans: ws.dayPlans.filter((plan) => plan.date >= cutoffKey),
  };
}
