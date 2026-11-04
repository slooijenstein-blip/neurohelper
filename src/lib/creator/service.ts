import type { Actor } from "../share/actions.ts";
import { ShareError } from "../share/errors.ts";
import {
  applyInput,
  canAuthorActivities,
  isFounderActor,
  parseCreatorInput,
  parseReview,
  publicDisplayName,
} from "./rules.ts";
import type { CreatorStore } from "./store.ts";
import type { CreatorActivity, OwnedCreatorActivity, PublishedCreatorActivity } from "./types.ts";

function newId(): string {
  return `cact_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function toPublished(activity: CreatorActivity): PublishedCreatorActivity {
  return {
    id: activity.id,
    ownerName: activity.ownerName,
    title: activity.title,
    description: activity.description,
    minAge: activity.minAge,
    maxAge: activity.maxAge,
    skill: activity.skill,
    minutes: activity.minutes,
    materials: activity.materials,
    steps: activity.steps,
    language: activity.language,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
}

export function toOwned(activity: CreatorActivity): OwnedCreatorActivity {
  return {
    ...toPublished(activity),
    ownerId: activity.ownerId,
    status: activity.status,
    reviewNote: activity.reviewNote,
  };
}

function assertAuthor(actor: Actor) {
  if (!canAuthorActivities(actor)) {
    throw new ShareError(403, "not_creator", "Creator Pro is required to create activities.");
  }
}

async function owned(store: CreatorStore, actor: Actor, id: string): Promise<CreatorActivity> {
  const existing = await store.get(id);
  if (!existing || existing.ownerId !== actor.userId) {
    throw new ShareError(403, "not_owner", "You can only change activities you created.");
  }
  return existing;
}

export async function createCreatorActivity(
  store: CreatorStore,
  actor: Actor,
  body: Record<string, unknown>,
  now: string,
): Promise<CreatorActivity> {
  assertAuthor(actor);
  const input = parseCreatorInput(body);
  const activity: CreatorActivity = {
    id: newId(),
    ownerId: actor.userId,
    ownerName: publicDisplayName(actor.name),
    ...input,
    status: "pending",
    reviewNote: "",
    createdAt: now,
    updatedAt: now,
  };
  await store.save(activity);
  return activity;
}

export async function updateCreatorActivity(
  store: CreatorStore,
  actor: Actor,
  id: string,
  body: Record<string, unknown>,
  now: string,
): Promise<CreatorActivity> {
  assertAuthor(actor);
  const existing = await owned(store, actor, id);
  const next = applyInput(existing, parseCreatorInput(body), publicDisplayName(actor.name), now);
  await store.save(next);
  return next;
}

export async function deleteCreatorActivity(
  store: CreatorStore,
  actor: Actor,
  id: string,
): Promise<void> {
  assertAuthor(actor);
  await owned(store, actor, id);
  await store.delete(id);
}

export async function reviewCreatorActivity(
  store: CreatorStore,
  actor: Actor,
  id: string,
  body: Record<string, unknown>,
  now: string,
): Promise<CreatorActivity> {
  if (!isFounderActor(actor)) {
    throw new ShareError(403, "forbidden", "Only the founder can review activities.");
  }
  const existing = await store.get(id);
  if (!existing) throw new ShareError(404, "not_found", "Activity not found.");
  const review = parseReview(body);
  const next: CreatorActivity = {
    ...existing,
    status: review.decision === "approve" ? "published" : "rejected",
    reviewNote: review.note,
    updatedAt: now,
  };
  await store.save(next);
  return next;
}

export async function listOwnActivities(
  store: CreatorStore,
  actor: Actor,
): Promise<CreatorActivity[]> {
  assertAuthor(actor);
  const rows = await store.list();
  return rows.filter((row) => row.ownerId === actor.userId);
}

export async function listReviewQueue(
  store: CreatorStore,
  actor: Actor,
): Promise<CreatorActivity[]> {
  if (!isFounderActor(actor)) {
    throw new ShareError(403, "forbidden", "Only the founder can review activities.");
  }
  const rows = await store.list();
  return rows.filter((row) => row.status === "pending" || row.status === "rejected");
}

export async function listPublishedActivities(store: CreatorStore): Promise<CreatorActivity[]> {
  const rows = await store.list();
  return rows.filter((row) => row.status === "published");
}

export async function readVisibleActivity(
  store: CreatorStore,
  actor: Actor | null,
  id: string,
): Promise<{ activity: CreatorActivity; full: boolean }> {
  const activity = await store.get(id);
  if (!activity) throw new ShareError(404, "not_found", "Activity not found.");
  if (activity.status === "published") return { activity, full: false };
  const allowed = actor !== null && (actor.userId === activity.ownerId || isFounderActor(actor));
  if (!allowed) throw new ShareError(404, "not_found", "Activity not found.");
  return { activity, full: true };
}
