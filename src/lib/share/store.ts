import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { Workspace } from "./workspace.ts";

export type ShareStore = {
  get(ownerUserId: string): Promise<Workspace | null>;
  save(previous: Workspace | null, next: Workspace): Promise<void>;
  ownerForChild(childId: string): Promise<string | null>;
  ownerForPlan(planId: string): Promise<string | null>;
  ownerForInvite(inviteId: string): Promise<string | null>;
  ownerForMembership(membershipId: string): Promise<string | null>;
  ownerForToken(token: string): Promise<string | null>;
  ownersForUser(userId: string): Promise<string[]>;
  ownersForEmail(email: string): Promise<string[]>;
};

type Bag = {
  workspaces: Record<string, Workspace>;
  child: Record<string, string>;
  plan: Record<string, string>;
  invite: Record<string, string>;
  membership: Record<string, string>;
  token: Record<string, string>;
  user: Record<string, string[]>;
  email: Record<string, string[]>;
};

function emptyBag(): Bag {
  return {
    workspaces: {},
    child: {},
    plan: {},
    invite: {},
    membership: {},
    token: {},
    user: {},
    email: {},
  };
}

function listAdd(map: Record<string, string[]>, key: string, ownerId: string) {
  const current = map[key] ?? [];
  if (!current.includes(ownerId)) map[key] = [...current, ownerId];
}

function listRemove(map: Record<string, string[]>, key: string, ownerId: string) {
  const next = (map[key] ?? []).filter((item) => item !== ownerId);
  if (next.length) map[key] = next;
  else delete map[key];
}

function reindex(bag: Bag, previous: Workspace | null, next: Workspace) {
  const ownerId = next.ownerUserId;
  if (previous) {
    for (const child of previous.children) delete bag.child[child.id];
    for (const plan of previous.libraryPlans) delete bag.plan[plan.id];
    for (const invite of previous.invites) {
      delete bag.invite[invite.id];
      delete bag.token[invite.token];
    }
    for (const membership of previous.memberships) delete bag.membership[membership.id];
    for (const membership of previous.memberships) {
      if (membership.status === "active") listRemove(bag.user, membership.personId, ownerId);
    }
    for (const invite of previous.invites) {
      if (invite.status === "pending") listRemove(bag.email, invite.email, ownerId);
    }
  }
  bag.workspaces[ownerId] = next;
  for (const child of next.children) bag.child[child.id] = ownerId;
  for (const plan of next.libraryPlans) bag.plan[plan.id] = ownerId;
  for (const invite of next.invites) {
    bag.invite[invite.id] = ownerId;
    if (invite.status === "pending") bag.token[invite.token] = ownerId;
  }
  for (const membership of next.memberships) bag.membership[membership.id] = ownerId;
  const activeUsers = new Set(
    next.memberships
      .filter((membership) => membership.status === "active")
      .map((membership) => membership.personId),
  );
  activeUsers.add(ownerId);
  for (const userId of activeUsers) listAdd(bag.user, userId, ownerId);
  for (const invite of next.invites) {
    if (invite.status === "pending") listAdd(bag.email, invite.email, ownerId);
  }
}

export function createMemoryShareStore(): ShareStore {
  const bag = emptyBag();
  return storeFromBag(bag);
}

function storeFromBag(bag: Bag): ShareStore {
  return {
    async get(ownerUserId) {
      return bag.workspaces[ownerUserId] ?? null;
    },
    async save(previous, next) {
      reindex(bag, previous, next);
    },
    async ownerForChild(childId) {
      return bag.child[childId] ?? null;
    },
    async ownerForPlan(planId) {
      return bag.plan[planId] ?? null;
    },
    async ownerForInvite(inviteId) {
      return bag.invite[inviteId] ?? null;
    },
    async ownerForMembership(membershipId) {
      return bag.membership[membershipId] ?? null;
    },
    async ownerForToken(token) {
      return bag.token[token] ?? null;
    },
    async ownersForUser(userId) {
      return [...(bag.user[userId] ?? [])];
    },
    async ownersForEmail(email) {
      return [...(bag.email[email] ?? [])];
    },
  };
}

export function createFileShareStore(filePath: string): ShareStore {
  const bag = emptyBag();
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Bag;
    Object.assign(bag, parsed);
  } catch {
    /* first run */
  }
  const persist = () => {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(bag));
  };
  const inner = storeFromBag(bag);
  return {
    ...inner,
    async save(previous, next) {
      await inner.save(previous, next);
      persist();
    },
  };
}

type RedisEnv = { url: string; token: string };

function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  return env[name];
}

export function redisEnv(env: NodeJS.ProcessEnv): RedisEnv | null {
  const url = readEnv(env, "UPSTASH_REDIS_REST_URL") || readEnv(env, "KV_REST_API_URL");
  const token = readEnv(env, "UPSTASH_REDIS_REST_TOKEN") || readEnv(env, "KV_REST_API_TOKEN");
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function redis(conn: RedisEnv, command: string[]): Promise<unknown> {
  const response = await fetch(conn.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Redis request failed (${response.status}).`);
  }
  return payload.result;
}

const PREFIX = "synlumae:share:";

export function createRedisShareStore(conn: RedisEnv): ShareStore {
  const key = (suffix: string) => `${PREFIX}${suffix}`;

  const readJson = async <T>(suffix: string): Promise<T | null> => {
    const raw = await redis(conn, ["GET", key(suffix)]);
    if (typeof raw !== "string" || !raw) return null;
    return JSON.parse(raw) as T;
  };

  const writeJson = async (suffix: string, value: unknown) => {
    await redis(conn, ["SET", key(suffix), JSON.stringify(value)]);
  };

  const readList = async (suffix: string): Promise<string[]> => {
    return (await readJson<string[]>(suffix)) ?? [];
  };

  const writeList = async (suffix: string, values: string[]) => {
    if (values.length === 0) await redis(conn, ["DEL", key(suffix)]);
    else await writeJson(suffix, values);
  };

  return {
    async get(ownerUserId) {
      return readJson<Workspace>(`ws:${ownerUserId}`);
    },
    async save(_passed, next) {
      const lock = key(`lock:${next.ownerUserId}`);
      const locked = await redis(conn, ["SET", lock, "1", "NX", "EX", "8"]);
      if (locked !== "OK") {
        throw Object.assign(new Error("busy"), { code: "conflict" });
      }
      try {
        const previous = await readJson<Workspace>(`ws:${next.ownerUserId}`);
        if ((previous?.rev ?? 0) !== next.rev - 1) {
          throw Object.assign(new Error("conflict"), { code: "conflict" });
        }
        await writeJson(`ws:${next.ownerUserId}`, next);
        const drop = (suffix: string) => redis(conn, ["DEL", key(suffix)]);
        if (previous) {
          await Promise.all([
            ...previous.children.map((child) => drop(`child:${child.id}`)),
            ...previous.libraryPlans.map((plan) => drop(`plan:${plan.id}`)),
            ...previous.invites.flatMap((invite) => [
              drop(`invite:${invite.id}`),
              drop(`token:${invite.token}`),
            ]),
            ...previous.memberships.map((membership) => drop(`mem:${membership.id}`)),
          ]);
          const prevUsers = new Set(
            previous.memberships
              .filter((membership) => membership.status === "active")
              .map((membership) => membership.personId),
          );
          for (const userId of prevUsers) {
            const list = (await readList(`user:${userId}`)).filter((id) => id !== next.ownerUserId);
            await writeList(`user:${userId}`, list);
          }
          for (const invite of previous.invites) {
            if (invite.status !== "pending") continue;
            const list = (await readList(`email:${invite.email}`)).filter(
              (id) => id !== next.ownerUserId,
            );
            await writeList(`email:${invite.email}`, list);
          }
        }
        await Promise.all([
          ...next.children.map((child) =>
            redis(conn, ["SET", key(`child:${child.id}`), next.ownerUserId]),
          ),
          ...next.libraryPlans.map((plan) =>
            redis(conn, ["SET", key(`plan:${plan.id}`), next.ownerUserId]),
          ),
          ...next.invites.map((invite) =>
            redis(conn, ["SET", key(`invite:${invite.id}`), next.ownerUserId]),
          ),
          ...next.invites
            .filter((invite) => invite.status === "pending")
            .map((invite) => redis(conn, ["SET", key(`token:${invite.token}`), next.ownerUserId])),
          ...next.memberships.map((membership) =>
            redis(conn, ["SET", key(`mem:${membership.id}`), next.ownerUserId]),
          ),
        ]);
        const users = new Set(
          next.memberships
            .filter((membership) => membership.status === "active")
            .map((membership) => membership.personId),
        );
        users.add(next.ownerUserId);
        for (const userId of users) {
          const list = await readList(`user:${userId}`);
          if (!list.includes(next.ownerUserId)) {
            await writeList(`user:${userId}`, [...list, next.ownerUserId]);
          }
        }
        for (const invite of next.invites) {
          if (invite.status !== "pending") continue;
          const list = await readList(`email:${invite.email}`);
          if (!list.includes(next.ownerUserId)) {
            await writeList(`email:${invite.email}`, [...list, next.ownerUserId]);
          }
        }
      } finally {
        await redis(conn, ["DEL", lock]);
      }
    },
    async ownerForChild(childId) {
      const value = await redis(conn, ["GET", key(`child:${childId}`)]);
      return typeof value === "string" ? value : null;
    },
    async ownerForPlan(planId) {
      const value = await redis(conn, ["GET", key(`plan:${planId}`)]);
      return typeof value === "string" ? value : null;
    },
    async ownerForInvite(inviteId) {
      const value = await redis(conn, ["GET", key(`invite:${inviteId}`)]);
      return typeof value === "string" ? value : null;
    },
    async ownerForMembership(membershipId) {
      const value = await redis(conn, ["GET", key(`mem:${membershipId}`)]);
      return typeof value === "string" ? value : null;
    },
    async ownerForToken(token) {
      const value = await redis(conn, ["GET", key(`token:${token}`)]);
      return typeof value === "string" ? value : null;
    },
    async ownersForUser(userId) {
      return readList(`user:${userId}`);
    },
    async ownersForEmail(email) {
      return readList(`email:${email}`);
    },
  };
}
