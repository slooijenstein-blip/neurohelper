import { ACTIVITIES, type Activity } from "../activities-data.ts";
import { nid, type PlanStep } from "./types.ts";

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

export function customPlanStep(title: string, minutes = 10, notes = ""): PlanStep {
  return {
    id: nid("st"),
    title: title.trim() || "Custom step",
    notes,
    description: notes,
    minutes,
    activityId: null,
  };
}

export function resolveActivity(activityId: string | null | undefined): Activity | null {
  if (!activityId) return null;
  return ACTIVITIES.find((a) => a.id === activityId) ?? null;
}

export function normalizePlanStep(raw: Partial<PlanStep> & { title?: string }): PlanStep {
  return {
    id: raw.id ?? nid("st"),
    title: raw.title ?? "",
    notes: raw.notes ?? raw.description ?? "",
    description: raw.description ?? raw.notes ?? "",
    minutes: typeof raw.minutes === "number" ? raw.minutes : 10,
    activityId: raw.activityId ?? null,
  };
}
