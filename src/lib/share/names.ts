import { ShareError } from "./errors.ts";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 200) {
    throw new ShareError(400, "invalid_email", "Enter a valid email address.");
  }
  return normalized;
}

/** Gmail ignores dots and +tags. Used only to match an invite to a Google sign-in. */
export function canonicalEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return normalized;
  const domain = normalized.slice(at + 1);
  const host = domain === "googlemail.com" ? "gmail.com" : domain;
  if (host !== "gmail.com") return normalized;
  const local = normalized.slice(0, at).split("+")[0]?.replace(/\./g, "") ?? "";
  return `${local}@gmail.com`;
}

export function emailIndexKeys(email: string): string[] {
  const normalized = assertEmail(email);
  const canonical = canonicalEmail(normalized);
  return canonical === normalized ? [normalized] : [normalized, canonical];
}

export function actorEmailKeys(actor: { email: string; emails?: string[] }): string[] {
  const keys = new Set<string>();
  for (const raw of [actor.email, ...(actor.emails ?? [])]) {
    try {
      for (const key of emailIndexKeys(raw)) keys.add(key);
    } catch {
      /* skip a blank or malformed address */
    }
  }
  return [...keys];
}

export function emailMatchesActor(
  inviteEmail: string,
  actor: { email: string; emails?: string[] },
): boolean {
  let invite = "";
  try {
    invite = assertEmail(inviteEmail);
  } catch {
    return false;
  }
  const keys = new Set(actorEmailKeys(actor));
  return keys.has(invite) || keys.has(canonicalEmail(invite));
}

/** First name / display label only. Rejects addresses so child rows stay minimal. */
export function clipDisplayName(raw: string, fallback: string): string {
  let cleaned = "";
  for (const char of raw) {
    cleaned += char.charCodeAt(0) < 32 ? " " : char;
  }
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.includes("@")) return fallback.slice(0, 40);
  return cleaned.slice(0, 40);
}

export function assertId(id: string, prefix: string): string {
  if (!new RegExp(`^${prefix}_[a-z0-9_]{8,64}$`).test(id)) {
    throw new ShareError(400, "invalid_id", "Invalid id.");
  }
  return id;
}

export function assertDateKey(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ShareError(400, "invalid_date", "Date must look like 2026-09-23.");
  }
  return date;
}

export function emailLocalPart(email: string): string {
  return (
    email
      .split("@")[0]
      ?.replace(/[._+-]+/g, " ")
      .trim() || "Parent"
  );
}
