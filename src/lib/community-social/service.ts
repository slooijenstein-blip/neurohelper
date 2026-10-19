import type { Actor } from "../share/actions.ts";
import {
  ensureOwners,
  examplesMissing,
  groupNeedsOwner,
  isSampleCommunityUser,
  isSampleGroup,
  presentCommunityDb,
  productionHidesSamples,
  seedExampleGroups,
} from "./examples.ts";
import { CommunityError, LIMITS, assertRole, clipText, isCommunityId, newId } from "./limits.ts";
import {
  activeRole,
  activeSuspension,
  assertOwnerStays,
  assertReportReason,
  canManageGroup,
  canReviewRequests,
  canSeePost,
  groupById,
  inMainFeed,
  inShorts,
  isClosedGroup,
  isCommunityFounder,
  isCommunityModerator,
  membershipOf,
  postsToday,
  type Viewer,
} from "./rules.ts";
import type { CommunityStore } from "./store.ts";
import {
  knownPeople,
  rememberPerson,
  resolveShares,
  resolveTags,
  searchPeople,
  sharesOf,
  tagsOf,
} from "./people.ts";
import type {
  ClientComment,
  ClientMember,
  ClientPerson,
  ClientPost,
  ClientReport,
  CommunityDb,
  GroupVisibility,
  SocialGroup,
  SocialMedia,
  SocialPost,
} from "./types.ts";

function viewerOf(actor: Actor | null): Viewer {
  if (!actor) return { userId: null, moderator: false };
  return {
    userId: actor.userId,
    moderator: isCommunityModerator(actor),
  };
}

function parseVisibility(raw: unknown): GroupVisibility {
  if (raw === "private" || raw === "hidden") return raw;
  return "public";
}

function summarizeGroup(db: CommunityDb, groupId: string, userId: string | null) {
  const group = groupById(db, groupId);
  const mine = membershipOf(db, group.id, userId);
  const active = db.members.filter((item) => item.groupId === group.id && item.status === "active");
  const requests = db.members.filter(
    (item) => item.groupId === group.id && item.status === "requested",
  );
  const role = mine?.status === "active" ? mine.role : null;
  const inside = role !== null || !isClosedGroup(group);
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    rules: inside ? group.rules : "",
    visibility: group.visibility,
    coverUrl: group.coverUrl,
    joinQuestion: group.joinQuestion,
    memberCount: active.length,
    myRole: role,
    requested: mine?.status === "requested",
    banned: mine?.status === "banned",
    pendingRequests: canReviewRequests(role) ? requests.length : 0,
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
    tags: tagsOf(post).map((tag) => ({ userId: tag.userId, name: tag.name })),
    ...(post.editedAt ? { editedAt: post.editedAt } : {}),
  };
}

function profileVisible(
  db: CommunityDb,
  post: SocialPost,
  viewer: Viewer,
  mode: "author" | "tagged",
): boolean {
  if (post.status === "removed" || post.status === "rejected") return false;
  if (post.status === "pending") {
    return mode === "author" && viewer.userId === post.authorId;
  }
  if (post.status !== "approved") return false;
  return canSeePost(db, post, viewer);
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

function assertVisibleGroup(group: SocialGroup) {
  if (productionHidesSamples(process.env) && isSampleGroup(group)) {
    throw new CommunityError(404, "not_found", "That group is not here.");
  }
}

function assertVisiblePost(db: CommunityDb, post: SocialPost) {
  if (!productionHidesSamples(process.env)) return;
  if (isSampleCommunityUser(post.authorId)) {
    throw new CommunityError(404, "not_found", "That post is not here.");
  }
  if (!post.groupId) return;
  const group = db.groups.find((item) => item.id === post.groupId);
  if (group && isSampleGroup(group)) {
    throw new CommunityError(404, "not_found", "That post is not here.");
  }
}

function assertGroupMember(db: CommunityDb, groupId: string, userId: string) {
  const role = activeRole(db, groupId, userId);
  if (!role) throw new CommunityError(403, "forbidden", "Join this group before posting.");
  return role;
}

/** Founder reviews every post. Group staff review only posts inside a group they run. */
function assertCanReviewPost(db: CommunityDb, user: Actor, post: SocialPost) {
  if (isCommunityModerator(user)) return;
  const role = post.groupId ? activeRole(db, post.groupId, user.userId) : null;
  if (post.groupId && canReviewRequests(role)) return;
  throw new CommunityError(
    403,
    "forbidden",
    post.groupId
      ? "You can only review posts in a group you run."
      : "Only the founder account can review the main feed.",
  );
}

function toClientReport(item: CommunityDb["reports"][number]): ClientReport {
  return {
    id: item.id,
    targetType: item.targetType,
    postId: item.postId,
    ...(item.commentId ? { commentId: item.commentId } : {}),
    excerpt: item.excerpt,
    reporterName: item.reporterName,
    reason: item.reason,
    note: item.note,
    createdAt: item.createdAt,
  };
}

function capPosts(db: CommunityDb) {
  if (db.posts.length <= LIMITS.maxStoredPosts) return;
  db.posts.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  db.posts.splice(0, db.posts.length - LIMITS.maxStoredPosts);
}

export function createCommunityService(store: CommunityStore) {
  async function readyDb() {
    const current = await store.read();
    if (!examplesMissing(current) && !groupNeedsOwner(current)) return current;
    await store.update((db) => {
      ensureOwners(db);
      seedExampleGroups(db);
    });
    return store.read();
  }

  return {
    async session(actor: Actor | null) {
      if (actor) {
        const current = await store.read();
        const known = (current.people ?? []).find((item) => item.userId === actor.userId);
        if (!known || known.name !== actor.name) {
          await store.update((db) =>
            rememberPerson(db, { userId: actor.userId, name: actor.name, role: "Parent" }),
          );
        }
      }
      const db = await store.read();
      const viewer = viewerOf(actor);
      return {
        signedIn: Boolean(actor),
        moderator: viewer.moderator,
        founder: actor ? isCommunityFounder(actor) : false,
        suspended: actor ? Boolean(activeSuspension(db, actor.userId)) : false,
        userId: actor?.userId ?? null,
        name: actor?.name ?? null,
      };
    },

    async feed(actor: Actor | null) {
      const db = presentCommunityDb(await store.read(), process.env);
      const viewer = viewerOf(actor);
      const posts = newest(
        db.posts.filter((post) => inMainFeed(post, viewer) && canSeePost(db, post, viewer)),
      );
      return posts.slice(0, 100).map((post) => toClientPost(db, post, viewer.userId));
    },

    async shorts(actor: Actor | null) {
      const db = presentCommunityDb(await store.read(), process.env);
      const viewer = viewerOf(actor);
      const posts = newest(
        db.posts.filter((post) => inShorts(db, post) && canSeePost(db, post, viewer)),
      );
      return posts.slice(0, 60).map((post) => toClientPost(db, post, viewer.userId));
    },

    async listGroups(actor: Actor | null) {
      const db = presentCommunityDb(await readyDb(), process.env);
      const userId = actor?.userId ?? null;
      return db.groups
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .filter((group) => {
          if (group.visibility !== "hidden") return true;
          return membershipOf(db, group.id, userId) !== null;
        })
        .map((group) => summarizeGroup(db, group.id, userId));
    },

    async groupDetail(actor: Actor | null, groupId: string) {
      const stored = await readyDb();
      const group = groupById(stored, groupId);
      assertVisibleGroup(group);
      const db = presentCommunityDb(stored, process.env);
      const viewer = viewerOf(actor);
      const role = activeRole(db, group.id, viewer.userId);
      if (isClosedGroup(group) && !role) {
        return {
          group: summarizeGroup(db, group.id, viewer.userId),
          members: [] as ClientMember[],
          posts: [] as ClientPost[],
        };
      }
      const members: ClientMember[] = db.members
        .filter((item) => item.groupId === group.id)
        .filter((item) => {
          if (item.status === "active") return true;
          if (item.status === "requested") return canReviewRequests(role);
          if (item.status === "banned") return role === "owner" || role === "admin";
          return false;
        })
        .map((item) => ({
          userId: item.userId,
          name: item.name,
          role: item.role,
          status: item.status,
          answer: canReviewRequests(role) ? item.answer : "",
        }));
      const posts = newest(
        db.posts.filter((post) => post.groupId === group.id && canSeePost(db, post, viewer)),
      )
        .filter((post) => post.status === "approved" || post.authorId === viewer.userId)
        .slice(0, 100)
        .map((post) => toClientPost(db, post, viewer.userId));
      return { group: summarizeGroup(db, group.id, viewer.userId), members, posts };
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
        tagUserIds?: unknown;
        shareUserIds?: unknown;
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
          assertVisibleGroup(groupById(db, groupId));
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
        rememberPerson(db, {
          userId: user.userId,
          name: user.name,
          role: assertRole(input.authorRole),
        });
        const tags = resolveTags(db, input.tagUserIds, groupId, user.userId);
        const shares = resolveShares(db, input.shareUserIds, groupId, user.userId, now);
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
          tags,
          shares,
        };
        db.posts.unshift(created);
        capPosts(db);
      });
      const db = await store.read();
      return toClientPost(db, created!, user.userId);
    },

    async editPost(
      actor: Actor | null,
      postId: string,
      input: {
        body?: unknown;
        uploadId?: unknown;
        removeMedia?: unknown;
        tagUserIds?: unknown;
        shareUserIds?: unknown;
        consent?: unknown;
      },
      now: string,
    ) {
      const user = requireUser(actor);
      let removedUrl: string | null = null;
      await store.update((db) => {
        assertNotSuspended(db, user.userId);
        const post = requirePost(db, postId);
        assertVisiblePost(db, post);
        if (post.authorId !== user.userId) {
          throw new CommunityError(403, "forbidden", "Only the author can edit this post.");
        }
        if (post.status === "removed") {
          throw new CommunityError(400, "invalid", "That post was removed.");
        }
        const body = clipText(input.body, LIMITS.maxBody);
        let media = post.media;
        if (input.removeMedia === true) {
          if (post.media?.url) removedUrl = post.media.url;
          media = null;
        }
        if (typeof input.uploadId === "string" && input.uploadId) {
          if (input.consent !== true) {
            throw new CommunityError(
              400,
              "consent_required",
              "Confirm you have consent before posting a photo or video.",
            );
          }
          const next = takeUpload(db, user, input.uploadId);
          if (post.media?.url && post.media.url !== next.url) removedUrl = post.media.url;
          media = next;
        }
        if (!body && !media) {
          throw new CommunityError(400, "invalid", "Write something or add a photo or video.");
        }
        const tags = resolveTags(
          db,
          input.tagUserIds ?? tagsOf(post).map((tag) => tag.userId),
          post.groupId,
          user.userId,
        );
        const added = resolveShares(db, input.shareUserIds, post.groupId, user.userId, now);
        const shares = sharesOf(post);
        for (const share of added) {
          if (!shares.some((item) => item.userId === share.userId)) shares.push(share);
        }
        post.body = body;
        post.media = media;
        post.tags = tags;
        post.shares = shares;
        post.editedAt = now;
        post.status = "pending";
        delete post.statusReason;
        delete post.reviewedAt;
        delete post.reviewedBy;
        post.consent = post.consent || input.consent === true;
      });
      const db = await store.read();
      return { post: toClientPost(db, requirePost(db, postId), user.userId), removedUrl };
    },

    async deletePost(actor: Actor | null, postId: string) {
      const user = requireUser(actor);
      let removedUrl: string | null = null;
      await store.update((db) => {
        const post = requirePost(db, postId);
        assertVisiblePost(db, post);
        if (post.authorId !== user.userId) {
          throw new CommunityError(403, "forbidden", "Only the author can delete this post.");
        }
        if (post.media?.url) removedUrl = post.media.url;
        db.posts = db.posts.filter((item) => item.id !== post.id);
        db.reports = db.reports.filter((item) => item.postId !== post.id);
      });
      return { removedUrl };
    },

    async removeOwnTag(actor: Actor | null, postId: string) {
      const user = requireUser(actor);
      await store.update((db) => {
        const post = requirePost(db, postId);
        assertVisiblePost(db, post);
        const tags = tagsOf(post);
        if (!tags.some((tag) => tag.userId === user.userId)) {
          throw new CommunityError(404, "not_found", "You are not tagged on that post.");
        }
        post.tags = tags.filter((tag) => tag.userId !== user.userId);
      });
    },

    async findPeople(actor: Actor | null, query: string, groupId: string | null) {
      const user = requireUser(actor);
      const db = presentCommunityDb(await store.read(), process.env);
      if (groupId) assertVisibleGroup(groupById(db, groupId));
      return searchPeople(db, query, groupId, user.userId).map((person) => ({
        userId: person.userId,
        name: person.name,
        role: person.role,
      }));
    },

    async person(_actor: Actor | null, userId: string): Promise<ClientPerson> {
      const db = presentCommunityDb(await store.read(), process.env);
      const found = knownPeople(db).find((item) => item.userId === userId) ?? null;
      if (!found || found.userId.startsWith("child_")) {
        throw new CommunityError(404, "not_found", "That person is not here.");
      }
      if (productionHidesSamples(process.env) && isSampleCommunityUser(found.userId)) {
        throw new CommunityError(404, "not_found", "That person is not here.");
      }
      return { userId: found.userId, name: found.name, role: found.role };
    },

    async profilePosts(actor: Actor | null, userId: string) {
      const viewer = viewerOf(actor);
      const db = presentCommunityDb(await store.read(), process.env);
      const posts = newest(
        db.posts.filter(
          (post) => post.authorId === userId && profileVisible(db, post, viewer, "author"),
        ),
      ).slice(0, 60);
      return posts.map((post) => toClientPost(db, post, viewer.userId));
    },

    async profileTagged(actor: Actor | null, userId: string) {
      const viewer = viewerOf(actor);
      const db = presentCommunityDb(await store.read(), process.env);
      const posts = newest(
        db.posts.filter(
          (post) =>
            tagsOf(post).some((tag) => tag.userId === userId) &&
            profileVisible(db, post, viewer, "tagged"),
        ),
      ).slice(0, 60);
      return posts.map((post) => toClientPost(db, post, viewer.userId));
    },

    async sharedWith(actor: Actor | null) {
      const user = requireUser(actor);
      const viewer = viewerOf(user);
      const db = presentCommunityDb(await store.read(), process.env);
      const posts = newest(
        db.posts.filter(
          (post) =>
            sharesOf(post).some((share) => share.userId === user.userId) &&
            post.status === "approved" &&
            canSeePost(db, post, viewer),
        ),
      ).slice(0, 60);
      return posts.map((post) => toClientPost(db, post, viewer.userId));
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
        const viewer = viewerOf(user);
        const post = requirePost(db, postId);
        assertVisiblePost(db, post);
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
        const viewer = viewerOf(user);
        const post = requirePost(db, postId);
        assertVisiblePost(db, post);
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
        const viewer = viewerOf(user);
        const post = requirePost(db, postId);
        assertVisiblePost(db, post);
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
      const db = presentCommunityDb(await store.read(), process.env);
      if (!isCommunityModerator(user)) {
        throw new CommunityError(
          403,
          "forbidden",
          "Only the founder account can open the review list.",
        );
      }
      const posts = newest(db.posts.filter((post) => post.status === "pending")).map((post) =>
        toClientPost(db, post, user.userId),
      );
      const reports: ClientReport[] = db.reports
        .filter((item) => item.status === "open")
        .map(toClientReport);
      return { posts, reports, moderators: [...db.moderators] };
    },

    async groupQueue(actor: Actor | null, groupId: string) {
      const user = requireUser(actor);
      const stored = await store.read();
      const group = groupById(stored, groupId);
      assertVisibleGroup(group);
      const db = presentCommunityDb(stored, process.env);
      const role = activeRole(db, group.id, user.userId);
      if (!canReviewRequests(role)) {
        throw new CommunityError(
          403,
          "forbidden",
          "Only a group owner, admin, or moderator can review this group.",
        );
      }
      const posts = newest(
        db.posts.filter((post) => post.groupId === group.id && post.status === "pending"),
      ).map((post) => toClientPost(db, post, user.userId));
      const inGroup = new Set(
        db.posts.filter((post) => post.groupId === group.id).map((post) => post.id),
      );
      const reports = db.reports
        .filter((item) => item.status === "open" && inGroup.has(item.postId))
        .map(toClientReport);
      return { posts, reports };
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
        const post = requirePost(db, postId);
        assertCanReviewPost(db, user, post);
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
        const post = requirePost(db, postId);
        assertCanReviewPost(db, user, post);
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
        if (!isCommunityModerator(user)) {
          throw new CommunityError(403, "forbidden", "Only the founder account can pause posting.");
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

    async setModerator() {
      throw new CommunityError(
        403,
        "forbidden",
        "Only the founder account can review posts. There is no other moderator list.",
      );
    },

    async createGroup(
      actor: Actor | null,
      input: {
        name?: unknown;
        description?: unknown;
        rules?: unknown;
        visibility?: unknown;
        joinQuestion?: unknown;
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
        const visibility = parseVisibility(input.visibility);
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
          joinQuestion: clipText(input.joinQuestion, LIMITS.maxJoinQuestion),
          createdBy: user.userId,
          createdAt: now,
        });
        db.members.push({
          groupId: id,
          userId: user.userId,
          name: clipText(user.name, 80) || "Member",
          role: "owner",
          status: "active",
          answer: "",
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
        joinQuestion?: unknown;
        uploadId?: unknown;
      },
    ) {
      const user = requireUser(actor);
      await store.update((db) => {
        const group = groupById(db, groupId);
        assertVisibleGroup(group);
        const role = activeRole(db, group.id, user.userId);
        if (!canManageGroup(role)) {
          throw new CommunityError(
            403,
            "forbidden",
            "Only a group owner or admin can change the group.",
          );
        }
        const name = clipText(input.name, LIMITS.maxGroupName);
        if (name.length < 2) throw new CommunityError(400, "invalid", "Give the group a name.");
        group.name = name;
        group.description = clipText(input.description, LIMITS.maxGroupDescription);
        group.rules = clipText(input.rules, LIMITS.maxGroupRules);
        group.visibility = parseVisibility(input.visibility);
        group.joinQuestion = clipText(input.joinQuestion, LIMITS.maxJoinQuestion);
        if (typeof input.uploadId === "string" && input.uploadId) {
          const media = takeUpload(db, user, input.uploadId);
          if (media.kind !== "image") {
            throw new CommunityError(400, "invalid", "The cover needs to be a picture.");
          }
          group.coverUrl = media.url;
        }
      });
    },

    async deleteGroup(actor: Actor | null, groupId: string) {
      const user = requireUser(actor);
      await store.update((db) => {
        const group = groupById(db, groupId);
        assertVisibleGroup(group);
        if (activeRole(db, group.id, user.userId) !== "owner") {
          throw new CommunityError(403, "forbidden", "Only the owner can delete the group.");
        }
        db.groups = db.groups.filter((item) => item.id !== group.id);
        db.members = db.members.filter((item) => item.groupId !== group.id);
        for (const post of db.posts) {
          if (post.groupId === group.id && post.status !== "removed") {
            post.status = "removed";
            post.statusReason = "The group was deleted.";
          }
        }
      });
    },

    async transferOwnership(actor: Actor | null, groupId: string, targetId: string) {
      const user = requireUser(actor);
      await store.update((db) => {
        const group = groupById(db, groupId);
        assertVisibleGroup(group);
        if (activeRole(db, group.id, user.userId) !== "owner") {
          throw new CommunityError(403, "forbidden", "Only the owner can transfer the group.");
        }
        const target = db.members.find(
          (item) =>
            item.groupId === group.id && item.userId === targetId && item.status === "active",
        );
        if (!target || target.userId === user.userId) {
          throw new CommunityError(400, "invalid", "Choose another member.");
        }
        const owner = db.members.find(
          (item) =>
            item.groupId === group.id && item.userId === user.userId && item.status === "active",
        );
        if (!owner)
          throw new CommunityError(403, "forbidden", "Only the owner can transfer the group.");
        target.role = "owner";
        owner.role = "admin";
        group.createdBy = target.userId;
      });
    },

    async joinGroup(actor: Actor | null, groupId: string, now: string, answerRaw?: unknown) {
      const user = requireUser(actor);
      let result: "joined" | "requested" = "joined";
      await store.update((db) => {
        const group = groupById(db, groupId);
        assertVisibleGroup(group);
        const existing = membershipOf(db, group.id, user.userId);
        if (existing?.status === "banned") {
          throw new CommunityError(403, "forbidden", "You cannot join this group.");
        }
        if (existing?.status === "active") {
          result = "joined";
          return;
        }
        if (existing?.status === "requested") {
          result = "requested";
          return;
        }
        const answer = clipText(answerRaw, LIMITS.maxJoinAnswer);
        const open = group.visibility === "public";
        result = open ? "joined" : "requested";
        if (existing) {
          existing.status = open ? "active" : "requested";
          existing.role = "member";
          existing.answer = answer;
          existing.name = clipText(user.name, 80) || existing.name;
          return;
        }
        db.members.push({
          groupId: group.id,
          userId: user.userId,
          name: clipText(user.name, 80) || "Member",
          role: "member",
          status: open ? "active" : "requested",
          answer,
          createdAt: now,
        });
      });
      return result;
    },

    async leaveGroup(actor: Actor | null, groupId: string) {
      const user = requireUser(actor);
      await store.update((db) => {
        assertVisibleGroup(groupById(db, groupId));
        const role = activeRole(db, groupId, user.userId);
        assertOwnerStays(role);
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
        assertVisibleGroup(group);
        const role = activeRole(db, group.id, user.userId);
        const target = db.members.find(
          (item) => item.groupId === group.id && item.userId === targetId,
        );
        if (!target) throw new CommunityError(404, "not_found", "That person is not in the group.");
        const action = input.action;
        if (action === "approve" || action === "decline") {
          if (!canReviewRequests(role)) {
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
        if (action === "remove" || action === "ban" || action === "unban") {
          if (targetId === user.userId) {
            throw new CommunityError(400, "invalid", "Use leave group for yourself.");
          }
          if (target.role === "owner") {
            throw new CommunityError(
              403,
              "forbidden",
              "Transfer ownership before removing the owner.",
            );
          }
          const staff = role === "owner" || role === "admin";
          const modRemovesMember =
            role === "moderator" && target.role === "member" && action === "remove";
          const adminTouchesAdmin =
            role === "admin" && (target.role === "admin" || target.role === "owner");
          if ((!staff && !modRemovesMember) || adminTouchesAdmin) {
            throw new CommunityError(403, "forbidden", "You cannot change that person.");
          }
          if (action === "unban") {
            if (role !== "owner" && role !== "admin") {
              throw new CommunityError(403, "forbidden", "You cannot change that person.");
            }
            db.members = db.members.filter((item) => item !== target);
            return;
          }
          if (action === "ban") {
            if (role !== "owner" && role !== "admin") {
              throw new CommunityError(403, "forbidden", "You cannot ban that person.");
            }
            target.status = "banned";
            target.role = "member";
            return;
          }
          db.members = db.members.filter((item) => item !== target);
          return;
        }
        if (action === "setRole") {
          const next = input.role;
          if (next !== "admin" && next !== "moderator" && next !== "member") {
            throw new CommunityError(400, "invalid", "Choose a role.");
          }
          if (target.status !== "active" || target.role === "owner") {
            throw new CommunityError(400, "invalid", "Choose another member.");
          }
          if (role === "owner") {
            target.role = next;
            return;
          }
          if (
            role === "admin" &&
            (target.role === "moderator" || target.role === "member") &&
            next !== "admin"
          ) {
            target.role = next;
            return;
          }
          throw new CommunityError(403, "forbidden", "Only the owner can appoint an admin.");
        }
        if (action === "transfer") {
          throw new CommunityError(400, "invalid", "Use transfer for ownership.");
        }
        throw new CommunityError(400, "invalid", "That action is not available.");
      });
    },
  };
}

export type CommunityService = ReturnType<typeof createCommunityService>;
