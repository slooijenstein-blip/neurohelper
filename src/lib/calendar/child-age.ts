import { toDateKey, type AgeBand, type Child } from "./types.ts";

/** Whole years a saved age can reach. The Add patient slider stops at 10. */
export const MAX_AGE_YEARS = 25;
export const AGE_STEP_MONTHS = 6;
export const SLIDER_MAX_MONTHS = 10 * 12;
export const SLIDER_MAX_INDEX = SLIDER_MAX_MONTHS / AGE_STEP_MONTHS;

export type TherapistAgeInput = {
  ageYears?: number;
  ageMonths?: number;
  birthDate?: string;
};

export type ResolvedChildAge = {
  ageBand: AgeBand;
  ageYears?: number;
  ageMonths?: number;
  birthDate?: string;
};

export type ChildAgeView =
  | { kind: "band"; band: AgeBand }
  | { kind: "exact"; years: number; months: number; born: string | null };

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

export function monthsFromSliderIndex(index: number): number {
  const step = Math.min(SLIDER_MAX_INDEX, Math.max(0, Math.round(index)));
  return step * AGE_STEP_MONTHS;
}

export function sliderIndexFromMonths(months: number): number {
  const clamped = Math.min(SLIDER_MAX_MONTHS, Math.max(0, months));
  return Math.round(clamped / AGE_STEP_MONTHS);
}

export function wholeMonths(birthDate: string, today = new Date()): number {
  const parts = birthDate.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  let months = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
  if (today.getDate() < day) months -= 1;
  return Math.max(0, months);
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

/** Therapist add: a slider age, a date of birth, or both. A date of birth wins on screen. */
export function resolveTherapistAge(
  input: TherapistAgeInput,
  today = new Date(),
): ResolvedChildAge | null {
  const years = input.ageYears;
  const months = input.ageMonths;
  const birthDate = input.birthDate;
  const hasYears = years != null;
  const hasMonths = months != null;
  const hasBirth = Boolean(birthDate);
  if (!hasYears && !hasMonths && !hasBirth) return null;
  if (hasYears && !isStoredAgeYears(years)) return null;
  if (hasMonths && !isStoredAgeMonths(months)) return null;
  if (hasBirth && !parseBirthDate(birthDate ?? "", today)) return null;
  const monthsForBand = hasBirth
    ? wholeMonths(birthDate ?? "", today)
    : hasMonths
      ? months
      : (years ?? 0) * 12;
  return {
    ageBand: bandForYears(monthsForBand / 12),
    ...(hasYears ? { ageYears: years } : {}),
    ...(hasMonths ? { ageMonths: months } : {}),
    ...(hasBirth && birthDate ? { birthDate } : {}),
  };
}

function exactAge(totalMonths: number, born: string | null): ChildAgeView {
  const months = Math.max(0, Math.round(totalMonths));
  return {
    kind: "exact",
    years: Math.floor(months / 12),
    months: months % 12,
    born,
  };
}

export function childAgeDisplay(
  child: Pick<Child, "ageBand" | "ageYears" | "ageMonths" | "birthDate">,
  today = new Date(),
): ChildAgeView {
  if (child.birthDate) return exactAge(wholeMonths(child.birthDate, today), child.birthDate);
  if (child.ageMonths != null) return exactAge(child.ageMonths, null);
  if (child.ageYears != null) return exactAge(child.ageYears * 12, null);
  return { kind: "band", band: child.ageBand };
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

export function isStoredAgeMonths(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_AGE_YEARS * 12
  );
}

export function isStoredAgeYears(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_AGE_YEARS
  );
}

export function isStoredBirthDate(value: unknown, today = new Date()): value is string {
  return typeof value === "string" && parseBirthDate(value, today) === value;
}
