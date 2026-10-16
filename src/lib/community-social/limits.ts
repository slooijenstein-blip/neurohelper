export const COMMUNITY_ROLES = [
  "Parent",
  "Legal Guardian",
  "Teacher",
  "Therapist",
  "Creator",
  "Grandparent",
  "Family Member",
  "Caregiver",
  "Other",
  "Founder",
] as const;

export const LIMITS = {
  maxVideoSeconds: 60,
  maxVideoBytes: 20 * 1024 * 1024,
  maxImageBytes: 1_500_000,
  maxImageEdge: 1600,
  imageQuality: 0.82,
  maxBody: 2000,
  maxComment: 500,
  maxReason: 300,
  maxGroupName: 80,
  maxGroupDescription: 600,
  maxGroupRules: 1000,
  maxJoinQuestion: 200,
  maxJoinAnswer: 300,
  maxNote: 300,
  postsPerDay: 30,
  videosPerDay: 8,
  maxComments: 100,
  maxStoredPosts: 2000,
} as const;

export class CommunityError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CommunityError";
    this.status = status;
    this.code = code;
  }
}

export function clipText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  let cleaned = "";
  for (const char of raw) {
    const code = char.charCodeAt(0);
    cleaned += code < 32 && char !== "\n" && char !== "\t" ? " " : char;
  }
  return cleaned
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export function assertRole(raw: unknown): string {
  if (typeof raw === "string" && (COMMUNITY_ROLES as readonly string[]).includes(raw)) return raw;
  return "Parent";
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function isCommunityId(id: string, prefix: string): boolean {
  return new RegExp(`^${prefix}_[a-z0-9]{8,32}$`).test(id);
}
