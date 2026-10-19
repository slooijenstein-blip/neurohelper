import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  CommunityDb,
  GroupRole,
  GroupVisibility,
  MemberStatus,
  SocialGroup,
  SocialMembership,
} from "./types.ts";

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
    people: [],
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asVisibility(value: unknown): GroupVisibility {
  if (value === "private" || value === "hidden" || value === "public") return value;
  return "public";
}

function asRole(value: unknown): GroupRole {
  if (value === "owner" || value === "admin" || value === "moderator" || value === "member")
    return value;
  return "member";
}

function asStatus(value: unknown): MemberStatus {
  if (value === "requested" || value === "banned" || value === "active") return value;
  return "active";
}

function asGroup(value: unknown): SocialGroup | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<SocialGroup>;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === "string" ? row.description : "",
    rules: typeof row.rules === "string" ? row.rules : "",
    visibility: asVisibility(row.visibility),
    coverUrl: typeof row.coverUrl === "string" ? row.coverUrl : null,
    joinQuestion: typeof row.joinQuestion === "string" ? row.joinQuestion : "",
    createdBy: typeof row.createdBy === "string" ? row.createdBy : "",
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
  };
}

function asMember(value: unknown): SocialMembership | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<SocialMembership>;
  if (typeof row.groupId !== "string" || typeof row.userId !== "string") return null;
  return {
    groupId: row.groupId,
    userId: row.userId,
    name: typeof row.name === "string" ? row.name : "Member",
    role: asRole(row.role),
    status: asStatus(row.status),
    answer: typeof row.answer === "string" ? row.answer : "",
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
  };
}

export function coerceDb(value: unknown): CommunityDb {
  if (!value || typeof value !== "object") return emptyDb();
  const row = value as Partial<CommunityDb>;
  return {
    posts: asArray(row.posts),
    groups: asArray(row.groups)
      .map(asGroup)
      .filter((item): item is SocialGroup => item !== null),
    members: asArray(row.members)
      .map(asMember)
      .filter((item): item is SocialMembership => item !== null),
    reports: asArray(row.reports),
    suspensions: asArray(row.suspensions),
    moderators: asArray<string>(row.moderators).filter((item) => typeof item === "string"),
    uploads: asArray(row.uploads),
    people: asArray(row.people).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const person = item as { userId?: unknown; name?: unknown; role?: unknown };
      if (typeof person.userId !== "string" || person.userId.startsWith("child_")) return [];
      return [
        {
          userId: person.userId,
          name: typeof person.name === "string" && person.name.trim() ? person.name : "Member",
          role: typeof person.role === "string" && person.role.trim() ? person.role : "Parent",
        },
      ];
    }),
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
