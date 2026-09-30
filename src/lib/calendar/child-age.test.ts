import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyShareAction } from "../share/mutate.ts";
import { blankAccountState } from "../share/workspace.ts";
import { ShareError } from "../share/errors.ts";
import {
  bandForYears,
  childAgeDisplay,
  parseAgeYears,
  parseBirthDate,
  resolveTherapistAge,
  wholeYears,
} from "./child-age.ts";

const today = new Date(2026, 8, 30);

const therapist = {
  userId: "user_therapist1",
  email: "maya@example.com",
  name: "Maya",
  isPro: true,
};

describe("therapist patient age", () => {
  it("maps whole years onto the existing bands", () => {
    assert.equal(bandForYears(0), "1-2");
    assert.equal(bandForYears(2), "1-2");
    assert.equal(bandForYears(4), "3-5");
    assert.equal(bandForYears(6), "6-8");
    assert.equal(bandForYears(12), "9-12");
    assert.equal(bandForYears(14), "9-12");
  });

  it("accepts a whole age, a past date of birth, or both", () => {
    assert.equal(parseAgeYears("4"), 4);
    assert.equal(parseAgeYears("0"), 0);
    assert.equal(parseAgeYears(""), null);
    assert.equal(parseAgeYears("4.5"), null);
    assert.equal(parseAgeYears("26"), null);

    assert.equal(parseBirthDate("2022-03-01", today), "2022-03-01");
    assert.equal(parseBirthDate("2026-09-30", today), "2026-09-30");
    assert.equal(parseBirthDate("2026-10-01", today), null);
    assert.equal(parseBirthDate("2020-02-31", today), null);
    assert.equal(wholeYears("2020-10-01", today), 5);

    const yearsOnly = resolveTherapistAge({ ageYears: 4 }, today);
    assert.equal(yearsOnly?.ageBand, "3-5");
    assert.equal(yearsOnly?.ageYears, 4);
    assert.equal(yearsOnly?.birthDate, undefined);

    const dobOnly = resolveTherapistAge({ birthDate: "2020-01-15" }, today);
    assert.equal(dobOnly?.ageBand, "6-8");
    assert.equal(dobOnly?.ageYears, undefined);
    assert.equal(dobOnly?.birthDate, "2020-01-15");

    const both = resolveTherapistAge({ ageYears: 4, birthDate: "2022-03-01" }, today);
    assert.equal(both?.ageYears, 4);
    assert.equal(both?.birthDate, "2022-03-01");
    assert.equal(both?.ageBand, "3-5");

    assert.equal(resolveTherapistAge({}, today), null);
  });

  it("shows a band for demo patients and years or a birth date when those were saved", () => {
    assert.deepEqual(childAgeDisplay({ ageBand: "3-5" }, today), { kind: "band", band: "3-5" });
    assert.deepEqual(childAgeDisplay({ ageBand: "6-8" }, today), { kind: "band", band: "6-8" });
    assert.deepEqual(childAgeDisplay({ ageBand: "3-5", ageYears: 4 }, today), {
      kind: "exact",
      years: 4,
      born: null,
    });
    assert.deepEqual(childAgeDisplay({ ageBand: "6-8", birthDate: "2020-01-15" }, today), {
      kind: "exact",
      years: 6,
      born: "2020-01-15",
    });
  });

  it("persists age and date of birth and still accepts a band on its own", () => {
    const state = blankAccountState(therapist);
    const saved = applyShareAction(state, therapist, {
      type: "addChild",
      childId: "child_noah0001",
      membershipId: "mem_therap03",
      displayName: "Noah",
      ageBand: "3-5",
      ageYears: 4,
      birthDate: "2022-03-01",
      tagIds: [],
      now: "2026-09-30T12:00:00.000Z",
    });
    const noah = saved.state.children.find((child) => child.id === "child_noah0001");
    assert.equal(noah?.ageYears, 4);
    assert.equal(noah?.birthDate, "2022-03-01");
    assert.equal(noah?.ageBand, "3-5");

    const bandOnly = applyShareAction(state, therapist, {
      type: "addChild",
      childId: "child_alex0001",
      membershipId: "mem_therap01",
      displayName: "Alex",
      ageBand: "3-5",
      tagIds: [],
      now: "2026-09-30T12:00:00.000Z",
    });
    const alex = bandOnly.state.children[0];
    assert.equal(alex?.displayName, "Alex");
    assert.equal(alex?.ageBand, "3-5");
    assert.equal(alex?.ageYears, undefined);
    assert.equal(alex?.birthDate, undefined);

    assert.throws(
      () =>
        applyShareAction(state, therapist, {
          type: "addChild",
          childId: "child_bad00001",
          membershipId: "mem_therap04",
          displayName: "Bad",
          ageBand: "3-5",
          ageYears: 99,
          tagIds: [],
          now: "2026-09-30T12:00:00.000Z",
        }),
      (error: unknown) => error instanceof ShareError && error.status === 400,
    );
  });
});
