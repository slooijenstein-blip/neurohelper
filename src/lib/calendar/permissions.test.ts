import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ACTIVITIES } from "../activities-data.ts";
import { canEditPlan, canInvite, inviteRolesFor, canMarkDone } from "./permissions.ts";
import { createSeedState, withDemoFamily } from "./seed.ts";

describe("calendar permissions", () => {
  it("maps therapist / caregiver / helper capabilities", () => {
    assert.equal(canEditPlan("therapist"), true);
    assert.equal(canEditPlan("caregiver"), true);
    assert.equal(canEditPlan("helper"), false);
    assert.equal(canMarkDone("helper"), true);
    assert.deepEqual(inviteRolesFor("therapist"), ["caregiver"]);
    assert.deepEqual(inviteRolesFor("caregiver"), ["helper"]);
    assert.deepEqual(inviteRolesFor("helper"), []);
    assert.equal(canInvite("helper"), false);
  });
});

describe("calendar seed", () => {
  it("links parent and grandparent to Alex, and keeps Jordan with the therapist", () => {
    const state = createSeedState();
    const alexMembers = state.memberships.filter((m) => m.childId === "child_alex");
    const jordanMembers = state.memberships.filter((m) => m.childId === "child_jordan");
    assert.ok(alexMembers.some((m) => m.personId === "person_sam" && m.role === "caregiver"));
    assert.ok(alexMembers.some((m) => m.personId === "person_grandma" && m.role === "helper"));
    assert.ok(!jordanMembers.some((m) => m.personId === "person_sam"));
    assert.ok(!jordanMembers.some((m) => m.personId === "person_grandma"));
    assert.equal(
      state.memberships.filter((m) => m.personId === "person_maya" && m.role === "therapist")
        .length,
      2,
    );
    assert.ok(
      state.therapistTags.every((tag) => tag.therapistId === "person_maya"),
      "tags are therapist-desk only in seed",
    );
  });

  it("seeds therapist templates from real catalog activities only", () => {
    const state = createSeedState();
    const masters = state.libraryPlans.filter(
      (plan) => plan.ownerId === "person_maya" && plan.childId === null,
    );
    assert.equal(masters.length, 5);
    const ids = new Set(ACTIVITIES.map((activity) => activity.id));
    for (const plan of state.libraryPlans) {
      assert.ok(plan.steps.length > 0, plan.name);
      for (const step of plan.steps) {
        assert.ok(step.activityId && ids.has(step.activityId), `${plan.name}: ${step.title}`);
        assert.equal(step.title, ACTIVITIES.find((a) => a.id === step.activityId)?.title);
      }
    }
    const today = state.dayPlans.find((plan) => plan.childId === "child_alex");
    assert.ok(today);
    assert.ok(today.steps.every((step) => step.activityId && ids.has(step.activityId)));
  });

  it("keeps Alex’s check-offs when the demo family is already on this device", () => {
    const state = createSeedState();
    const today = state.dayPlans.find((plan) => plan.childId === "child_alex");
    assert.ok(today);
    today.steps[0]!.done = true;
    const kept = withDemoFamily(state);
    assert.equal(kept, state);
    assert.equal(kept.dayPlans.find((plan) => plan.id === "day_alex_today")?.steps[0]?.done, true);

    const missingGrandparent = {
      ...createSeedState(),
      memberships: createSeedState().memberships.filter(
        (membership) => membership.personId !== "person_grandma",
      ),
    };
    const marked = missingGrandparent.dayPlans.find((plan) => plan.id === "day_alex_today");
    assert.ok(marked);
    marked.steps[1]!.done = true;
    const repaired = withDemoFamily(missingGrandparent);
    assert.equal(
      repaired.dayPlans.find((plan) => plan.id === "day_alex_today")?.steps[1]?.done,
      true,
    );
    assert.ok(
      repaired.memberships.some(
        (membership) =>
          membership.personId === "person_grandma" && membership.childId === "child_alex",
      ),
    );
    assert.equal(
      repaired.memberships.some(
        (membership) =>
          membership.childId === "child_jordan" && membership.personId === "person_sam",
      ),
      false,
    );
  });
});
