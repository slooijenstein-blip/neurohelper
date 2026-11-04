import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { redisEnv } from "../share/store.ts";
import { creatorKeyPrefix } from "./rules.ts";
import type { CreatorActivity } from "./types.ts";

export type CreatorStore = {
  get(id: string): Promise<CreatorActivity | null>;
  save(activity: CreatorActivity): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<CreatorActivity[]>;
};

function byNewest(rows: CreatorActivity[]): CreatorActivity[] {
  return [...rows].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  );
}

export function createMemoryCreatorStore(): CreatorStore {
  const rows = new Map<string, CreatorActivity>();
  return {
    async get(id) {
      return rows.get(id) ?? null;
    },
    async save(activity) {
      rows.set(activity.id, activity);
    },
    async delete(id) {
      rows.delete(id);
    },
    async list() {
      return byNewest([...rows.values()]);
    },
  };
}

export function createFileCreatorStore(filePath: string): CreatorStore {
  const rows = new Map<string, CreatorActivity>();
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as { activities?: CreatorActivity[] };
    for (const activity of parsed.activities ?? []) {
      if (activity?.id) rows.set(activity.id, activity);
    }
  } catch {
    /* first run */
  }
  const persist = () => {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ activities: [...rows.values()] }));
  };
  const inner = {
    async get(id: string) {
      return rows.get(id) ?? null;
    },
    async save(activity: CreatorActivity) {
      rows.set(activity.id, activity);
      persist();
    },
    async delete(id: string) {
      rows.delete(id);
      persist();
    },
    async list() {
      return byNewest([...rows.values()]);
    },
  };
  return inner;
}

type RedisEnv = { url: string; token: string };

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

export function createRedisCreatorStore(conn: RedisEnv, prefix: string): CreatorStore {
  const key = (suffix: string) => `${prefix}${suffix}`;

  const readJson = async <T>(suffix: string): Promise<T | null> => {
    const raw = await redis(conn, ["GET", key(suffix)]);
    if (typeof raw !== "string" || !raw) return null;
    return JSON.parse(raw) as T;
  };

  const readIds = async (): Promise<string[]> => {
    return (await readJson<string[]>("ids")) ?? [];
  };

  const withLock = async <T>(work: () => Promise<T>): Promise<T> => {
    const lock = key("lock");
    let locked: unknown = null;
    for (let attempt = 0; attempt < 4 && locked !== "OK"; attempt += 1) {
      locked = await redis(conn, ["SET", lock, "1", "NX", "EX", "8"]);
      if (locked !== "OK") await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
    if (locked !== "OK") throw Object.assign(new Error("busy"), { code: "conflict" });
    try {
      return await work();
    } finally {
      await redis(conn, ["DEL", lock]);
    }
  };

  return {
    async get(id) {
      return readJson<CreatorActivity>(`act:${id}`);
    },
    async save(activity) {
      await withLock(async () => {
        await redis(conn, ["SET", key(`act:${activity.id}`), JSON.stringify(activity)]);
        const ids = await readIds();
        if (!ids.includes(activity.id)) {
          await redis(conn, ["SET", key("ids"), JSON.stringify([...ids, activity.id])]);
        }
      });
    },
    async delete(id) {
      await withLock(async () => {
        await redis(conn, ["DEL", key(`act:${id}`)]);
        const ids = (await readIds()).filter((item) => item !== id);
        if (ids.length) await redis(conn, ["SET", key("ids"), JSON.stringify(ids)]);
        else await redis(conn, ["DEL", key("ids")]);
      });
    },
    async list() {
      const ids = await readIds();
      const rows = await Promise.all(ids.map((id) => readJson<CreatorActivity>(`act:${id}`)));
      return byNewest(rows.filter((row): row is CreatorActivity => row !== null));
    },
  };
}

export function createCreatorStore(env: NodeJS.ProcessEnv = process.env): CreatorStore | null {
  if (env["SHARE_STORE"] === "memory") return createMemoryCreatorStore();
  const redisConn = redisEnv(env);
  if (redisConn) return createRedisCreatorStore(redisConn, creatorKeyPrefix(env));
  if (!env["VERCEL"] && env["SHARE_STORE"] !== "none") {
    return createFileCreatorStore(path.join(process.cwd(), ".data", "creator-activities.json"));
  }
  return null;
}
