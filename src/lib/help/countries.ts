/**
 * Caregiver Help directory.
 * Phones come only from country-resources.json (Help Research, last checked 2026-09-22).
 * Do not add a number here. If a phone has no https sourceUrl, it is dropped.
 */

import rawPacks from "./country-resources.json" with { type: "json" };

import { NAME_ES } from "./country-names.ts";

export type CitedLink = {
  label: string;
  url: string;
};

export type EmergencyService = {
  number: string;
  labelEn: string;
  labelEs: string;
};

export type SupportResource = {
  name: string;
  /** English body from the research pack. Spanish UI labels stay translated; this text does not. */
  descriptionEn: string;
  phone?: string;
  url?: string;
  source: string;
};

export type Confidence = "high" | "medium" | "needs_review";

export type CountryHelp = {
  code: string;
  nameEn: string;
  nameEs: string;
  emergencyNumber?: string;
  emergencyServices: EmergencyService[];
  crisisLines: SupportResource[];
  caregiverSupport: SupportResource[];
  disclaimerKey: "help.disclaimer";
  sources: CitedLink[];
  confidence: Confidence;
  needsReview: boolean;
  uncertaintyNotes?: string;
  lastChecked: string;
};

type CrisisLine = {
  name: string;
  phone: string;
  notes: string;
  sourceUrl: string;
};

type CaregiverOrg = {
  name: string;
  url: string;
  focus: string;
  sourceUrl: string;
};

type CountryPack = {
  countryCode: string;
  countryName: string;
  emergencyDial: string;
  crisisLines: CrisisLine[];
  caregiverOrgs: CaregiverOrg[];
  confidence: Confidence;
  uncertaintyNotes: string;
  disclaimer: string;
  lastChecked: string;
};

export const FIND_A_HELPLINE_URL = "https://findahelpline.com/";

const packs = rawPacks as CountryPack[];

function httpsUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

function mapCrisis(line: CrisisLine): SupportResource | null {
  const source = httpsUrl(line.sourceUrl);
  const phone = line.phone.trim();
  if (!source || !phone) return null;
  return {
    name: line.name,
    descriptionEn: line.notes,
    phone,
    source,
  };
}

function mapOrg(org: CaregiverOrg): SupportResource | null {
  const source = httpsUrl(org.sourceUrl);
  if (!source) return null;
  const url = httpsUrl(org.url);
  return {
    name: org.name,
    descriptionEn: org.focus,
    source,
    ...(url ? { url } : {}),
  };
}

function mapPack(pack: CountryPack): CountryHelp {
  const nameEs = NAME_ES[pack.countryCode];
  if (!nameEs) {
    throw new Error(`Missing Spanish (Spain) name for ${pack.countryCode}`);
  }

  const dial = pack.emergencyDial.trim();
  const crisisLines = pack.crisisLines.flatMap((line) => {
    const mapped = mapCrisis(line);
    return mapped ? [mapped] : [];
  });
  const caregiverSupport = pack.caregiverOrgs.flatMap((org) => {
    const mapped = mapOrg(org);
    return mapped ? [mapped] : [];
  });

  const sources: CitedLink[] = [];
  const seen = new Set<string>();
  for (const line of [...crisisLines, ...caregiverSupport]) {
    if (seen.has(line.source)) continue;
    seen.add(line.source);
    sources.push({ label: line.name, url: line.source });
  }

  const notes = pack.uncertaintyNotes.trim();

  return {
    code: pack.countryCode,
    nameEn: pack.countryName,
    nameEs,
    ...(dial
      ? {
          emergencyNumber: dial,
          emergencyServices: [
            {
              number: dial,
              labelEn: "Emergency",
              labelEs: "Emergencia",
            },
          ],
        }
      : { emergencyServices: [] }),
    crisisLines,
    caregiverSupport,
    disclaimerKey: "help.disclaimer",
    sources,
    confidence: pack.confidence,
    needsReview: pack.confidence === "needs_review",
    ...(notes ? { uncertaintyNotes: notes } : {}),
    lastChecked: pack.lastChecked,
  };
}

export const COUNTRIES: CountryHelp[] = packs.map(mapPack);

export const REQUIRED_COUNTRY_CODES = COUNTRIES.map((country) => country.code);

export function getCountry(code: string | null | undefined): CountryHelp | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return COUNTRIES.find((country) => country.code === normalized);
}

export function countryName(country: CountryHelp, locale: "en" | "es"): string {
  return locale === "es" ? country.nameEs : country.nameEn;
}

export function sortedCountries(locale: "en" | "es"): CountryHelp[] {
  const rest = COUNTRIES.filter((country) => country.code !== "NL").sort((a, b) =>
    countryName(a, locale).localeCompare(countryName(b, locale), locale === "es" ? "es" : "en"),
  );
  const nl = getCountry("NL");
  return nl ? [nl, ...rest] : rest;
}

export function resourceDescription(resource: SupportResource): string {
  return resource.descriptionEn;
}

export function serviceLabel(service: EmergencyService, locale: "en" | "es"): string {
  return locale === "es" ? service.labelEs : service.labelEn;
}
