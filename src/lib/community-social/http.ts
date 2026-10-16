import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { del, get, issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";

import type { Actor } from "../share/actions.ts";
import { shareDeps } from "../share/http.ts";
import { redisEnv } from "../share/store.ts";
import { demoCommunityActor } from "./demo-actors.ts";
import { CommunityError, isCommunityId } from "./limits.ts";
import {
  blobUploadLimits,
  isOwnedBlobPath,
  isSafeBlobPath,
  localMediaPath,
  mediaFromUpload,
} from "./media-url.ts";
import { createRedisCommunityStore } from "./redis-store.ts";
import { createCommunityService, type CommunityService } from "./service.ts";
import {
  createFileCommunityStore,
  createMemoryCommunityStore,
  type CommunityStore,
} from "./store.ts";
import type { MediaKind } from "./types.ts";

export type CommunityDeps = {
  configured: boolean;
  storeName: "redis" | "file" | "memory" | "none";
  media: "blob" | "local" | "none";
  store: CommunityStore | null;
  service: CommunityService | null;
  authenticate: (req: Request) => Promise<Actor | null>;
  localMediaDir: string;
  blobToken: string | null;
  blobStoreId: string | null;
};

function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  return env[name];
}

export function createCommunityDeps(env: NodeJS.ProcessEnv = process.env): CommunityDeps {
  const redis = redisEnv(env);
  let store: CommunityStore | null = null;
  let storeName: CommunityDeps["storeName"] = "none";
  if (redis) {
    store = createRedisCommunityStore(redis);
    storeName = "redis";
  } else if (readEnv(env, "SHARE_STORE") === "memory") {
    store = createMemoryCommunityStore();
    storeName = "memory";
  } else if (!readEnv(env, "VERCEL") && readEnv(env, "SHARE_STORE") !== "none") {
    const filePath =
      readEnv(env, "COMMUNITY_STORE_PATH") ||
      path.join(process.cwd(), ".data", "community-store.json");
    store = createFileCommunityStore(filePath);
    storeName = "file";
  }
  const blobToken = readEnv(env, "BLOB_READ_WRITE_TOKEN") || null;
  const blobStoreId = readEnv(env, "BLOB_STORE_ID") || null;
  const oidc = Boolean(
    blobStoreId && (readEnv(env, "VERCEL") || readEnv(env, "VERCEL_OIDC_TOKEN")),
  );
  const media: CommunityDeps["media"] =
    oidc || blobToken ? "blob" : !readEnv(env, "VERCEL") && store ? "local" : "none";
  const share = shareDeps(env);
  return {
    configured: Boolean(store),
    storeName,
    media,
    store,
    service: store ? createCommunityService(store) : null,
    authenticate: (req) => share.authenticate(req),
    localMediaDir:
      readEnv(env, "COMMUNITY_MEDIA_DIR") || path.join(process.cwd(), ".data", "community-media"),
    blobToken,
    blobStoreId,
  };
}

let runtime: { key: string; deps: CommunityDeps } | null = null;

export function communityDeps(env: NodeJS.ProcessEnv = process.env): CommunityDeps {
  const key = [
    readEnv(env, "UPSTASH_REDIS_REST_URL") || readEnv(env, "KV_REST_API_URL") || "",
    readEnv(env, "SHARE_STORE") || "",
    readEnv(env, "VERCEL") ? "vercel" : "local",
    readEnv(env, "BLOB_STORE_ID") || "",
    readEnv(env, "BLOB_READ_WRITE_TOKEN") ? "blob" : "noblob",
    readEnv(env, "VERCEL_OIDC_TOKEN") ? "oidc" : "nooidc",
    readEnv(env, "CLERK_SECRET_KEY") ? "clerk" : "noclerk",
  ].join("|");
  if (runtime?.key === key) return runtime.deps;
  const deps = createCommunityDeps(env);
  runtime = { key, deps };
  return deps;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errorResponse(err: unknown): Response {
  if (err instanceof CommunityError)
    return json({ error: err.message, code: err.code }, err.status);
  console.error(err);
  return json({ error: "Something went wrong. Try again.", code: "server_error" }, 500);
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (!text.trim()) return {};
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CommunityError(400, "invalid_json", "Request body must be an object.");
  }
  return parsed as Record<string, unknown>;
}

type Route =
  | { name: "health" }
  | { name: "session" }
  | { name: "feed" }
  | { name: "shorts" }
  | { name: "create-post" }
  | { name: "like"; id: string }
  | { name: "comment"; id: string }
  | { name: "remove-comment"; id: string; commentId: string }
  | { name: "report" }
  | { name: "queue" }
  | { name: "review"; id: string }
  | { name: "suspend" }
  | { name: "moderators" }
  | { name: "groups" }
  | { name: "group"; id: string }
  | { name: "group-queue"; id: string }
  | { name: "join"; id: string }
  | { name: "leave"; id: string }
  | { name: "delete-group"; id: string }
  | { name: "transfer"; id: string }
  | { name: "members"; id: string }
  | { name: "upload-complete" }
  | { name: "media-post" }
  | { name: "media-get"; id: string }
  | { name: "blob" };

function match(pathname: string): Route | null {
  const parts = pathname.split("?")[0]!.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "community") return null;
  const rest = parts.slice(2).map((part) => decodeURIComponent(part));
  if (rest.length === 1 && rest[0] === "health") return { name: "health" };
  if (rest.length === 1 && rest[0] === "session") return { name: "session" };
  if (rest.length === 1 && rest[0] === "feed") return { name: "feed" };
  if (rest.length === 1 && rest[0] === "shorts") return { name: "shorts" };
  if (rest.length === 1 && rest[0] === "posts") return { name: "create-post" };
  if (rest.length === 3 && rest[0] === "posts" && rest[2] === "like")
    return { name: "like", id: rest[1]! };
  if (rest.length === 3 && rest[0] === "posts" && rest[2] === "comments") {
    return { name: "comment", id: rest[1]! };
  }
  if (rest.length === 5 && rest[0] === "posts" && rest[2] === "comments" && rest[4] === "remove") {
    return { name: "remove-comment", id: rest[1]!, commentId: rest[3]! };
  }
  if (rest.length === 1 && rest[0] === "reports") return { name: "report" };
  if (rest.length === 1 && rest[0] === "moderation") return { name: "queue" };
  if (rest.length === 3 && rest[0] === "moderation" && rest[1] === "posts") {
    return { name: "review", id: rest[2]! };
  }
  if (rest.length === 2 && rest[0] === "moderation" && rest[1] === "suspend")
    return { name: "suspend" };
  if (rest.length === 2 && rest[0] === "moderation" && rest[1] === "moderators")
    return { name: "moderators" };
  if (rest.length === 1 && rest[0] === "groups") return { name: "groups" };
  if (rest.length === 2 && rest[0] === "groups") return { name: "group", id: rest[1]! };
  if (rest.length === 3 && rest[0] === "groups" && rest[2] === "queue")
    return { name: "group-queue", id: rest[1]! };
  if (rest.length === 3 && rest[0] === "groups" && rest[2] === "join")
    return { name: "join", id: rest[1]! };
  if (rest.length === 3 && rest[0] === "groups" && rest[2] === "leave")
    return { name: "leave", id: rest[1]! };
  if (rest.length === 3 && rest[0] === "groups" && rest[2] === "delete")
    return { name: "delete-group", id: rest[1]! };
  if (rest.length === 3 && rest[0] === "groups" && rest[2] === "transfer")
    return { name: "transfer", id: rest[1]! };
  if (rest.length === 3 && rest[0] === "groups" && rest[2] === "members")
    return { name: "members", id: rest[1]! };
  if (rest.length === 1 && rest[0] === "uploads") return { name: "upload-complete" };
  if (rest.length === 1 && rest[0] === "media") return { name: "media-post" };
  if (rest.length === 2 && rest[0] === "media") return { name: "media-get", id: rest[1]! };
  if (rest.length === 1 && rest[0] === "blob") return { name: "blob" };
  return null;
}

function requireService(deps: CommunityDeps): CommunityService {
  if (!deps.service || !deps.configured) {
    throw new CommunityError(
      503,
      "not_configured",
      "Community storage is not connected on this preview yet.",
    );
  }
  return deps.service;
}

async function actorOf(deps: CommunityDeps, req: Request): Promise<Actor | null> {
  const demo = demoCommunityActor(req, process.env);
  if (demo) return demo;
  return deps.authenticate(req);
}

function numberField(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  return undefined;
}

function uploadFields(input: {
  url: string;
  kind: MediaKind;
  contentType: string;
  bytes: number;
  width: number | undefined;
  height: number | undefined;
  durationSec: number | undefined;
  blobPath?: string;
}) {
  return mediaFromUpload({
    url: input.url,
    kind: input.kind,
    contentType: input.contentType,
    bytes: input.bytes,
    ...(input.width !== undefined ? { width: input.width } : {}),
    ...(input.height !== undefined ? { height: input.height } : {}),
    ...(input.durationSec !== undefined ? { durationSec: input.durationSec } : {}),
    ...(input.blobPath ? { blobPath: input.blobPath } : {}),
  });
}

function blobCommand(deps: CommunityDeps): { token?: string; storeId?: string } {
  if (deps.blobStoreId) return { storeId: deps.blobStoreId };
  if (deps.blobToken) return { token: deps.blobToken };
  return {};
}

async function forgetMedia(
  deps: CommunityDeps,
  target: { url: string | null; blobPath: string | null },
) {
  if (target.blobPath && isSafeBlobPath(target.blobPath)) {
    try {
      await del(target.blobPath, blobCommand(deps));
    } catch (err) {
      console.error("blob delete", err);
    }
  }
  const id = target.url?.split("/").pop() || "";
  if (!target.url?.startsWith("/api/community/media/") || !isCommunityId(id, "cupl")) return;
  try {
    unlinkSync(path.join(deps.localMediaDir, id));
    unlinkSync(path.join(deps.localMediaDir, `${id}.json`));
  } catch {
    /* already gone */
  }
}

function saveLocalFile(deps: CommunityDeps, id: string, bytes: Uint8Array, contentType: string) {
  mkdirSync(deps.localMediaDir, { recursive: true });
  writeFileSync(path.join(deps.localMediaDir, id), bytes);
  writeFileSync(path.join(deps.localMediaDir, `${id}.json`), JSON.stringify({ contentType }));
}

export async function handleCommunityApi(req: Request, deps: CommunityDeps): Promise<Response> {
  const route = match(new URL(req.url).pathname);
  if (!route) return json({ error: "Not found.", code: "not_found" }, 404);

  if (route.name === "health") {
    return json({ ok: deps.configured, store: deps.storeName, media: deps.media });
  }

  if (route.name === "media-get" && req.method === "GET") {
    try {
      const service = requireService(deps);
      const actor = await actorOf(deps, req);
      const opened = await service.openMedia(actor, route.id);
      if (opened.blobPath)
        return await streamPrivateBlob(deps, opened.blobPath, opened.contentType);
      if (opened.localId) return readLocalMedia(deps, opened.localId, opened.contentType);
      return json({ error: "Not found.", code: "not_found" }, 404);
    } catch (err) {
      return errorResponse(err);
    }
  }

  try {
    const service = requireService(deps);
    const now = new Date().toISOString();

    if (route.name === "blob" && req.method === "POST") {
      if (deps.media !== "blob") {
        throw new CommunityError(
          503,
          "media_not_configured",
          "Photo and video storage is not connected yet.",
        );
      }
      const actor = await actorOf(deps, req);
      if (!actor) return json({ error: "Sign in to continue.", code: "unauthorized" }, 401);
      const body = (await req.json()) as HandleUploadPresignedBody;
      try {
        const result = await handleUploadPresigned({
          body,
          request: req,
          getSignedToken: async (pathname) => {
            const limits = blobUploadLimits(pathname);
            if (!isOwnedBlobPath(pathname, actor.userId) || !limits) {
              throw new CommunityError(400, "invalid", "That file path is not allowed.");
            }
            const validUntil = Date.now() + 10 * 60 * 1000;
            const token = await issueSignedToken({
              pathname,
              operations: ["put"],
              allowedContentTypes: limits.allowedContentTypes,
              maximumSizeInBytes: limits.maximumSizeInBytes,
              validUntil,
              ...blobCommand(deps),
            });
            return {
              token,
              urlOptions: {
                allowedContentTypes: limits.allowedContentTypes,
                maximumSizeInBytes: limits.maximumSizeInBytes,
                addRandomSuffix: false,
                allowOverwrite: false,
                validUntil,
              },
            };
          },
        });
        return json(result);
      } catch (err) {
        if (err instanceof CommunityError) throw err;
        console.error("blob upload", err);
        throw new CommunityError(
          503,
          "media_not_configured",
          "Photo and video storage is not connected yet.",
        );
      }
    }

    if (route.name === "media-post" && req.method === "POST") {
      if (deps.media !== "local") {
        throw new CommunityError(
          503,
          "media_not_configured",
          "Photo and video storage is not connected yet.",
        );
      }
      const actor = await actorOf(deps, req);
      if (!actor) return json({ error: "Sign in to continue.", code: "unauthorized" }, 401);
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        throw new CommunityError(400, "invalid", "Choose a photo or video.");
      const kind =
        form.get("kind") === "video" ? "video" : form.get("kind") === "image" ? "image" : null;
      if (!kind) throw new CommunityError(400, "invalid", "Choose a photo or video.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const media = uploadFields({
        url: "about:blank",
        kind,
        contentType: file.type || (kind === "image" ? "image/jpeg" : "video/mp4"),
        bytes: bytes.byteLength,
        width: numberField(form.get("width")),
        height: numberField(form.get("height")),
        durationSec: numberField(form.get("durationSec")),
      });
      const uploadId = await service.saveUpload(actor, { ...media, url: "pending" }, now);
      media.url = localMediaPath(uploadId);
      saveLocalFile(deps, uploadId, bytes, media.contentType);
      await serviceReplaceUploadUrl(deps, uploadId, media.url);
      return json({ uploadId, url: media.url });
    }

    const actor = await actorOf(deps, req);

    if (route.name === "session" && req.method === "GET") {
      const session = await service.session(actor);
      return json({ ...session, media: deps.media, configured: true });
    }
    if (!actor && req.method !== "GET") {
      return json({ error: "Sign in to continue.", code: "unauthorized" }, 401);
    }
    if (route.name === "feed" && req.method === "GET")
      return json({ posts: await service.feed(actor) });
    if (route.name === "shorts" && req.method === "GET")
      return json({ posts: await service.shorts(actor) });
    if (route.name === "groups" && req.method === "GET")
      return json({ groups: await service.listGroups(actor) });
    if (route.name === "group" && req.method === "GET")
      return json(await service.groupDetail(actor, route.id));
    if (route.name === "group-queue" && req.method === "GET")
      return json(await service.groupQueue(actor, route.id));
    if (route.name === "queue" && req.method === "GET") return json(await service.queue(actor));

    if (req.method !== "POST") return json({ error: "Not found.", code: "not_found" }, 404);
    const body = route.name === "media-post" ? {} : await readJson(req);

    if (route.name === "create-post") {
      const post = await service.createPost(actor, body, now);
      return json({ post }, 201);
    }
    if (route.name === "like") {
      await service.toggleLike(actor, route.id);
      return json({ ok: true });
    }
    if (route.name === "comment") {
      await service.addComment(actor, route.id, body, now);
      return json({ ok: true });
    }
    if (route.name === "remove-comment") {
      await service.removeComment(actor, route.id, route.commentId);
      return json({ ok: true });
    }
    if (route.name === "report") {
      await service.report(actor, body, now);
      return json({ ok: true });
    }
    if (route.name === "review") {
      const result = await service.review(actor, route.id, body, now);
      if (result.removed) await forgetMedia(deps, result.removed);
      return json({ ok: true });
    }
    if (route.name === "suspend") {
      await service.setSuspension(actor, body, now);
      return json({ ok: true });
    }
    if (route.name === "moderators") {
      await service.setModerator(actor, body);
      return json({ ok: true });
    }
    if (route.name === "groups") {
      const id = await service.createGroup(actor, body, now);
      return json({ id }, 201);
    }
    if (route.name === "group") {
      const replaced = await service.updateGroup(actor, route.id, body);
      if (replaced) await forgetMedia(deps, replaced);
      return json({ ok: true });
    }
    if (route.name === "join") {
      const status = await service.joinGroup(actor, route.id, now, body["answer"]);
      return json({ status });
    }
    if (route.name === "leave") {
      await service.leaveGroup(actor, route.id);
      return json({ ok: true });
    }
    if (route.name === "delete-group") {
      const forgotten = await service.deleteGroup(actor, route.id);
      for (const item of forgotten) await forgetMedia(deps, item);
      return json({ ok: true });
    }
    if (route.name === "transfer") {
      const target = typeof body["userId"] === "string" ? body["userId"] : "";
      await service.transferOwnership(actor, route.id, target);
      return json({ ok: true });
    }
    if (route.name === "members") {
      await service.memberAction(actor, route.id, body);
      return json({ ok: true });
    }
    if (route.name === "upload-complete") {
      if (deps.media !== "blob") {
        throw new CommunityError(
          503,
          "media_not_configured",
          "Photo and video storage is not connected yet.",
        );
      }
      if (!actor) return json({ error: "Sign in to continue.", code: "unauthorized" }, 401);
      const pathname = typeof body["pathname"] === "string" ? body["pathname"] : "";
      if (!isOwnedBlobPath(pathname, actor.userId) || !blobUploadLimits(pathname)) {
        throw new CommunityError(400, "invalid", "That file is not in community storage.");
      }
      const kindValue = body["kind"];
      const kind: MediaKind | null =
        kindValue === "video" || kindValue === "image" ? kindValue : null;
      if (!kind) throw new CommunityError(400, "invalid", "Choose a photo or video.");
      const contentType = body["contentType"];
      let media;
      try {
        media = uploadFields({
          url: "pending",
          kind,
          contentType: typeof contentType === "string" ? contentType : "",
          bytes: numberField(body["bytes"]) ?? 0,
          width: numberField(body["width"]),
          height: numberField(body["height"]),
          durationSec: numberField(body["durationSec"]),
          blobPath: pathname,
        });
      } catch (err) {
        await forgetMedia(deps, { url: null, blobPath: pathname });
        throw err;
      }
      const uploadId = await service.saveUpload(actor, media, now);
      await serviceReplaceUploadUrl(deps, uploadId, localMediaPath(uploadId));
      return json({ uploadId });
    }
    return json({ error: "Not found.", code: "not_found" }, 404);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return json({ error: "Request body must be JSON.", code: "invalid_json" }, 400);
    }
    return errorResponse(err);
  }
}

function readLocalMedia(deps: CommunityDeps, id: string, fallbackType: string): Response {
  try {
    const meta = JSON.parse(readFileSync(path.join(deps.localMediaDir, `${id}.json`), "utf8")) as {
      contentType?: string;
    };
    const bytes = readFileSync(path.join(deps.localMediaDir, id));
    return new Response(bytes, {
      headers: {
        "content-type": meta.contentType || fallbackType || "application/octet-stream",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return json({ error: "Not found.", code: "not_found" }, 404);
  }
}

async function streamPrivateBlob(
  deps: CommunityDeps,
  blobPath: string,
  fallbackType: string,
): Promise<Response> {
  if (deps.media !== "blob") {
    throw new CommunityError(
      503,
      "media_not_configured",
      "Photo and video storage is not connected yet.",
    );
  }
  try {
    const result = await get(blobPath, {
      access: "private",
      useCache: false,
      ...blobCommand(deps),
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return json({ error: "Not found.", code: "not_found" }, 404);
    }
    return new Response(result.stream, {
      headers: {
        "content-type": result.blob.contentType || fallbackType || "application/octet-stream",
        "content-length": String(result.blob.size),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    console.error("blob read", err);
    throw new CommunityError(
      503,
      "media_not_configured",
      "Photo and video storage is not connected yet.",
    );
  }
}

async function serviceReplaceUploadUrl(deps: CommunityDeps, uploadId: string, url: string) {
  if (!deps.store) return;
  await deps.store.update((db) => {
    const upload = db.uploads.find((item) => item.id === uploadId);
    if (upload) upload.media.url = url;
  });
}
