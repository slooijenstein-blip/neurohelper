import type { AgeBand, ChildRole, LibraryPlan, PlanStep } from "../calendar/types.ts";

export type ShareAction =
  | {
      type: "addChild";
      childId: string;
      membershipId: string;
      displayName: string;
      ageBand: AgeBand;
      tagIds: string[];
      now: string;
    }
  | { type: "addTherapistTag"; tagId: string; name: string }
  | { type: "setChildTags"; childId: string; tagIds: string[] }
  | { type: "toggleStepDone"; childId: string; date: string; stepId: string; now: string }
  | {
      type: "applyLibraryPlan";
      libraryPlanId: string;
      childId: string;
      days: Array<{ date: string; dayId: string; stepIds: string[] }>;
      now: string;
    }
  | { type: "createLibraryPlan"; plan: LibraryPlan }
  | {
      type: "updateLibraryPlan";
      id: string;
      name?: string;
      steps?: PlanStep[];
      now: string;
    }
  | {
      type: "duplicateLibraryPlan";
      sourceId: string;
      copyId: string;
      stepIds: string[];
      now: string;
    }
  | { type: "deleteLibraryPlan"; id: string }
  | {
      type: "useTemplateForPatient";
      masterId: string;
      childId: string;
      copyId: string;
      stepIds: string[];
      now: string;
    }
  | {
      type: "tweakDayStep";
      childId: string;
      date: string;
      stepId: string;
      title: string;
      now: string;
    }
  | {
      type: "addDayStep";
      childId: string;
      date: string;
      step: PlanStep;
      dayId: string;
      stepId: string;
      now: string;
    }
  | {
      type: "replaceDayStep";
      childId: string;
      date: string;
      stepId: string;
      step: PlanStep;
      now: string;
    }
  | { type: "removeDayStep"; childId: string; date: string; stepId: string; now: string }
  | {
      type: "appendLibraryStep";
      libraryPlanId: string;
      step: PlanStep;
      stepId: string;
      now: string;
    }
  | {
      type: "saveDayBackToLibrary";
      childId: string;
      date: string;
      planId: string;
      stepIds: string[];
      now: string;
    }
  | {
      type: "createInvite";
      childId: string;
      email: string;
      role: "caregiver" | "helper";
      displayName: string;
      inviteId: string;
      membershipId: string;
      pendingPersonId: string;
      token: string;
      now: string;
    }
  | { type: "resendInvite"; inviteId: string; token: string; now: string }
  | { type: "changeMemberRole"; membershipId: string; role: ChildRole }
  | { type: "removeMember"; membershipId: string }
  | { type: "removeInvite"; inviteId: string }
  | { type: "acceptInvite"; token: string; now: string };

export type Actor = {
  userId: string;
  email: string;
  /** Other verified addresses (Google often adds a second one). */
  emails?: string[];
  name: string;
  isPro: boolean;
};

export type EmailCode =
  | "sent"
  | "demo"
  | "not_configured"
  | "already_user"
  | "redirect_blocked"
  | "clerk_error"
  | "skipped";

export type EmailResult = {
  sent: boolean;
  code: EmailCode;
  message: string;
};
