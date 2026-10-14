import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSeedState } from "../calendar/seed.ts";
import { applyShareAction } from "./mutate.ts";
import { ShareError } from "./errors.ts";
import { blankAccountState } from "./workspace.ts";

const therapist = {
  userId: "user_therapist1",
  email: "maya@example.com",
  name: "Maya",
  isPro: true,
};

const now = "2026-10-14T12:00:00.000Z";

const step = (id: string, activityId: string, title: string) => ({
  id,
  title,
  notes: "",
  minutes: 10,
  activityId,
  description: title,
});

describe("therapist edits", () => {
  it("updates a patient, keeps a check-off when a plan changes, and removes the shared child", () => {
    let state = blankAccountState(therapist);
    state = applyShareAction(state, therapist, {
      type: "addChild",
      childId: "child_noah0001",
      membershipId: "mem_therap03",
      displayName: "Noah",
      ageBand: "3-5",
      ageMonths: 42,
      tagIds: [],
      now,
    }).state;
    state = applyShareAction(state, therapist, {
      type: "createLibraryPlan",
      plan: {
        id: "lib_calm00001",
        ownerId: therapist.userId,
        name: "Calm hour",
        childId: "child_noah0001",
        sourceTemplateId: null,
        updatedAt: now,
        steps: [
          step("st_glitter01", "calming-glitter-bottle", "Glitter"),
          step("st_story0001", "story-time-props", "Story"),
        ],
      },
    }).state;
    state = applyShareAction(state, therapist, {
      type: "applyLibraryPlan",
      libraryPlanId: "lib_calm00001",
      childId: "child_noah0001",
      days: [
        {
          date: "2026-10-14",
          dayId: "day_today001",
          stepIds: ["ds_glitter01", "ds_story0001"],
        },
      ],
      now,
    }).state;
    state = applyShareAction(state, therapist, {
      type: "toggleStepDone",
      childId: "child_noah0001",
      date: "2026-10-14",
      stepId: "ds_glitter01",
      now,
    }).state;

    state = applyShareAction(state, therapist, {
      type: "updateLibraryPlan",
      id: "lib_calm00001",
      name: "Afternoon calm",
      steps: [step("st_glitter01", "calming-glitter-bottle", "Glitter bottle")],
      now,
    }).state;
    const day = state.dayPlans.find((plan) => plan.childId === "child_noah0001");
    assert.equal(day?.name, "Afternoon calm");
    assert.equal(day?.steps.length, 1);
    assert.equal(day?.steps[0]?.done, true);
    assert.equal(day?.steps[0]?.activityId, "calming-glitter-bottle");

    state = applyShareAction(state, therapist, {
      type: "updateChild",
      childId: "child_noah0001",
      displayName: "Noa",
      ageBand: "6-8",
      ageMonths: 78,
      birthDate: "2019-04-02",
      tagIds: [],
      now,
    }).state;
    assert.equal(state.children[0]?.displayName, "Noa");
    assert.equal(state.children[0]?.birthDate, "2019-04-02");
    assert.equal(state.people.length, 1);

    state = applyShareAction(state, therapist, {
      type: "removeDayPlan",
      childId: "child_noah0001",
      date: "2026-10-14",
      now,
    }).state;
    assert.equal(state.dayPlans.length, 0);
    assert.equal(state.children.length, 1);

    state = applyShareAction(state, therapist, {
      type: "removeChild",
      childId: "child_noah0001",
      now,
    }).state;
    assert.equal(state.children.length, 0);
    assert.equal(state.memberships.length, 0);
    assert.equal(state.dayPlans.length, 0);
    assert.equal(state.people[0]?.email, "maya@example.com");
  });

  it("lets a parent remove a helper, then the helper cannot see or check that child", () => {
    const parent = {
      userId: "person_sam",
      email: "sam@example.com",
      name: "Demo Parent",
      isPro: false,
    };
    const helper = {
      userId: "person_grandma",
      email: "grandma@example.com",
      name: "Demo Grandparent",
      isPro: false,
    };
    const seed = createSeedState();
    const stepId = seed.dayPlans.find((plan) => plan.id === "day_alex_today")?.steps[0]?.id;
    assert.ok(stepId);
    const removed = applyShareAction(seed, parent, {
      type: "removeMember",
      membershipId: "mem_grandma_alex",
    });
    assert.equal(
      removed.state.memberships.some((item) => item.personId === "person_grandma"),
      false,
    );
    assert.ok(removed.state.people.some((person) => person.id === "person_grandma"));
    assert.throws(
      () =>
        applyShareAction(removed.state, helper, {
          type: "toggleStepDone",
          childId: "child_alex",
          date: seed.dayPlans.find((plan) => plan.id === "day_alex_today")!.date,
          stepId,
          now,
        }),
      (error: unknown) => error instanceof ShareError && error.status === 403,
    );
    assert.throws(
      () =>
        applyShareAction(seed, parent, {
          type: "removeMember",
          membershipId: "mem_maya_alex",
        }),
      (error: unknown) => error instanceof ShareError && error.status === 403,
    );
  });
});
