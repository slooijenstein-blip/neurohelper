import { planStepFromActivity, customPlanStep } from "./activity-steps.ts";
import { ACTIVITIES } from "../activities-data.ts";
import {
  nid,
  toDateKey,
  type CalendarState,
  type DayStep,
  type LibraryPlan,
  type PlanStep,
} from "./types.ts";

const THERAPIST_ID = "person_maya";
const PARENT_ID = "person_sam";
const HELPER_ID = "person_grandma";
const CHILD_ALEX = "child_alex";
const CHILD_JORDAN = "child_jordan";
const TAG_SCHOOL = "tag_school_age";
const TAG_EARLY = "tag_early";
const MASTER_CALM = "lib_weekday_calm";
const MASTER_MORNING = "lib_morning_ready";

function activityOrCustom(id: string, fallback: PlanStep): PlanStep {
  const act = ACTIVITIES.find((a) => a.id === id);
  return act ? planStepFromActivity(act) : fallback;
}

function dayStepsFrom(plan: LibraryPlan): DayStep[] {
  return plan.steps.map((s) => ({ ...s, id: nid("ds"), done: false }));
}

export const DEMO_PERSON_IDS = {
  therapist: THERAPIST_ID,
  caregiver: PARENT_ID,
  helper: HELPER_ID,
} as const;

export function createSeedState(): CalendarState {
  const today = toDateKey(new Date());

  const calmSteps: PlanStep[] = [
    customPlanStep("Arrive and settle", 5, "Shoes off, soft voice"),
    activityOrCustom("sensory-rice-bin", customPlanStep("Quiet sensory bin", 15, "Rice + scoops")),
    customPlanStep("Snack together", 10, ""),
    activityOrCustom("story-time-props", customPlanStep("Picture book", 10, "")),
    customPlanStep("Transition cue", 5, "Timer + next activity"),
  ];

  const morningSteps: PlanStep[] = [
    activityOrCustom("deep-pressure-sandwich", customPlanStep("Wake stretch", 5, "")),
    customPlanStep("Get dressed", 10, "Choice of two outfits"),
    customPlanStep("Breakfast", 15, ""),
    customPlanStep("Bag pack", 5, ""),
  ];

  const masterCalm: LibraryPlan = {
    id: MASTER_CALM,
    ownerId: THERAPIST_ID,
    name: "Weekday afternoon calm hour",
    steps: calmSteps,
    childId: null,
    sourceTemplateId: null,
    updatedAt: new Date().toISOString(),
  };

  const masterMorning: LibraryPlan = {
    id: MASTER_MORNING,
    ownerId: THERAPIST_ID,
    name: "Morning ready routine",
    steps: morningSteps,
    childId: null,
    sourceTemplateId: null,
    updatedAt: new Date().toISOString(),
  };

  const alexCopy: LibraryPlan = {
    id: "lib_alex_calm",
    ownerId: THERAPIST_ID,
    name: "Weekday afternoon calm hour",
    steps: calmSteps.map((s) => ({ ...s, id: nid("st") })),
    childId: CHILD_ALEX,
    sourceTemplateId: MASTER_CALM,
    updatedAt: new Date().toISOString(),
  };

  const parentPlan: LibraryPlan = {
    id: "lib_sam_evening",
    ownerId: PARENT_ID,
    name: "Evening wind-down",
    steps: [
      customPlanStep("Bath", 15, ""),
      customPlanStep("Pajamas", 5, ""),
      activityOrCustom("story-time-props", customPlanStep("Story", 10, "")),
      customPlanStep("Lights dim", 5, ""),
    ],
    childId: null,
    sourceTemplateId: null,
    updatedAt: new Date().toISOString(),
  };

  return {
    v: 1,
    activePersonId: THERAPIST_ID,
    people: [
      {
        id: THERAPIST_ID,
        name: "Maya (Therapist)",
        email: "maya@example.com",
        appRole: "therapist",
      },
      {
        id: PARENT_ID,
        name: "Sam (Parent)",
        email: "sam@example.com",
        appRole: "caregiver",
      },
      {
        id: HELPER_ID,
        name: "Grandma (Helper)",
        email: "grandma@example.com",
        appRole: "helper",
      },
    ],
    children: [
      {
        id: CHILD_ALEX,
        displayName: "Alex",
        ageBand: "3-5",
        createdAt: new Date().toISOString(),
        createdById: THERAPIST_ID,
      },
      {
        id: CHILD_JORDAN,
        displayName: "Jordan",
        ageBand: "6-8",
        createdAt: new Date().toISOString(),
        createdById: THERAPIST_ID,
      },
    ],
    memberships: [
      {
        id: "mem_maya_alex",
        childId: CHILD_ALEX,
        personId: THERAPIST_ID,
        role: "therapist",
        status: "active",
      },
      {
        id: "mem_maya_jordan",
        childId: CHILD_JORDAN,
        personId: THERAPIST_ID,
        role: "therapist",
        status: "active",
      },
      {
        id: "mem_sam_alex",
        childId: CHILD_ALEX,
        personId: PARENT_ID,
        role: "caregiver",
        status: "active",
      },
    ],
    invites: [],
    libraryPlans: [masterCalm, masterMorning, alexCopy, parentPlan],
    dayPlans: [
      {
        id: "day_alex_today",
        childId: CHILD_ALEX,
        date: today,
        name: alexCopy.name,
        libraryPlanId: alexCopy.id,
        steps: dayStepsFrom(alexCopy),
        tweaked: false,
        updatedAt: new Date().toISOString(),
      },
    ],
    therapistTags: [
      { id: TAG_EARLY, therapistId: THERAPIST_ID, name: "Early years" },
      { id: TAG_SCHOOL, therapistId: THERAPIST_ID, name: "School age" },
    ],
    childTags: [
      { childId: CHILD_ALEX, tagId: TAG_EARLY },
      { childId: CHILD_JORDAN, tagId: TAG_SCHOOL },
    ],
    selectedChildId: null,
  };
}

export { CHILD_ALEX, CHILD_JORDAN, MASTER_CALM, PARENT_ID, THERAPIST_ID, HELPER_ID };
