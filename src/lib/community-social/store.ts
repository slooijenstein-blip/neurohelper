import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { CommunityDb } from "./types.ts";

export type CommunityStore = {
  read(): Promise<CommunityDb>;
  update(mutate: (db: CommunityDb) => void): Promise<CommunityDb>;
};

export function emptyDb(): CommunityDb {
  return {
    posts: [],
    groups: [],
    members: [],
    reports: [],
    suspensions: [],
    moderators: [],
    uploads: [],
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function coerceDb(value: unknown): CommunityDb {
  if (!value || typeof value !== "object") return emptyDb();
  const row = value as Partial<CommunityDb>;
  return {
    posts: asArray(row.posts),
    groups: asArray(row.groups),
    members: asArray(row.members),
    reports: asArray(row.reports),
    suspensions: asArray(row.suspensions),
    moderators: asArray<string>(row.moderators).filter((item) => typeof item === "string"),
    uploads: asArray(row.uploads),
  };
}

export function createMemoryCommunityStore(initial?: CommunityDb): CommunityStore {
  let db = initial ? structuredClone(initial) : emptyDb();
  return {
    async read() {
      return structuredClone(db);
    },
    async update(mutate) {
      const next = structuredClone(db);
      mutate(next);
      db = next;
      return structuredClone(db);
    },
  };
}

export function createFileCommunityStore(filePath: string): CommunityStore {
  let initial = emptyDb();
  try {
    initial = coerceDb(JSON.parse(readFileSync(filePath, "utf8")));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
  const memory = createMemoryCommunityStore(initial);
  return {
    read: () => memory.read(),
    async update(mutate) {
      const next = await memory.update(mutate);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(next));
      return next;
    },
  };
}
