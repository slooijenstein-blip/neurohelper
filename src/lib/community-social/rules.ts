import { canUseFounderRole } from "../founder-role.ts";
import { REPORT_REASONS, type ReportReason } from "../community.ts";
import { actorEmailKeys, assertEmail, canonicalEmail } from "../share/names.ts";
import { CommunityError, LIMITS } from "./limits.ts";
import type { CommunityDb, GroupRole, SocialGroup, SocialMembership, SocialPost } from "./types.ts";

export type Viewer = {
  userId: string | null;
  moderator: boolean;
};

type ActorEmails = { email: string; emails?: string[] };

export function isCommunityFounder(actor: ActorEmails): boolean {
  return canUseFounderRole([actor.email, ...(actor.emails ?? [])]);
}

export function isCommunityModerator(
  actor: ActorEmails,
  moderatorEmails: readonly string[],
): boolean {
  if (isCommunityFounder(actor)) return true;
  const allow = new Set<string>();
  for (const raw of moderatorEmails) {
    try {
      allow.add(canonicalEmail(assertEmail(raw)));
    } catch {
      /* skip a bad saved address */
    }
  }
  return actorEmailKeys(actor).some((key) => allow.has(canonicalEmail(key)));
}

export function activeSuspension(db: CommunityDb, userId: string) {
  return db.suspensions.find((item) => item.userId === userId && item.active) ?? null;
}

export function membershipOf(
  db: CommunityDb,
  groupId: string,
  userId: string | null,
): SocialMembership | null {
  if (!userId) return null;
  return db.members.find((item) => item.groupId === groupId && item.userId === userId) ?? null;
}

export function activeRole(
  db: CommunityDb,
  groupId: string,
  userId: string | null,
): GroupRole | null {
  const membership = membershipOf(db, groupId, userId);
  if (!membership || membership.status !== "active") return null;
  return membership.role;
}

export function canSeePost(db: CommunityDb, post: SocialPost, viewer: Viewer): boolean {
  if (viewer.moderator) return true;
  if (viewer.userId && post.authorId === viewer.userId) return true;
  if (post.status !== "approved") return false;
  if (!post.groupId) return true;
  const group = db.groups.find((item) => item.id === post.groupId);
  if (!group) return false;
  if (group.visibility === "public") return true;
  return activeRole(db, group.id, viewer.userId) !== null;
}

export function inMainFeed(post: SocialPost, viewer: Viewer): boolean {
  if (post.groupId) return false;
  if (post.status === "approved") return true;
  return Boolean(viewer.userId && post.authorId === viewer.userId);
}

export function inShorts(db: CommunityDb, post: SocialPost): boolean {
  if (post.status !== "approved" || post.media?.kind !== "video") return false;
  const duration = post.media.durationSec ?? LIMITS.maxVideoSeconds + 1;
  if (duration <= 0 || duration > LIMITS.maxVideoSeconds) return false;
  if (!post.groupId) return true;
  const group = db.groups.find((item) => item.id === post.groupId);
  return group?.visibility === "public";
}

export function canManageGroup(role: GroupRole | null, moderator: boolean): boolean {
  return moderator || role === "admin";
}

export function canReviewRequests(role: GroupRole | null): boolean {
  return role === "admin" || role === "moderator";
}

export function assertLastAdminStays(members: SocialMembership[], groupId: string, userId: string) {
  const admins = members.filter(
    (item) => item.groupId === groupId && item.status === "active" && item.role === "admin",
  );
  if (admins.length === 1 && admins[0]?.userId === userId) {
    throw new CommunityError(
      400,
      "last_admin",
      "Choose another admin before you leave or step down.",
    );
  }
}

export function assertReportReason(raw: unknown): ReportReason {
  if (typeof raw === "string" && (REPORT_REASONS as readonly string[]).includes(raw)) {
    return raw as ReportReason;
  }
  throw new CommunityError(400, "invalid", "Choose a reason.");
}

export function groupById(db: CommunityDb, groupId: string): SocialGroup {
  const group = db.groups.find((item) => item.id === groupId);
  if (!group) throw new CommunityError(404, "not_found", "That group is not here.");
  return group;
}

export function postsToday(db: CommunityDb, userId: string, now: string, kind?: "video") {
  const start = Date.parse(now) - 24 * 60 * 60 * 1000;
  return db.posts.filter((post) => {
    if (post.authorId !== userId) return false;
    if (Date.parse(post.createdAt) < start) return false;
    if (kind === "video") return post.media?.kind === "video";
    return true;
  }).length;
}
