import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TranslationDeps } from "../community-translate.ts";
import { translateKnownText } from "../community-translate.ts";
import type { CatalogActivity } from "./catalog.ts";
import { localizeCreatorActivity } from "./localize.ts";

const bubble: CatalogActivity = {
  id: "cact_bubble",
  title: "Slow bubble turn-taking",
  description: "Blow one bubble, then wait.",
  minAge: 1,
  maxAge: 4,
  minMinutes: 10,
  maxMinutes: 10,
  skill: "Social Skills",
  materials: ["Bubble mix", "Wand"],
  steps: ["Blow one bubble.", "Wait for a look."],
  creatorName: "Alex Rivera",
  contentLanguage: "en",
};

const translator: TranslationDeps = {
  canTranslate: async () => true,
  translate: async (text, source, target) =>
    text
      .split("\n")
      .map((line) => `${line} [${source}-${target}]`)
      .join("\n"),
};

describe("creator activity language", () => {
  it("translates a known text with the on-device translator", async () => {
    const text = await translateKnownText("Wait.", "en", "es", translator);
    assert.equal(text, "Wait. [en-es]");
    assert.equal(await translateKnownText("Wait.", "es", "es", translator), "Wait.");
    assert.equal(await translateKnownText("Wait.", "en", "es", {}), null);
  });

  it("rewrites a creator activity into the profile language and leaves a match alone", async () => {
    const spanish = await localizeCreatorActivity(bubble, "es", translator);
    assert.equal(spanish?.title, "Slow bubble turn-taking [en-es]");
    assert.deepEqual(spanish?.materials, ["Bubble mix [en-es]", "Wand [en-es]"]);
    assert.equal(spanish?.steps[1], "Wait for a look. [en-es]");
    assert.equal(spanish?.translatedInto, "es");
    assert.equal(await localizeCreatorActivity(bubble, "en", translator), null);
  });

  it("detects an unmarked activity and keeps the original when translation is unavailable", async () => {
    const unmarked = { ...bubble, contentLanguage: "" as const };
    const detected = await localizeCreatorActivity(unmarked, "es", {
      ...translator,
      detect: async () => "en-US",
    });
    assert.equal(detected?.translatedInto, "es");
    assert.equal(
      await localizeCreatorActivity(bubble, "es", { canTranslate: async () => false }),
      null,
    );
  });
});
