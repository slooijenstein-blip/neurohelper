import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Actor } from "../share/actions.ts";
import { EXAMPLE_PRIVATE_ID, EXAMPLE_PUBLIC_ID } from "./examples.ts";
import { COMMUNITY_REDIS_KEY } from "./redis-store.ts";
import { createCommunityDeps, handleCommunityApi, type CommunityDeps } from "./http.ts";
import { stripIsoBmffUserData } from "./mp4-strip.ts";
import { isOwnedBlobPath } from "./media-url.ts";
import { createCommunityService } from "./service.ts";
import { createMemoryCommunityStore } from "./store.ts";

const sam: Actor = {
  userId: "user_sam",
  email: "s.looijenstein@synlumae.com",
  name: "Sam",
  isPro: true,
};
const maya: Actor = {
  userId: "user_maya",
  email: "maya@example.com",
  name: "Maya",
  isPro: false,
};
const now = "2026-10-16T09:00:00.000Z";

function box(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(payload, 8);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

describe("community media", () => {
  it("removes location boxes and keeps the video data", () => {
    const file = concat([
      box("ftyp", new TextEncoder().encode("isom")),
      box(
        "moov",
        concat([
          box("mvhd", new Uint8Array([1, 2, 3])),
          box("udta", new TextEncoder().encode("gps")),
        ]),
      ),
      box("mdat", new Uint8Array([9, 9, 9])),
      box("meta", new TextEncoder().encode("location")),
    ]);
    const stripped = stripIsoBmffUserData(file);
    assert.equal(stripped.ok, true);
    if (!stripped.ok) return;
    const text = new TextDecoder().decode(stripped.bytes);
    assert.equal(text.includes("gps"), false);
    assert.equal(text.includes("location"), false);
    assert.equal(text.includes("isom"), true);
    assert.ok(stripped.bytes.includes(9));
  });

  it("refuses a file that is not a video container", () => {
    assert.equal(stripIsoBmffUserData(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])).ok, false);
  });

  it("only accepts this user's private blob pathname", () => {
    assert.equal(isOwnedBlobPath("community/user_maya/photo.jpg", "user_maya"), true);
    assert.equal(isOwnedBlobPath("community/user_sam/photo.jpg", "user_maya"), false);
    assert.equal(isOwnedBlobPath("community/user_maya/../user_sam/photo.jpg", "user_maya"), false);
    assert.equal(
      isOwnedBlobPath(
        "https://store.private.blob.vercel-storage.com/community/user_maya/photo.jpg",
        "user_maya",
      ),
      false,
    );
  });
});

describe("community social", () => {
  it("keeps community data on its own redis key", () => {
    assert.equal(COMMUNITY_REDIS_KEY, "synlumae:community:db");
    assert.equal(COMMUNITY_REDIS_KEY.includes("synlumae:share:"), false);
  });

  it("hides a new post until a moderator approves it", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const post = await service.createPost(
      maya,
      { body: "A quiet win #calm", privacyAck: true, authorRole: "Parent" },
      now,
    );
    assert.equal(post.status, "pending");
    assert.equal(
      (await service.feed(sam)).some((item) => item.id === post.id),
      false,
    );
    assert.equal(
      (await service.feed(maya)).some((item) => item.id === post.id),
      true,
    );
    await service.review(sam, post.id, { action: "approve" }, now);
    assert.equal(
      (await service.feed(sam)).some((item) => item.id === post.id),
      true,
    );
  });

  it("requires consent for a photo and a reason to reject", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const uploadId = await service.saveUpload(
      maya,
      {
        kind: "image",
        url: "/api/community/media/cupl_testimage01",
        contentType: "image/jpeg",
        bytes: 1000,
      },
      now,
    );
    await assert.rejects(
      () =>
        service.createPost(
          maya,
          { privacyAck: true, consent: false, uploadId, authorRole: "Parent" },
          now,
        ),
      (err: unknown) => (err as { code?: string }).code === "consent_required",
    );
    const post = await service.createPost(
      maya,
      {
        body: "Hands at the table",
        privacyAck: true,
        consent: true,
        uploadId,
        authorRole: "Parent",
      },
      now,
    );
    assert.equal(post.media?.kind, "image");
    await assert.rejects(
      () => service.review(sam, post.id, { action: "reject", reason: "  " }, now),
      (err: unknown) => (err as { code?: string }).code === "invalid",
    );
    await service.review(
      sam,
      post.id,
      { action: "reject", reason: "Please crop the name tag." },
      now,
    );
    const mine = (await service.feed(maya)).find((item) => item.id === post.id);
    assert.equal(mine?.status, "rejected");
    assert.equal(mine?.statusReason, "Please crop the name tag.");
  });

  it("lets only the founder review posts and pause posting", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    await assert.rejects(
      () => service.setModerator(sam, { email: "mod@example.com", action: "add" }),
      (err: unknown) => (err as { code?: string }).code === "forbidden",
    );
    const post = await service.createPost(
      maya,
      { body: "Hello", privacyAck: true, authorRole: "Parent" },
      now,
    );
    await assert.rejects(
      () => service.review(maya, post.id, { action: "approve" }, now),
      (err: unknown) => (err as { code?: string }).code === "forbidden",
    );
    await service.review(sam, post.id, { action: "approve" }, now);
    await assert.rejects(
      () => service.setSuspension(maya, { userId: sam.userId, active: true, reason: "No" }, now),
      (err: unknown) => (err as { code?: string }).code === "forbidden",
    );
    await service.setSuspension(
      sam,
      { userId: maya.userId, active: true, reason: "Unkind comments" },
      now,
    );
    await assert.rejects(
      () =>
        service.createPost(maya, { body: "Again", privacyAck: true, authorRole: "Parent" }, now),
      (err: unknown) => (err as { code?: string }).code === "suspended",
    );
    await service.report(sam, { targetType: "post", postId: post.id, reason: "unkind" }, now);
    const queue = await service.queue(sam);
    assert.equal(queue.reports.length, 1);
    await service.review(
      sam,
      post.id,
      { action: "remove", reason: "Removed after a report." },
      now,
    );
    assert.equal(
      (await service.feed(sam)).some((item) => item.id === post.id),
      false,
    );
  });

  it("lets group staff review only posts and reports inside their group", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const guest: Actor = {
      userId: "user_guest",
      email: "guest@example.com",
      name: "Guest",
      isPro: false,
    };
    const groupId = await service.createGroup(
      maya,
      { name: "Evening songs", description: "Night.", rules: "No names.", visibility: "private" },
      now,
    );
    await service.joinGroup(guest, groupId, now, "I listen too.");
    await service.memberAction(maya, groupId, { userId: guest.userId, action: "approve" });
    const groupPost = await service.createPost(
      guest,
      { body: "Inside the group", privacyAck: true, groupId, authorRole: "Parent" },
      now,
    );
    const feedPost = await service.createPost(
      guest,
      { body: "On the main feed", privacyAck: true, authorRole: "Parent" },
      now,
    );
    const otherId = await service.createGroup(
      guest,
      { name: "Guest circle", description: "Mine.", rules: "No names.", visibility: "public" },
      now,
    );
    const otherPost = await service.createPost(
      guest,
      { body: "Another group", privacyAck: true, groupId: otherId, authorRole: "Parent" },
      now,
    );
    const forbidden = (err: unknown) => (err as { code?: string }).code === "forbidden";
    await assert.rejects(() => service.groupQueue(guest, groupId), forbidden);
    await assert.rejects(
      () => service.review(guest, groupPost.id, { action: "approve" }, now),
      forbidden,
    );
    await assert.rejects(
      () => service.review(maya, feedPost.id, { action: "approve" }, now),
      forbidden,
    );
    await assert.rejects(
      () => service.review(maya, otherPost.id, { action: "approve" }, now),
      forbidden,
    );
    await assert.rejects(() => service.queue(maya), forbidden);
    await assert.rejects(() => service.groupQueue(sam, groupId), forbidden);
    const waiting = await service.groupQueue(maya, groupId);
    assert.deepEqual(
      waiting.posts.map((item) => item.id),
      [groupPost.id],
    );
    assert.equal(
      (await service.groupQueue(guest, otherId)).posts.some((item) => item.id === groupPost.id),
      false,
    );
    await service.review(maya, groupPost.id, { action: "approve" }, now);
    assert.equal(
      (await service.groupDetail(guest, groupId)).posts.some(
        (item) => item.id === groupPost.id && item.status === "approved",
      ),
      true,
    );
    await service.report(
      guest,
      { targetType: "post", postId: groupPost.id, reason: "unkind" },
      now,
    );
    assert.equal((await service.groupQueue(maya, groupId)).reports.length, 1);
    await service.review(sam, feedPost.id, { action: "approve" }, now);
    await service.report(maya, { targetType: "post", postId: feedPost.id, reason: "spam" }, now);
    assert.equal(
      (await service.groupQueue(maya, groupId)).reports.some((item) => item.postId === feedPost.id),
      false,
    );
    const founderQueue = await service.queue(sam);
    assert.equal(
      founderQueue.posts.some((item) => item.id === otherPost.id),
      true,
    );
    assert.equal(
      founderQueue.reports.some((item) => item.postId === feedPost.id),
      true,
    );
    await service.review(sam, otherPost.id, { action: "approve" }, now);
    const second = await service.createPost(
      guest,
      { body: "One more", privacyAck: true, groupId, authorRole: "Parent" },
      now,
    );
    await service.memberAction(maya, groupId, {
      userId: guest.userId,
      action: "setRole",
      role: "moderator",
    });
    await service.review(
      guest,
      second.id,
      { action: "reject", reason: "Not for this group." },
      now,
    );
    assert.equal((await service.groupQueue(maya, groupId)).posts.length, 0);
    await service.addComment(guest, groupPost.id, { text: "A note", authorRole: "Parent" }, now);
    const commented = (await service.groupDetail(guest, groupId)).posts.find(
      (item) => item.id === groupPost.id,
    );
    const commentId = commented?.comments[0]?.id;
    assert.ok(commentId);
    await service.report(
      maya,
      { targetType: "comment", postId: groupPost.id, commentId, reason: "unkind" },
      now,
    );
    await service.removeComment(guest, groupPost.id, commentId!);
    assert.equal(
      (await service.groupQueue(maya, groupId)).reports.some(
        (item) => item.commentId === commentId,
      ),
      false,
    );
    await assert.rejects(
      () => service.removeComment(guest, feedPost.id, "cmt_missingcomment01"),
      forbidden,
    );
  });

  it("runs a private group with requests, roles, and the same review", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const groupId = await service.createGroup(
      maya,
      {
        name: "Evening songs",
        description: "What we repeat at night.",
        rules: "No full names.",
        visibility: "private",
      },
      now,
    );
    await service.joinGroup(sam, groupId, now, "I would like to listen.");
    let detail = await service.groupDetail(sam, groupId);
    assert.equal(detail.posts.length, 0);
    assert.equal(detail.members.length, 0);
    assert.equal(detail.group.requested, true);
    detail = await service.groupDetail(maya, groupId);
    assert.equal(
      detail.members.some(
        (member) => member.userId === sam.userId && member.status === "requested",
      ),
      true,
    );
    await service.memberAction(maya, groupId, { userId: sam.userId, action: "approve" });
    const uploadId = await service.saveUpload(
      sam,
      {
        kind: "video",
        url: "/api/community/media/cupl_testvideo0001",
        contentType: "video/mp4",
        bytes: 2000,
        durationSec: 12,
      },
      now,
    );
    const post = await service.createPost(
      sam,
      {
        body: "Our song",
        privacyAck: true,
        consent: true,
        uploadId,
        groupId,
        authorRole: "Founder",
      },
      now,
    );
    assert.equal((await service.shorts(maya)).length, 0);
    assert.equal(
      (await service.groupDetail(maya, groupId)).posts.some((item) => item.id === post.id),
      false,
    );
    assert.equal(
      (await service.groupDetail(sam, groupId)).posts.some((item) => item.id === post.id),
      true,
    );
    await service.review(sam, post.id, { action: "approve" }, now);
    assert.equal(
      (await service.groupDetail(maya, groupId)).posts.some((item) => item.id === post.id),
      true,
    );
    const guest: Actor = {
      userId: "user_guest",
      email: "guest@example.com",
      name: "Guest",
      isPro: false,
    };
    assert.equal((await service.groupDetail(guest, groupId)).posts.length, 0);
    assert.equal((await service.shorts(maya)).length, 0);
    await service.memberAction(maya, groupId, {
      userId: sam.userId,
      action: "setRole",
      role: "moderator",
    });
    await assert.rejects(
      () => service.leaveGroup(maya, groupId),
      (err: unknown) => (err as { code?: string }).code === "last_admin",
    );
    await service.transferOwnership(maya, groupId, sam.userId);
    await service.leaveGroup(maya, groupId);
    const after = await service.groupDetail(sam, groupId);
    assert.equal(after.group.myRole, "owner");
    const guestList = await service.listGroups(guest);
    assert.equal(
      guestList.some((item) => item.name === "Everyday wins" && item.visibility === "public"),
      true,
    );
    assert.equal(
      guestList.some((item) => item.name === "Quiet questions" && item.visibility === "private"),
      true,
    );
  });

  it("keeps a hidden group out of search and blocks a banned member", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const groupId = await service.createGroup(
      maya,
      {
        name: "Invite only",
        description: "A closed circle.",
        rules: "No names.",
        visibility: "hidden",
        joinQuestion: "Who invited you?",
      },
      now,
    );
    const guest: Actor = {
      userId: "user_guest",
      email: "guest@example.com",
      name: "Guest",
      isPro: false,
    };
    assert.equal(
      (await service.listGroups(guest)).some((item) => item.id === groupId),
      false,
    );
    const peek = await service.groupDetail(guest, groupId);
    assert.equal(peek.posts.length, 0);
    assert.equal(peek.group.joinQuestion, "Who invited you?");
    await service.joinGroup(guest, groupId, now, "Maya did.");
    await service.memberAction(maya, groupId, { userId: guest.userId, action: "approve" });
    await service.memberAction(maya, groupId, { userId: guest.userId, action: "ban" });
    await assert.rejects(
      () => service.joinGroup(guest, groupId, now),
      (err: unknown) => (err as { code?: string }).code === "forbidden",
    );
  });

  it("gives each demo role a separate community identity off production", async () => {
    const store = createMemoryCommunityStore();
    const service = createCommunityService(store);
    const deps: CommunityDeps = {
      configured: true,
      storeName: "memory",
      media: "none",
      store,
      service,
      authenticate: async () => null,
      localMediaDir: "/tmp",
      blobToken: null,
      blobStoreId: null,
    };
    const previous = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "preview";
    const therapist = await handleCommunityApi(
      new Request("http://localhost/api/community/session", {
        headers: { "x-synlumae-demo-persona": "therapist" },
      }),
      deps,
    );
    const therapistBody = (await therapist.json()) as {
      userId: string;
      name: string;
      founder: boolean;
    };
    assert.equal(therapistBody.userId, "demo_therapist");
    assert.equal(therapistBody.name, "Demo Therapist");
    assert.equal(therapistBody.founder, false);
    const groups = await handleCommunityApi(
      new Request("http://localhost/api/community/groups", {
        headers: { "x-synlumae-demo-persona": "therapist" },
      }),
      deps,
    );
    const groupBody = (await groups.json()) as {
      groups: Array<{ name: string; myRole: string | null }>;
    };
    assert.equal(groupBody.groups.find((item) => item.name === "Quiet questions")?.myRole, "owner");
    assert.equal(groupBody.groups.find((item) => item.name === "Everyday wins")?.myRole, null);
    const parent = await handleCommunityApi(
      new Request("http://localhost/api/community/session", {
        headers: { "x-synlumae-demo-persona": "parent" },
      }),
      deps,
    );
    const parentBody = (await parent.json()) as { userId: string };
    assert.equal(parentBody.userId, "demo_parent");
    assert.notEqual(parentBody.userId, therapistBody.userId);
    process.env.VERCEL_ENV = "production";
    const blocked = await handleCommunityApi(
      new Request("http://localhost/api/community/session", {
        headers: { "x-synlumae-demo-persona": "parent" },
      }),
      deps,
    );
    const blockedBody = (await blocked.json()) as { signedIn: boolean };
    assert.equal(blockedBody.signedIn, false);
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  });

  it("hides sample groups and demo posts from production readers", async () => {
    const previous = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "preview";
    try {
      const store = createMemoryCommunityStore();
      const service = createCommunityService(store);
      const previewGroups = await service.listGroups(sam);
      assert.equal(
        previewGroups.some((item) => item.name === "Everyday wins"),
        true,
      );
      assert.equal(
        previewGroups.some((item) => item.name === "Quiet questions"),
        true,
      );
      const demo: Actor = {
        userId: "demo_therapist",
        email: "demo.therapist@preview.synlumae.invalid",
        name: "Demo Therapist",
        isPro: true,
      };
      const samplePost = await service.createPost(
        demo,
        { body: "A made-up win from a demo account", privacyAck: true },
        now,
      );
      const realPost = await service.createPost(
        sam,
        { body: "hello everyone", privacyAck: true },
        now,
      );
      await service.review(sam, samplePost.id, { action: "approve" }, now);
      await service.review(sam, realPost.id, { action: "approve" }, now);
      await service.toggleLike(demo, realPost.id);
      await service.addComment(demo, realPost.id, { text: "Nice demo reply" }, now);
      const keptId = await service.createGroup(
        sam,
        {
          name: "alicante autism",
          description: "A local group.",
          rules: "Be kind.",
          visibility: "private",
        },
        now,
      );

      process.env.VERCEL_ENV = "production";
      const productionGroups = await service.listGroups(sam);
      assert.equal(
        productionGroups.some((item) => item.name === "Everyday wins"),
        false,
      );
      assert.equal(
        productionGroups.some((item) => item.name === "Quiet questions"),
        false,
      );
      assert.equal(
        productionGroups.some((item) => item.id === keptId && item.name === "alicante autism"),
        true,
      );
      const feed = await service.feed(sam);
      assert.equal(
        feed.some((item) => item.body === "A made-up win from a demo account"),
        false,
      );
      const hello = feed.find((item) => item.body === "hello everyone");
      assert.ok(hello);
      assert.equal(hello.likeCount, 0);
      assert.equal(
        hello.comments.some((comment) => comment.text === "Nice demo reply"),
        false,
      );
      await assert.rejects(
        () => service.groupDetail(sam, EXAMPLE_PUBLIC_ID),
        (err: unknown) => (err as { code?: string }).code === "not_found",
      );
      await assert.rejects(
        () => service.groupDetail(sam, EXAMPLE_PRIVATE_ID),
        (err: unknown) => (err as { code?: string }).code === "not_found",
      );
      const stored = await store.read();
      assert.equal(
        stored.groups.some((item) => item.id === EXAMPLE_PUBLIC_ID),
        true,
      );
      assert.equal(
        stored.posts.some((item) => item.body === "A made-up win from a demo account"),
        true,
      );
    } finally {
      if (previous === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous;
    }
  });

  it("shows an approved public video in shorts", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const uploadId = await service.saveUpload(
      maya,
      {
        kind: "video",
        url: "/api/community/media/cupl_shortvideo001",
        contentType: "video/mp4",
        bytes: 3000,
        durationSec: 8,
      },
      now,
    );
    const post = await service.createPost(
      maya,
      {
        body: "Three sounds #calm",
        privacyAck: true,
        consent: true,
        uploadId,
        authorRole: "Parent",
      },
      now,
    );
    assert.equal((await service.shorts(sam)).length, 0);
    await service.review(sam, post.id, { action: "approve" }, now);
    const shorts = await service.shorts(sam);
    assert.equal(shorts.length, 1);
    assert.equal(shorts[0]?.media?.durationSec, 8);
    await service.toggleLike(sam, post.id);
    await service.addComment(sam, post.id, { text: "We do this too.", authorRole: "Founder" }, now);
    const liked = (await service.shorts(sam))[0];
    assert.equal(liked?.liked, true);
    assert.equal(liked?.comments.length, 1);
  });

  it("gives the browser an app address instead of a blob host", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const uploadId = await service.saveUpload(
      maya,
      {
        kind: "image",
        url: "pending",
        blobPath: "community/user_maya/photo.jpg",
        contentType: "image/jpeg",
        bytes: 120,
        width: 8,
        height: 8,
      },
      now,
    );
    const post = await service.createPost(
      maya,
      {
        body: "A picture",
        privacyAck: true,
        consent: true,
        uploadId,
        authorRole: "Parent",
      },
      now,
    );
    assert.equal(post.media?.url, `/api/community/media/${post.id}`);
    assert.equal(JSON.stringify(post).includes("blob.vercel-storage.com"), false);
    assert.equal(JSON.stringify(post).includes("community/user_maya"), false);
  });
});

describe("community http", () => {
  it("says storage is missing without redis and still answers health", async () => {
    const deps: CommunityDeps = {
      configured: false,
      storeName: "none",
      media: "none",
      store: null,
      service: null,
      authenticate: async () => null,
      localMediaDir: "",
      blobToken: null,
      blobStoreId: null,
    };
    const health = await handleCommunityApi(new Request("http://local/api/community/health"), deps);
    assert.equal(health.status, 200);
    const body = (await health.json()) as { ok: boolean; media: string };
    assert.equal(body.ok, false);
    assert.equal(body.media, "none");
    const feed = await handleCommunityApi(new Request("http://local/api/community/feed"), deps);
    assert.equal(feed.status, 503);
  });

  it("stores a pending text post for a signed-in member", async () => {
    const store = createMemoryCommunityStore();
    const deps: CommunityDeps = {
      configured: true,
      storeName: "memory",
      media: "none",
      store,
      service: createCommunityService(store),
      authenticate: async (req) => (req.headers.get("x-user") === "maya" ? maya : null),
      localMediaDir: "",
      blobToken: null,
      blobStoreId: null,
    };
    const created = await handleCommunityApi(
      new Request("http://local/api/community/posts", {
        method: "POST",
        headers: { "content-type": "application/json", "x-user": "maya" },
        body: JSON.stringify({ body: "Hello families", privacyAck: true, authorRole: "Parent" }),
      }),
      deps,
    );
    assert.equal(created.status, 201);
    const guest = await handleCommunityApi(new Request("http://local/api/community/feed"), deps);
    const guestBody = (await guest.json()) as { posts: unknown[] };
    assert.equal(guestBody.posts.length, 0);
    const createdBody = (await created.json()) as { post: { id: string } };
    const edited = await handleCommunityApi(
      new Request(`http://local/api/community/posts/${createdBody.post.id}/edit`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-user": "maya" },
        body: JSON.stringify({ body: "Hello families, revised", tagUserIds: [] }),
      }),
      deps,
    );
    assert.equal(edited.status, 200);
    const editedBody = (await edited.json()) as {
      post: { body: string; status: string; editedAt?: string };
    };
    assert.equal(editedBody.post.body, "Hello families, revised");
    assert.equal(editedBody.post.status, "pending");
    assert.equal(typeof editedBody.post.editedAt, "string");
    const removed = await handleCommunityApi(
      new Request(`http://local/api/community/posts/${createdBody.post.id}/delete`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-user": "maya" },
        body: JSON.stringify({}),
      }),
      deps,
    );
    assert.equal(removed.status, 200);
  });

  it("uses the private store when Vercel has a blob store id and no read-write token", () => {
    const deps = createCommunityDeps({
      VERCEL: "1",
      BLOB_STORE_ID: "store_test",
      SHARE_STORE: "memory",
    });
    assert.equal(deps.media, "blob");
    assert.equal(deps.blobStoreId, "store_test");
    assert.equal(deps.blobToken, null);
    const local = createCommunityDeps({ SHARE_STORE: "memory" });
    assert.equal(local.media, "local");
  });
});

describe("private community media", () => {
  const therapist: Actor = {
    userId: "user_therapist",
    email: "therapist@example.com",
    name: "Therapist",
    isPro: true,
  };
  const outsider: Actor = {
    userId: "user_outsider",
    email: "outsider@example.com",
    name: "Outsider",
    isPro: false,
  };

  async function localDeps() {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "community-media-"));
    const store = createMemoryCommunityStore();
    const people: Record<string, Actor> = { maya, sam, therapist, outsider };
    const deps: CommunityDeps = {
      configured: true,
      storeName: "memory",
      media: "local",
      store,
      service: createCommunityService(store),
      authenticate: async (req) => people[req.headers.get("x-user") ?? ""] ?? null,
      localMediaDir: dir,
      blobToken: null,
      blobStoreId: null,
    };
    return deps;
  }

  function authed(url: string, user: string | null, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (user) headers.set("x-user", user);
    return new Request(url, { ...init, headers });
  }

  it("serves a pending private-group photo only to the uploader, founder, and group staff", async () => {
    const deps = await localDeps();
    const file = new File([Uint8Array.from([1, 2, 3, 4])], "pic.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.set("file", file);
    form.set("kind", "image");
    form.set("width", "8");
    form.set("height", "8");
    const uploaded = await handleCommunityApi(
      authed("http://local/api/community/media", "maya", { method: "POST", body: form }),
      deps,
    );
    assert.equal(uploaded.status, 200);
    const { uploadId } = (await uploaded.json()) as { uploadId: string };
    const group = await handleCommunityApi(
      authed("http://local/api/community/groups", "therapist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Quiet room",
          description: "Private",
          rules: "Be kind",
          visibility: "private",
          joinQuestion: "",
        }),
      }),
      deps,
    );
    const { id: groupId } = (await group.json()) as { id: string };
    const joined = await handleCommunityApi(
      authed(`http://local/api/community/groups/${groupId}/join`, "maya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      deps,
    );
    assert.equal(joined.status, 200);
    const admitted = await handleCommunityApi(
      authed(`http://local/api/community/groups/${groupId}/members`, "therapist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: maya.userId, action: "approve" }),
      }),
      deps,
    );
    assert.equal(admitted.status, 200);
    const created = await handleCommunityApi(
      authed("http://local/api/community/posts", "maya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: "A private picture",
          privacyAck: true,
          consent: true,
          uploadId,
          groupId,
          authorRole: "Parent",
        }),
      }),
      deps,
    );
    assert.equal(created.status, 201);
    const post = (await created.json()) as { post: { id: string; media: { url: string } } };
    assert.equal(post.post.media.url, `/api/community/media/${post.post.id}`);
    assert.equal(JSON.stringify(post).includes("blob.vercel-storage.com"), false);
    const mediaUrl = `http://local${post.post.media.url}`;
    const guest = await handleCommunityApi(authed(mediaUrl, null), deps);
    assert.equal(guest.status, 401);
    const stranger = await handleCommunityApi(authed(mediaUrl, "outsider"), deps);
    assert.equal(stranger.status, 403);
    const author = await handleCommunityApi(authed(mediaUrl, "maya"), deps);
    assert.equal(author.status, 200);
    assert.equal(author.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(new Uint8Array(await author.arrayBuffer()), Uint8Array.from([1, 2, 3, 4]));
    const founder = await handleCommunityApi(authed(mediaUrl, "sam"), deps);
    assert.equal(founder.status, 200);
    const staff = await handleCommunityApi(authed(mediaUrl, "therapist"), deps);
    assert.equal(staff.status, 200);
    const approved = await handleCommunityApi(
      authed(`http://local/api/community/moderation/posts/${post.post.id}`, "therapist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      deps,
    );
    assert.equal(approved.status, 200);
    assert.equal((await handleCommunityApi(authed(mediaUrl, null), deps)).status, 401);
    assert.equal((await handleCommunityApi(authed(mediaUrl, "outsider"), deps)).status, 403);
    assert.equal((await handleCommunityApi(authed(mediaUrl, "maya"), deps)).status, 200);
    assert.equal((await handleCommunityApi(authed(mediaUrl, "sam"), deps)).status, 403);
  });

  it("hides a hidden-group photo from someone who is not a member", async () => {
    const deps = await localDeps();
    const file = new File([Uint8Array.from([9, 9])], "pic.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.set("file", file);
    form.set("kind", "image");
    const uploaded = await handleCommunityApi(
      authed("http://local/api/community/media", "therapist", { method: "POST", body: form }),
      deps,
    );
    const { uploadId } = (await uploaded.json()) as { uploadId: string };
    const group = await handleCommunityApi(
      authed("http://local/api/community/groups", "therapist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Hidden room",
          visibility: "hidden",
        }),
      }),
      deps,
    );
    const { id: groupId } = (await group.json()) as { id: string };
    const created = await handleCommunityApi(
      authed("http://local/api/community/posts", "therapist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: "Hidden picture",
          privacyAck: true,
          consent: true,
          uploadId,
          groupId,
          authorRole: "Therapist",
        }),
      }),
      deps,
    );
    const post = (await created.json()) as { post: { id: string } };
    await handleCommunityApi(
      authed(`http://local/api/community/moderation/posts/${post.post.id}`, "therapist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      deps,
    );
    const mediaUrl = `http://local/api/community/media/${post.post.id}`;
    assert.equal((await handleCommunityApi(authed(mediaUrl, "outsider"), deps)).status, 404);
    assert.equal((await handleCommunityApi(authed(mediaUrl, "therapist"), deps)).status, 200);
  });

  it("rejects a public blob url and another member's pathname", async () => {
    const store = createMemoryCommunityStore();
    const deps: CommunityDeps = {
      configured: true,
      storeName: "memory",
      media: "blob",
      store,
      service: createCommunityService(store),
      authenticate: async (req) => (req.headers.get("x-user") === "maya" ? maya : null),
      localMediaDir: "",
      blobToken: null,
      blobStoreId: "store_test",
    };
    const foreign = await handleCommunityApi(
      authed("http://local/api/community/uploads", "maya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pathname: "community/user_sam/photo.jpg",
          kind: "image",
          contentType: "image/jpeg",
          bytes: 100,
          width: 8,
          height: 8,
        }),
      }),
      deps,
    );
    assert.equal(foreign.status, 400);
    const host = await handleCommunityApi(
      authed("http://local/api/community/uploads", "maya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://abc.public.blob.vercel-storage.com/community/user_maya/photo.jpg",
          pathname: "https://abc.private.blob.vercel-storage.com/community/user_maya/photo.jpg",
          kind: "image",
          contentType: "image/jpeg",
          bytes: 100,
        }),
      }),
      deps,
    );
    assert.equal(host.status, 400);
    const saved = await handleCommunityApi(
      authed("http://local/api/community/uploads", "maya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pathname: "community/user_maya/photo.jpg",
          kind: "image",
          contentType: "image/jpeg",
          bytes: 100,
          width: 8,
          height: 8,
        }),
      }),
      deps,
    );
    assert.equal(saved.status, 200);
    const body = (await saved.json()) as { uploadId: string; url?: string };
    assert.equal(body.url, undefined);
    assert.equal(JSON.stringify(body).includes("blob.vercel-storage.com"), false);
  });
});

describe("edit, delete, tags, and profile posts", () => {
  const outsider: Actor = {
    userId: "user_outsider",
    email: "out@example.com",
    name: "Outsider",
    isPro: false,
  };
  const forbidden = (err: unknown) => (err as { code?: string }).code === "forbidden";
  const invalid = (err: unknown) => (err as { code?: string }).code === "invalid";

  it("lets only the author edit, sends the post back for review, and shows edited", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const post = await service.createPost(
      maya,
      { body: "First words", privacyAck: true, authorRole: "Parent" },
      now,
    );
    await assert.rejects(() => service.editPost(sam, post.id, { body: "Changed" }, now), forbidden);
    const edited = await service.editPost(maya, post.id, { body: "Clearer words" }, now);
    assert.equal(edited.post.body, "Clearer words");
    assert.equal(edited.post.status, "pending");
    assert.equal(typeof edited.post.editedAt, "string");
    assert.equal(
      (await service.feed(sam)).some((item) => item.id === post.id),
      false,
    );
    assert.equal(
      (await service.queue(sam)).posts.some((item) => item.id === post.id),
      true,
    );
    await assert.rejects(() => service.deletePost(sam, post.id), forbidden);
    await service.deletePost(maya, post.id);
    assert.equal(
      (await service.queue(sam)).posts.some((item) => item.id === post.id),
      false,
    );
  });

  it("keeps group review for an edited group post and hides it from non-members", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const groupId = await service.createGroup(
      maya,
      { name: "Quiet room", description: "Private.", rules: "No names.", visibility: "private" },
      now,
    );
    await service.joinGroup(sam, groupId, now, "I am listening.");
    await service.memberAction(maya, groupId, { userId: sam.userId, action: "approve" });
    const post = await service.createPost(
      maya,
      { body: "A private note", privacyAck: true, groupId, authorRole: "Parent" },
      now,
    );
    await service.review(sam, post.id, { action: "approve" }, now);
    await assert.rejects(
      () => service.editPost(sam, post.id, { body: "Staff rewrite" }, now),
      forbidden,
    );
    const edited = await service.editPost(
      maya,
      post.id,
      { body: "A private note, revised", tagUserIds: [sam.userId] },
      now,
    );
    assert.equal(edited.post.status, "pending");
    assert.equal(
      edited.post.tags.some((tag) => tag.userId === sam.userId),
      true,
    );
    assert.equal(
      (await service.groupQueue(maya, groupId)).posts.some((item) => item.id === post.id),
      true,
    );
    assert.equal(
      (await service.profilePosts(outsider, maya.userId)).some((item) => item.id === post.id),
      false,
    );
    assert.equal(
      (await service.profilePosts(maya, maya.userId)).some((item) => item.id === post.id),
      true,
    );
    await service.session(outsider);
    await assert.rejects(
      () => service.editPost(maya, post.id, { body: "Nope", tagUserIds: [outsider.userId] }, now),
      forbidden,
    );
    await service.review(sam, post.id, { action: "approve" }, now);
    assert.equal(
      (await service.profilePosts(sam, maya.userId)).some((item) => item.id === post.id),
      true,
    );
    assert.equal(
      (await service.profilePosts(outsider, maya.userId)).some((item) => item.id === post.id),
      false,
    );
    assert.equal(
      (await service.profileTagged(sam, sam.userId)).some((item) => item.id === post.id),
      true,
    );
    assert.equal(
      (await service.profileTagged(outsider, sam.userId)).some((item) => item.id === post.id),
      false,
    );
    await service.removeOwnTag(sam, post.id);
    assert.equal((await service.profileTagged(sam, sam.userId)).length, 0);
    const still = (await service.profilePosts(sam, maya.userId)).find(
      (item) => item.id === post.id,
    );
    assert.equal(still?.status, "approved");
  });

  it("shares only with people who can see the post, and only after approval", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    await service.session(sam);
    const post = await service.createPost(
      maya,
      {
        body: "For Sam",
        privacyAck: true,
        authorRole: "Parent",
        shareUserIds: [sam.userId],
      },
      now,
    );
    assert.equal((await service.sharedWith(sam)).length, 0);
    await service.review(sam, post.id, { action: "approve" }, now);
    assert.equal(
      (await service.sharedWith(sam)).some((item) => item.id === post.id),
      true,
    );
    assert.equal((await service.sharedWith(outsider)).length, 0);
    await assert.rejects(
      () =>
        service.createPost(
          maya,
          { body: "Child", privacyAck: true, tagUserIds: ["child_noa"] },
          now,
        ),
      invalid,
    );
  });

  it("shows the author their pending post and hides it from everyone else", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    const post = await service.createPost(
      maya,
      { body: "Waiting", privacyAck: true, authorRole: "Parent" },
      now,
    );
    const mine = await service.profilePosts(maya, maya.userId);
    assert.equal(mine[0]?.status, "pending");
    assert.equal((await service.profilePosts(sam, maya.userId)).length, 0);
    assert.equal((await service.profileTagged(sam, sam.userId)).length, 0);
    void post;
  });
});
