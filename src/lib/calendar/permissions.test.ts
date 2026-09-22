import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canEditPlan, canInvite, inviteRolesFor, canMarkDone } from "./permissions.ts";
import { createSeedState } from "./seed.ts";

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
  it("keeps Alex membership private to therapist + parent (no Jordan bleed)", () => {
    const state = createSeedState();
    const alexMembers = state.memberships.filter((m) => m.childId === "child_alex");
    const jordanMembers = state.memberships.filter((m) => m.childId === "child_jordan");
    assert.ok(alexMembers.some((m) => m.personId === "person_sam"));
    assert.ok(!jordanMembers.some((m) => m.personId === "person_sam"));
    assert.ok(
      state.therapistTags.every((tag) => tag.therapistId === "person_maya"),
      "tags are therapist-desk only in seed",
    );
  });
});
