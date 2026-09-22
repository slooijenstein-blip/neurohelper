import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Profile } from "./app-store";
import {
  applyCaregiverProfileEdits,
  clerkNameUpdateFromDisplayName,
  displayNameFromClerk,
  isLegacyDemoProfile,
  planClerkProfileSync,
  profileFromClerkUser,
  type ClerkNameSource,
} from "./clerk-profile.ts";

const DEMO_BIO =
  "Parent of a curious 4-year-old. Always looking for motor skill ideas that fit into our day.";

function clerkUser(overrides: Partial<ClerkNameSource> = {}): ClerkNameSource {
  return {
    id: "user_123",
    fullName: "Sam Looijenstein",
    firstName: "Sam",
    username: null,
    primaryEmailAddress: { emailAddress: "sam@example.com" },
    ...overrides,
  };
}

function localProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "me",
    clerkUserId: "user_123",
    name: "Sam",
    role: "Parent",
    location: "Amsterdam",
    bio: "Coffee and playgrounds.",
    socials: {},
    color: "bg-primary",
    ...overrides,
  };
}

describe("displayNameFromClerk", () => {
  it("prefers full name, then first name, then email local-part", () => {
    assert.equal(displayNameFromClerk(clerkUser()), "Sam Looijenstein");
    assert.equal(displayNameFromClerk(clerkUser({ fullName: "  ", firstName: "Sam" })), "Sam");
    assert.equal(
      displayNameFromClerk(clerkUser({ fullName: null, firstName: null, username: null })),
      "sam",
    );
  });
});

describe("isLegacyDemoProfile", () => {
  it("detects the old in-browser Sam demo only", () => {
    assert.equal(isLegacyDemoProfile(null), true);
    assert.equal(
      isLegacyDemoProfile({
        id: "me",
        name: "Sam",
        role: "Parent",
        location: "Amsterdam",
        bio: DEMO_BIO,
        socials: {},
        color: "bg-primary",
      }),
      true,
    );
    assert.equal(isLegacyDemoProfile(localProfile()), false);
    assert.equal(isLegacyDemoProfile(localProfile({ bio: "Edited on this phone" })), false);
  });
});

describe("profileFromClerkUser", () => {
  it("keeps local name, bio, role, and location for the same Clerk user", () => {
    const existing = localProfile({
      name: "Sam (edited)",
      role: "Caregiver",
      location: "Utrecht",
      bio: "Edited bio",
      locale: "es",
      helpCountry: "NL",
    });
    const next = profileFromClerkUser(clerkUser(), existing);
    assert.equal(next.name, "Sam (edited)");
    assert.equal(next.role, "Caregiver");
    assert.equal(next.location, "Utrecht");
    assert.equal(next.bio, "Edited bio");
    assert.equal(next.clerkUserId, "user_123");
    assert.equal(next.locale, "es");
    assert.equal(next.helpCountry, "NL");
    assert.equal("childName" in next, false);
    assert.equal("childAge" in next, false);
  });

  it("takes the Clerk name and empty extras when linking a new account over the demo", () => {
    const demo: Profile = {
      id: "me",
      name: "Sam",
      role: "Parent",
      location: "Amsterdam",
      bio: DEMO_BIO,
      socials: { instagram: "https://instagram.com/sam.parent" },
      color: "bg-primary",
    };
    const next = profileFromClerkUser(clerkUser(), demo);
    assert.equal(next.name, "Sam Looijenstein");
    assert.equal(next.role, "Parent");
    assert.equal(next.location, "");
    assert.equal(next.bio, "");
    assert.deepEqual(next.socials, {});
  });

  it("keeps a controlled Pro flag for the same Clerk user", () => {
    const next = profileFromClerkUser(
      clerkUser(),
      localProfile({ isPro: true, role: "Therapist" }),
    );
    assert.equal(next.isPro, true);
    assert.equal(next.role, "Therapist");
  });

  it("does not grant Pro to the legacy demo profile", () => {
    const next = profileFromClerkUser(clerkUser(), {
      id: "me",
      name: "Sam",
      role: "Parent",
      location: "Amsterdam",
      bio: DEMO_BIO,
      socials: {},
      color: "bg-primary",
      isPro: true,
    });
    assert.equal(next.isPro, undefined);
  });

  it("fills name from Clerk when the bound profile has a blank name", () => {
    const next = profileFromClerkUser(clerkUser(), localProfile({ name: "   " }));
    assert.equal(next.name, "Sam Looijenstein");
    assert.equal(next.bio, "Coffee and playgrounds.");
  });
});

describe("planClerkProfileSync", () => {
  it("skips once this Clerk user is already bound so reloads keep local edits", () => {
    assert.deepEqual(
      planClerkProfileSync({
        existing: localProfile(),
        clerkUserId: "user_123",
        loggedOut: false,
        devDemo: false,
      }),
      { action: "skip" },
    );
  });

  it("binds on first session, logout, demo, or a different Clerk user", () => {
    assert.equal(
      planClerkProfileSync({
        existing: null,
        clerkUserId: "user_123",
        loggedOut: true,
        devDemo: false,
      }).action,
      "bind",
    );
    assert.equal(
      planClerkProfileSync({
        existing: localProfile(),
        clerkUserId: "user_123",
        loggedOut: true,
        devDemo: false,
      }).action,
      "bind",
    );
    assert.equal(
      planClerkProfileSync({
        existing: localProfile(),
        clerkUserId: "user_123",
        loggedOut: false,
        devDemo: true,
      }).action,
      "bind",
    );
    assert.equal(
      planClerkProfileSync({
        existing: localProfile({ clerkUserId: "user_other" }),
        clerkUserId: "user_123",
        loggedOut: false,
        devDemo: false,
      }).action,
      "bind",
    );
  });
});

describe("applyCaregiverProfileEdits", () => {
  it("updates caregiver fields only and ignores blank names", () => {
    const next = applyCaregiverProfileEdits(localProfile(), {
      name: "  Maya  ",
      role: "Therapist",
      location: "  London ",
      bio: " OT notes ",
    });
    assert.equal(next.name, "Maya");
    assert.equal(next.role, "Therapist");
    assert.equal(next.location, "London");
    assert.equal(next.bio, "OT notes");
    assert.equal(next.clerkUserId, "user_123");

    const kept = applyCaregiverProfileEdits(localProfile({ name: "Sam" }), {
      name: "   ",
      role: "Parent",
      location: "",
      bio: "",
    });
    assert.equal(kept.name, "Sam");
    assert.equal(kept.location, "");
    assert.equal(kept.bio, "");
  });
});

describe("clerkNameUpdateFromDisplayName", () => {
  it("splits a display name into Clerk first/last and never carries child fields", () => {
    assert.deepEqual(clerkNameUpdateFromDisplayName("Sam Looijenstein"), {
      firstName: "Sam",
      lastName: "Looijenstein",
    });
    assert.deepEqual(clerkNameUpdateFromDisplayName("Sam"), {
      firstName: "Sam",
      lastName: "",
    });
    const payload = clerkNameUpdateFromDisplayName("Sam");
    assert.deepEqual(Object.keys(payload).sort(), ["firstName", "lastName"]);
  });
});
