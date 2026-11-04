import type { AppLocale } from "../../i18n/locales.ts";
import {
  languageCode,
  translateKnownText,
  type TranslationDeps,
  type TranslatorLanguage,
} from "../community-translate.ts";
import type { CatalogActivity } from "./catalog.ts";

function isCreator(activity: CatalogActivity): boolean {
  return "creatorName" in activity;
}

function knownLanguage(value: string | null | undefined): TranslatorLanguage | null {
  const code = languageCode(value);
  if (code === "en" || code === "es") return code;
  return null;
}

async function sourceLanguage(
  activity: CatalogActivity,
  deps: TranslationDeps,
): Promise<TranslatorLanguage | null> {
  const marked = knownLanguage(activity.contentLanguage);
  if (marked) return marked;
  if (!deps.detect) return null;
  const sample = `${activity.title}. ${activity.description}`.trim();
  if (!sample) return null;
  try {
    return knownLanguage(await deps.detect(sample.slice(0, 1000)));
  } catch {
    return null;
  }
}

async function translateLines(
  lines: string[],
  source: TranslatorLanguage,
  target: TranslatorLanguage,
  deps: TranslationDeps,
): Promise<string[] | null> {
  if (lines.length === 0) return [];
  const together = await translateKnownText(lines.join("\n"), source, target, deps);
  if (together) {
    const parts = together
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (parts.length === lines.length) return parts;
  }
  const each: string[] = [];
  for (const line of lines) {
    const next = await translateKnownText(line, source, target, deps);
    if (!next) return null;
    each.push(next);
  }
  return each;
}

/** Display copy in the profile language. Null means keep the written text. */
export async function localizeCreatorActivity(
  activity: CatalogActivity,
  locale: AppLocale,
  deps: TranslationDeps,
): Promise<CatalogActivity | null> {
  if (!isCreator(activity)) return null;
  const source = await sourceLanguage(activity, deps);
  if (!source || source === locale) return null;
  const title = await translateKnownText(activity.title, source, locale, deps);
  const description = await translateKnownText(activity.description, source, locale, deps);
  const materials = await translateLines(activity.materials, source, locale, deps);
  const steps = await translateLines(activity.steps, source, locale, deps);
  if (!title || !description || !materials || !steps) return null;
  return {
    ...activity,
    title,
    description,
    materials,
    steps,
    translatedInto: locale,
  };
}

const cache = new Map<string, CatalogActivity | null>();

function cacheKey(activity: CatalogActivity, locale: AppLocale): string {
  return [
    activity.id,
    locale,
    activity.contentLanguage ?? "",
    activity.title,
    activity.description,
    activity.materials.join("\n"),
    activity.steps.join("\n"),
  ].join("\u0001");
}

export async function localizeCreatorActivities(
  activities: CatalogActivity[],
  locale: AppLocale,
  deps: TranslationDeps,
): Promise<Record<string, CatalogActivity>> {
  const next: Record<string, CatalogActivity> = {};
  for (const activity of activities) {
    if (!isCreator(activity)) continue;
    const key = cacheKey(activity, locale);
    let localized = cache.get(key);
    if (localized === undefined) {
      localized = await localizeCreatorActivity(activity, locale, deps);
      cache.set(key, localized);
    }
    if (localized) next[activity.id] = localized;
  }
  return next;
}
