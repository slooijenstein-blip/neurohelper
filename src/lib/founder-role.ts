import type { Role } from "./app-store";

/** The only address that may select the Founder profile tag. */
export const FOUNDER_EMAIL = "s.looijenstein@synlumae.com";

type ClerkEmailSource =
  | {
      primaryEmailAddress?: { emailAddress?: string | null } | null;
      emailAddresses?: ReadonlyArray<{ emailAddress?: string | null } | null> | null;
    }
  | null
  | undefined;

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

/** Primary address plus every address on the Clerk user. Duplicates are fine. */
export function founderEmailsFromClerk(user: ClerkEmailSource): string[] {
  if (!user) return [];
  const listed = user.emailAddresses?.map((item) => item?.emailAddress) ?? [];
  return [user.primaryEmailAddress?.emailAddress, ...listed].filter(
    (email): email is string => typeof email === "string" && email.trim().length > 0,
  );
}

/** Case-insensitive. True when any listed address is the Founder allowlist email. */
export function canUseFounderRole(
  emails: readonly (string | null | undefined)[] | null | undefined,
): boolean {
  if (!emails) return false;
  const allowed = normalizeEmail(FOUNDER_EMAIL);
  return emails.some((email) => normalizeEmail(email) === allowed);
}

/**
 * Roles offered in Profile edit.
 * `null` means the signed-in address list is still loading — hide Founder until it is known.
 */
export function rolesVisibleToEmails(
  emails: readonly (string | null | undefined)[] | null | undefined,
  roles: readonly Role[],
): Role[] {
  if (canUseFounderRole(emails)) return [...roles];
  return roles.filter((role) => role !== "Founder");
}

/**
 * Keep a chosen role. Founder is kept only for the allowlisted account.
 * `null` means the address list is still unknown, so a stored Founder tag is left alone
 * and does not flash to another role while Clerk loads.
 */
export function roleChoiceForEmails(
  role: Role,
  emails: readonly (string | null | undefined)[] | null | undefined,
  fallback: Role = "Parent",
): Role {
  if (role !== "Founder") return role;
  if (emails === null) return role;
  if (canUseFounderRole(emails)) return role;
  return fallback === "Founder" ? "Parent" : fallback;
}

/** Drop a stored Founder tag when this signed-in account is not on the allowlist. */
export function restrictFounderRole<T extends { role: Role }>(
  profile: T,
  emails: readonly (string | null | undefined)[],
): T {
  const role = roleChoiceForEmails(profile.role, emails, "Parent");
  if (role === profile.role) return profile;
  return { ...profile, role };
}
