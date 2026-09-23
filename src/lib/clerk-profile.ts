import type { Profile } from "./app-store";

/** Minimal Clerk user fields we map into the local caregiver profile. */
export type ClerkNameSource = {
  id: string;
  fullName: string | null;
  firstName: string | null;
  username: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  publicMetadata?: { isPro?: unknown } | null;
};

export function isClerkPro(user: ClerkNameSource): boolean {
  return user.publicMetadata?.isPro === true;
}

const DEMO_SAM_BIO =
  "Parent of a curious 4-year-old. Always looking for motor skill ideas that fit into our day.";

export type CaregiverProfileEdits = {
  name: string;
  role: Profile["role"];
  location: string;
  bio: string;
};

export type ClerkProfileSyncPlan = { action: "skip" } | { action: "bind" };

export function displayNameFromClerk(user: ClerkNameSource): string {
  const fromName = user.fullName?.trim() || user.firstName?.trim() || user.username?.trim();
  if (fromName) return fromName;
  const localPart = user.primaryEmailAddress?.emailAddress.split("@")[0]?.trim();
  return localPart || "Member";
}

/** True when localStorage still holds the old in-browser demo identity. */
export function isLegacyDemoProfile(profile: Profile | null): boolean {
  if (!profile) return true;
  if (profile.clerkUserId) return false;
  return profile.id === "me" && profile.name === "Sam" && profile.bio === DEMO_SAM_BIO;
}

/**
 * Overlay Clerk identity onto the local profile.
 * Never copies or invents child details from Clerk — those stay device-local and user-entered.
 * Same Clerk user: keep local name/bio/role/location so a reload cannot wipe in-app edits.
 */
export function profileFromClerkUser(user: ClerkNameSource, existing: Profile | null): Profile {
  const sameUser = existing?.clerkUserId === user.id;
  const keepLocalExtras = sameUser || (existing !== null && !isLegacyDemoProfile(existing));
  const clerkName = displayNameFromClerk(user);
  const localName = existing?.name?.trim();

  return {
    id: "me",
    clerkUserId: user.id,
    name: sameUser && existing && localName ? existing.name : clerkName,
    role: keepLocalExtras && existing ? existing.role : "Parent",
    location: keepLocalExtras && existing ? existing.location : "",
    bio: keepLocalExtras && existing ? existing.bio : "",
    socials: keepLocalExtras && existing ? existing.socials : {},
    color: existing?.color ?? "bg-primary",
    ...(existing?.favouriteActivityIds
      ? { favouriteActivityIds: existing.favouriteActivityIds }
      : {}),
    ...(existing?.followers ? { followers: existing.followers } : {}),
    ...(existing?.locale ? { locale: existing.locale } : {}),
    ...(existing?.helpCountry ? { helpCountry: existing.helpCountry } : {}),
    ...(isClerkPro(user) ? { isPro: true as const } : {}),
  };
}

/**
 * After a Clerk user is bound, do not rewrite the local caregiver profile on every reload.
 * Bind on first link, logout, demo exit, or a different Clerk account.
 */
export function planClerkProfileSync(input: {
  existing: Profile | null;
  clerkUserId: string;
  loggedOut: boolean;
  devDemo: boolean;
}): ClerkProfileSyncPlan {
  const { existing, clerkUserId, loggedOut, devDemo } = input;
  if (devDemo || loggedOut || !existing) return { action: "bind" };
  if (existing.clerkUserId !== clerkUserId) return { action: "bind" };
  return { action: "skip" };
}

/** Merge caregiver identity edits. Does not touch child fields. */
export function applyCaregiverProfileEdits(
  existing: Profile,
  edits: CaregiverProfileEdits,
): Profile {
  const name = edits.name.trim();
  return {
    ...existing,
    name: name || existing.name,
    role: edits.role,
    location: edits.location.trim(),
    bio: edits.bio.trim(),
  };
}

/** Map a display name into Clerk's first/last fields. Never include child PII. */
export function clerkNameUpdateFromDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "Member";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}
