import { getCountry } from "./countries.ts";

/** Product home when locale and timezone do not match a listed country. */
export const DEFAULT_HELP_COUNTRY = "NL";

export const HELP_COUNTRY_STORAGE_KEY = "synlumae-help-country";

const TIMEZONE_COUNTRY: Record<string, string> = {
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Berlin": "DE",
  "Europe/Busingen": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Lisbon": "PT",
  "Atlantic/Azores": "PT",
  "Atlantic/Madeira": "PT",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL",
  "Europe/Dublin": "IE",
  "Europe/London": "GB",
  "Europe/Belfast": "GB",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/St_Johns": "CA",
  "America/Mexico_City": "MX",
  "America/Cancun": "MX",
  "America/Merida": "MX",
  "America/Monterrey": "MX",
  "America/Mazatlan": "MX",
  "America/Tijuana": "MX",
  "America/Chihuahua": "MX",
  "America/Hermosillo": "MX",
};

const LANGUAGE_COUNTRY: Record<string, string> = {
  nl: "NL",
  es: "ES",
  pt: "PT",
  fr: "FR",
  de: "DE",
  it: "IT",
  sv: "SE",
  da: "DK",
  fi: "FI",
  pl: "PL",
  nb: "NO",
  nn: "NO",
  no: "NO",
};

export function detectCountry(browserLocale?: string | null, timeZone?: string | null): string {
  const locale = (browserLocale ?? "").trim().replace("_", "-");
  const [language, regionRaw] = locale.split("-");
  const region = regionRaw?.toUpperCase();
  if (region === "UK" && getCountry("GB")) return "GB";
  if (region && getCountry(region)) return region;

  const fromZone = timeZone ? TIMEZONE_COUNTRY[timeZone] : undefined;
  if (fromZone && getCountry(fromZone)) return fromZone;

  const fromLanguage = language ? LANGUAGE_COUNTRY[language.toLowerCase()] : undefined;
  if (fromLanguage && getCountry(fromLanguage)) return fromLanguage;

  return DEFAULT_HELP_COUNTRY;
}

export function listedCountryCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return getCountry(normalized) ? normalized : null;
}

export function readStoredResidence(): string | null {
  try {
    return listedCountryCode(window.localStorage.getItem(HELP_COUNTRY_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredResidence(code: string | null) {
  try {
    if (!code) window.localStorage.removeItem(HELP_COUNTRY_STORAGE_KEY);
    else window.localStorage.setItem(HELP_COUNTRY_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

/** Profile country, then the copy saved on this device, then browser detection. */
export function resolveHelpCountry(input: {
  profileCountry?: string | null;
  stored?: string | null;
  browserLocale?: string | null;
  timeZone?: string | null;
}): string {
  const profile = listedCountryCode(input.profileCountry);
  if (profile) return profile;
  const stored = listedCountryCode(input.stored);
  if (stored) return stored;
  return detectCountry(input.browserLocale, input.timeZone);
}

/** How Help should describe the country currently on screen. */
export function helpLookupMode(
  residenceCode: string | null,
  viewingCode: string,
): "home" | "other" | "guessed" {
  if (!residenceCode) return "guessed";
  if (residenceCode !== viewingCode) return "other";
  return "home";
}
