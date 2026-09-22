import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { en } from "./en.ts";
import { es } from "./es.ts";
import { detectLocale, resolveLocale } from "./locales.ts";
import { messageKeys, translate } from "./translate.ts";

describe("translate", () => {
  it("falls back to English when a Spanish string is missing", () => {
    assert.equal(translate("es", "help.title"), "Ayuda");
    assert.equal(translate("es", "not.a.real.key"), "not.a.real.key");
    assert.equal(translate("en", "help.disclaimer").includes("Synlumae"), true);
    assert.equal(translate("en", "help.disclaimer").includes("NeuroHelper"), false);
  });

  it("interpolates values", () => {
    assert.equal(
      translate("en", "help.callEmergency", { number: "112" }),
      "Call emergency services (112)",
    );
    assert.equal(translate("es", "profile.years", { age: 4 }), "4 años");
  });

  it("keeps Spanish (Spain) keys aligned with English", () => {
    assert.deepEqual(messageKeys(es).sort(), messageKeys(en).sort());
  });
});

describe("resolveLocale", () => {
  it("prefers the profile, then local storage, then an es browser language", () => {
    assert.equal(resolveLocale({ profileLocale: "es", stored: "en", browser: "en-US" }), "es");
    assert.equal(resolveLocale({ profileLocale: null, stored: "es", browser: "en-GB" }), "es");
    assert.equal(resolveLocale({ browser: "es-ES" }), "es");
    assert.equal(resolveLocale({ browser: "es-MX" }), "es");
    assert.equal(detectLocale("nl-NL"), "en");
    assert.equal(resolveLocale({ browser: "en-US" }), "en");
  });
});
