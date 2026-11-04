import { SKILLS, type Skill } from "../activities-data.ts";
import { canUseFounderRole } from "../founder-role.ts";
import { ShareError } from "../share/errors.ts";
import type { CreatorActivity, CreatorActivityInput, CreatorLanguage } from "./types.ts";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /\d[\d\s().-]{7,}\d/;

export function isFounderActor(actor: { email: string; emails?: string[] }): boolean {
  return canUseFounderRole([actor.email, ...(actor.emails ?? [])]);
}

export function canAuthorActivities(actor: {
  email: string;
  emails?: string[];
  isCreatorPro?: boolean;
}): boolean {
  return actor.isCreatorPro === true || isFounderActor(actor);
}

/** Preview and production stay in different Redis keys. Vercel sets VERCEL_ENV itself. */
export function creatorKeyPrefix(env: NodeJS.ProcessEnv): string {
  const raw = env["VERCEL_ENV"] || (env["VERCEL"] ? "preview" : "local");
  const safe = raw.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "local";
  return `synlumae:creator:${safe}:`;
}

export function metadataWithCreatorPro(
  current: Record<string, unknown> | null | undefined,
  enabled: boolean,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(current ?? {}), isCreatorPro: enabled };
  if (enabled) next["isPro"] = true;
  return next;
}

export function publicDisplayName(name: string): string {
  const clipped = clipLine(name, 80);
  if (!clipped || clipped.includes("@") || /\d{6,}/.test(clipped)) return "";
  return clipped;
}

function clipLine(raw: string, max: number): string {
  let cleaned = "";
  for (const char of raw) {
    cleaned += char.charCodeAt(0) < 32 ? " " : char;
  }
  return cleaned.replace(/\s+/g, " ").trim().slice(0, max);
}

function assertNoPrivateContact(text: string) {
  if (EMAIL_RE.test(text) || PHONE_RE.test(text)) {
    throw new ShareError(
      400,
      "no_contact",
      "Leave out email addresses and phone numbers. Families will see this activity.",
    );
  }
}

function textBlock(value: unknown, max: number): string {
  const text = clipLine(typeof value === "string" ? value : "", max);
  assertNoPrivateContact(text);
  return text;
}

function lineList(value: unknown, maxItems: number, maxLen: number): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\n+/) : [];
  const lines: string[] = [];
  for (const item of raw) {
    if (lines.length >= maxItems) break;
    const line = textBlock(item, maxLen);
    if (line) lines.push(line);
  }
  return lines;
}

function wholeYears(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isInteger(number) || number < 0 || number > 6) return null;
  return number;
}

function languageOf(value: unknown): CreatorLanguage {
  if (value === undefined || value === null || value === "") return "";
  if (value === "en" || value === "es") return value;
  throw new ShareError(400, "invalid_activity", "Language must be English, Spanish, or blank.");
}

export function parseCreatorInput(body: Record<string, unknown>): CreatorActivityInput {
  const title = textBlock(body["title"], 80);
  const description = textBlock(body["description"], 800);
  if (!title || !description) {
    throw new ShareError(400, "invalid_activity", "Add a name and what the activity is about.");
  }
  const minAge = wholeYears(body["minAge"]);
  const maxAge = wholeYears(body["maxAge"]);
  if (minAge === null || maxAge === null || minAge > maxAge) {
    throw new ShareError(400, "invalid_activity", "Age range must be whole years from 0 to 6.");
  }
  const skillRaw = typeof body["skill"] === "string" ? body["skill"] : "";
  if (!SKILLS.includes(skillRaw as Skill)) {
    throw new ShareError(400, "invalid_activity", "Choose a type of activity.");
  }
  const minutes =
    typeof body["minutes"] === "number"
      ? body["minutes"]
      : typeof body["minutes"] === "string" && body["minutes"].trim()
        ? Number(body["minutes"])
        : Number.NaN;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    throw new ShareError(400, "invalid_activity", "Length must be whole minutes from 1 to 180.");
  }
  const steps = lineList(body["steps"], 16, 300);
  if (!steps.length) {
    throw new ShareError(400, "invalid_activity", "Add at least one step for how to play.");
  }
  return {
    title,
    description,
    minAge,
    maxAge,
    skill: skillRaw as Skill,
    minutes,
    materials: lineList(body["materials"], 16, 80),
    steps,
    language: languageOf(body["language"]),
  };
}

export function parseReview(body: Record<string, unknown>): {
  decision: "approve" | "reject";
  note: string;
} {
  const decision = body["decision"];
  if (decision !== "approve" && decision !== "reject") {
    throw new ShareError(400, "invalid_review", "Choose approve or reject.");
  }
  return { decision, note: textBlock(body["note"], 280) };
}

export function applyInput(
  existing: CreatorActivity,
  input: CreatorActivityInput,
  ownerName: string,
  now: string,
): CreatorActivity {
  return {
    ...existing,
    ...input,
    ownerName,
    status: "pending",
    reviewNote: "",
    updatedAt: now,
  };
}
