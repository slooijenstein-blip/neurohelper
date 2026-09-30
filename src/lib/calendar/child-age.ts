import { toDateKey, type AgeBand, type Child } from "./types.ts";

/** Whole years a therapist can type. Older than this stays out of the pediatric form. */
export const MAX_AGE_YEARS = 25;

export type TherapistAgeInput = {
  ageYears?: number;
  birthDate?: string;
};

export type ResolvedChildAge = {
  ageBand: AgeBand;
  ageYears?: number;
  birthDate?: string;
};

export type ChildAgeView =
  { kind: "band"; band: AgeBand } | { kind: "exact"; years: number; born: string | null };

/** Map a whole-year age onto the existing band so older saves still have a band. */
export function bandForYears(years: number): AgeBand {
  if (years <= 2) return "1-2";
  if (years <= 5) return "3-5";
  if (years <= 8) return "6-8";
  return "9-12";
}

export function parseAgeYears(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const years = Number(trimmed);
  if (!Number.isInteger(years) || years > MAX_AGE_YEARS) return null;
  return years;
}

/** YYYY-MM-DD, a real calendar day, not in the future, within the age cap. */
export function parseBirthDate(raw: string, today = new Date()): string | null {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parts = trimmed.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year == null || month == null || day == null) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  if (trimmed > toDateKey(today)) return null;
  if (wholeYears(trimmed, today) > MAX_AGE_YEARS) return null;
  return trimmed;
}

export function wholeYears(birthDate: string, today = new Date()): number {
  const parts = birthDate.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  let years = today.getFullYear() - year;
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  if (todayMonth < month || (todayMonth === month && todayDay < day)) years -= 1;
  return Math.max(0, years);
}

/** Therapist add: at least one of age years or date of birth. Both may be set. */
export function resolveTherapistAge(
  input: TherapistAgeInput,
  today = new Date(),
): ResolvedChildAge | null {
  const years = input.ageYears;
  const birthDate = input.birthDate;
  const hasYears = years != null;
  const hasBirth = Boolean(birthDate);
  if (!hasYears && !hasBirth) return null;
  if (hasYears && (years < 0 || years > MAX_AGE_YEARS || !Number.isInteger(years))) return null;
  if (hasBirth && !parseBirthDate(birthDate ?? "", today)) return null;
  const yearsForBand = hasYears ? years : wholeYears(birthDate ?? "", today);
  return {
    ageBand: bandForYears(yearsForBand),
    ...(hasYears ? { ageYears: years } : {}),
    ...(hasBirth && birthDate ? { birthDate } : {}),
  };
}

export function childAgeDisplay(
  child: Pick<Child, "ageBand" | "ageYears" | "birthDate">,
  today = new Date(),
): ChildAgeView {
  if (child.ageYears == null && !child.birthDate) {
    return { kind: "band", band: child.ageBand };
  }
  const years = child.ageYears ?? wholeYears(child.birthDate ?? "", today);
  return { kind: "exact", years, born: child.birthDate ?? null };
}

export function formatBirthDate(iso: string, locale: "en" | "es"): string {
  const parts = iso.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isStoredAgeYears(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_AGE_YEARS
  );
}

export function isStoredBirthDate(value: unknown, today = new Date()): value is string {
  return typeof value === "string" && parseBirthDate(value, today) === value;
}
