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
  "Europe/Vienna": "AT",
  "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL",
  "Europe/Dublin": "IE",
  "Europe/Luxembourg": "LU",
  "Europe/Prague": "CZ",
  "Europe/Bratislava": "SK",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Sofia": "BG",
  "Europe/Athens": "GR",
  "Europe/Zagreb": "HR",
  "Europe/Ljubljana": "SI",
  "Europe/Tallinn": "EE",
  "Europe/Riga": "LV",
  "Europe/Vilnius": "LT",
  "Europe/Malta": "MT",
  "Asia/Nicosia": "CY",
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
  "America/Argentina/Buenos_Aires": "AR",
  "America/Argentina/Cordoba": "AR",
  "America/Santiago": "CL",
  "America/Bogota": "CO",
  "America/Sao_Paulo": "BR",
  "America/Manaus": "BR",
  "America/Fortaleza": "BR",
  "America/Recife": "BR",
  "America/Lima": "PE",
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

export function resolveHelpCountry(input: {
  profileCountry?: string | null;
  stored?: string | null;
  browserLocale?: string | null;
  timeZone?: string | null;
}): string {
  if (input.profileCountry && getCountry(input.profileCountry))
    return input.profileCountry.toUpperCase();
  if (input.stored && getCountry(input.stored)) return input.stored.toUpperCase();
  return detectCountry(input.browserLocale, input.timeZone);
}
