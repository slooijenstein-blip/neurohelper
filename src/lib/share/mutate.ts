import {
  canEditPlan,
  canInvite,
  inviteRolesFor,
  membershipOnChild,
} from "../calendar/permissions.ts";
import {
  isAgeBand,
  type AppRole,
  type CalendarState,
  type ChildRole,
  type Invite,
  type LibraryPlan,
  type Person,
  type PlanStep,
} from "../calendar/types.ts";
import type { Actor, ShareAction } from "./actions.ts";
import { ShareError } from "./errors.ts";
import {
  assertDateKey,
  assertEmail,
  assertId,
  clipDisplayName,
  emailLocalPart,
  emailMatchesActor,
} from "./names.ts";

export type MutateResult = {
  state: CalendarState;
  invite?: Invite;
};

function nowOr(value: string): string {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) ? value : new Date().toISOString();
}

function sanitizeStep(step: PlanStep, id: string): PlanStep {
  const title = step.title.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!title) throw new ShareError(400, "invalid_step", "Each step needs a title.");
  const notes = (step.notes || step.description || "").trim().slice(0, 400);
  const minutes = Math.round(Number(step.minutes));
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) {
    throw new ShareError(400, "invalid_step", "Keep each step between 1 and 180 minutes.");
  }
  const activityId =
    step.activityId && /^[a-z0-9-]{1,80}$/.test(step.activityId) ? step.activityId : null;
  if (!/^(st|ds)_[a-z0-9_]{8,64}$/.test(id)) {
    throw new ShareError(400, "invalid_id", "Invalid id.");
  }
  return { id, title, notes, description: notes, minutes, activityId };
}

function roleOn(state: CalendarState, childId: string, actorId: string): ChildRole | null {
  return membershipOnChild(state.memberships, childId, actorId)?.role ?? null;
}

function requireEditor(state: CalendarState, childId: string, actorId: string) {
  const role = roleOn(state, childId, actorId);
  if (!canEditPlan(role)) {
    throw new ShareError(403, "forbidden", "You cannot edit this plan.");
  }
  return role;
}

function personOf(state: CalendarState, actorId: string): Person | null {
  return state.people.find((person) => person.id === actorId) ?? null;
}

export function applyShareAction(
  state: CalendarState,
  actor: Actor,
  action: ShareAction,
): MutateResult {
  const now = "now" in action ? nowOr(action.now) : new Date().toISOString();

  switch (action.type) {
    case "addChild": {
      const person = personOf(state, actor.userId);
      if (!actor.isPro || person?.appRole !== "therapist") {
        throw new ShareError(403, "pro_required", "Only a Pro account can add a patient.");
      }
      if (state.children.length >= 40) {
        throw new ShareError(400, "limit", "This caseload is full.");
      }
      if (!isAgeBand(action.ageBand)) {
        throw new ShareError(400, "invalid_age", "Choose an age band.");
      }
      const childId = assertId(action.childId, "child");
      const child = {
        id: childId,
        displayName: clipDisplayName(action.displayName, "Child"),
        ageBand: action.ageBand,
        createdAt: now,
        createdById: actor.userId,
      };
      const allowedTags = new Set(
        state.therapistTags.filter((tag) => tag.therapistId === actor.userId).map((tag) => tag.id),
      );
      return {
        state: {
          ...state,
          children: [...state.children, child],
          memberships: [
            ...state.memberships,
            {
              id: assertId(action.membershipId, "mem"),
              childId,
              personId: actor.userId,
              role: "therapist",
              status: "active",
            },
          ],
          childTags: [
            ...state.childTags,
            ...action.tagIds
              .filter((tagId) => allowedTags.has(tagId))
              .map((tagId) => ({ childId, tagId })),
          ],
          selectedChildId: childId,
        },
      };
    }
    case "addTherapistTag": {
      const person = personOf(state, actor.userId);
      if (!actor.isPro || person?.appRole !== "therapist") {
        throw new ShareError(403, "pro_required", "Only a Pro account can add tags.");
      }
      const name = clipDisplayName(action.name, "");
      if (!name) return { state };
      return {
        state: {
          ...state,
          therapistTags: [
            ...state.therapistTags,
            { id: assertId(action.tagId, "tag"), therapistId: actor.userId, name },
          ],
        },
      };
    }
    case "setChildTags": {
      const role = roleOn(state, action.childId, actor.userId);
      if (role !== "therapist") {
        throw new ShareError(403, "forbidden", "Only the therapist can tag a patient.");
      }
      const allowed = new Set(
        state.therapistTags.filter((tag) => tag.therapistId === actor.userId).map((tag) => tag.id),
      );
      return {
        state: {
          ...state,
          childTags: [
            ...state.childTags.filter((tag) => tag.childId !== action.childId),
            ...action.tagIds
              .filter((tagId) => allowed.has(tagId))
              .map((tagId) => ({ childId: action.childId, tagId })),
          ],
        },
      };
    }
    case "toggleStepDone": {
      if (!roleOn(state, action.childId, actor.userId)) {
        throw new ShareError(403, "forbidden", "You cannot update this plan.");
      }
      assertDateKey(action.date);
      return {
        state: {
          ...state,
          dayPlans: state.dayPlans.map((plan) => {
            if (plan.childId !== action.childId || plan.date !== action.date) return plan;
            return {
              ...plan,
              updatedAt: now,
              steps: plan.steps.map((step) =>
                step.id === action.stepId ? { ...step, done: !step.done } : step,
              ),
            };
          }),
        },
      };
    }
    case "applyLibraryPlan": {
      requireEditor(state, action.childId, actor.userId);
      const plan = state.libraryPlans.find((item) => item.id === action.libraryPlanId);
      if (!plan) throw new ShareError(404, "not_found", "Plan not found.");
      let dayPlans = [...state.dayPlans];
      for (const day of action.days) {
        assertDateKey(day.date);
        if (day.stepIds.length !== plan.steps.length) {
          throw new ShareError(400, "invalid_step", "Step ids do not match the plan.");
        }
        const next = {
          id: assertId(day.dayId, "day"),
          childId: action.childId,
          date: day.date,
          name: plan.name,
          nameKey: plan.nameKey ?? null,
          libraryPlanId: plan.id,
          steps: plan.steps.map((step, index) => ({
            ...sanitizeStep(step, day.stepIds[index]!),
            done: false,
          })),
          tweaked: false,
          updatedAt: now,
        };
        dayPlans = dayPlans.filter(
          (item) => !(item.childId === action.childId && item.date === day.date),
        );
        dayPlans.push(next);
      }
      return { state: { ...state, dayPlans } };
    }
    case "createLibraryPlan": {
      const childId = action.plan.childId;
      if (childId) requireEditor(state, childId, actor.userId);
      else if (!actor.isPro || personOf(state, actor.userId)?.appRole !== "therapist") {
        throw new ShareError(403, "pro_required", "Only a Pro account can add a template.");
      }
      if (state.libraryPlans.length >= 40) {
        throw new ShareError(400, "limit", "Too many plans.");
      }
      const steps = action.plan.steps.slice(0, 30).map((step) => sanitizeStep(step, step.id));
      const plan: LibraryPlan = {
        id: assertId(action.plan.id, "lib"),
        ownerId: actor.userId,
        name: clipDisplayName(action.plan.name, "Untitled plan"),
        nameKey: action.plan.nameKey ?? null,
        steps,
        childId,
        sourceTemplateId: null,
        updatedAt: now,
      };
      return { state: { ...state, libraryPlans: [...state.libraryPlans, plan] } };
    }
    case "updateLibraryPlan": {
      const current = state.libraryPlans.find((plan) => plan.id === action.id);
      if (!current) return { state };
      if (current.childId) requireEditor(state, current.childId, actor.userId);
      else if (current.ownerId !== actor.userId) {
        throw new ShareError(403, "forbidden", "You cannot edit this template.");
      }
      const name =
        action.name !== undefined ? clipDisplayName(action.name, current.name) : current.name;
      return {
        state: {
          ...state,
          libraryPlans: state.libraryPlans.map((plan) =>
            plan.id === action.id
              ? {
                  ...plan,
                  name,
                  nameKey: action.name && action.name !== plan.name ? null : (plan.nameKey ?? null),
                  steps: action.steps
                    ? action.steps.slice(0, 30).map((step) => sanitizeStep(step, step.id))
                    : plan.steps,
                  updatedAt: now,
                }
              : plan,
          ),
        },
      };
    }
    case "duplicateLibraryPlan": {
      const source = state.libraryPlans.find((plan) => plan.id === action.sourceId);
      if (!source) return { state };
      if (source.childId) requireEditor(state, source.childId, actor.userId);
      else if (source.ownerId !== actor.userId) {
        throw new ShareError(403, "forbidden", "You cannot copy this template.");
      }
      if (action.stepIds.length !== source.steps.length) {
        throw new ShareError(400, "invalid_step", "Step ids do not match the plan.");
      }
      const copy: LibraryPlan = {
        ...source,
        id: assertId(action.copyId, "lib"),
        name: clipDisplayName(`${source.name} (copy)`, "Copy"),
        nameKey: null,
        steps: source.steps.map((step, index) => sanitizeStep(step, action.stepIds[index]!)),
        updatedAt: now,
      };
      return { state: { ...state, libraryPlans: [...state.libraryPlans, copy] } };
    }
    case "deleteLibraryPlan": {
      const current = state.libraryPlans.find((plan) => plan.id === action.id);
      if (!current) return { state };
      if (current.childId) requireEditor(state, current.childId, actor.userId);
      else if (current.ownerId !== actor.userId) {
        throw new ShareError(403, "forbidden", "You cannot delete this template.");
      }
      return {
        state: {
          ...state,
          libraryPlans: state.libraryPlans.filter((plan) => plan.id !== action.id),
        },
      };
    }
    case "useTemplateForPatient": {
      if (personOf(state, actor.userId)?.appRole !== "therapist") {
        throw new ShareError(403, "pro_required", "Only a Pro account can copy a template.");
      }
      requireEditor(state, action.childId, actor.userId);
      const master = state.libraryPlans.find(
        (plan) =>
          plan.id === action.masterId && plan.childId === null && plan.ownerId === actor.userId,
      );
      if (!master) throw new ShareError(404, "not_found", "Template not found.");
      if (action.stepIds.length !== master.steps.length) {
        throw new ShareError(400, "invalid_step", "Step ids do not match the template.");
      }
      const copy: LibraryPlan = {
        id: assertId(action.copyId, "lib"),
        ownerId: actor.userId,
        name: master.name,
        nameKey: master.nameKey ?? null,
        steps: master.steps.map((step, index) => sanitizeStep(step, action.stepIds[index]!)),
        childId: action.childId,
        sourceTemplateId: master.id,
        updatedAt: now,
      };
      return { state: { ...state, libraryPlans: [...state.libraryPlans, copy] } };
    }
    case "tweakDayStep": {
      requireEditor(state, action.childId, actor.userId);
      assertDateKey(action.date);
      const title = clipDisplayName(action.title, "");
      if (!title) throw new ShareError(400, "invalid_step", "Each step needs a title.");
      return {
        state: {
          ...state,
          dayPlans: state.dayPlans.map((plan) => {
            if (plan.childId !== action.childId || plan.date !== action.date) return plan;
            return {
              ...plan,
              tweaked: true,
              updatedAt: now,
              steps: plan.steps.map((step) =>
                step.id === action.stepId ? { ...step, title } : step,
              ),
            };
          }),
        },
      };
    }
    case "addDayStep": {
      requireEditor(state, action.childId, actor.userId);
      assertDateKey(action.date);
      const step = { ...sanitizeStep(action.step, action.stepId), done: false };
      const existing = state.dayPlans.find(
        (plan) => plan.childId === action.childId && plan.date === action.date,
      );
      if (existing) {
        return {
          state: {
            ...state,
            dayPlans: state.dayPlans.map((plan) =>
              plan.id === existing.id
                ? { ...plan, steps: [...plan.steps, step], tweaked: true, updatedAt: now }
                : plan,
            ),
          },
        };
      }
      return {
        state: {
          ...state,
          dayPlans: [
            ...state.dayPlans,
            {
              id: assertId(action.dayId, "day"),
              childId: action.childId,
              date: action.date,
              name: "Today's plan",
              nameKey: "calendar.today.customPlan",
              libraryPlanId: null,
              steps: [step],
              tweaked: true,
              updatedAt: now,
            },
          ],
        },
      };
    }
    case "replaceDayStep": {
      requireEditor(state, action.childId, actor.userId);
      assertDateKey(action.date);
      return {
        state: {
          ...state,
          dayPlans: state.dayPlans.map((plan) => {
            if (plan.childId !== action.childId || plan.date !== action.date) return plan;
            return {
              ...plan,
              tweaked: true,
              updatedAt: now,
              steps: plan.steps.map((step) =>
                step.id === action.stepId
                  ? {
                      ...sanitizeStep({ ...action.step, id: action.stepId }, action.stepId),
                      done: step.done,
                    }
                  : step,
              ),
            };
          }),
        },
      };
    }
    case "removeDayStep": {
      requireEditor(state, action.childId, actor.userId);
      assertDateKey(action.date);
      return {
        state: {
          ...state,
          dayPlans: state.dayPlans.map((plan) => {
            if (plan.childId !== action.childId || plan.date !== action.date) return plan;
            return {
              ...plan,
              tweaked: true,
              updatedAt: now,
              steps: plan.steps.filter((step) => step.id !== action.stepId),
            };
          }),
        },
      };
    }
    case "appendLibraryStep": {
      const plan = state.libraryPlans.find((item) => item.id === action.libraryPlanId);
      if (!plan) return { state };
      if (plan.childId) requireEditor(state, plan.childId, actor.userId);
      else if (plan.ownerId !== actor.userId) {
        throw new ShareError(403, "forbidden", "You cannot edit this template.");
      }
      const step = sanitizeStep(action.step, action.stepId);
      return {
        state: {
          ...state,
          libraryPlans: state.libraryPlans.map((item) =>
            item.id === plan.id
              ? { ...item, steps: [...item.steps, step].slice(0, 30), updatedAt: now }
              : item,
          ),
        },
      };
    }
    case "saveDayBackToLibrary": {
      requireEditor(state, action.childId, actor.userId);
      assertDateKey(action.date);
      const day = state.dayPlans.find(
        (plan) => plan.childId === action.childId && plan.date === action.date,
      );
      if (!day) return { state };
      if (action.stepIds.length !== day.steps.length) {
        throw new ShareError(400, "invalid_step", "Step ids do not match the day.");
      }
      const steps = day.steps.map((step, index) => sanitizeStep(step, action.stepIds[index]!));
      if (day.libraryPlanId && state.libraryPlans.some((plan) => plan.id === day.libraryPlanId)) {
        return {
          state: {
            ...state,
            libraryPlans: state.libraryPlans.map((plan) =>
              plan.id === day.libraryPlanId
                ? {
                    ...plan,
                    name: day.name,
                    nameKey: day.nameKey ?? plan.nameKey ?? null,
                    steps,
                    updatedAt: now,
                  }
                : plan,
            ),
            dayPlans: state.dayPlans.map((plan) =>
              plan.id === day.id ? { ...plan, tweaked: false } : plan,
            ),
          },
        };
      }
      const created: LibraryPlan = {
        id: assertId(action.planId, "lib"),
        ownerId: actor.userId,
        name: day.name,
        nameKey: day.nameKey ?? null,
        steps,
        childId: action.childId,
        sourceTemplateId: null,
        updatedAt: now,
      };
      return {
        state: {
          ...state,
          libraryPlans: [...state.libraryPlans, created],
          dayPlans: state.dayPlans.map((plan) =>
            plan.id === day.id ? { ...plan, libraryPlanId: created.id, tweaked: false } : plan,
          ),
        },
      };
    }
    case "createInvite": {
      const actorRole = roleOn(state, action.childId, actor.userId);
      if (!canInvite(actorRole)) {
        throw new ShareError(403, "forbidden", "You cannot invite someone to this plan.");
      }
      if (!inviteRolesFor(actorRole).includes(action.role)) {
        throw new ShareError(403, "role_not_allowed", "That role is not allowed.");
      }
      const email = assertEmail(action.email);
      const existing = state.invites.find(
        (invite) =>
          invite.childId === action.childId &&
          invite.email === email &&
          invite.status === "pending",
      );
      const token = assertId(action.token, "tok");
      if (existing) {
        const invite: Invite = { ...existing, createdAt: now, token, status: "pending" };
        return {
          invite,
          state: {
            ...state,
            invites: state.invites.map((item) => (item.id === existing.id ? invite : item)),
          },
        };
      }
      if (state.invites.filter((invite) => invite.childId === action.childId).length >= 20) {
        throw new ShareError(400, "limit", "Too many invites for this child.");
      }
      const invite: Invite = {
        id: assertId(action.inviteId, "inv"),
        childId: action.childId,
        email,
        role: action.role,
        status: "pending",
        invitedById: actor.userId,
        token,
        createdAt: now,
        membershipId: assertId(action.membershipId, "mem"),
        displayName: clipDisplayName(action.displayName, emailLocalPart(email)),
      };
      return {
        invite,
        state: {
          ...state,
          memberships: [
            ...state.memberships,
            {
              id: invite.membershipId!,
              childId: action.childId,
              personId: assertId(action.pendingPersonId, "pending"),
              role: action.role,
              status: "pending",
            },
          ],
          invites: [...state.invites, invite],
        },
      };
    }
    case "resendInvite": {
      const current = state.invites.find((invite) => invite.id === action.inviteId);
      if (!current) throw new ShareError(404, "not_found", "Invite not found.");
      const actorRole = roleOn(state, current.childId, actor.userId);
      if (!canInvite(actorRole)) {
        throw new ShareError(403, "forbidden", "You cannot resend this invite.");
      }
      const invite: Invite = {
        ...current,
        createdAt: now,
        token: assertId(action.token, "tok"),
        status: "pending",
      };
      return {
        invite,
        state: {
          ...state,
          invites: state.invites.map((item) => (item.id === invite.id ? invite : item)),
        },
      };
    }
    case "changeMemberRole": {
      const membership = state.memberships.find((item) => item.id === action.membershipId);
      if (!membership || membership.role === "therapist") {
        throw new ShareError(403, "forbidden", "That role cannot be changed.");
      }
      const actorRole = roleOn(state, membership.childId, actor.userId);
      if (actorRole !== "therapist" && actorRole !== "caregiver") {
        throw new ShareError(403, "forbidden", "You cannot change roles.");
      }
      if (action.role === "therapist") {
        throw new ShareError(403, "forbidden", "You cannot assign the therapist role.");
      }
      return {
        state: {
          ...state,
          memberships: state.memberships.map((item) =>
            item.id === membership.id ? { ...item, role: action.role } : item,
          ),
        },
      };
    }
    case "removeMember": {
      const membership = state.memberships.find((item) => item.id === action.membershipId);
      if (!membership || membership.role === "therapist") {
        throw new ShareError(403, "forbidden", "The therapist stays on this plan.");
      }
      const actorRole = roleOn(state, membership.childId, actor.userId);
      if (actorRole !== "therapist" && actorRole !== "caregiver") {
        throw new ShareError(403, "forbidden", "You cannot remove this person.");
      }
      return {
        state: {
          ...state,
          memberships: state.memberships.filter((item) => item.id !== membership.id),
        },
      };
    }
    case "removeInvite": {
      const invite = state.invites.find((item) => item.id === action.inviteId);
      if (!invite) return { state };
      const actorRole = roleOn(state, invite.childId, actor.userId);
      if (!canInvite(actorRole)) {
        throw new ShareError(403, "forbidden", "You cannot remove this invite.");
      }
      return {
        state: {
          ...state,
          invites: state.invites.filter((item) => item.id !== invite.id),
          memberships: invite.membershipId
            ? state.memberships.filter((item) => item.id !== invite.membershipId)
            : state.memberships,
        },
      };
    }
    case "acceptInvite": {
      const invite = state.invites.find((item) => item.token === action.token);
      if (!invite || !emailMatchesActor(invite.email, actor)) {
        throw new ShareError(
          invite ? 403 : 404,
          invite ? "email_mismatch" : "invite_missing",
          invite
            ? "Sign in with the invited email to accept."
            : "This invite is missing or already used.",
        );
      }
      if (invite.status === "active") return { state };
      const appRole: AppRole = invite.role === "helper" ? "helper" : "caregiver";
      const person: Person = {
        id: actor.userId,
        name: clipDisplayName(actor.name, invite.displayName),
        email: assertEmail(actor.email),
        appRole,
      };
      const people: Person[] = state.people.some((item) => item.id === person.id)
        ? state.people.map((item): Person =>
            item.id === person.id
              ? {
                  ...item,
                  name: person.name,
                  email: person.email,
                  appRole: item.appRole === "therapist" ? "therapist" : appRole,
                }
              : item,
          )
        : [...state.people, person];
      return {
        invite: { ...invite, status: "active" },
        state: {
          ...state,
          people,
          selectedChildId: invite.childId,
          invites: state.invites.map((item) =>
            item.id === invite.id ? { ...item, status: "active" } : item,
          ),
          memberships: state.memberships.map((item) =>
            item.id === invite.membershipId
              ? { ...item, personId: actor.userId, status: "active", role: invite.role }
              : item,
          ),
        },
      };
    }
    default: {
      const unknown: never = action;
      throw new ShareError(
        400,
        "unknown_action",
        `Unknown action ${(unknown as { type?: string }).type ?? ""}.`,
      );
    }
  }
}
