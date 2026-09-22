import { planStepFromActivity } from "./activity-steps.ts";
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

/** Every seed step is a real catalog activity — no custom free-text rows. */
export function stepsFromCatalog(ids: readonly string[]): PlanStep[] {
  return ids.map((id) => {
    const activity = ACTIVITIES.find((item) => item.id === id);
    if (!activity) throw new Error(`Seed activity missing from catalog: ${id}`);
    return planStepFromActivity(activity);
  });
}

function cloneSteps(steps: PlanStep[]): PlanStep[] {
  return steps.map((step) => ({ ...step, id: nid("st") }));
}

function dayStepsFrom(plan: LibraryPlan): DayStep[] {
  return plan.steps.map((step) => ({ ...step, id: nid("ds"), done: false }));
}

function master(
  id: string,
  name: string,
  activityIds: readonly string[],
  ownerId: string,
): LibraryPlan {
  return {
    id,
    ownerId,
    name,
    steps: stepsFromCatalog(activityIds),
    childId: null,
    sourceTemplateId: null,
    updatedAt: new Date().toISOString(),
  };
}

export const DEMO_PERSON_IDS = {
  therapist: THERAPIST_ID,
  caregiver: PARENT_ID,
  helper: HELPER_ID,
} as const;

/** Therapist My templates — names stay in English; chrome is translated separately. */
export const THERAPIST_TEMPLATE_ACTIVITIES = {
  "Weekday afternoon calm hour": [
    "calming-glitter-bottle",
    "sensory-rice-bin",
    "deep-pressure-sandwich",
    "story-time-props",
    "yoga-poses",
  ],
  "Morning ready routine": [
    "hand-washing",
    "brushing-hair",
    "dressing-race",
    "shoe-lacing",
    "setting-table",
  ],
  "Sensory and movement break": [
    "animal-walks",
    "obstacle-course",
    "textured-walk",
    "dancing-freeze",
    "balloon-tap",
  ],
  "Homework wind-down": [
    "puzzle-time",
    "story-sequencing",
    "rhyming-match",
    "calming-glitter-bottle",
    "yoga-poses",
  ],
  "Fine motor practice": [
    "stringing-beads",
    "playdough-pinch",
    "clothespin-drop",
    "sticker-peel",
    "cutting-practice",
  ],
} as const;

export const PARENT_EVENING_ACTIVITIES = [
  "hand-washing",
  "brushing-hair",
  "story-time-props",
  "sensory-bottle",
  "yoga-poses",
] as const;

export function createSeedState(): CalendarState {
  const today = toDateKey(new Date());

  const calm = master(
    MASTER_CALM,
    "Weekday afternoon calm hour",
    THERAPIST_TEMPLATE_ACTIVITIES["Weekday afternoon calm hour"],
    THERAPIST_ID,
  );
  const morning = master(
    "lib_morning_ready",
    "Morning ready routine",
    THERAPIST_TEMPLATE_ACTIVITIES["Morning ready routine"],
    THERAPIST_ID,
  );
  const movement = master(
    "lib_sensory_movement",
    "Sensory and movement break",
    THERAPIST_TEMPLATE_ACTIVITIES["Sensory and movement break"],
    THERAPIST_ID,
  );
  const homework = master(
    "lib_homework_winddown",
    "Homework wind-down",
    THERAPIST_TEMPLATE_ACTIVITIES["Homework wind-down"],
    THERAPIST_ID,
  );
  const fineMotor = master(
    "lib_fine_motor",
    "Fine motor practice",
    THERAPIST_TEMPLATE_ACTIVITIES["Fine motor practice"],
    THERAPIST_ID,
  );

  const alexCopy: LibraryPlan = {
    id: "lib_alex_calm",
    ownerId: THERAPIST_ID,
    name: calm.name,
    steps: cloneSteps(calm.steps),
    childId: CHILD_ALEX,
    sourceTemplateId: MASTER_CALM,
    updatedAt: new Date().toISOString(),
  };

  const parentEvening = master(
    "lib_sam_evening",
    "Evening wind-down",
    PARENT_EVENING_ACTIVITIES,
    PARENT_ID,
  );

  return {
    v: 2,
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
    libraryPlans: [calm, morning, movement, homework, fineMotor, alexCopy, parentEvening],
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
