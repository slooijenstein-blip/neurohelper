export const APP_LOCALES = ["en", "es"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const LOCALE_STORAGE_KEY = "synlumae-locale";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "es";
}

/** Spanish (Spain) for any es* browser language. English stays the fallback. */
export function detectLocale(browserLanguage?: string | null): AppLocale {
  const language = (browserLanguage ?? "").trim().toLowerCase().replace("_", "-");
  if (language === "es" || language.startsWith("es-")) return "es";
  return "en";
}

export function resolveLocale(input: {
  profileLocale?: string | null;
  stored?: string | null;
  browser?: string | null;
}): AppLocale {
  if (isAppLocale(input.profileLocale)) return input.profileLocale;
  if (isAppLocale(input.stored)) return input.stored;
  return detectLocale(input.browser);
}

export function htmlLang(locale: AppLocale): string {
  return locale === "es" ? "es-ES" : "en";
}
