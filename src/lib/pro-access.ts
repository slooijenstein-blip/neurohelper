/** Caregiver chrome stays put. Pro is an extra tab, never a replacement home. */

export const CAREGIVER_TAB_KEYS = [
  "activities",
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

/** Normal tabs for everyone. Pro accounts get one extra tab after Activities. */
export function tabsForAccount(isPro: boolean): AppTabKey[] {
  if (!isPro) return [...CAREGIVER_TAB_KEYS];
  const [activities, ...rest] = CAREGIVER_TAB_KEYS;
  return [activities, "pro", ...rest];
}
