import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DayPlan, ScheduleItem, Template } from "./app-store.ts";
import {
  addRoutineToMyCalendar,
  isOnMyCalendar,
  removeRoutineFromMyCalendar,
  sharedTemplateId,
} from "./my-calendar.ts";

const calm = {
  templateId: sharedTemplateId("lib_alex_calm"),
  name: "Weekday afternoon calm hour",
  items: [
    {
      activityId: "calming-glitter-bottle",
      title: "Calming Glitter Bottle",
      description: "Watch the glitter settle.",
      minutes: 10,
    },
  ],
};

function slice() {
  return {
    schedule: [] as ScheduleItem[],
    templates: [] as Template[],
    dayPlans: [] as DayPlan[],
    profile: { id: "me" },
  };
}

describe("my calendar", () => {
  it("adds a therapist-shared routine for one person and leaves another person's calendar clear", () => {
    let ids = 0;
    const next = addRoutineToMyCalendar(slice(), calm, "2026-09-30", "2026-09-30", "parent", () =>
      String(++ids),
    );
    assert.equal(isOnMyCalendar(next.dayPlans, calm.templateId, "2026-09-30", "parent"), true);
    assert.equal(
      isOnMyCalendar(next.dayPlans, calm.templateId, "2026-09-30", "grandparent"),
      false,
    );
    assert.equal(next.schedule.length, 1);
    assert.equal(next.schedule[0]?.title, "Calming Glitter Bottle");
    assert.equal(next.schedule[0]?.fromTemplateId, calm.templateId);
    assert.equal(next.templates[0]?.isPublic, false);

    const again = addRoutineToMyCalendar(next, calm, "2026-09-30", "2026-09-30", "parent", () =>
      String(++ids),
    );
    assert.equal(again.dayPlans.length, 1);
    assert.equal(again.schedule.length, 1);
  });

  it("removes only that person's copy and keeps their other activities", () => {
    let ids = 0;
    const own: ScheduleItem = {
      id: "own",
      activityId: "yoga-poses",
      title: "Yoga Poses",
      description: "Mine",
      time: "09:00",
      minutes: 10,
      done: false,
      viewerKey: "parent",
    };
    const added = addRoutineToMyCalendar(
      { ...slice(), schedule: [own] },
      calm,
      "2026-09-30",
      "2026-09-30",
      "parent",
      () => String(++ids),
    );
    const removed = removeRoutineFromMyCalendar(
      added,
      calm.templateId,
      "2026-09-30",
      "2026-09-30",
      "parent",
    );
    assert.equal(isOnMyCalendar(removed.dayPlans, calm.templateId, "2026-09-30", "parent"), false);
    assert.deepEqual(
      removed.schedule.map((item) => item.title),
      ["Yoga Poses"],
    );
    assert.equal(removed.templates.length, 1);
  });

  it("keeps today's list unchanged when the routine is placed on another day", () => {
    let ids = 0;
    const next = addRoutineToMyCalendar(slice(), calm, "2026-10-02", "2026-09-30", "parent", () =>
      String(++ids),
    );
    assert.equal(next.schedule.length, 0);
    assert.equal(next.dayPlans[0]?.date, "2026-10-02");
  });
});
