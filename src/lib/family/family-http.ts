import { FamilyService } from "./family-service";
import { FamilyError, isAgeBand, type Actor, type TimeBlock } from "./types";

export type FamilyHttpDeps = {
  configured: boolean;
  storeName: "clerk" | "memory" | "none";
  service: FamilyService | null;
  authenticate: (req: Request) => Promise<Actor | null>;
  afterInvite?: (email: string, inviteUrl: string) => Promise<void>;
  inviteUrl?: (req: Request, token: string) => string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errorResponse(err: unknown): Response {
  if (err instanceof FamilyError) {
    return json({ error: err.message, code: err.code }, err.status);
  }
  console.error(err);
  return json({ error: "Something went wrong. Try again.", code: "server_error" }, 500);
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  if (req.method === "GET" || req.method === "HEAD") return {};
  const text = await req.text();
  if (!text.trim()) return {};
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new FamilyError(400, "invalid_json", "Request body must be an object.");
  }
  return parsed as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function field(row: Record<string, unknown>, key: string): unknown {
  return row[key];
}

function asBlocks(value: unknown): TimeBlock[] {
  if (!Array.isArray(value))
    throw new FamilyError(400, "invalid_block", "Plan blocks must be a list.");
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new FamilyError(400, "invalid_block", "Each block must be an object.");
    }
    const row = item as Record<string, unknown>;
    const block: TimeBlock = {
      id: asString(field(row, "id")),
      start: asString(field(row, "start")),
      minutes: Number(field(row, "minutes")),
      title: asString(field(row, "title")),
      notes: asString(field(row, "notes")),
      done: Boolean(field(row, "done")),
    };
    const activityId = asString(field(row, "activityId"));
    if (activityId) block.activityId = activityId;
    return block;
  });
}

type Route =
  | { name: "health" }
  | { name: "children" }
  | { name: "child"; childId: string }
  | { name: "invites"; childId: string }
  | { name: "invite"; childId: string; inviteId: string }
  | { name: "invitePeek"; token: string }
  | { name: "inviteAccept"; token: string }
  | { name: "plan"; childId: string }
  | { name: "planBlock"; childId: string; blockId: string };

function matchRoute(pathname: string): Route | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "family") return null;
  const rest = parts.slice(2);

  if (rest.length === 1 && rest[0] === "health") return { name: "health" };
  if (rest.length === 1 && rest[0] === "children") return { name: "children" };
  if (rest.length === 2 && rest[0] === "children")
    return { name: "child", childId: decodeURIComponent(rest[1]!) };
  if (rest.length === 3 && rest[0] === "children" && rest[2] === "invites") {
    return { name: "invites", childId: decodeURIComponent(rest[1]!) };
  }
  if (rest.length === 4 && rest[0] === "children" && rest[2] === "invites") {
    return {
      name: "invite",
      childId: decodeURIComponent(rest[1]!),
      inviteId: decodeURIComponent(rest[3]!),
    };
  }
  if (rest.length === 3 && rest[0] === "children" && rest[2] === "plan") {
    return { name: "plan", childId: decodeURIComponent(rest[1]!) };
  }
  if (rest.length === 5 && rest[0] === "children" && rest[2] === "plan" && rest[3] === "blocks") {
    return {
      name: "planBlock",
      childId: decodeURIComponent(rest[1]!),
      blockId: decodeURIComponent(rest[4]!),
    };
  }
  if (rest.length === 2 && rest[0] === "invites") {
    return { name: "invitePeek", token: decodeURIComponent(rest[1]!) };
  }
  if (rest.length === 3 && rest[0] === "invites" && rest[2] === "accept") {
    return { name: "inviteAccept", token: decodeURIComponent(rest[1]!) };
  }
  return null;
}

function defaultInviteUrl(req: Request, token: string): string {
  const originHeader = req.headers.get("origin");
  const forwarded = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const origin = originHeader || (forwarded ? `${proto}://${forwarded}` : new URL(req.url).origin);
  return `${origin.replace(/\/$/, "")}/invite/${encodeURIComponent(token)}`;
}

export function createFamilyHttpHandler(deps: FamilyHttpDeps) {
  return async function handle(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const route = matchRoute(url.pathname);
      if (!route) return json({ error: "Not found.", code: "not_found" }, 404);

      if (route.name === "health") {
        return json({ ok: true, configured: deps.configured, store: deps.storeName });
      }

      if (!deps.service || !deps.configured) {
        throw new FamilyError(
          503,
          "not_configured",
          "Family sharing is not configured. Set CLERK_SECRET_KEY on the server.",
        );
      }

      const service = deps.service;

      if (route.name === "invitePeek" && req.method === "GET") {
        return json(await service.peekInvite(route.token));
      }

      const actor = await deps.authenticate(req);
      if (!actor) throw new FamilyError(401, "unauthorized", "Please sign in.");
      const body = await readJson(req);

      if (route.name === "children" && req.method === "GET") {
        return json({ children: await service.listChildren(actor) });
      }
      if (route.name === "children" && req.method === "POST") {
        const child = await service.createChild(actor, {
          displayName: asString(field(body, "displayName")),
          ageBand: asString(field(body, "ageBand")),
        });
        return json({ child }, 201);
      }
      if (route.name === "child" && req.method === "GET") {
        return json({ child: await service.getChild(actor, route.childId) });
      }
      if (route.name === "child" && req.method === "PATCH") {
        const displayName = field(body, "displayName");
        const ageBand = field(body, "ageBand");
        const child = await service.updateChild(actor, route.childId, {
          ...(typeof displayName === "string" ? { displayName } : {}),
          ...(typeof ageBand === "string" && isAgeBand(ageBand) ? { ageBand } : {}),
        });
        return json({ child });
      }
      if (route.name === "child" && req.method === "DELETE") {
        await service.deleteChild(actor, route.childId);
        return json({ ok: true });
      }
      if (route.name === "invites" && req.method === "POST") {
        const result = await service.invite(actor, route.childId, {
          email: asString(field(body, "email")),
          role: asString(field(body, "role")),
        });
        const inviteUrl = (deps.inviteUrl ?? defaultInviteUrl)(req, result.token);
        if (deps.afterInvite) await deps.afterInvite(result.email, inviteUrl);
        return json({ ...result, inviteUrl }, 201);
      }
      if (route.name === "invite" && req.method === "DELETE") {
        return json({ child: await service.cancelInvite(actor, route.childId, route.inviteId) });
      }
      if (route.name === "inviteAccept" && req.method === "POST") {
        return json({ child: await service.acceptInvite(actor, route.token) });
      }
      if (route.name === "plan" && req.method === "GET") {
        const date = url.searchParams.get("date") || "";
        return json({ plan: await service.getPlan(actor, route.childId, date) });
      }
      if (route.name === "plan" && req.method === "PUT") {
        const date = asString(field(body, "date")) || url.searchParams.get("date") || "";
        return json({
          plan: await service.savePlan(actor, route.childId, date, asBlocks(field(body, "blocks"))),
        });
      }
      if (route.name === "plan" && req.method === "DELETE") {
        const date = url.searchParams.get("date") || asString(field(body, "date"));
        await service.deletePlan(actor, route.childId, date);
        return json({ ok: true });
      }
      if (route.name === "planBlock" && req.method === "PATCH") {
        const date = asString(field(body, "date")) || url.searchParams.get("date") || "";
        return json({
          plan: await service.setBlockDone(
            actor,
            route.childId,
            date,
            route.blockId,
            Boolean(field(body, "done")),
          ),
        });
      }

      return json({ error: "Method not allowed.", code: "method" }, 405);
    } catch (err) {
      if (err instanceof SyntaxError) {
        return json({ error: "Invalid JSON.", code: "invalid_json" }, 400);
      }
      return errorResponse(err);
    }
  };
}
