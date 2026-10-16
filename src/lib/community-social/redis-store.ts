import { CommunityError } from "./limits.ts";
import { coerceDb, createMemoryCommunityStore, type CommunityStore } from "./store.ts";
import type { CommunityDb } from "./types.ts";

export const COMMUNITY_REDIS_KEY = "synlumae:community:db";
const LOCK_KEY = "synlumae:community:lock";

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

export function createRedisCommunityStore(conn: RedisEnv): CommunityStore {
  const read = async (): Promise<CommunityDb> => {
    const raw = await redis(conn, ["GET", COMMUNITY_REDIS_KEY]);
    if (typeof raw !== "string" || !raw) return coerceDb(null);
    return coerceDb(JSON.parse(raw));
  };

  return {
    read,
    async update(mutate) {
      let locked: unknown = null;
      for (let attempt = 0; attempt < 5 && locked !== "OK"; attempt += 1) {
        locked = await redis(conn, ["SET", LOCK_KEY, "1", "NX", "EX", "8"]);
        if (locked !== "OK")
          await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
      }
      if (locked !== "OK") {
        throw new CommunityError(409, "conflict", "Someone else is saving. Try again.");
      }
      try {
        const next = structuredClone(await read());
        mutate(next);
        await redis(conn, ["SET", COMMUNITY_REDIS_KEY, JSON.stringify(next)]);
        return next;
      } finally {
        await redis(conn, ["DEL", LOCK_KEY]);
      }
    },
  };
}

export { createMemoryCommunityStore };
