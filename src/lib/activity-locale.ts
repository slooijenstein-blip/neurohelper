import type { AppLocale } from "../i18n/locales.ts";
import { ACTIVITIES, type Activity, type Skill } from "./activities-data.ts";
import { esActivityCopy, type ActivityCopy } from "./activities-es.ts";

const SKILL_MESSAGE_KEY: Record<Skill, string> = {
  "Sensory Play": "activities.skills.sensory",
  "Motor Skills": "activities.skills.motor",
  Communication: "activities.skills.communication",
  "Social Skills": "activities.skills.social",
  Cognitive: "activities.skills.cognitive",
  "Self-Care": "activities.skills.selfCare",
};

export function skillMessageKey(skill: Skill): string {
  return SKILL_MESSAGE_KEY[skill];
}

function mergeCopy(activity: Activity, copy: ActivityCopy | undefined): Activity {
  if (!copy) return activity;
  return {
    ...activity,
    title: copy.title || activity.title,
    description: copy.description || activity.description,
    materials:
      copy.materials.length === activity.materials.length ? copy.materials : activity.materials,
    steps: copy.steps.length === activity.steps.length ? copy.steps : activity.steps,
  };
}

/** English catalog fields, or Castilian Spanish when that locale is active. */
export function localizedActivity(activity: Activity, locale: AppLocale): Activity {
  if (locale !== "es") return activity;
  return mergeCopy(activity, esActivityCopy[activity.id]);
}

export function localizedCatalog(locale: AppLocale): Activity[] {
  return ACTIVITIES.map((activity) => localizedActivity(activity, locale));
}

export function presentPlanStep(
  step: {
    activityId: string | null;
    title: string;
    description?: string;
    notes?: string;
  },
  locale: AppLocale,
): { title: string; description: string; activity: Activity | null } {
  if (!step.activityId) {
    return {
      title: step.title,
      description: step.description || step.notes || "",
      activity: null,
    };
  }
  const raw = ACTIVITIES.find((activity) => activity.id === step.activityId) ?? null;
  if (!raw) {
    return {
      title: step.title,
      description: step.description || step.notes || "",
      activity: null,
    };
  }
  const activity = localizedActivity(raw, locale);
  return { title: activity.title, description: activity.description, activity };
}

export function presentPlanName(
  plan: { name: string; nameKey?: string | null },
  translate: (key: string) => string,
): string {
  if (!plan.nameKey) return plan.name;
  const label = translate(plan.nameKey);
  return label === plan.nameKey ? plan.name : label;
}
