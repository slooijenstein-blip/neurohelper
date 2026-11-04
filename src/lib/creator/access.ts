import { ShareError } from "../share/errors.ts";
import { metadataWithCreatorPro } from "./rules.ts";

type ClerkUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName?: string | null;
  publicMetadata?: Record<string, unknown> | null;
  emailAddresses: Array<{ emailAddress: string }>;
  primaryEmailAddressId?: string | null;
};

export type CreatorAccessUser = {
  userId: string;
  email: string;
  name: string;
  isPro: boolean;
  isCreatorPro: boolean;
};

function displayName(user: ClerkUser): string {
  const full = user.fullName?.trim() || [user.firstName, user.lastName].filter(Boolean).join(" ");
  return full.trim();
}

function flagsOf(meta: Record<string, unknown> | null | undefined): {
  isPro: boolean;
  isCreatorPro: boolean;
} {
  return {
    isPro: meta?.["isPro"] === true || meta?.["isCreatorPro"] === true,
    isCreatorPro: meta?.["isCreatorPro"] === true,
  };
}

function toAccessUser(user: ClerkUser): CreatorAccessUser {
  const email =
    user.emailAddresses.find((item) => item.emailAddress)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";
  const flags = flagsOf(user.publicMetadata);
  return {
    userId: user.id,
    email,
    name: displayName(user),
    isPro: flags.isPro,
    isCreatorPro: flags.isCreatorPro,
  };
}

async function clerkClient(secretKey: string) {
  const { createClerkClient } = await import("@clerk/backend");
  return createClerkClient({ secretKey });
}

function asUsers(result: unknown): ClerkUser[] {
  if (Array.isArray(result)) return result as ClerkUser[];
  if (result && typeof result === "object" && Array.isArray((result as { data?: unknown }).data)) {
    return (result as { data: ClerkUser[] }).data;
  }
  return [];
}

export async function lookupCreatorAccess(
  secretKey: string | null,
  email: string,
): Promise<CreatorAccessUser | null> {
  if (!secretKey) {
    throw new ShareError(
      503,
      "not_configured",
      "Creator Pro uses the existing Clerk account. This preview has no Clerk secret yet.",
    );
  }
  const clerk = await clerkClient(secretKey);
  const result = await clerk.users.getUserList({ emailAddress: [email], limit: 5 });
  const user = asUsers(result)[0];
  return user ? toAccessUser(user) : null;
}

export async function setCreatorAccess(
  secretKey: string | null,
  userId: string,
  enabled: boolean,
): Promise<CreatorAccessUser> {
  if (!secretKey) {
    throw new ShareError(
      503,
      "not_configured",
      "Creator Pro uses the existing Clerk account. This preview has no Clerk secret yet.",
    );
  }
  if (!userId.trim()) throw new ShareError(400, "invalid_user", "Choose an account first.");
  const clerk = await clerkClient(secretKey);
  const current = await clerk.users.getUser(userId);
  const meta = metadataWithCreatorPro(
    (current.publicMetadata as Record<string, unknown> | null) ?? {},
    enabled,
  );
  const updated = await clerk.users.updateUser(userId, { publicMetadata: meta });
  return toAccessUser(updated as ClerkUser);
}
