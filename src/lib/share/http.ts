import type { Actor, ShareAction } from "./actions.ts";
import { ShareError } from "./errors.ts";
import { sendClerkInvitation } from "./mail.ts";
import { ShareService } from "./service.ts";
import {
  createFileShareStore,
  createMemoryShareStore,
  createRedisShareStore,
  redisEnv,
  type ShareStore,
} from "./store.ts";
import path from "node:path";

function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  return env[name];
}

export type ShareDeps = {
  configured: boolean;
  clerk: boolean;
  storeName: "redis" | "file" | "memory" | "none";
  service: ShareService | null;
  authenticate: (req: Request) => Promise<Actor | null>;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errorResponse(err: unknown): Response {
  if (err instanceof ShareError) return json({ error: err.message, code: err.code }, err.status);
  console.error(err);
  return json({ error: "Something went wrong. Try again.", code: "server_error" }, 500);
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  if (req.method === "GET" || req.method === "HEAD") return {};
  const text = await req.text();
  if (!text.trim()) return {};
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ShareError(400, "invalid_json", "Request body must be an object.");
  }
  return parsed as Record<string, unknown>;
}

function match(
  pathname: string,
):
  | { name: "health" }
  | { name: "snapshot" }
  | { name: "actions" }
  | { name: "peek"; token: string }
  | { name: "accept"; token: string }
  | null {
  const parts = pathname.split("?")[0]!.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "share") return null;
  const rest = parts.slice(2);
  if (rest.length === 1 && rest[0] === "health") return { name: "health" };
  if (rest.length === 1 && rest[0] === "snapshot") return { name: "snapshot" };
  if (rest.length === 1 && rest[0] === "actions") return { name: "actions" };
  if (rest.length === 2 && rest[0] === "invites")
    return { name: "peek", token: decodeURIComponent(rest[1]!) };
  if (rest.length === 3 && rest[0] === "invites" && rest[2] === "accept") {
    return { name: "accept", token: decodeURIComponent(rest[1]!) };
  }
  return null;
}

function devActor(req: Request, env: NodeJS.ProcessEnv): Actor | null {
  if (readEnv(env, "SHARE_DEV_BYPASS") !== "1" || readEnv(env, "VERCEL")) return null;
  const raw = req.headers.get("x-share-dev-user");
  if (!raw) return null;
  const [userId, email, name, pro] = raw.split("|");
  if (!userId || !email || !email.includes("@")) return null;
  return { userId, email, name: name || "Member", isPro: pro === "1" };
}

async function clerkActor(
  req: Request,
  secretKey: string,
  env: NodeJS.ProcessEnv,
): Promise<Actor | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const { verifyToken, createClerkClient } = await import("@clerk/backend");
  const parties = readEnv(env, "CLERK_AUTHORIZED_PARTIES")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const payload = await verifyToken(token, {
    secretKey,
    ...(parties && parties.length > 0 ? { authorizedParties: parties } : {}),
  });
  const userId = payload.sub;
  if (!userId) return null;
  const user = await createClerkClient({ secretKey }).users.getUser(userId);
  const verified = user.emailAddresses
    .filter(
      (item) => item.id === user.primaryEmailAddressId || item.verification?.status === "verified",
    )
    .map((item) => item.emailAddress);
  const external = (user.externalAccounts ?? [])
    .map((item) => item.emailAddress)
    .filter((item): item is string => Boolean(item));
  const emails = [...new Set([...verified, ...external])];
  const email =
    user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress ??
    emails[0] ??
    "";
  if (!email) return null;
  const meta = user.publicMetadata as { isPro?: unknown } | null | undefined;
  return {
    userId,
    email,
    emails,
    name: user.firstName || user.fullName || email.split("@")[0] || "Member",
    isPro: meta?.isPro === true,
  };
}

export function createShareDeps(env: NodeJS.ProcessEnv = process.env): ShareDeps {
  const redis = redisEnv(env);
  const secretKey = readEnv(env, "CLERK_SECRET_KEY");
  const clerk = Boolean(secretKey);
  let store: ShareStore | null = null;
  let storeName: ShareDeps["storeName"] = "none";
  if (redis) {
    store = createRedisShareStore(redis);
    storeName = "redis";
  } else if (readEnv(env, "SHARE_STORE") === "memory") {
    store = createMemoryShareStore();
    storeName = "memory";
  } else if (!readEnv(env, "VERCEL") && readEnv(env, "SHARE_STORE") !== "none") {
    const filePath =
      readEnv(env, "SHARE_STORE_PATH") || path.join(process.cwd(), ".data", "share-store.json");
    store = createFileShareStore(filePath);
    storeName = "file";
  }
  const service = store
    ? new ShareService(store, (input) =>
        sendClerkInvitation({
          secretKey,
          email: input.email,
          redirectUrl: input.redirectUrl,
          token: input.token,
        }),
      )
    : null;
  return {
    configured: Boolean(service),
    clerk,
    storeName,
    service,
    authenticate: async (req) => {
      const dev = devActor(req, env);
      if (dev) return dev;
      if (!secretKey) return null;
      try {
        return await clerkActor(req, secretKey, env);
      } catch (err) {
        console.error("clerk auth", err);
        return null;
      }
    },
  };
}

let runtime: { key: string; deps: ShareDeps } | null = null;

export function shareDeps(env: NodeJS.ProcessEnv = process.env): ShareDeps {
  const key = [
    readEnv(env, "UPSTASH_REDIS_REST_URL") || readEnv(env, "KV_REST_API_URL") || "",
    readEnv(env, "SHARE_STORE") || "",
    readEnv(env, "VERCEL") ? "vercel" : "local",
    readEnv(env, "CLERK_SECRET_KEY") ? "clerk" : "noclerk",
  ].join("|");
  if (runtime?.key === key) return runtime.deps;
  const deps = createShareDeps(env);
  runtime = { key, deps };
  return deps;
}

export async function handleShareApi(req: Request, deps: ShareDeps): Promise<Response> {
  const route = match(new URL(req.url).pathname);
  if (!route) return json({ error: "Not found.", code: "not_found" }, 404);
  if (route.name === "health") {
    return json({
      ok: deps.configured,
      clerk: deps.clerk,
      store: deps.storeName,
    });
  }
  if (!deps.service || !deps.configured) {
    return json(
      {
        error: "Live sharing is not configured on this preview yet.",
        code: "not_configured",
        clerk: deps.clerk,
        store: deps.storeName,
      },
      503,
    );
  }

  try {
    if (route.name === "peek" && req.method === "GET") {
      const preview = await deps.service.peek(route.token);
      if (!preview)
        return json(
          { error: "This invite is missing or already used.", code: "invite_missing" },
          404,
        );
      return json(preview);
    }

    const actor = await deps.authenticate(req);
    if (!actor) return json({ error: "Sign in to continue.", code: "unauthorized" }, 401);

    if (route.name === "snapshot" && req.method === "GET") {
      return json(await deps.service.snapshot(actor, req.headers.get("x-share-invite-token")));
    }
    if (route.name === "actions" && req.method === "POST") {
      const body = await readJson(req);
      const action = body["action"] as ShareAction | undefined;
      const originValue = body["origin"];
      const origin = typeof originValue === "string" ? originValue : "";
      if (!action || typeof action !== "object" || typeof action.type !== "string") {
        throw new ShareError(400, "invalid_action", "Missing action.");
      }
      const result = await deps.service.act(actor, action, origin);
      return json(result);
    }
    if (route.name === "accept" && req.method === "POST") {
      const body = await readJson(req);
      const originValue = body["origin"];
      const origin = typeof originValue === "string" ? originValue : new URL(req.url).origin;
      const result = await deps.service.act(
        actor,
        { type: "acceptInvite", token: route.token, now: new Date().toISOString() },
        origin,
      );
      return json(result);
    }
    return json({ error: "Not found.", code: "not_found" }, 404);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return json({ error: "Request body must be JSON.", code: "invalid_json" }, 400);
    }
    return errorResponse(err);
  }
}
