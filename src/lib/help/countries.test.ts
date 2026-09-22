import assert from "node:assert/strict";
import { describe, it } from "node:test";

import rawPacks from "./country-resources.json" with { type: "json" };

import { COUNTRIES, getCountry, REQUIRED_COUNTRY_CODES, sortedCountries } from "./countries.ts";
import { detectCountry, resolveHelpCountry } from "./detect-country.ts";
import { safeHttpsUrl, telHref } from "./links.ts";

type Pack = {
  countryCode: string;
  emergencyDial: string;
  confidence: string;
  crisisLines: { phone: string; sourceUrl: string }[];
  caregiverOrgs: { sourceUrl: string }[];
};

const packs = rawPacks as Pack[];

describe("country help directory", () => {
  it("loads every research pack exactly once", () => {
    const codes = COUNTRIES.map((country) => country.code);
    assert.deepEqual(
      codes,
      packs.map((pack) => pack.countryCode),
    );
    assert.deepEqual([...codes].sort(), [...REQUIRED_COUNTRY_CODES].sort());
    assert.equal(new Set(codes).size, codes.length);
    assert.equal(codes.length, 21);
    assert.deepEqual([...codes].sort(), [
      "AR",
      "BE",
      "BR",
      "CA",
      "CL",
      "CO",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GB",
      "IE",
      "IT",
      "NL",
      "NO",
      "PE",
      "PL",
      "PT",
      "SE",
      "US",
    ]);
    for (const dropped of ["AT", "BG", "CH", "CY", "CZ", "EE", "GR", "HR", "HU", "IS", "LU"]) {
      assert.equal(getCountry(dropped), undefined, dropped);
    }
  });

  it("keeps the research confidence split", () => {
    const count = (confidence: string) =>
      COUNTRIES.filter((country) => country.confidence === confidence).length;
    assert.equal(count("high"), 18);
    assert.equal(count("medium"), 3);
    assert.equal(count("needs_review"), 0);
    assert.deepEqual(
      COUNTRIES.filter((country) => country.confidence === "medium")
        .map((country) => country.code)
        .sort(),
      ["CL", "PE", "SE"],
    );
  });

  it("fills the Netherlands from the research pack", () => {
    const nl = getCountry("NL");
    assert.ok(nl);
    assert.equal(nl.confidence, "high");
    assert.equal(nl.needsReview, false);
    assert.equal(nl.emergencyNumber, "112");
    assert.deepEqual(
      nl.crisisLines.map((line) => line.phone),
      ["113", "088 0767 000"],
    );
    assert.ok(nl.caregiverSupport.some((line) => line.name.includes("Mantelzorg")));
    assert.ok(nl.caregiverSupport.some((line) => line.name.includes("Balans")));
    assert.equal(nl.nameEs, "Países Bajos");
    assert.equal(
      nl.crisisLines.some((line) => line.phone.includes("0800-2000")),
      false,
    );
  });

  it("ships only phones that the research file already sourced", () => {
    for (const country of COUNTRIES) {
      const pack = packs.find((entry) => entry.countryCode === country.code);
      assert.ok(pack, country.code);
      assert.equal(country.disclaimerKey, "help.disclaimer");
      assert.equal(country.needsReview, pack.confidence === "needs_review");
      assert.ok(country.nameEs, country.code);
      assert.equal(country.emergencyNumber, pack.emergencyDial);

      if (country.needsReview) {
        assert.deepEqual(country.crisisLines, [], country.code);
      }

      assert.deepEqual(
        country.crisisLines.map((line) => line.phone),
        pack.crisisLines.map((line) => line.phone),
        country.code,
      );

      for (const line of country.crisisLines) {
        assert.ok(line.phone);
        assert.ok(safeHttpsUrl(line.source), `${country.code} ${line.name}`);
        assert.ok(telHref(line.phone), `${country.code} ${line.phone}`);
        assert.ok(line.descriptionEn);
      }
      for (const line of country.caregiverSupport) {
        assert.equal(line.phone, undefined, `${country.code} ${line.name}`);
        assert.ok(safeHttpsUrl(line.source), `${country.code} ${line.name}`);
        if (line.url) assert.ok(safeHttpsUrl(line.url), `${country.code} ${line.name} url`);
        assert.ok(line.descriptionEn);
      }
      for (const source of country.sources) {
        assert.ok(safeHttpsUrl(source.url), source.url);
      }
    }
  });

  it("keeps emergency dials from the pack, including split-system primaries", () => {
    for (const code of ["BE", "DE", "FR", "ES", "IT", "PT", "SE", "DK", "FI", "PL", "IE"]) {
      assert.equal(getCountry(code)?.emergencyNumber, "112", code);
    }
    assert.equal(getCountry("NO")?.emergencyNumber, "112");
    assert.equal(getCountry("GB")?.emergencyNumber, "999");
    assert.equal(getCountry("US")?.emergencyNumber, "911");
    assert.equal(getCountry("CL")?.emergencyNumber, "131");
    assert.equal(getCountry("BR")?.emergencyNumber, "192");
    assert.equal(getCountry("PE")?.emergencyNumber, "105");
    assert.equal(telHref("*4141"), "tel:*4141");
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
    assert.equal(detectCountry("en", "Europe/Vienna"), "NL");
    assert.equal(resolveHelpCountry({ stored: "BG", browserLocale: "en-US" }), "US");
  });
});
