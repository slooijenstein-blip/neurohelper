import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Actor } from "../share/actions.ts";
import { COMMUNITY_REDIS_KEY } from "./redis-store.ts";
import { handleCommunityApi, type CommunityDeps } from "./http.ts";
import { stripIsoBmffUserData } from "./mp4-strip.ts";
import { isPublicBlobUrl } from "./media-url.ts";
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

  it("only accepts this user's blob address", () => {
    assert.equal(
      isPublicBlobUrl(
        "https://abc.public.blob.vercel-storage.com/community/user_maya/photo-abc.jpg",
        "user_maya",
      ),
      true,
    );
    assert.equal(
      isPublicBlobUrl("https://example.com/community/user_maya/photo.jpg", "user_maya"),
      false,
    );
    assert.equal(
      isPublicBlobUrl(
        "https://abc.public.blob.vercel-storage.com/community/user_sam/photo.jpg",
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

  it("lets the founder add a moderator and pause posting", async () => {
    const service = createCommunityService(createMemoryCommunityStore());
    await assert.rejects(
      () => service.setModerator(maya, { email: "mod@example.com", action: "add" }),
      (err: unknown) => (err as { code?: string }).code === "forbidden",
    );
    await service.setModerator(sam, { email: "Mod@Example.com", action: "add" });
    const mod: Actor = { userId: "user_mod", email: "mod@example.com", name: "Mod", isPro: false };
    const post = await service.createPost(
      maya,
      { body: "Hello", privacyAck: true, authorRole: "Parent" },
      now,
    );
    await service.review(mod, post.id, { action: "approve" }, now);
    await service.setSuspension(
      mod,
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
      (await service.feed(mod)).some((item) => item.id === post.id),
      false,
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
    await service.joinGroup(sam, groupId, now);
    let detail = await service.groupDetail(sam, groupId);
    assert.equal(detail.posts.length, 0);
    assert.equal(
      detail.members.some(
        (member) => member.userId === sam.userId && member.status === "requested",
      ),
      true,
    );
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
    await service.memberAction(maya, groupId, {
      userId: sam.userId,
      action: "setRole",
      role: "admin",
    });
    await service.leaveGroup(maya, groupId);
    const after = await service.groupDetail(sam, groupId);
    assert.equal(after.group.myRole, "admin");
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
  });
});
