import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { answerHelper, detectTopics, isCrisisQuestion, parseAskedAge } from "./helper.ts";

describe("helper", () => {
  it("reads an age and a topic in English and Spanish", () => {
    assert.equal(parseAskedAge("speech activity for a 3 year old"), 3);
    assert.equal(parseAskedAge("actividad de habla para 3 años"), 3);
    assert.equal(parseAskedAge("3 años y medio"), 3.5);
    assert.deepEqual(detectTopics("my child is overwhelmed and screaming"), ["meltdown"]);
    assert.ok(detectTopics("hora de dormir y rutinas").includes("bedtime"));
    assert.equal(isCrisisQuestion("he is not breathing"), true);
    assert.equal(isCrisisQuestion("my child is screaming"), false);
  });

  it("matches Synlumae activities and help guides without calling out", () => {
    const speech = answerHelper({
      text: "speech activity for a 3 year old",
      locale: "en",
      countryCode: "NL",
    });
    assert.equal(speech.crisis, false);
    assert.equal(speech.matched, true);
    assert.ok(speech.activities.every((item) => item.minAge <= 3 && item.maxAge >= 3));
    assert.ok(speech.activities.some((item) => item.id === "copycat-words"));
    assert.equal(speech.emergencyNumber, undefined);

    const scream = answerHelper({
      text: "my child is overwhelmed and screaming",
      locale: "en",
      countryCode: "NL",
    });
    assert.equal(scream.guides[0]?.id, "child-during-overwhelm-safety");
    assert.ok(scream.activities.some((item) => item.id === "calming-glitter-bottle"));

    const bedtime = answerHelper({
      text: "bedtime is hard",
      locale: "en",
      countryCode: "ES",
    });
    assert.ok(bedtime.activities.some((item) => item.id === "story-time-props"));

    const spanish = answerHelper({
      text: "mi hijo está gritando y desbordado",
      locale: "es",
      countryCode: "ES",
    });
    assert.equal(spanish.countryName, "España");
    assert.equal(spanish.guides[0]?.title, "Durante el desborde: primero la seguridad");
    assert.equal(spanish.activities[0]?.title, "Botella de purpurina para calmarse");

    const none = answerHelper({
      text: "quantum origami tax forms",
      locale: "en",
      countryCode: "NL",
    });
    assert.equal(none.matched, false);
    assert.equal(none.activities.length, 0);
    assert.equal(none.guides.length, 0);
  });

  it("puts the country emergency number first for safety wording", () => {
    const danger = answerHelper({
      text: "he is not breathing",
      locale: "en",
      countryCode: "NL",
    });
    assert.equal(danger.crisis, true);
    assert.equal(danger.emergencyNumber, "112");
    assert.equal(danger.countryName, "Netherlands");

    const spain = answerHelper({
      text: "quiero morir",
      locale: "es",
      countryCode: "ES",
    });
    assert.equal(spain.crisis, true);
    assert.equal(spain.emergencyNumber, "112");
  });
});
