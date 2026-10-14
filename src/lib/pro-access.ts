/** Caregiver chrome stays put. Pro is an extra tab, never a replacement home. */

export const CAREGIVER_TAB_KEYS = [
  "activities",
  "children",
  "schedule",
  "journey",
  "community",
  "help",
  "profile",
] as const;

export type CaregiverTabKey = (typeof CAREGIVER_TAB_KEYS)[number];
export type AppTabKey = CaregiverTabKey | "pro";

export function isProAccount(profile: { isPro?: boolean } | null | undefined): boolean {
  return profile?.isPro === true;
}

/**
 * Pro chrome on a deployed app. Clerk publicMetadata.isPro is the only grant.
 * A profile role tag cannot set this. The device demo is local development only.
 */
export function showProChrome(input: { clerkIsPro: boolean; deviceDemo: boolean }): boolean {
  if (input.clerkIsPro) return true;
  return input.deviceDemo;
}

/**
 * Parents get Children only while a child is shared with them.
 * Pro accounts get Pro instead, in the same place.
 */
export function tabsForAccount(isPro: boolean, hasLinkedChildren = false): AppTabKey[] {
  const withoutChildren = CAREGIVER_TAB_KEYS.filter((key) => key !== "children");
  const [activities, ...rest] = withoutChildren;
  if (isPro) return [activities!, "pro", ...rest];
  if (!hasLinkedChildren) return [...withoutChildren];
  return [...CAREGIVER_TAB_KEYS];
}
