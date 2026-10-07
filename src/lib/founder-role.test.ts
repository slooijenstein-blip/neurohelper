import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Profile } from "./app-store";
import {
  canUseFounderRole,
  FOUNDER_EMAIL,
  founderEmailsFromClerk,
  restrictFounderRole,
  roleChoiceForEmails,
  rolesVisibleToEmails,
} from "./founder-role.ts";

const FOUNDER = "s.looijenstein@synlumae.com";

function profile(role: Profile["role"]): Profile {
  return {
    id: "me",
    name: "Sam",
    role,
    location: "",
    bio: "",
    socials: {},
    color: "bg-primary",
  };
}

describe("canUseFounderRole", () => {
  it("allows only the Synlumae address, case-insensitively", () => {
    assert.equal(FOUNDER_EMAIL, FOUNDER);
    assert.equal(canUseFounderRole([FOUNDER]), true);
    assert.equal(canUseFounderRole(["  S.Looijenstein@Synlumae.COM  "]), true);
    assert.equal(canUseFounderRole([null, undefined, "", FOUNDER]), true);
  });

  it("accepts the address anywhere in the Clerk email list", () => {
    assert.equal(canUseFounderRole(["parent@example.com", "S.LOOIJENSTEIN@synlumae.com"]), true);
    assert.equal(
      canUseFounderRole(
        founderEmailsFromClerk({
          primaryEmailAddress: { emailAddress: "other@example.com" },
          emailAddresses: [
            { emailAddress: "other@example.com" },
            { emailAddress: "s.looijenstein@synlumae.com" },
          ],
        }),
      ),
      true,
    );
  });

  it("rejects every other address", () => {
    for (const email of [
      "samlooijenstein@gmail.com",
      "s.looijenstein@gmail.com",
      "s.looijenstein@synlumae.co",
      "s.looijenstein@synlumae.com.evil",
      "xs.looijenstein@synlumae.com",
      "s.looijenstein+tag@synlumae.com",
      "not-an-email",
      "",
    ]) {
      assert.equal(canUseFounderRole([email]), false, email);
    }
    assert.equal(canUseFounderRole([]), false);
    assert.equal(canUseFounderRole(null), false);
    assert.equal(canUseFounderRole(undefined), false);
    assert.equal(canUseFounderRole(founderEmailsFromClerk(null)), false);
  });
});

const CATALOG = [
  "Parent",
  "Legal Guardian",
  "Teacher",
  "Therapist",
  "Creator",
  "Grandparent",
  "Family Member",
  "Caregiver",
  "Other",
  "Founder",
] as const;

describe("rolesVisibleToEmails", () => {
  it("hides Founder from everyone except the allowlisted account", () => {
    const others = rolesVisibleToEmails(["parent@example.com"], CATALOG);
    assert.deepEqual(
      others,
      CATALOG.filter((role) => role !== "Founder"),
    );
    assert.equal(rolesVisibleToEmails([], CATALOG).includes("Founder"), false);
    assert.equal(rolesVisibleToEmails(null, CATALOG).includes("Founder"), false);
    assert.equal(rolesVisibleToEmails(undefined, CATALOG).includes("Founder"), false);

    const founder = rolesVisibleToEmails(["s.looijenstein@synlumae.com"], CATALOG);
    assert.deepEqual(founder, [...CATALOG]);
    assert.equal(rolesVisibleToEmails(["parent@example.com"], CATALOG).includes("Founder"), false);
  });
});

describe("roleChoiceForEmails", () => {
  it("does not overwrite a role the Founder account already chose", () => {
    assert.equal(roleChoiceForEmails("Parent", [FOUNDER]), "Parent");
    assert.equal(roleChoiceForEmails("Therapist", [FOUNDER]), "Therapist");
    assert.equal(roleChoiceForEmails("Founder", [FOUNDER]), "Founder");
    assert.equal(roleChoiceForEmails("Caregiver", [FOUNDER], "Parent"), "Caregiver");
  });

  it("refuses Founder for any other email and keeps their existing role", () => {
    assert.equal(roleChoiceForEmails("Founder", ["parent@example.com"], "Teacher"), "Teacher");
    assert.equal(roleChoiceForEmails("Therapist", ["parent@example.com"]), "Therapist");
    assert.equal(roleChoiceForEmails("Founder", [], "Founder"), "Parent");
    assert.equal(roleChoiceForEmails("Founder", undefined, "Grandparent"), "Grandparent");
    assert.equal(roleChoiceForEmails("Founder", null), "Founder");
  });
});

describe("restrictFounderRole", () => {
  it("leaves the Founder account's chosen tag in place", () => {
    const chosen = profile("Therapist");
    assert.equal(restrictFounderRole(chosen, [FOUNDER]), chosen);
    const founder = profile("Founder");
    assert.equal(restrictFounderRole(founder, [FOUNDER]), founder);
  });

  it("strips Founder from any other signed-in account", () => {
    const stored = profile("Founder");
    const next = restrictFounderRole(stored, ["parent@example.com"]);
    assert.equal(next.role, "Parent");
    assert.notEqual(next, stored);
    assert.equal(
      restrictFounderRole(profile("Caregiver"), ["parent@example.com"]).role,
      "Caregiver",
    );
  });
});
