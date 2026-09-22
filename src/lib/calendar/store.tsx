import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { canEditPlan, canInvite, inviteRolesFor, membershipOnChild } from "./permissions";
import { createSeedState, DEMO_PERSON_IDS } from "./seed";
import { normalizePlanStep } from "./activity-steps";
import {
  addDays,
  nid,
  parseDateKey,
  toDateKey,
  type AgeBand,
  type AppRole,
  type CalendarState,
  type Child,
  type ChildRole,
  type DayPlan,
  type DayStep,
  type Invite,
  type LibraryPlan,
  type Membership,
  type Person,
  type PlanStep,
} from "./types";

const STORAGE_KEY = "synlumae-calendar-prototype-v1";

type CalendarContextValue = {
  hydrated: boolean;
  state: CalendarState;
  activePerson: Person;
  /** Child role for the selected child, or null. */
  roleOnSelected: ChildRole | null;
  myChildren: Child[];
  selectedChild: Child | null;
  resetDemo: () => void;
  switchPersona: (personId: string) => void;
  selectChild: (childId: string | null) => void;
  addChild: (displayName: string, ageBand: AgeBand, tagIds?: string[]) => Child;
  addTherapistTag: (name: string) => void;
  setChildTags: (childId: string, tagIds: string[]) => void;
  getDayPlan: (childId: string, date: string) => DayPlan | null;
  toggleStepDone: (childId: string, date: string, stepId: string) => void;
  applyLibraryPlan: (libraryPlanId: string, childId: string, dates: string[]) => void;
  createLibraryPlan: (name: string, steps: PlanStep[], childId?: string | null) => LibraryPlan;
  updateLibraryPlan: (id: string, patch: Partial<Pick<LibraryPlan, "name" | "steps">>) => void;
  duplicateLibraryPlan: (id: string) => LibraryPlan | null;
  deleteLibraryPlan: (id: string) => void;
  /** Therapist: copy master template onto a patient library (diverges independently). */
  useTemplateForPatient: (masterId: string, childId: string) => LibraryPlan | null;
  tweakDayStep: (childId: string, date: string, stepId: string, title: string) => void;
  /** Add a step to a day plan (creates an empty named plan if none). */
  addDayStep: (childId: string, date: string, step: PlanStep) => void;
  /** Replace a day step (e.g. change activity). */
  replaceDayStep: (childId: string, date: string, stepId: string, step: PlanStep) => void;
  removeDayStep: (childId: string, date: string, stepId: string) => void;
  /** Append a step onto an existing library plan. */
  appendLibraryStep: (libraryPlanId: string, step: PlanStep) => void;
  saveDayBackToLibrary: (childId: string, date: string) => LibraryPlan | null;
  createInvite: (
    childId: string,
    email: string,
    role: "caregiver" | "helper",
    displayName: string,
  ) => Invite | null;
  resendInvite: (inviteId: string) => Invite | null;
  changeMemberRole: (membershipId: string, role: ChildRole) => void;
  removeMember: (membershipId: string) => void;
  removeInvite: (inviteId: string) => void;
  /** Prototype: activate a pending invite as if the invitee accepted. */
  acceptInviteToken: (token: string) => { ok: boolean; message: string };
  peopleForChild: (childId: string) => Array<{
    kind: "member" | "invite";
    id: string;
    name: string;
    email: string;
    role: ChildRole | "caregiver" | "helper";
    status: "pending" | "active";
    membershipId?: string;
    inviteId?: string;
  }>;
  visibleLibrary: (childId: string | null) => LibraryPlan[];
  therapistTagsForActive: () => CalendarState["therapistTags"];
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

function loadState(): CalendarState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as CalendarState;
    if (parsed?.v !== 3 || !Array.isArray(parsed.people)) return createSeedState();
    return {
      ...parsed,
      libraryPlans: (parsed.libraryPlans ?? []).map((p) => ({
        ...p,
        steps: (p.steps ?? []).map((s) => normalizePlanStep(s)),
      })),
      dayPlans: (parsed.dayPlans ?? []).map((p) => ({
        ...p,
        steps: (p.steps ?? []).map((s) => ({
          ...normalizePlanStep(s),
          done: Boolean((s as DayStep).done),
        })),
      })),
    };
  } catch {
    return createSeedState();
  }
}

function persist(state: CalendarState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function cloneSteps(steps: PlanStep[]): PlanStep[] {
  return steps.map((s) => normalizePlanStep({ ...s, id: nid("st") }));
}

function toDaySteps(steps: PlanStep[]): DayStep[] {
  return steps.map((s) => ({ ...normalizePlanStep({ ...s, id: nid("ds") }), done: false }));
}

export function CalendarStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CalendarState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(state);
  }, [state, hydrated]);

  const update = useCallback((fn: (prev: CalendarState) => CalendarState) => {
    setState((prev) => fn(prev));
  }, []);

  const activePerson = useMemo(() => {
    const person = state.people.find((p) => p.id === state.activePersonId) ?? state.people[0];
    if (!person) throw new Error("Calendar demo has no people");
    return person;
  }, [state.people, state.activePersonId]);

  const myChildren = useMemo(() => {
    const ids = new Set(
      state.memberships
        .filter((m) => m.personId === activePerson.id && m.status === "active")
        .map((m) => m.childId),
    );
    return state.children.filter((c) => ids.has(c.id));
  }, [state.memberships, state.children, activePerson.id]);

  const selectedChild = useMemo(() => {
    if (!state.selectedChildId) {
      if (activePerson.appRole !== "therapist" && myChildren.length === 1) {
        return myChildren[0] ?? null;
      }
      return null;
    }
    return myChildren.find((c) => c.id === state.selectedChildId) ?? null;
  }, [state.selectedChildId, myChildren, activePerson.appRole]);

  const roleOnSelected = useMemo(() => {
    if (!selectedChild) return null;
    return membershipOnChild(state.memberships, selectedChild.id, activePerson.id)?.role ?? null;
  }, [selectedChild, state.memberships, activePerson.id]);

  // Auto-select single child for caregivers/helpers
  useEffect(() => {
    if (!hydrated) return;
    if (activePerson.appRole === "therapist") return;
    const only = myChildren[0];
    if (myChildren.length === 1 && only && state.selectedChildId !== only.id) {
      update((prev) => ({ ...prev, selectedChildId: only.id }));
    }
  }, [hydrated, activePerson.appRole, myChildren, state.selectedChildId, update]);

  const value: CalendarContextValue = {
    hydrated,
    state,
    activePerson,
    roleOnSelected,
    myChildren,
    selectedChild,
    resetDemo: () => update(() => createSeedState()),
    switchPersona: (personId) =>
      update((prev) => {
        const person = prev.people.find((p) => p.id === personId);
        if (!person) return prev;

        // Prototype convenience: claim any pending invites for this persona's email
        // so Profile → Continue as Helper works after Parent sent an invite.
        let invites = prev.invites;
        let memberships = prev.memberships;
        let selectedChildId = person.appRole === "therapist" ? null : prev.selectedChildId;

        for (const invite of prev.invites) {
          if (invite.status !== "pending" || invite.email !== person.email) continue;
          invites = invites.map((i) => (i.id === invite.id ? { ...i, status: "active" } : i));
          memberships = memberships.map((m) =>
            m.id === invite.membershipId
              ? { ...m, personId: person.id, status: "active", role: invite.role }
              : m,
          );
          selectedChildId = invite.childId;
        }

        return {
          ...prev,
          activePersonId: personId,
          invites,
          memberships,
          selectedChildId,
        };
      }),
    selectChild: (childId) => update((prev) => ({ ...prev, selectedChildId: childId })),
    addChild: (displayName, ageBand, tagIds = []) => {
      const child: Child = {
        id: nid("child"),
        displayName: displayName.trim() || "Child",
        ageBand,
        createdAt: new Date().toISOString(),
        createdById: activePerson.id,
      };
      const membership: Membership = {
        id: nid("mem"),
        childId: child.id,
        personId: activePerson.id,
        role: activePerson.appRole === "therapist" ? "therapist" : "caregiver",
        status: "active",
      };
      update((prev) => ({
        ...prev,
        children: [...prev.children, child],
        memberships: [...prev.memberships, membership],
        childTags: [...prev.childTags, ...tagIds.map((tagId) => ({ childId: child.id, tagId }))],
        selectedChildId: child.id,
      }));
      return child;
    },
    addTherapistTag: (name) => {
      const trimmed = name.trim();
      if (!trimmed || activePerson.appRole !== "therapist") return;
      update((prev) => ({
        ...prev,
        therapistTags: [
          ...prev.therapistTags,
          { id: nid("tag"), therapistId: activePerson.id, name: trimmed },
        ],
      }));
    },
    setChildTags: (childId, tagIds) => {
      update((prev) => ({
        ...prev,
        childTags: [
          ...prev.childTags.filter((ct) => ct.childId !== childId),
          ...tagIds.map((tagId) => ({ childId, tagId })),
        ],
      }));
    },
    getDayPlan: (childId, date) =>
      state.dayPlans.find((p) => p.childId === childId && p.date === date) ?? null,
    toggleStepDone: (childId, date, stepId) => {
      const role = membershipOnChild(state.memberships, childId, activePerson.id)?.role ?? null;
      if (!role) return;
      update((prev) => ({
        ...prev,
        dayPlans: prev.dayPlans.map((plan) => {
          if (plan.childId !== childId || plan.date !== date) return plan;
          return {
            ...plan,
            steps: plan.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    applyLibraryPlan: (libraryPlanId, childId, dates) => {
      const role = membershipOnChild(state.memberships, childId, activePerson.id)?.role ?? null;
      if (!canEditPlan(role)) return;
      const plan = state.libraryPlans.find((p) => p.id === libraryPlanId);
      if (!plan) return;
      update((prev) => {
        let dayPlans = [...prev.dayPlans];
        for (const date of dates) {
          const next: DayPlan = {
            id: nid("day"),
            childId,
            date,
            name: plan.name,
            nameKey: plan.nameKey ?? null,
            libraryPlanId: plan.id,
            steps: toDaySteps(plan.steps),
            tweaked: false,
            updatedAt: new Date().toISOString(),
          };
          dayPlans = dayPlans.filter((d) => !(d.childId === childId && d.date === date));
          dayPlans.push(next);
        }
        return { ...prev, dayPlans };
      });
    },
    createLibraryPlan: (name, steps, childId = null) => {
      const plan: LibraryPlan = {
        id: nid("lib"),
        ownerId: activePerson.id,
        name: name.trim() || "Untitled plan",
        steps: cloneSteps(steps),
        childId,
        sourceTemplateId: null,
        updatedAt: new Date().toISOString(),
      };
      update((prev) => ({ ...prev, libraryPlans: [...prev.libraryPlans, plan] }));
      return plan;
    },
    updateLibraryPlan: (id, patch) => {
      update((prev) => ({
        ...prev,
        libraryPlans: prev.libraryPlans.map((p) =>
          p.id === id
            ? {
                ...p,
                name: patch.name ?? p.name,
                nameKey: patch.name && patch.name !== p.name ? null : (p.nameKey ?? null),
                steps: patch.steps ? cloneSteps(patch.steps) : p.steps,
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
    },
    duplicateLibraryPlan: (id) => {
      const source = state.libraryPlans.find((p) => p.id === id);
      if (!source) return null;
      const copy: LibraryPlan = {
        ...source,
        id: nid("lib"),
        name: `${source.name} (copy)`,
        nameKey: null,
        steps: cloneSteps(source.steps),
        updatedAt: new Date().toISOString(),
      };
      update((prev) => ({ ...prev, libraryPlans: [...prev.libraryPlans, copy] }));
      return copy;
    },
    deleteLibraryPlan: (id) => {
      update((prev) => ({
        ...prev,
        libraryPlans: prev.libraryPlans.filter((p) => p.id !== id),
      }));
    },
    useTemplateForPatient: (masterId, childId) => {
      if (activePerson.appRole !== "therapist") return null;
      const master = state.libraryPlans.find(
        (p) => p.id === masterId && p.childId === null && p.ownerId === activePerson.id,
      );
      if (!master) return null;
      const copy: LibraryPlan = {
        id: nid("lib"),
        ownerId: activePerson.id,
        name: master.name,
        nameKey: master.nameKey ?? null,
        steps: cloneSteps(master.steps),
        childId,
        sourceTemplateId: master.id,
        updatedAt: new Date().toISOString(),
      };
      update((prev) => ({ ...prev, libraryPlans: [...prev.libraryPlans, copy] }));
      return copy;
    },
    tweakDayStep: (childId, date, stepId, title) => {
      const role = membershipOnChild(state.memberships, childId, activePerson.id)?.role ?? null;
      if (!canEditPlan(role)) return;
      update((prev) => ({
        ...prev,
        dayPlans: prev.dayPlans.map((plan) => {
          if (plan.childId !== childId || plan.date !== date) return plan;
          return {
            ...plan,
            tweaked: true,
            steps: plan.steps.map((s) => (s.id === stepId ? { ...s, title } : s)),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    addDayStep: (childId, date, step) => {
      const role = membershipOnChild(state.memberships, childId, activePerson.id)?.role ?? null;
      if (!canEditPlan(role)) return;
      const dayStep: DayStep = { ...normalizePlanStep(step), id: nid("ds"), done: false };
      update((prev) => {
        const existing = prev.dayPlans.find((p) => p.childId === childId && p.date === date);
        if (existing) {
          return {
            ...prev,
            dayPlans: prev.dayPlans.map((p) =>
              p.id === existing.id
                ? {
                    ...p,
                    steps: [...p.steps, dayStep],
                    tweaked: true,
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          };
        }
        const created: DayPlan = {
          id: nid("day"),
          childId,
          date,
          name: "Today’s plan",
          nameKey: "calendar.today.customPlan",
          libraryPlanId: null,
          steps: [dayStep],
          tweaked: true,
          updatedAt: new Date().toISOString(),
        };
        return { ...prev, dayPlans: [...prev.dayPlans, created] };
      });
    },
    replaceDayStep: (childId, date, stepId, step) => {
      const role = membershipOnChild(state.memberships, childId, activePerson.id)?.role ?? null;
      if (!canEditPlan(role)) return;
      update((prev) => ({
        ...prev,
        dayPlans: prev.dayPlans.map((plan) => {
          if (plan.childId !== childId || plan.date !== date) return plan;
          return {
            ...plan,
            tweaked: true,
            steps: plan.steps.map((s) =>
              s.id === stepId ? { ...normalizePlanStep({ ...step, id: stepId }), done: s.done } : s,
            ),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    removeDayStep: (childId, date, stepId) => {
      const role = membershipOnChild(state.memberships, childId, activePerson.id)?.role ?? null;
      if (!canEditPlan(role)) return;
      update((prev) => ({
        ...prev,
        dayPlans: prev.dayPlans.map((plan) => {
          if (plan.childId !== childId || plan.date !== date) return plan;
          return {
            ...plan,
            tweaked: true,
            steps: plan.steps.filter((s) => s.id !== stepId),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    appendLibraryStep: (libraryPlanId, step) => {
      update((prev) => ({
        ...prev,
        libraryPlans: prev.libraryPlans.map((p) =>
          p.id === libraryPlanId
            ? {
                ...p,
                steps: [...p.steps, normalizePlanStep({ ...step, id: nid("st") })],
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
    },
    saveDayBackToLibrary: (childId, date) => {
      const role = membershipOnChild(state.memberships, childId, activePerson.id)?.role ?? null;
      if (!canEditPlan(role)) return null;
      const day = state.dayPlans.find((p) => p.childId === childId && p.date === date);
      if (!day) return null;
      if (day.libraryPlanId) {
        update((prev) => ({
          ...prev,
          libraryPlans: prev.libraryPlans.map((p) =>
            p.id === day.libraryPlanId
              ? {
                  ...p,
                  name: day.name,
                  nameKey: day.nameKey ?? p.nameKey ?? null,
                  steps: day.steps.map(({ done: _d, ...rest }) => ({ ...rest, id: nid("st") })),
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
          dayPlans: prev.dayPlans.map((p) => (p.id === day.id ? { ...p, tweaked: false } : p)),
        }));
        return state.libraryPlans.find((p) => p.id === day.libraryPlanId) ?? null;
      }
      const plan: LibraryPlan = {
        id: nid("lib"),
        ownerId: activePerson.id,
        name: day.name,
        nameKey: day.nameKey ?? null,
        steps: day.steps.map(({ done: _d, ...rest }) => ({ ...rest, id: nid("st") })),
        childId,
        sourceTemplateId: null,
        updatedAt: new Date().toISOString(),
      };
      update((prev) => ({
        ...prev,
        libraryPlans: [...prev.libraryPlans, plan],
        dayPlans: prev.dayPlans.map((p) =>
          p.id === day.id ? { ...p, libraryPlanId: plan.id, tweaked: false } : p,
        ),
      }));
      return plan;
    },
    createInvite: (childId, email, role, displayName) => {
      const actorRole =
        membershipOnChild(state.memberships, childId, activePerson.id)?.role ?? null;
      if (!canInvite(actorRole)) return null;
      const allowed = inviteRolesFor(actorRole);
      if (!allowed.includes(role)) return null;
      const normalized = email.trim().toLowerCase();
      if (!normalized.includes("@")) return null;

      // Re-invite: if a pending invite exists for this email, refresh it (fix the "can't invite again" bug)
      const existing = state.invites.find(
        (i) => i.childId === childId && i.email === normalized && i.status === "pending",
      );
      if (existing) {
        update((prev) => ({
          ...prev,
          invites: prev.invites.map((i) =>
            i.id === existing.id
              ? { ...i, createdAt: new Date().toISOString(), token: nid("tok") }
              : i,
          ),
        }));
        return { ...existing, createdAt: new Date().toISOString() };
      }

      const membership: Membership = {
        id: nid("mem"),
        childId,
        personId: nid("pending"),
        role,
        status: "pending",
      };
      const invite: Invite = {
        id: nid("inv"),
        childId,
        email: normalized,
        role,
        status: "pending",
        invitedById: activePerson.id,
        token: nid("tok"),
        createdAt: new Date().toISOString(),
        membershipId: membership.id,
        displayName: displayName.trim() || normalized.split("@")[0] || normalized,
      };
      update((prev) => ({
        ...prev,
        memberships: [...prev.memberships, membership],
        invites: [...prev.invites, invite],
      }));
      return invite;
    },
    resendInvite: (inviteId) => {
      const current = state.invites.find((i) => i.id === inviteId);
      if (!current) return null;
      const next: Invite = {
        ...current,
        createdAt: new Date().toISOString(),
        token: nid("tok"),
        status: "pending",
      };
      update((prev) => ({
        ...prev,
        invites: prev.invites.map((i) => (i.id === inviteId ? next : i)),
      }));
      return next;
    },
    changeMemberRole: (membershipId, role) => {
      update((prev) => ({
        ...prev,
        memberships: prev.memberships.map((m) => (m.id === membershipId ? { ...m, role } : m)),
      }));
    },
    removeMember: (membershipId) => {
      update((prev) => ({
        ...prev,
        memberships: prev.memberships.filter((m) => m.id !== membershipId),
      }));
    },
    removeInvite: (inviteId) => {
      update((prev) => {
        const invite = prev.invites.find((i) => i.id === inviteId);
        return {
          ...prev,
          invites: prev.invites.filter((i) => i.id !== inviteId),
          memberships: invite?.membershipId
            ? prev.memberships.filter((m) => m.id !== invite.membershipId)
            : prev.memberships,
        };
      });
    },
    acceptInviteToken: (token) => {
      const invite = state.invites.find((i) => i.token === token && i.status === "pending");
      if (!invite) return { ok: false, message: "Invite not found or already used." };

      // Match demo personas by email, or create a lightweight person
      let person = state.people.find((p) => p.email === invite.email);
      if (!person) {
        const appRole: AppRole = invite.role === "helper" ? "helper" : "caregiver";
        person = {
          id: nid("person"),
          name: invite.displayName,
          email: invite.email,
          appRole,
        };
      }

      update((prev) => {
        const people = prev.people.some((p) => p.id === person!.id)
          ? prev.people
          : [...prev.people, person!];
        return {
          ...prev,
          people,
          activePersonId: person!.id,
          selectedChildId: invite.childId,
          invites: prev.invites.map((i) => (i.id === invite.id ? { ...i, status: "active" } : i)),
          memberships: prev.memberships.map((m) =>
            m.id === invite.membershipId
              ? { ...m, personId: person!.id, status: "active", role: invite.role }
              : m,
          ),
        };
      });
      return { ok: true, message: `Joined as ${invite.role}.` };
    },
    peopleForChild: (childId) => {
      const rows: Array<{
        kind: "member" | "invite";
        id: string;
        name: string;
        email: string;
        role: ChildRole | "caregiver" | "helper";
        status: "pending" | "active";
        membershipId?: string;
        inviteId?: string;
      }> = [];
      for (const m of state.memberships.filter((x) => x.childId === childId)) {
        if (m.status === "pending") continue;
        const person = state.people.find((p) => p.id === m.personId);
        if (!person) continue;
        rows.push({
          kind: "member",
          id: m.id,
          name: person.name,
          email: person.email,
          role: m.role,
          status: "active",
          membershipId: m.id,
        });
      }
      for (const inv of state.invites.filter(
        (i) => i.childId === childId && i.status === "pending",
      )) {
        rows.push({
          kind: "invite",
          id: inv.id,
          name: inv.displayName,
          email: inv.email,
          role: inv.role,
          status: "pending",
          inviteId: inv.id,
        });
      }
      return rows;
    },
    visibleLibrary: (childId) => {
      if (activePerson.appRole === "therapist") {
        // Masters (childId null) + copies for selected patient
        return state.libraryPlans.filter(
          (p) =>
            p.ownerId === activePerson.id &&
            (p.childId === null || (childId != null && p.childId === childId)),
        );
      }
      // Caregivers: own masters + plans for this child
      return state.libraryPlans.filter(
        (p) => p.ownerId === activePerson.id || (childId != null && p.childId === childId),
      );
    },
    therapistTagsForActive: () =>
      state.therapistTags.filter((t) => t.therapistId === activePerson.id),
  };

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendarStore() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendarStore must be used within CalendarStoreProvider");
  return ctx;
}

export function weekdayDatesFrom(start: Date, mask: boolean[]): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (mask[i]) dates.push(toDateKey(addDays(start, i)));
  }
  return dates;
}

export function thisWeekDates(mask: boolean[]): string[] {
  const monday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  })();
  return weekdayDatesFrom(monday, mask);
}

export { DEMO_PERSON_IDS, parseDateKey, toDateKey, STORAGE_KEY };
