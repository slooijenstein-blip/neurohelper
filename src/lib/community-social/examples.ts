import type { CommunityDb, SocialGroup } from "./types.ts";

export const EXAMPLE_PUBLIC_ID = "cgrp_examplepublic0001";
export const EXAMPLE_PRIVATE_ID = "cgrp_exampleprivate001";
const EXAMPLE_OWNER = "synlumae_examples";
const EXAMPLE_AT = "2026-10-16T08:00:00.000Z";

const EXAMPLES: Array<
  Pick<SocialGroup, "id" | "name" | "description" | "rules" | "visibility" | "joinQuestion"> & {
    ownerId: string;
    ownerName: string;
  }
> = [
  {
    id: EXAMPLE_PUBLIC_ID,
    name: "Everyday wins",
    description: "A public group for small wins from the week. Anyone can read and join.",
    rules: "Be kind. No full names, schools, or exact locations. Ask before you share a face.",
    visibility: "public",
    joinQuestion: "",
    ownerId: EXAMPLE_OWNER,
    ownerName: "Synlumae",
  },
  {
    id: EXAMPLE_PRIVATE_ID,
    name: "Quiet questions",
    description: "A private group. You can see that it exists, and an admin lets members in.",
    rules: "Questions stay in the group. No full names, schools, or exact locations.",
    visibility: "private",
    joinQuestion: "What would you like to talk about with other caregivers?",
    ownerId: "demo_therapist",
    ownerName: "Demo Therapist",
  },
];

export function groupNeedsOwner(db: CommunityDb): boolean {
  return db.groups.some(
    (group) =>
      !db.members.some(
        (member) =>
          member.groupId === group.id && member.status === "active" && member.role === "owner",
      ),
  );
}

export function examplesMissing(db: CommunityDb): boolean {
  return EXAMPLES.some((example) => !db.groups.some((group) => group.id === example.id));
}

/** Promote the creator to owner when an older group has only admins. */
export function ensureOwners(db: CommunityDb) {
  for (const group of db.groups) {
    const active = db.members.filter(
      (member) => member.groupId === group.id && member.status === "active",
    );
    if (active.some((member) => member.role === "owner")) continue;
    const creator = active.find((member) => member.userId === group.createdBy);
    const admin = creator ?? active.find((member) => member.role === "admin");
    if (admin) admin.role = "owner";
  }
}

const SAMPLE_COMMUNITY_USERS = new Set([
  "demo_therapist",
  "demo_parent",
  "demo_grandparent",
  EXAMPLE_OWNER,
]);

/** Preview keeps the sample groups. Production must not show or create them. */
export function productionHidesSamples(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL_ENV === "production";
}

export function isSampleCommunityUser(userId: string | null | undefined): boolean {
  return Boolean(userId && SAMPLE_COMMUNITY_USERS.has(userId));
}

export function isSampleGroup(group: { id: string; createdBy: string }): boolean {
  return (
    group.id === EXAMPLE_PUBLIC_ID ||
    group.id === EXAMPLE_PRIVATE_ID ||
    isSampleCommunityUser(group.createdBy)
  );
}

export function presentCommunityDb(db: CommunityDb, env: NodeJS.ProcessEnv): CommunityDb {
  if (!productionHidesSamples(env)) return db;
  const hiddenGroups = new Set(
    db.groups.filter((group) => isSampleGroup(group)).map((group) => group.id),
  );
  const posts = db.posts
    .filter(
      (post) =>
        !(post.groupId && hiddenGroups.has(post.groupId)) && !isSampleCommunityUser(post.authorId),
    )
    .map((post) => ({
      ...post,
      likeUserIds: post.likeUserIds.filter((userId) => !isSampleCommunityUser(userId)),
      comments: post.comments.filter((comment) => !isSampleCommunityUser(comment.authorId)),
    }));
  const visiblePosts = new Set(posts.map((post) => post.id));
  return {
    ...db,
    groups: db.groups.filter((group) => !hiddenGroups.has(group.id)),
    members: db.members.filter(
      (member) => !hiddenGroups.has(member.groupId) && !isSampleCommunityUser(member.userId),
    ),
    posts,
    reports: db.reports.filter(
      (report) => visiblePosts.has(report.postId) && !isSampleCommunityUser(report.reporterId),
    ),
  };
}

export function seedExampleGroups(db: CommunityDb) {
  if (productionHidesSamples(process.env)) return;
  for (const example of EXAMPLES) {
    if (db.groups.some((group) => group.id === example.id)) continue;
    const { ownerId, ownerName, ...fields } = example;
    db.groups.push({
      ...fields,
      coverUrl: null,
      createdBy: ownerId,
      createdAt: EXAMPLE_AT,
    });
    db.members.push({
      groupId: example.id,
      userId: ownerId,
      name: ownerName,
      role: "owner",
      status: "active",
      answer: "",
      createdAt: EXAMPLE_AT,
    });
  }
}
