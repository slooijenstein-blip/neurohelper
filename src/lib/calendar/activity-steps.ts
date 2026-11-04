import { ACTIVITIES, SKILLS, type Activity, type Skill } from "../activities-data.ts";
import { findAnyActivity } from "../creator/catalog.ts";
import { nid, type PlanStep } from "./types.ts";

function wholeYear(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number.NaN;
  if (!Number.isInteger(number) || number < 0 || number > 6) return null;
  return number;
}

function clipLines(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const lines: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const line = item.replace(/\s+/g, " ").trim().slice(0, maxLen);
    if (!line) continue;
    lines.push(line);
    if (lines.length >= maxItems) break;
  }
  return lines;
}

/** Optional detail for a custom calendar step. Catalog links do not need these. */
export function customStepDetail(raw: {
  skill?: unknown;
  minAge?: unknown;
  maxAge?: unknown;
  materials?: unknown;
  howTo?: unknown;
}): Partial<Pick<PlanStep, "skill" | "minAge" | "maxAge" | "materials" | "howTo">> {
  const detail: Partial<Pick<PlanStep, "skill" | "minAge" | "maxAge" | "materials" | "howTo">> = {};
  if (typeof raw.skill === "string" && SKILLS.includes(raw.skill as Skill)) {
    detail.skill = raw.skill as Skill;
  }
  const minAge = wholeYear(raw.minAge);
  const maxAge = wholeYear(raw.maxAge);
  if (minAge !== null && maxAge !== null && minAge <= maxAge) {
    detail.minAge = minAge;
    detail.maxAge = maxAge;
  }
  const materials = clipLines(raw.materials, 16, 80);
  const howTo = clipLines(raw.howTo, 16, 300);
  if (materials.length) detail.materials = materials;
  if (howTo.length) detail.howTo = howTo;
  return detail;
}

/** Build a plan step from a catalog activity (details preserved via activityId). */
export function planStepFromActivity(activity: Activity, keepId?: string): PlanStep {
  const canonical = ACTIVITIES.find((item) => item.id === activity.id) ?? activity;
  return {
    id: keepId ?? nid("st"),
    title: canonical.title,
    notes: canonical.description,
    description: canonical.description,
    minutes: canonical.minMinutes,
    activityId: canonical.id,
  };
}

export function customPlanStep(input: {
  title: string;
  description: string;
  minutes: number;
  skill: Skill;
  minAge: number;
  maxAge: number;
  materials: string[];
  howTo: string[];
}): PlanStep {
  const description = input.description.trim();
  const minutes = Number.isInteger(input.minutes) && input.minutes > 0 ? input.minutes : 10;
  return {
    id: nid("st"),
    title: input.title.trim() || "Custom step",
    notes: description,
    description,
    minutes,
    activityId: null,
    ...customStepDetail(input),
  };
}

export function resolveActivity(activityId: string | null | undefined) {
  return findAnyActivity(activityId);
}

export function normalizePlanStep(raw: Partial<PlanStep> & { title?: string }): PlanStep {
  return {
    id: raw.id ?? nid("st"),
    title: raw.title ?? "",
    notes: raw.notes ?? raw.description ?? "",
    description: raw.description ?? raw.notes ?? "",
    minutes: typeof raw.minutes === "number" ? raw.minutes : 10,
    activityId: raw.activityId ?? null,
    ...customStepDetail(raw),
  };
}
