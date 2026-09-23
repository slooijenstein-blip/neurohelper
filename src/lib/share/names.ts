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
