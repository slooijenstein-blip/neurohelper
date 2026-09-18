import type { Profile } from "./app-store";

/** Minimal Clerk user fields we map into the local caregiver profile. */
export type ClerkNameSource = {
  id: string;
  fullName: string | null;
  firstName: string | null;
  username: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
};

const DEMO_SAM_BIO =
  "Parent of a curious 4-year-old. Always looking for motor skill ideas that fit into our day.";

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
 */
export function profileFromClerkUser(user: ClerkNameSource, existing: Profile | null): Profile {
  const sameUser = existing?.clerkUserId === user.id;
  const keepLocalExtras = sameUser || (existing !== null && !isLegacyDemoProfile(existing));

  return {
    id: "me",
    clerkUserId: user.id,
    name: displayNameFromClerk(user),
    role: keepLocalExtras && existing ? existing.role : "Parent",
    location: keepLocalExtras && existing ? existing.location : "",
    bio: keepLocalExtras && existing ? existing.bio : "",
    socials: keepLocalExtras && existing ? existing.socials : {},
    color: existing?.color ?? "bg-primary",
    ...(existing?.favouriteActivityIds
      ? { favouriteActivityIds: existing.favouriteActivityIds }
      : {}),
    ...(existing?.followers ? { followers: existing.followers } : {}),
  };
}
