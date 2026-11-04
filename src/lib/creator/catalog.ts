import { ACTIVITIES, type Activity } from "../activities-data.ts";
import type { PublishedCreatorActivity } from "./types.ts";

export type CatalogActivity = Activity & {
  creatorName?: string;
  /** Language the professional wrote in. Empty means it was not set. */
  contentLanguage?: "en" | "es" | "";
  /** Set only on a display copy, after the profile language translated it. */
  translatedInto?: "en" | "es";
};

const listeners = new Set<() => void>();
let published: CatalogActivity[] = [];

export function publishedCreatorActivities(): CatalogActivity[] {
  return published;
}

export function replacePublishedCreatorActivities(next: CatalogActivity[]) {
  published = next;
  for (const listener of listeners) listener();
}

export function subscribePublishedCreatorActivities(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function creatorActivityToCatalog(activity: PublishedCreatorActivity): CatalogActivity {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    minAge: activity.minAge,
    maxAge: activity.maxAge,
    minMinutes: activity.minutes,
    maxMinutes: activity.minutes,
    skill: activity.skill,
    materials: activity.materials,
    steps: activity.steps,
    creatorName: activity.ownerName,
    contentLanguage: activity.language,
  };
}

export function findAnyActivity(activityId: string | null | undefined): CatalogActivity | null {
  if (!activityId) return null;
  return (
    ACTIVITIES.find((activity) => activity.id === activityId) ??
    published.find((activity) => activity.id === activityId) ??
    null
  );
}

export function creatorCreditName(activity: object | null | undefined): string | null {
  if (!activity || !("creatorName" in activity)) return null;
  const name = (activity as { creatorName?: unknown }).creatorName;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function isCreatorCatalogActivity(activity: { id: string } | null | undefined): boolean {
  if (!activity) return false;
  return published.some((item) => item.id === activity.id);
}
