import type { Actor } from "../share/actions.ts";
import { ShareError } from "../share/errors.ts";
import { assertEmail, normalizeEmail } from "../share/names.ts";
import { lookupCreatorAccess, setCreatorAccess } from "./access.ts";
import { isFounderActor } from "./rules.ts";
import {
  createCreatorActivity,
  deleteCreatorActivity,
  listOwnActivities,
  listPublishedActivities,
  listReviewQueue,
  readVisibleActivity,
  reviewCreatorActivity,
  toOwned,
  toPublished,
  updateCreatorActivity,
} from "./service.ts";
import type { CreatorStore } from "./store.ts";

export type CreatorHttpDeps = {
  creatorStore: CreatorStore | null;
  clerkSecret: string | null;
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
  console.error("creator activities", err);
  return json({ error: "Something went wrong. Try again.", code: "server_error" }, 500);
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (!text.trim()) return {};
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ShareError(400, "invalid_json", "Request body must be an object.");
  }
  return parsed as Record<string, unknown>;
}

type CreatorRoute =
  | { name: "collection" }
  | { name: "one"; id: string }
  | { name: "review"; id: string }
  | { name: "access" };

function matchCreator(pathname: string): CreatorRoute | null {
  const parts = pathname.split("?")[0]!.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "share") return null;
  const rest = parts.slice(2);
  if (rest.length === 1 && rest[0] === "creator-access") return { name: "access" };
  if (rest.length === 1 && rest[0] === "creator-activities") return { name: "collection" };
  if (rest.length === 2 && rest[0] === "creator-activities") {
    return { name: "one", id: decodeURIComponent(rest[1]!) };
  }
  if (rest.length === 3 && rest[0] === "creator-activities" && rest[2] === "review") {
    return { name: "review", id: decodeURIComponent(rest[1]!) };
  }
  return null;
}

function assertId(id: string) {
  if (!/^cact_[a-z0-9]+$/i.test(id)) {
    throw new ShareError(404, "not_found", "Activity not found.");
  }
}

async function requireActor(deps: CreatorHttpDeps, req: Request): Promise<Actor> {
  const actor = await deps.authenticate(req);
  if (!actor) throw new ShareError(401, "unauthorized", "Sign in to continue.");
  return actor;
}

function requireStore(deps: CreatorHttpDeps): CreatorStore {
  if (!deps.creatorStore) {
    throw new ShareError(503, "not_configured", "Activities are not saved on this preview yet.");
  }
  return deps.creatorStore;
}

export async function handleCreatorApi(
  req: Request,
  deps: CreatorHttpDeps,
): Promise<Response | null> {
  const url = new URL(req.url);
  const route = matchCreator(url.pathname);
  if (!route) return null;

  try {
    if (route.name === "collection" && req.method === "GET") {
      const scope = url.searchParams.get("scope") || "published";
      if (scope === "published") {
        if (!deps.creatorStore) return json({ activities: [] });
        const rows = await listPublishedActivities(deps.creatorStore);
        return json({ activities: rows.map(toPublished) });
      }
      const actor = await requireActor(deps, req);
      const store = requireStore(deps);
      if (scope === "mine") {
        const rows = await listOwnActivities(store, actor);
        return json({ activities: rows.map(toOwned) });
      }
      if (scope === "review") {
        const rows = await listReviewQueue(store, actor);
        return json({ activities: rows.map(toOwned) });
      }
      throw new ShareError(400, "invalid_scope", "Scope must be published, mine, or review.");
    }

    if (route.name === "collection" && req.method === "POST") {
      const actor = await requireActor(deps, req);
      const store = requireStore(deps);
      const activity = await createCreatorActivity(
        store,
        actor,
        await readJson(req),
        new Date().toISOString(),
      );
      return json({ activity: toOwned(activity) }, 201);
    }

    if (route.name === "one" && req.method === "GET") {
      assertId(route.id);
      if (!deps.creatorStore) throw new ShareError(404, "not_found", "Activity not found.");
      const actor = await deps.authenticate(req);
      const visible = await readVisibleActivity(deps.creatorStore, actor, route.id);
      return json({
        activity: visible.full ? toOwned(visible.activity) : toPublished(visible.activity),
      });
    }

    if (route.name === "one" && req.method === "PATCH") {
      assertId(route.id);
      const actor = await requireActor(deps, req);
      const activity = await updateCreatorActivity(
        requireStore(deps),
        actor,
        route.id,
        await readJson(req),
        new Date().toISOString(),
      );
      return json({ activity: toOwned(activity) });
    }

    if (route.name === "one" && req.method === "DELETE") {
      assertId(route.id);
      const actor = await requireActor(deps, req);
      await deleteCreatorActivity(requireStore(deps), actor, route.id);
      return json({ ok: true });
    }

    if (route.name === "review" && req.method === "POST") {
      assertId(route.id);
      const actor = await requireActor(deps, req);
      const activity = await reviewCreatorActivity(
        requireStore(deps),
        actor,
        route.id,
        await readJson(req),
        new Date().toISOString(),
      );
      return json({ activity: toOwned(activity) });
    }

    if (route.name === "access" && (req.method === "GET" || req.method === "POST")) {
      const actor = await requireActor(deps, req);
      if (!isFounderActor(actor)) {
        throw new ShareError(403, "forbidden", "Only the founder can change Creator Pro.");
      }
      if (req.method === "GET") {
        const email = assertEmail(url.searchParams.get("email") || "");
        const user = await lookupCreatorAccess(deps.clerkSecret, normalizeEmail(email));
        return json({ user });
      }
      const body = await readJson(req);
      const userId = typeof body["userId"] === "string" ? body["userId"].trim() : "";
      if (typeof body["isCreatorPro"] !== "boolean") {
        throw new ShareError(400, "invalid_user", "Say whether Creator Pro should be on.");
      }
      const user = await setCreatorAccess(deps.clerkSecret, userId, body["isCreatorPro"]);
      return json({ user });
    }

    return json({ error: "Not found.", code: "not_found" }, 404);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return json({ error: "Request body must be JSON.", code: "invalid_json" }, 400);
    }
    return errorResponse(err);
  }
}
