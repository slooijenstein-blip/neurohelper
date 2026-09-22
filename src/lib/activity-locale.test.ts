import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { translate } from "../i18n/translate.ts";
import { ACTIVITIES } from "./activities-data.ts";
import { esActivityCopy } from "./activities-es.ts";
import { localizedActivity, presentPlanName, presentPlanStep } from "./activity-locale.ts";

describe("activity locale", () => {
  it("translates every catalog activity into Spanish and falls back to English", () => {
    for (const activity of ACTIVITIES) {
      const copy = esActivityCopy[activity.id];
      assert.ok(copy, `missing es copy for ${activity.id}`);
      assert.equal(copy.materials.length, activity.materials.length, activity.id);
      assert.equal(copy.steps.length, activity.steps.length, activity.id);
      const spanish = localizedActivity(activity, "es");
      assert.equal(spanish.title, copy.title);
      assert.notEqual(spanish.title, activity.title);
      assert.equal(localizedActivity(activity, "en").title, activity.title);
    }
  });

  it("shows catalog-linked steps and seeded plan names in the active locale", () => {
    const spanish = presentPlanStep(
      {
        activityId: "sensory-rice-bin",
        title: "Sensory Rice Bin",
        description: "English snapshot",
      },
      "es",
    );
    assert.equal(spanish.title, "Bandeja sensorial de arroz");
    assert.match(spanish.description, /arroz/i);
    assert.ok(spanish.activity && spanish.activity.materials.length > 0);

    const custom = presentPlanStep(
      { activityId: null, title: "Snack time", description: "Apple slices" },
      "es",
    );
    assert.equal(custom.title, "Snack time");
    assert.equal(custom.description, "Apple slices");

    const plan = { name: "Weekday afternoon calm hour", nameKey: "calendar.templates.calmHour" };
    assert.equal(
      presentPlanName(plan, (key) => translate("en", key)),
      "Weekday afternoon calm hour",
    );
    assert.equal(
      presentPlanName(plan, (key) => translate("es", key)),
      "Hora tranquila de la tarde",
    );
    assert.equal(
      presentPlanName({ name: "My custom plan" }, (key) => translate("es", key)),
      "My custom plan",
    );
  });
});
