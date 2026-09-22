import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { COUNTRIES, getCountry, REQUIRED_COUNTRY_CODES, sortedCountries } from "./countries.ts";
import { detectCountry, resolveHelpCountry } from "./detect-country.ts";
import { safeHttpsUrl, telHref } from "./links.ts";

describe("country help directory", () => {
  it("includes every requested country exactly once", () => {
    const codes = COUNTRIES.map((country) => country.code);
    assert.deepEqual([...codes].sort(), [...REQUIRED_COUNTRY_CODES].sort());
    assert.equal(new Set(codes).size, codes.length);
  });

  it("fills the Netherlands with cited emergency, crisis, and caregiver lines", () => {
    const nl = getCountry("NL");
    assert.ok(nl);
    assert.equal(nl.needsReview, false);
    assert.equal(nl.emergencyNumber, "112");
    assert.ok(nl.crisisLines.some((line) => line.phone === "113"));
    assert.ok(nl.crisisLines.some((line) => line.phone === "0800-2000"));
    assert.ok(nl.caregiverSupport.some((line) => line.name.includes("Mantelzorg")));
    assert.ok(nl.sources.length >= 8);
    assert.equal(nl.nameEs, "Países Bajos");
  });

  it("only keeps phone numbers that have an https source", () => {
    for (const country of COUNTRIES) {
      assert.equal(country.disclaimerKey, "help.disclaimer");
      if (country.needsReview) {
        assert.ok(country.reviewNoteEn && country.reviewNoteEs, country.code);
      }
      if (country.emergencyNumber) {
        assert.ok(
          country.emergencyServices.some((service) => service.number === country.emergencyNumber),
          country.code,
        );
      }
      for (const service of country.emergencyServices) {
        assert.ok(telHref(service.number), `${country.code} ${service.number}`);
        assert.ok(safeHttpsUrl(service.source), `${country.code} emergency source`);
      }
      for (const line of [...country.crisisLines, ...country.caregiverSupport]) {
        assert.ok(safeHttpsUrl(line.source), `${country.code} ${line.name}`);
        if (line.url) assert.ok(safeHttpsUrl(line.url), `${country.code} ${line.name} url`);
        if (line.phone) assert.ok(telHref(line.phone), `${country.code} ${line.phone}`);
        assert.ok(line.descriptionEn && line.descriptionEs);
      }
      for (const source of country.sources) {
        assert.ok(safeHttpsUrl(source.url), source.url);
      }
      if (country.emergencyServices.length === 0) {
        assert.equal(country.needsReview, true, country.code);
      }
    }
  });

  it("uses 112 for EU members and does not invent a single number for Norway", () => {
    for (const code of ["BE", "DE", "FR", "ES", "IT", "PT", "AT", "SE", "DK", "FI", "PL"]) {
      assert.equal(getCountry(code)?.emergencyNumber, "112", code);
    }
    const norway = getCountry("NO");
    assert.equal(norway?.emergencyNumber, undefined);
    assert.deepEqual(norway?.emergencyServices.map((service) => service.number).sort(), [
      "110",
      "112",
      "113",
    ]);
  });

  it("pins the Netherlands first in the picker", () => {
    assert.equal(sortedCountries("es")[0]?.code, "NL");
    assert.equal(sortedCountries("en")[1]?.code !== "NL", true);
  });
});

describe("detectCountry", () => {
  it("prefers a saved choice, then locale region, then time zone", () => {
    assert.equal(
      resolveHelpCountry({
        profileCountry: "ES",
        stored: "US",
        browserLocale: "nl-NL",
        timeZone: "Europe/Amsterdam",
      }),
      "ES",
    );
    assert.equal(resolveHelpCountry({ stored: "gb", browserLocale: "en-US" }), "GB");
    assert.equal(detectCountry("en-GB", "America/New_York"), "GB");
    assert.equal(detectCountry("en", "Europe/Amsterdam"), "NL");
    assert.equal(detectCountry("es-MX", "America/Lima"), "PE");
    assert.equal(detectCountry("fr", "UTC"), "FR");
    assert.equal(detectCountry("en", "UTC"), "NL");
  });
});
