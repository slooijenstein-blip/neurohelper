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

export function seedExampleGroups(db: CommunityDb) {
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
