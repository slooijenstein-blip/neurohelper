import type { Actor } from "../share/actions.ts";
import { assertEmail, canonicalEmail } from "../share/names.ts";
import { ShareError } from "../share/errors.ts";
import { CommunityError, LIMITS, assertRole, clipText, isCommunityId, newId } from "./limits.ts";
import {
  activeRole,
  activeSuspension,
  assertLastAdminStays,
  assertReportReason,
  canReviewRequests,
  canSeePost,
  groupById,
  inMainFeed,
  inShorts,
  isCommunityFounder,
  isCommunityModerator,
  membershipOf,
  postsToday,
  type Viewer,
} from "./rules.ts";
import type { CommunityStore } from "./store.ts";
import type {
  ClientComment,
  ClientGroup,
  ClientMember,
  ClientPost,
  ClientReport,
  CommunityDb,
  GroupRole,
  GroupVisibility,
  SocialMedia,
  SocialPost,
} from "./types.ts";

function viewerOf(actor: Actor | null, db: CommunityDb): Viewer {
  if (!actor) return { userId: null, moderator: false };
  return {
    userId: actor.userId,
    moderator: isCommunityModerator(actor, db.moderators),
  };
}

function toComment(comment: SocialPost["comments"][number]): ClientComment {
  return {
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.authorName,
    authorRole: comment.authorRole,
    text: comment.text,
    createdAt: comment.createdAt,
  };
}

export function toClientPost(
  db: CommunityDb,
  post: SocialPost,
  viewerId: string | null,
): ClientPost {
  const group = post.groupId ? db.groups.find((item) => item.id === post.groupId) : undefined;
  return {
    id: post.id,
    authorId: post.authorId,
    authorName: post.authorName,
    authorRole: post.authorRole,
    body: post.body,
    createdAt: post.createdAt,
    status: post.status,
    ...(post.statusReason ? { statusReason: post.statusReason } : {}),
    groupId: post.groupId,
    ...(group ? { groupName: group.name } : {}),
    media: post.media
      ? {
          kind: post.media.kind,
          url: post.media.url,
          ...(post.media.width ? { width: post.media.width } : {}),
          ...(post.media.height ? { height: post.media.height } : {}),
          ...(post.media.durationSec ? { durationSec: post.media.durationSec } : {}),
        }
      : null,
    likeCount: post.likeUserIds.length,
    liked: Boolean(viewerId && post.likeUserIds.includes(viewerId)),
    comments: post.comments.filter((comment) => comment.status === "visible").map(toComment),
  };
}

function newest(posts: SocialPost[]): SocialPost[] {
  return [...posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function requireUser(actor: Actor | null): Actor {
  if (!actor) throw new CommunityError(401, "unauthorized", "Sign in to continue.");
  return actor;
}

function assertNotSuspended(db: CommunityDb, userId: string) {
  if (activeSuspension(db, userId)) {
    throw new CommunityError(403, "suspended", "Posting is paused on this account.");
  }
}

function requirePost(db: CommunityDb, id: string): SocialPost {
  const post = db.posts.find((item) => item.id === id);
  if (!post) throw new CommunityError(404, "not_found", "That post is not here.");
  return post;
}

function takeUpload(db: CommunityDb, actor: Actor, uploadId: string): SocialMedia {
  if (!isCommunityId(uploadId, "cupl")) {
    throw new CommunityError(400, "invalid", "That file is missing. Choose it again.");
  }
  const index = db.uploads.findIndex(
    (item) => item.id === uploadId && item.userId === actor.userId,
  );
  if (index < 0) throw new CommunityError(400, "invalid", "That file is missing. Choose it again.");
  const upload = db.uploads[index]!;
  db.uploads.splice(index, 1);
  return upload.media;
}

function assertGroupMember(db: CommunityDb, groupId: string, userId: string) {
  const role = activeRole(db, groupId, userId);
  if (!role) throw new CommunityError(403, "forbidden", "Join this group before posting.");
  return role;
}

function capPosts(db: CommunityDb) {
  if (db.posts.length <= LIMITS.maxStoredPosts) return;
  db.posts.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  db.posts.splice(0, db.posts.length - LIMITS.maxStoredPosts);
}

export function createCommunityService(store: CommunityStore) {
  return {
    async session(actor: Actor | null) {
      const db = await store.read();
      const viewer = viewerOf(actor, db);
      return {
        signedIn: Boolean(actor),
        moderator: viewer.moderator,
        founder: actor ? isCommunityFounder(actor) : false,
        suspended: actor ? Boolean(activeSuspension(db, actor.userId)) : false,
        userId: actor?.userId ?? null,
      };
    },

    async feed(actor: Actor | null) {
      const db = await store.read();
      const viewer = viewerOf(actor, db);
      const posts = newest(
        db.posts.filter((post) => inMainFeed(post, viewer) && canSeePost(db, post, viewer)),
      );
      return posts.slice(0, 100).map((post) => toClientPost(db, post, viewer.userId));
    },

    async shorts(actor: Actor | null) {
      const db = await store.read();
      const viewer = viewerOf(actor, db);
      const posts = newest(
        db.posts.filter((post) => inShorts(db, post) && canSeePost(db, post, viewer)),
      );
      return posts.slice(0, 60).map((post) => toClientPost(db, post, viewer.userId));
    },

    async listGroups(actor: Actor | null) {
      const db = await store.read();
      const groups: ClientGroup[] = db.groups
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((group) => {
          const mine = membershipOf(db, group.id, actor?.userId ?? null);
          const active = db.members.filter(
            (item) => item.groupId === group.id && item.status === "active",
          );
          const requests = db.members.filter(
            (item) => item.groupId === group.id && item.status === "requested",
          );
          const role = mine?.status === "active" ? mine.role : null;
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            rules: role || group.visibility === "public" ? group.rules : "",
            visibility: group.visibility,
            coverUrl: group.coverUrl,
            memberCount: active.length,
            myRole: role,
            requested: mine?.status === "requested",
            pendingRequests: role === "admin" || role === "moderator" ? requests.length : 0,
          };
        });
      return groups;
    },

    async groupDetail(actor: Actor | null, groupId: string) {
      const db = await store.read();
      const viewer = viewerOf(actor, db);
      const group = groupById(db, groupId);
      const role = activeRole(db, group.id, viewer.userId);
      const requested = membershipOf(db, group.id, viewer.userId)?.status === "requested";
      if (group.visibility === "private" && !role && !viewer.moderator) {
        return {
          group: {
            id: group.id,
            name: group.name,
            description: group.description,
            rules: "",
            visibility: group.visibility,
            coverUrl: group.coverUrl,
            memberCount: db.members.filter(
              (item) => item.groupId === group.id && item.status === "active",
            ).length,
            myRole: null,
            requested,
            pendingRequests: 0,
          } satisfies ClientGroup,
          members: [] as ClientMember[],
          posts: [] as ClientPost[],
        };
      }
      const members: ClientMember[] = db.members
        .filter((item) => item.groupId === group.id)
        .filter((item) => item.status === "active" || canReviewRequests(role) || viewer.moderator)
        .map((item) => ({
          userId: item.userId,
          name: item.name,
          role: item.role,
          status: item.status,
        }));
      const posts = newest(
        db.posts.filter((post) => post.groupId === group.id && canSeePost(db, post, viewer)),
      )
        .filter(
          (post) =>
            post.status === "approved" || post.authorId === viewer.userId || viewer.moderator,
        )
        .slice(0, 100)
        .map((post) => toClientPost(db, post, viewer.userId));
      const summary = (await this.listGroups(actor)).find((item) => item.id === group.id)!;
      return { group: summary, members, posts };
    },

    async createPost(
      actor: Actor | null,
      input: {
        body?: unknown;
        privacyAck?: unknown;
        consent?: unknown;
        uploadId?: unknown;
        groupId?: unknown;
        authorRole?: unknown;
      },
      now: string,
    ) {
      const user = requireUser(actor);
      let created: SocialPost | null = null;
      await store.update((db) => {
        assertNotSuspended(db, user.userId);
        if (input.privacyAck !== true) {
          throw new CommunityError(
            400,
            "consent_required",
            "Read the privacy reminder before posting.",
          );
        }
        const body = clipText(input.body, LIMITS.maxBody);
        const groupId = typeof input.groupId === "string" && input.groupId ? input.groupId : null;
        if (groupId) {
          groupById(db, groupId);
          assertGroupMember(db, groupId, user.userId);
        }
        let media: SocialMedia | null = null;
        if (typeof input.uploadId === "string" && input.uploadId) {
          if (input.consent !== true) {
            throw new CommunityError(
              400,
              "consent_required",
              "Confirm you have consent before posting a photo or video.",
            );
          }
          media = takeUpload(db, user, input.uploadId);
          if (media.kind === "video") {
            const duration = media.durationSec ?? 0;
            if (duration <= 0 || duration > LIMITS.maxVideoSeconds) {
              throw new CommunityError(400, "video_too_long", "Videos can be up to 60 seconds.");
            }
            if (media.bytes > LIMITS.maxVideoBytes) {
              throw new CommunityError(400, "video_too_big", "That video is too large.");
            }
            if (postsToday(db, user.userId, now, "video") >= LIMITS.videosPerDay) {
              throw new CommunityError(429, "limit", "That is enough videos for today.");
            }
          }
          if (media.kind === "image" && media.bytes > LIMITS.maxImageBytes) {
            throw new CommunityError(400, "invalid", "That picture is too large.");
          }
        }
        if (!body && !media) {
          throw new CommunityError(400, "invalid", "Write something or add a photo or video.");
        }
        if (postsToday(db, user.userId, now) >= LIMITS.postsPerDay) {
          throw new CommunityError(429, "limit", "That is enough posts for today.");
        }
        created = {
          id: newId("cpost"),
          authorId: user.userId,
          authorName: clipText(user.name, 80) || "Member",
          authorRole: assertRole(input.authorRole),
          body,
          createdAt: now,
          status: "pending",
          groupId,
          media,
          privacyAck: true,
          consent: input.consent === true,
          likeUserIds: [],
          comments: [],
        };
        db.posts.unshift(created);
        capPosts(db);
      });
      const db = await store.read();
      return toClientPost(db, created!, user.userId);
    },

    async saveUpload(actor: Actor | null, media: SocialMedia, now: string) {
      const user = requireUser(actor);
      const id = newId("cupl");
      await store.update((db) => {
        assertNotSuspended(db, user.userId);
        db.uploads.push({ id, userId: user.userId, media, createdAt: now });
        if (db.uploads.length > 100) db.uploads.splice(0, db.uploads.length - 100);
      });
      return id;
    },

    async toggleLike(actor: Actor | null, postId: string) {
      const user = requireUser(actor);
      await store.update((db) => {
        const viewer = viewerOf(user, db);
        const post = requirePost(db, postId);
        if (!canSeePost(db, post, viewer) || post.status !== "approved") {
          throw new CommunityError(403, "forbidden", "You cannot like that post.");
        }
        if (post.likeUserIds.includes(user.userId)) {
          post.likeUserIds = post.likeUserIds.filter((id) => id !== user.userId);
        } else {
          post.likeUserIds.push(user.userId);
        }
      });
    },

    async addComment(
      actor: Actor | null,
      postId: string,
      input: { text?: unknown; authorRole?: unknown },
      now: string,
    ) {
      const user = requireUser(actor);
      await store.update((db) => {
        assertNotSuspended(db, user.userId);
        const viewer = viewerOf(user, db);
        const post = requirePost(db, postId);
        if (!canSeePost(db, post, viewer) || post.status !== "approved") {
          throw new CommunityError(403, "forbidden", "You cannot comment on that post.");
        }
        const text = clipText(input.text, LIMITS.maxComment);
        if (!text) throw new CommunityError(400, "invalid", "Write a comment first.");
        const visible = post.comments.filter((comment) => comment.status === "visible");
        if (visible.length >= LIMITS.maxComments) {
          throw new CommunityError(429, "limit", "This post has enough comments.");
        }
        post.comments.push({
          id: newId("ccmt"),
          authorId: user.userId,
          authorName: clipText(user.name, 80) || "Member",
          authorRole: assertRole(input.authorRole),
          text,
          createdAt: now,
          status: "visible",
        });
      });
    },

    async report(
      actor: Actor | null,
      input: {
        targetType?: unknown;
        postId?: unknown;
        commentId?: unknown;
        reason?: unknown;
        note?: unknown;
      },
      now: string,
    ) {
      const user = requireUser(actor);
      const reason = assertReportReason(input.reason);
      const postId = typeof input.postId === "string" ? input.postId : "";
      await store.update((db) => {
        const viewer = viewerOf(user, db);
        const post = requirePost(db, postId);
        if (!canSeePost(db, post, viewer)) {
          throw new CommunityError(403, "forbidden", "You cannot report that.");
        }
        const targetType = input.targetType === "comment" ? "comment" : "post";
        let commentId: string | undefined;
        let excerpt = post.body || (post.media?.kind === "video" ? "Video" : "Photo");
        if (targetType === "comment") {
          commentId = typeof input.commentId === "string" ? input.commentId : "";
          const comment = post.comments.find(
            (item) => item.id === commentId && item.status === "visible",
          );
          if (!comment) throw new CommunityError(404, "not_found", "That comment is not here.");
          excerpt = comment.text;
        }
        const duplicate = db.reports.find(
          (item) =>
            item.status === "open" &&
            item.reporterId === user.userId &&
            item.postId === post.id &&
            item.commentId === commentId &&
            item.targetType === targetType,
        );
        if (duplicate) return;
        db.reports.unshift({
          id: newId("crep"),
          targetType,
          postId: post.id,
          ...(commentId ? { commentId } : {}),
          excerpt: excerpt.slice(0, 280),
          reporterId: user.userId,
          reporterName: clipText(user.name, 80) || "Member",
          reason,
          note: clipText(input.note, LIMITS.maxNote),
          createdAt: now,
          status: "open",
        });
      });
    },

    async queue(actor: Actor | null) {
      const user = requireUser(actor);
      const db = await store.read();
      if (!isCommunityModerator(user, db.moderators)) {
        throw new CommunityError(403, "forbidden", "Only moderators can open the review list.");
      }
      const posts = newest(db.posts.filter((post) => post.status === "pending")).map((post) =>
        toClientPost(db, post, user.userId),
      );
      const reports: ClientReport[] = db.reports
        .filter((item) => item.status === "open")
        .map((item) => ({
          id: item.id,
          targetType: item.targetType,
          postId: item.postId,
          ...(item.commentId ? { commentId: item.commentId } : {}),
          excerpt: item.excerpt,
          reporterName: item.reporterName,
          reason: item.reason,
          note: item.note,
          createdAt: item.createdAt,
        }));
      return { posts, reports, moderators: [...db.moderators] };
    },

    async review(
      actor: Actor | null,
      postId: string,
      input: { action?: unknown; reason?: unknown },
      now: string,
    ) {
      const user = requireUser(actor);
      let removedUrl: string | null = null;
      await store.update((db) => {
        if (!isCommunityModerator(user, db.moderators)) {
          throw new CommunityError(403, "forbidden", "Only moderators can review posts.");
        }
        const post = requirePost(db, postId);
        const action = input.action;
        if (action === "approve") {
          if (post.status === "removed") {
            throw new CommunityError(400, "invalid", "That post was removed.");
          }
          post.status = "approved";
          delete post.statusReason;
        } else if (action === "reject" || action === "remove") {
          const reason = clipText(input.reason, LIMITS.maxReason);
          if (!reason) throw new CommunityError(400, "invalid", "Add a short reason.");
          post.status = action === "reject" ? "rejected" : "removed";
          post.statusReason = reason;
          if (action === "remove" && post.media) removedUrl = post.media.url;
        } else {
          throw new CommunityError(400, "invalid", "Choose approve, reject, or remove.");
        }
        post.reviewedAt = now;
        post.reviewedBy = user.userId;
        for (const report of db.reports) {
          if (report.postId === post.id && report.status === "open" && action !== "approve") {
            report.status = "resolved";
          }
          if (report.postId === post.id && report.targetType === "post" && action === "approve") {
            report.status = "resolved";
          }
        }
      });
      return { removedUrl };
    },

    async removeComment(actor: Actor | null, postId: string, commentId: string) {
      const user = requireUser(actor);
      await store.update((db) => {
        if (!isCommunityModerator(user, db.moderators)) {
          throw new CommunityError(403, "forbidden", "Only moderators can remove a comment.");
        }
        const post = requirePost(db, postId);
        const comment = post.comments.find((item) => item.id === commentId);
        if (!comment) throw new CommunityError(404, "not_found", "That comment is not here.");
        comment.status = "removed";
        for (const report of db.reports) {
          if (report.commentId === commentId && report.status === "open")
            report.status = "resolved";
        }
      });
    },

    async setSuspension(
      actor: Actor | null,
      input: { userId?: unknown; active?: unknown; reason?: unknown },
      now: string,
    ) {
      const user = requireUser(actor);
      const targetId = typeof input.userId === "string" ? input.userId : "";
      if (!targetId || targetId === user.userId) {
        throw new CommunityError(400, "invalid", "Choose another person.");
      }
      await store.update((db) => {
        if (!isCommunityModerator(user, db.moderators)) {
          throw new CommunityError(403, "forbidden", "Only moderators can pause posting.");
        }
        const active = input.active === true;
        const reason = clipText(input.reason, LIMITS.maxReason);
        if (active && !reason) throw new CommunityError(400, "invalid", "Add a short reason.");
        const current = db.suspensions.find((item) => item.userId === targetId);
        if (current) {
          current.active = active;
          current.reason = reason || current.reason;
          current.byUserId = user.userId;
          current.createdAt = now;
        } else if (active) {
          db.suspensions.push({
            userId: targetId,
            reason,
            byUserId: user.userId,
            createdAt: now,
            active: true,
          });
        }
      });
    },

    async setModerator(actor: Actor | null, input: { email?: unknown; action?: unknown }) {
      const user = requireUser(actor);
      let email = "";
      try {
        email = canonicalEmail(assertEmail(typeof input.email === "string" ? input.email : ""));
      } catch (err) {
        if (err instanceof ShareError) {
          throw new CommunityError(400, "invalid", "Enter the email they use to sign in.");
        }
        throw err;
      }
      await store.update((db) => {
        if (!isCommunityFounder(user)) {
          throw new CommunityError(
            403,
            "forbidden",
            "Only the founder can add or remove moderators.",
          );
        }
        if (input.action === "remove") {
          db.moderators = db.moderators.filter((item) => canonicalEmail(item) !== email);
          return;
        }
        if (input.action !== "add")
          throw new CommunityError(400, "invalid", "Choose add or remove.");
        if (!db.moderators.some((item) => canonicalEmail(item) === email))
          db.moderators.push(email);
      });
    },

    async createGroup(
      actor: Actor | null,
      input: {
        name?: unknown;
        description?: unknown;
        rules?: unknown;
        visibility?: unknown;
        uploadId?: unknown;
      },
      now: string,
    ) {
      const user = requireUser(actor);
      let id = "";
      await store.update((db) => {
        assertNotSuspended(db, user.userId);
        const name = clipText(input.name, LIMITS.maxGroupName);
        if (name.length < 2) throw new CommunityError(400, "invalid", "Give the group a name.");
        const visibility: GroupVisibility = input.visibility === "private" ? "private" : "public";
        let coverUrl: string | null = null;
        if (typeof input.uploadId === "string" && input.uploadId) {
          const media = takeUpload(db, user, input.uploadId);
          if (media.kind !== "image") {
            throw new CommunityError(400, "invalid", "The cover needs to be a picture.");
          }
          coverUrl = media.url;
        }
        id = newId("cgrp");
        db.groups.unshift({
          id,
          name,
          description: clipText(input.description, LIMITS.maxGroupDescription),
          rules: clipText(input.rules, LIMITS.maxGroupRules),
          visibility,
          coverUrl,
          createdBy: user.userId,
          createdAt: now,
        });
        db.members.push({
          groupId: id,
          userId: user.userId,
          name: clipText(user.name, 80) || "Member",
          role: "admin",
          status: "active",
          createdAt: now,
        });
      });
      return id;
    },

    async updateGroup(
      actor: Actor | null,
      groupId: string,
      input: {
        name?: unknown;
        description?: unknown;
        rules?: unknown;
        visibility?: unknown;
        uploadId?: unknown;
      },
    ) {
      const user = requireUser(actor);
      await store.update((db) => {
        const group = groupById(db, groupId);
        const role = activeRole(db, group.id, user.userId);
        if (role !== "admin" && !isCommunityModerator(user, db.moderators)) {
          throw new CommunityError(403, "forbidden", "Only a group admin can change the group.");
        }
        const name = clipText(input.name, LIMITS.maxGroupName);
        if (name.length < 2) throw new CommunityError(400, "invalid", "Give the group a name.");
        group.name = name;
        group.description = clipText(input.description, LIMITS.maxGroupDescription);
        group.rules = clipText(input.rules, LIMITS.maxGroupRules);
        group.visibility = input.visibility === "private" ? "private" : "public";
        if (typeof input.uploadId === "string" && input.uploadId) {
          const media = takeUpload(db, user, input.uploadId);
          if (media.kind !== "image") {
            throw new CommunityError(400, "invalid", "The cover needs to be a picture.");
          }
          group.coverUrl = media.url;
        }
      });
    },

    async joinGroup(actor: Actor | null, groupId: string, now: string) {
      const user = requireUser(actor);
      await store.update((db) => {
        const group = groupById(db, groupId);
        const existing = membershipOf(db, group.id, user.userId);
        if (existing?.status === "active") return;
        if (existing?.status === "requested") return;
        db.members.push({
          groupId: group.id,
          userId: user.userId,
          name: clipText(user.name, 80) || "Member",
          role: "member",
          status: group.visibility === "public" ? "active" : "requested",
          createdAt: now,
        });
      });
    },

    async leaveGroup(actor: Actor | null, groupId: string) {
      const user = requireUser(actor);
      await store.update((db) => {
        groupById(db, groupId);
        const role = activeRole(db, groupId, user.userId);
        if (role === "admin") assertLastAdminStays(db.members, groupId, user.userId);
        db.members = db.members.filter(
          (item) => !(item.groupId === groupId && item.userId === user.userId),
        );
      });
    },

    async memberAction(
      actor: Actor | null,
      groupId: string,
      input: { userId?: unknown; action?: unknown; role?: unknown },
    ) {
      const user = requireUser(actor);
      const targetId = typeof input.userId === "string" ? input.userId : "";
      await store.update((db) => {
        const group = groupById(db, groupId);
        const role = activeRole(db, group.id, user.userId);
        const moderator = isCommunityModerator(user, db.moderators);
        const target = db.members.find(
          (item) => item.groupId === group.id && item.userId === targetId,
        );
        if (!target) throw new CommunityError(404, "not_found", "That person is not in the group.");
        const action = input.action;
        if (action === "approve" || action === "decline") {
          if (!canReviewRequests(role) && !moderator) {
            throw new CommunityError(403, "forbidden", "You cannot review join requests.");
          }
          if (target.status !== "requested") return;
          if (action === "decline") {
            db.members = db.members.filter((item) => item !== target);
            return;
          }
          target.status = "active";
          target.role = "member";
          return;
        }
        if (action === "remove") {
          if (targetId === user.userId) {
            throw new CommunityError(400, "invalid", "Use leave group for yourself.");
          }
          const allowed =
            role === "admin" || moderator || (role === "moderator" && target.role === "member");
          if (!allowed)
            throw new CommunityError(403, "forbidden", "You cannot remove that person.");
          if (target.role === "admin") assertLastAdminStays(db.members, group.id, target.userId);
          db.members = db.members.filter((item) => item !== target);
          return;
        }
        if (action === "setRole") {
          if (role !== "admin" && !moderator) {
            throw new CommunityError(403, "forbidden", "Only a group admin can change roles.");
          }
          const next = input.role;
          if (next !== "admin" && next !== "moderator" && next !== "member") {
            throw new CommunityError(400, "invalid", "Choose a role.");
          }
          if (target.status !== "active") {
            throw new CommunityError(400, "invalid", "Approve the request first.");
          }
          if (target.role === "admin" && next !== "admin") {
            assertLastAdminStays(db.members, group.id, target.userId);
          }
          target.role = next;
          return;
        }
        throw new CommunityError(400, "invalid", "That action is not available.");
      });
    },
  };
}

export type CommunityService = ReturnType<typeof createCommunityService>;
