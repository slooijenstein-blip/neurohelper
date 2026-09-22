import { en, type Messages } from "./en.ts";
import { es } from "./es.ts";
import type { AppLocale } from "./locales.ts";

const catalogs: Record<AppLocale, Messages | typeof es> = { en, es };

function lookup(catalog: object, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, catalog);
  return typeof value === "string" ? value : undefined;
}

export function translate(
  locale: AppLocale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = lookup(catalogs[locale], key) ?? lookup(en, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    vars[name] === undefined ? "" : String(vars[name]),
  );
}

export function messageKeys(catalog: object, prefix = ""): string[] {
  return Object.entries(catalog).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") return messageKeys(value, path);
    return [path];
  });
}
