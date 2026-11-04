import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyShareAction } from "../share/mutate.ts";
import { blankAccountState } from "../share/workspace.ts";
import { customPlanStep, customStepDetail, normalizePlanStep } from "./activity-steps.ts";

describe("custom calendar steps", () => {
  it("keeps the activity detail on the step and out of the catalog", () => {
    const step = customPlanStep({
      title: "Slow bubble turn-taking",
      description: "Blow one bubble, then wait.",
      minutes: 10,
      skill: "Social Skills",
      minAge: 1,
      maxAge: 4,
      materials: ["Bubble mix", "Wand"],
      howTo: ["Blow one bubble.", "Wait for a look."],
    });
    assert.equal(step.activityId, null);
    assert.equal(step.skill, "Social Skills");
    assert.deepEqual(step.howTo, ["Blow one bubble.", "Wait for a look."]);
    const stored = normalizePlanStep(step);
    assert.equal(stored.minAge, 1);
    assert.deepEqual(stored.materials, ["Bubble mix", "Wand"]);
    assert.deepEqual(customStepDetail({ minAge: 8, maxAge: 2, skill: "Nope" }), {});
  });

  it("keeps custom detail when a shared plan is saved", () => {
    const actor = {
      userId: "user_therapist1",
      email: "maya@example.com",
      name: "Maya",
      isPro: true,
    };
    const step = customPlanStep({
      title: "Snack pause",
      description: "Sit together for a quiet bite.",
      minutes: 8,
      skill: "Self-Care",
      minAge: 2,
      maxAge: 4,
      materials: ["Apple slices"],
      howTo: ["Offer one slice.", "Wait."],
    });
    let state = blankAccountState(actor);
    state = applyShareAction(state, actor, {
      type: "addChild",
      childId: "child_noah0001",
      membershipId: "mem_therap03",
      displayName: "Noah",
      ageBand: "3-5",
      ageMonths: 42,
      tagIds: [],
      now: "2026-11-04T12:00:00.000Z",
    }).state;
    state = applyShareAction(state, actor, {
      type: "addDayStep",
      childId: "child_noah0001",
      date: "2026-11-04",
      dayId: "day_noahsnack1",
      stepId: "st_snackpause1",
      step,
      now: "2026-11-04T12:00:00.000Z",
    }).state;
    const saved = state.dayPlans[0]?.steps[0];
    assert.equal(saved?.activityId, null);
    assert.equal(saved?.title, "Snack pause");
    assert.deepEqual(saved?.howTo, ["Offer one slice.", "Wait."]);
    assert.equal(saved?.skill, "Self-Care");
    assert.equal(
      state.libraryPlans.some((plan) => plan.name === "Snack pause"),
      false,
    );
  });
});
