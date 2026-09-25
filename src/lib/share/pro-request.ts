import { ShareError } from "./errors.ts";
import { actorEmailKeys, assertEmail, canonicalEmail, normalizeEmail } from "./names.ts";
import type { ShareStore } from "./store.ts";

/** Reviewer inbox. Gmail dots and +tags match this same address. */
export const PRO_REQUEST_ADMIN_EMAIL = "samlooijenstein@gmail.com";

export const PRO_REQUEST_ROLES = ["therapist", "psychologist", "other"] as const;
export type ProRequestRole = (typeof PRO_REQUEST_ROLES)[number];

export type ProRequest = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: ProRequestRole;
  country: string;
  organisation: string;
  why: string;
  worksWithFamilies: true;
  status: "pending";
  createdAt: string;
  updatedAt: string;
};

export type ProRequestInput = {
  fullName: string;
  email: string;
  role: ProRequestRole;
  country: string;
  organisation: string;
  why: string;
  worksWithFamilies: true;
};

function clipLine(raw: string, max: number): string {
  let cleaned = "";
  for (const char of raw) {
    cleaned += char.charCodeAt(0) < 32 ? " " : char;
  }
  return cleaned.replace(/\s+/g, " ").trim().slice(0, max);
}

function newProRequestId(): string {
  return `proreq_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function isProRequestAdmin(actor: { email: string; emails?: string[] }): boolean {
  const allow = canonicalEmail(PRO_REQUEST_ADMIN_EMAIL);
  return actorEmailKeys(actor).some((key) => canonicalEmail(key) === allow);
}

export function parseProRequestInput(body: Record<string, unknown>): ProRequestInput {
  const fullName = clipLine(typeof body["fullName"] === "string" ? body["fullName"] : "", 80);
  if (!fullName || fullName.includes("@")) {
    throw new ShareError(400, "invalid_name", "Enter your full name.");
  }
  const email = assertEmail(typeof body["email"] === "string" ? body["email"] : "");
  const roleRaw = typeof body["role"] === "string" ? body["role"] : "";
  if (!PRO_REQUEST_ROLES.includes(roleRaw as ProRequestRole)) {
    throw new ShareError(400, "invalid_role", "Choose therapist, psychologist, or other.");
  }
  const countryRaw =
    typeof body["country"] === "string" ? body["country"].trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(countryRaw)) {
    throw new ShareError(400, "invalid_country", "Choose a country.");
  }
  if (body["worksWithFamilies"] !== true) {
    throw new ShareError(
      400,
      "confirm_required",
      "Confirm that you work with families in a professional role.",
    );
  }
  return {
    fullName,
    email,
    role: roleRaw as ProRequestRole,
    country: countryRaw,
    organisation: clipLine(
      typeof body["organisation"] === "string" ? body["organisation"] : "",
      80,
    ),
    why: clipLine(typeof body["why"] === "string" ? body["why"] : "", 160),
    worksWithFamilies: true,
  };
}

/** One pending request per account. Never writes Clerk isPro. */
export async function submitProRequest(
  store: ShareStore,
  actor: { userId: string; isPro: boolean },
  input: ProRequestInput,
  now: string,
): Promise<ProRequest> {
  if (actor.isPro) {
    throw new ShareError(409, "already_pro", "This account already has Pro.");
  }
  const existing = await store.getProRequest(actor.userId);
  const request: ProRequest = {
    id: existing?.id ?? newProRequestId(),
    userId: actor.userId,
    email: normalizeEmail(input.email),
    fullName: input.fullName,
    role: input.role,
    country: input.country,
    organisation: input.organisation,
    why: input.why,
    worksWithFamilies: true,
    status: "pending",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await store.saveProRequest(request);
  return request;
}

export async function pendingForReview(
  requests: ProRequest[],
  userIsPro: (userId: string) => Promise<boolean>,
): Promise<ProRequest[]> {
  const waiting: ProRequest[] = [];
  for (const request of requests) {
    if (await userIsPro(request.userId)) continue;
    waiting.push(request);
  }
  return waiting;
}

/** No general mailer is wired. Clerk invitations stay for parent invites only. */
export function proRequestNotifyResult(notifyEmail: string | undefined): {
  notified: false;
  code: "not_configured" | "no_mailer";
} {
  const to = notifyEmail?.trim();
  if (!to) return { notified: false, code: "not_configured" };
  return { notified: false, code: "no_mailer" };
}
