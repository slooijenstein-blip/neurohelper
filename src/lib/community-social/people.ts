import { isSampleCommunityUser, productionHidesSamples } from "./examples.ts";
import { CommunityError, LIMITS, clipText } from "./limits.ts";
import { DEMO_ACTORS } from "./demo-actors.ts";
import { activeRole } from "./rules.ts";
import type { CommunityDb, SocialPerson, SocialShare, SocialTag } from "./types.ts";

export const MAX_TAGS = 10;
export const MAX_SHARES = 20;

export function peopleList(db: CommunityDb): SocialPerson[] {
  if (!Array.isArray(db.people)) db.people = [];
  return db.people;
}

export function rememberPerson(
  db: CommunityDb,
  person: { userId: string; name: string; role?: string },
) {
  const userId = person.userId.trim();
  if (!userId || userId.startsWith("child_")) return;
  const name = clipText(person.name, 80) || "Member";
  const role = clipText(person.role, 40) || "Parent";
  const people = peopleList(db);
  const existing = people.find((item) => item.userId === userId);
  if (existing) {
    existing.name = name;
    existing.role = role;
    return;
  }
  people.push({ userId, name, role });
}

/** People accounts only. Child records are never searchable or taggable. */
export function knownPeople(db: CommunityDb, env: NodeJS.ProcessEnv = process.env): SocialPerson[] {
  const hideSamples = productionHidesSamples(env);
  const map = new Map<string, SocialPerson>();
  const add = (person: SocialPerson) => {
    if (!person.userId || person.userId.startsWith("child_")) return;
    if (hideSamples && isSampleCommunityUser(person.userId)) return;
    if (!map.has(person.userId)) map.set(person.userId, person);
  };
  for (const person of peopleList(db)) add(person);
  for (const member of db.members) {
    if (member.status !== "active") continue;
    add({ userId: member.userId, name: member.name, role: "Parent" });
  }
  for (const post of db.posts) {
    add({ userId: post.authorId, name: post.authorName, role: post.authorRole });
  }
  if (!hideSamples) {
    for (const actor of Object.values(DEMO_ACTORS)) {
      const role =
        actor.userId === "demo_therapist"
          ? "Therapist"
          : actor.userId === "demo_grandparent"
            ? "Grandparent"
            : "Parent";
      add({ userId: actor.userId, name: actor.name, role });
    }
  }
  return [...map.values()];
}

export function personCouldSee(db: CommunityDb, groupId: string | null, userId: string): boolean {
  if (!groupId) return true;
  const group = db.groups.find((item) => item.id === groupId);
  if (!group) return false;
  if (group.visibility === "public") return true;
  return activeRole(db, group.id, userId) !== null;
}

export function idList(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || ids.includes(id)) continue;
    if (id.startsWith("child_")) {
      throw new CommunityError(400, "invalid", "Tag people accounts only, never a child.");
    }
    ids.push(id);
    if (ids.length >= max) break;
  }
  return ids;
}

export function resolveTags(
  db: CommunityDb,
  raw: unknown,
  groupId: string | null,
  authorId: string,
  env: NodeJS.ProcessEnv = process.env,
): SocialTag[] {
  const wanted = idList(raw, MAX_TAGS);
  const known = knownPeople(db, env);
  const tags: SocialTag[] = [];
  for (const id of wanted) {
    if (id === authorId) continue;
    const person = known.find((item) => item.userId === id);
    if (!person) throw new CommunityError(400, "invalid", "Choose a person from the name search.");
    if (!personCouldSee(db, groupId, person.userId)) {
      throw new CommunityError(403, "forbidden", "You can only tag people who can see this post.");
    }
    tags.push({ userId: person.userId, name: person.name });
  }
  return tags;
}

export function resolveShares(
  db: CommunityDb,
  raw: unknown,
  groupId: string | null,
  authorId: string,
  now: string,
  env: NodeJS.ProcessEnv = process.env,
): SocialShare[] {
  const wanted = idList(raw, MAX_SHARES);
  const known = knownPeople(db, env);
  const shares: SocialShare[] = [];
  for (const id of wanted) {
    if (id === authorId) continue;
    const person = known.find((item) => item.userId === id);
    if (!person) throw new CommunityError(400, "invalid", "Choose a person from the name search.");
    if (!personCouldSee(db, groupId, person.userId)) {
      throw new CommunityError(
        403,
        "forbidden",
        "You can only share with people who can see this post.",
      );
    }
    shares.push({ userId: person.userId, name: person.name, byUserId: authorId, createdAt: now });
  }
  return shares;
}

export function tagsOf(post: { tags?: SocialTag[] }): SocialTag[] {
  if (!Array.isArray(post.tags)) return [];
  return post.tags.filter((tag) => tag.userId && !tag.userId.startsWith("child_"));
}

export function sharesOf(post: { shares?: SocialShare[] }): SocialShare[] {
  if (!Array.isArray(post.shares)) return [];
  return post.shares.filter((share) => share.userId && !share.userId.startsWith("child_"));
}

export function searchPeople(
  db: CommunityDb,
  query: string,
  groupId: string | null,
  authorId: string,
  env: NodeJS.ProcessEnv = process.env,
): SocialPerson[] {
  const needle = clipText(query, 80).toLocaleLowerCase();
  if (!needle) return [];
  return knownPeople(db, env)
    .filter((person) => person.userId !== authorId)
    .filter((person) => person.name.toLocaleLowerCase().includes(needle))
    .filter((person) => personCouldSee(db, groupId, person.userId))
    .slice(0, 8);
}

export function clipBody(raw: unknown): string {
  return clipText(raw, LIMITS.maxBody);
}
