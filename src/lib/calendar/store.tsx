import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Actor, EmailResult, ShareAction } from "@/lib/share/actions";
import { postShareAction } from "@/lib/share/client";
import { applyShareAction } from "@/lib/share/mutate";
import { membershipOnChild } from "./permissions";
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
  addChild: (displayName: string, ageBand: AgeBand, tagIds?: string[]) => Child | null;
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
  shareMode: "demo" | "live";
  shareStatus: "off" | "ready" | "not_configured" | "error";
  attachLive: (input: {
    getToken: () => Promise<string | null>;
    devUser: string | null;
    state: CalendarState | null;
    status: "ready" | "not_configured" | "error";
  }) => void;
  detachLive: () => void;
  emailFor: (inviteId: string) => Promise<EmailResult>;
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

const DEMO_EMAIL: EmailResult = {
  sent: false,
  code: "demo",
  message: "",
};

function adoptServerState(prev: CalendarState, next: CalendarState): CalendarState {
  const selected =
    prev.selectedChildId && next.children.some((child) => child.id === prev.selectedChildId)
      ? prev.selectedChildId
      : next.selectedChildId;
  return { ...next, selectedChildId: selected };
}

function actorFrom(state: CalendarState): Actor {
  const person = state.people.find((item) => item.id === state.activePersonId) ?? state.people[0];
  if (!person) {
    return { userId: "person_missing", email: "missing@example.com", name: "Member", isPro: false };
  }
  return {
    userId: person.id,
    email: person.email,
    name: person.name,
    isPro: person.appRole === "therapist",
  };
}

export function CalendarStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CalendarState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);
  const [shareMode, setShareMode] = useState<"demo" | "live">("demo");
  const [shareStatus, setShareStatus] = useState<"off" | "ready" | "not_configured" | "error">(
    "off",
  );
  const stateRef = useRef(state);
  const modeRef = useRef<"demo" | "live">("demo");
  const statusRef = useRef(shareStatus);
  const liveRef = useRef<{
    getToken: () => Promise<string | null>;
    devUser: string | null;
  } | null>(null);
  const chainRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const emailResults = useRef(new Map<string, EmailResult>());
  const emailWaiters = useRef(new Map<string, (result: EmailResult) => void>());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (modeRef.current === "live") {
      setHydrated(true);
      return;
    }
    const loaded = loadState();
    stateRef.current = loaded;
    setState(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || modeRef.current !== "demo") return;
    persist(state);
  }, [state, hydrated]);

  const rememberEmail = useCallback((inviteId: string | null, email: EmailResult | null) => {
    if (!inviteId || !email) return;
    emailResults.current.set(inviteId, email);
    emailWaiters.current.get(inviteId)?.(email);
    emailWaiters.current.delete(inviteId);
  }, []);

  const enqueue = useCallback(
    (action: ShareAction) => {
      const bridge = liveRef.current;
      if (!bridge || modeRef.current !== "live" || statusRef.current !== "ready") return;
      const my = ++genRef.current;
      chainRef.current = chainRef.current.then(async () => {
        try {
          const token = await bridge.getToken();
          const result = await postShareAction(
            { token, devUser: bridge.devUser },
            action,
            window.location.origin,
          );
          rememberEmail(result.inviteId, result.email);
          if (my !== genRef.current) return;
          setState((prev) => {
            const merged = adoptServerState(prev, result.state);
            stateRef.current = merged;
            return merged;
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not save.";
          rememberEmail("inviteId" in action ? action.inviteId : null, {
            sent: false,
            code: "clerk_error",
            message,
          });
          if (my === genRef.current) setShareStatus("error");
        }
      });
    },
    [rememberEmail],
  );

  const dispatch = useCallback(
    (action: ShareAction) => {
      try {
        const result = applyShareAction(stateRef.current, actorFrom(stateRef.current), action);
        stateRef.current = result.state;
        setState(result.state);
        enqueue(action);
        return result;
      } catch {
        return null;
      }
    },
    [enqueue],
  );

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
      const childId = nid("child");
      const result = dispatch({
        type: "addChild",
        childId,
        membershipId: nid("mem"),
        displayName,
        ageBand,
        tagIds,
        now: new Date().toISOString(),
      });
      return result?.state.children.find((child) => child.id === childId) ?? null;
    },
    addTherapistTag: (name) => {
      dispatch({ type: "addTherapistTag", tagId: nid("tag"), name });
    },
    setChildTags: (childId, tagIds) => {
      dispatch({ type: "setChildTags", childId, tagIds });
    },
    getDayPlan: (childId, date) =>
      state.dayPlans.find((p) => p.childId === childId && p.date === date) ?? null,
    toggleStepDone: (childId, date, stepId) => {
      dispatch({ type: "toggleStepDone", childId, date, stepId, now: new Date().toISOString() });
    },
    applyLibraryPlan: (libraryPlanId, childId, dates) => {
      const plan = stateRef.current.libraryPlans.find((item) => item.id === libraryPlanId);
      if (!plan) return;
      dispatch({
        type: "applyLibraryPlan",
        libraryPlanId,
        childId,
        days: dates.map((date) => ({
          date,
          dayId: nid("day"),
          stepIds: plan.steps.map(() => nid("st")),
        })),
        now: new Date().toISOString(),
      });
    },
    createLibraryPlan: (name, steps, childId = null) => {
      const plan: LibraryPlan = {
        id: nid("lib"),
        ownerId: stateRef.current.activePersonId,
        name: name.trim() || "Untitled plan",
        steps: cloneSteps(steps),
        childId,
        sourceTemplateId: null,
        updatedAt: new Date().toISOString(),
      };
      const result = dispatch({ type: "createLibraryPlan", plan });
      return result?.state.libraryPlans.find((item) => item.id === plan.id) ?? plan;
    },
    updateLibraryPlan: (id, patch) => {
      dispatch({
        type: "updateLibraryPlan",
        id,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.steps ? { steps: cloneSteps(patch.steps) } : {}),
        now: new Date().toISOString(),
      });
    },
    duplicateLibraryPlan: (id) => {
      const source = stateRef.current.libraryPlans.find((plan) => plan.id === id);
      if (!source) return null;
      const copyId = nid("lib");
      const result = dispatch({
        type: "duplicateLibraryPlan",
        sourceId: id,
        copyId,
        stepIds: source.steps.map(() => nid("st")),
        now: new Date().toISOString(),
      });
      return result?.state.libraryPlans.find((plan) => plan.id === copyId) ?? null;
    },
    deleteLibraryPlan: (id) => {
      dispatch({ type: "deleteLibraryPlan", id });
    },
    useTemplateForPatient: (masterId, childId) => {
      const master = stateRef.current.libraryPlans.find((plan) => plan.id === masterId);
      if (!master) return null;
      const copyId = nid("lib");
      const result = dispatch({
        type: "useTemplateForPatient",
        masterId,
        childId,
        copyId,
        stepIds: master.steps.map(() => nid("st")),
        now: new Date().toISOString(),
      });
      return result?.state.libraryPlans.find((plan) => plan.id === copyId) ?? null;
    },
    tweakDayStep: (childId, date, stepId, title) => {
      dispatch({
        type: "tweakDayStep",
        childId,
        date,
        stepId,
        title,
        now: new Date().toISOString(),
      });
    },
    addDayStep: (childId, date, step) => {
      dispatch({
        type: "addDayStep",
        childId,
        date,
        step,
        dayId: nid("day"),
        stepId: nid("ds"),
        now: new Date().toISOString(),
      });
    },
    replaceDayStep: (childId, date, stepId, step) => {
      dispatch({
        type: "replaceDayStep",
        childId,
        date,
        stepId,
        step,
        now: new Date().toISOString(),
      });
    },
    removeDayStep: (childId, date, stepId) => {
      dispatch({ type: "removeDayStep", childId, date, stepId, now: new Date().toISOString() });
    },
    appendLibraryStep: (libraryPlanId, step) => {
      dispatch({
        type: "appendLibraryStep",
        libraryPlanId,
        step,
        stepId: nid("st"),
        now: new Date().toISOString(),
      });
    },
    saveDayBackToLibrary: (childId, date) => {
      const day = stateRef.current.dayPlans.find(
        (plan) => plan.childId === childId && plan.date === date,
      );
      if (!day) return null;
      const planId = day.libraryPlanId || nid("lib");
      const result = dispatch({
        type: "saveDayBackToLibrary",
        childId,
        date,
        planId,
        stepIds: day.steps.map(() => nid("st")),
        now: new Date().toISOString(),
      });
      const savedId =
        day.libraryPlanId &&
        result?.state.libraryPlans.some((plan) => plan.id === day.libraryPlanId)
          ? day.libraryPlanId
          : planId;
      return result?.state.libraryPlans.find((plan) => plan.id === savedId) ?? null;
    },
    createInvite: (childId, email, role, displayName) => {
      const inviteId = nid("inv");
      const result = dispatch({
        type: "createInvite",
        childId,
        email,
        role,
        displayName,
        inviteId,
        membershipId: nid("mem"),
        pendingPersonId: nid("pending"),
        token: nid("tok"),
        now: new Date().toISOString(),
      });
      return (
        result?.state.invites.find((invite) => invite.id === inviteId) ?? result?.invite ?? null
      );
    },
    resendInvite: (inviteId) => {
      const result = dispatch({
        type: "resendInvite",
        inviteId,
        token: nid("tok"),
        now: new Date().toISOString(),
      });
      return result?.invite ?? null;
    },
    changeMemberRole: (membershipId, role) => {
      dispatch({ type: "changeMemberRole", membershipId, role });
    },
    removeMember: (membershipId) => {
      dispatch({ type: "removeMember", membershipId });
    },
    removeInvite: (inviteId) => {
      dispatch({ type: "removeInvite", inviteId });
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
    shareMode,
    shareStatus,
    attachLive: ({ getToken, devUser, state: next, status }) => {
      modeRef.current = "live";
      statusRef.current = status;
      liveRef.current = { getToken, devUser };
      setShareMode("live");
      setShareStatus(status);
      if (next) {
        setState((prev) => {
          const merged = adoptServerState(prev, next);
          stateRef.current = merged;
          return merged;
        });
      }
    },
    detachLive: () => {
      if (modeRef.current === "demo") return;
      modeRef.current = "demo";
      statusRef.current = "off";
      liveRef.current = null;
      const next = loadState();
      stateRef.current = next;
      setState(next);
      setShareMode("demo");
      setShareStatus("off");
    },
    emailFor: (inviteId) => {
      const existing = emailResults.current.get(inviteId);
      if (existing) return Promise.resolve(existing);
      if (modeRef.current !== "live") return Promise.resolve(DEMO_EMAIL);
      return new Promise((resolve) => {
        emailWaiters.current.set(inviteId, resolve);
      });
    },
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
