import { createClerkClient, verifyToken } from "@clerk/backend";

import { createClerkFamilyStore } from "./clerk-store.server";
import { FamilyService } from "./family-service";
import { createFamilyHttpHandler } from "./family-http";
import { createHmacTokenSigner } from "./hmac-token.server";
import type { Actor } from "./types";

type ClerkUserLike = {
  id: string;
  fullName: string | null;
  firstName: string | null;
  username: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses?: Array<{ emailAddress: string }>;
};

function userToActor(user: ClerkUserLike): Actor | null {
  const email =
    user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
  if (!email) return null;
  const name =
    user.fullName?.trim() ||
    user.firstName?.trim() ||
    user.username?.trim() ||
    email.split("@")[0] ||
    "Member";
  return { userId: user.id, email, name };
}

function authorizedParties(req: Request): string[] {
  const origin = req.headers.get("origin");
  const forwarded = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const extra = (process.env["CLERK_AUTHORIZED_PARTIES"] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const defaults = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://synlumae.com",
    "https://www.synlumae.com",
  ];
  if (origin) defaults.push(origin);
  if (forwarded) defaults.push(`${proto}://${forwarded}`);
  return [...new Set([...defaults, ...extra])];
}

async function authenticate(req: Request, secretKey: string): Promise<Actor | null> {
  const clerk = createClerkClient({ secretKey });
  try {
    const state = await clerk.authenticateRequest(req, {
      authorizedParties: authorizedParties(req),
    });
    if (state.isAuthenticated) {
      const auth = state.toAuth();
      const userId = "userId" in auth ? auth.userId : null;
      if (userId) {
        const user = await clerk.users.getUser(userId);
        return userToActor(user);
      }
    }
  } catch {
    /* fall through to bearer token */
  }

  const header = req.headers.get("authorization");
  const token = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey });
    if (!payload.sub) return null;
    const user = await clerk.users.getUser(payload.sub);
    return userToActor(user);
  } catch {
    return null;
  }
}

async function maybeSendClerkInvite(email: string, inviteUrl: string, secretKey: string) {
  try {
    const clerk = createClerkClient({ secretKey });
    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: inviteUrl,
      notify: true,
      ignoreExisting: true,
    });
  } catch {
    /* User may already exist; the copyable link still works. */
  }
}

export function createProductionFamilyHandler() {
  const secretKey = process.env["CLERK_SECRET_KEY"];
  if (!secretKey) {
    return createFamilyHttpHandler({
      configured: false,
      storeName: "none",
      service: null,
      authenticate: async () => null,
    });
  }
  const service = new FamilyService(
    createClerkFamilyStore(secretKey),
    createHmacTokenSigner(secretKey),
  );
  return createFamilyHttpHandler({
    configured: true,
    storeName: "clerk",
    service,
    authenticate: (req) => authenticate(req, secretKey),
    afterInvite: (email, inviteUrl) => maybeSendClerkInvite(email, inviteUrl, secretKey),
  });
}

export async function handleFamilyApi(req: Request): Promise<Response> {
  return createProductionFamilyHandler()(req);
}
