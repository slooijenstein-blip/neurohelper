import type { ShareAuth } from "../share/client.ts";
import { creatorActivityToCatalog, replacePublishedCreatorActivities } from "./catalog.ts";
import type { OwnedCreatorActivity, PublishedCreatorActivity } from "./types.ts";
import type { CreatorActivityInput } from "./types.ts";

export class CreatorApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CreatorApiError";
    this.code = code;
  }
}

function authHeaders(auth: ShareAuth | null): Headers {
  const headers = new Headers();
  if (auth?.token) headers.set("authorization", `Bearer ${auth.token}`);
  if (auth?.devUser && import.meta.env.DEV) headers.set("x-share-dev-user", auth.devUser);
  return headers;
}

async function readError(response: Response): Promise<CreatorApiError> {
  try {
    const body = (await response.json()) as { code?: string; error?: string };
    return new CreatorApiError(body.code || "server_error", body.error || "Something went wrong.");
  } catch {
    return new CreatorApiError("server_error", "Something went wrong.");
  }
}

async function send<T>(
  path: string,
  auth: ShareAuth | null,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const headers = authHeaders(auth);
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(body);
  }
  const response = await fetch(path, init);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

let publishedAt = 0;
let inflight: Promise<void> | null = null;

export function refreshPublishedCreatorActivities(force = false): Promise<void> {
  if (!force && publishedAt && Date.now() - publishedAt < 15000) return Promise.resolve();
  if (inflight && !force) return inflight;
  inflight = send<{ activities: PublishedCreatorActivity[] }>(
    "/api/share/creator-activities?scope=published",
    null,
  )
    .then((body) => {
      replacePublishedCreatorActivities(body.activities.map(creatorActivityToCatalog));
      publishedAt = Date.now();
    })
    .catch(() => {
      /* The built-in catalog still works when this preview has no store. */
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function fetchOwnCreatorActivities(auth: ShareAuth): Promise<OwnedCreatorActivity[]> {
  return send<{ activities: OwnedCreatorActivity[] }>(
    "/api/share/creator-activities?scope=mine",
    auth,
  ).then((body) => body.activities);
}

export function fetchCreatorReviewQueue(auth: ShareAuth): Promise<OwnedCreatorActivity[]> {
  return send<{ activities: OwnedCreatorActivity[] }>(
    "/api/share/creator-activities?scope=review",
    auth,
  ).then((body) => body.activities);
}

export function createCreatorActivity(
  auth: ShareAuth,
  input: CreatorActivityInput,
): Promise<OwnedCreatorActivity> {
  return send<{ activity: OwnedCreatorActivity }>(
    "/api/share/creator-activities",
    auth,
    "POST",
    input,
  ).then((body) => body.activity);
}

export function updateCreatorActivity(
  auth: ShareAuth,
  id: string,
  input: CreatorActivityInput,
): Promise<OwnedCreatorActivity> {
  return send<{ activity: OwnedCreatorActivity }>(
    `/api/share/creator-activities/${encodeURIComponent(id)}`,
    auth,
    "PATCH",
    input,
  ).then((body) => body.activity);
}

export function deleteCreatorActivity(auth: ShareAuth, id: string): Promise<void> {
  return send(`/api/share/creator-activities/${encodeURIComponent(id)}`, auth, "DELETE").then(
    () => undefined,
  );
}

export function reviewCreatorActivity(
  auth: ShareAuth,
  id: string,
  decision: "approve" | "reject",
  note: string,
): Promise<OwnedCreatorActivity> {
  return send<{ activity: OwnedCreatorActivity }>(
    `/api/share/creator-activities/${encodeURIComponent(id)}/review`,
    auth,
    "POST",
    { decision, note },
  ).then((body) => body.activity);
}

export type CreatorAccessUser = {
  userId: string;
  email: string;
  name: string;
  isPro: boolean;
  isCreatorPro: boolean;
};

export function lookupCreatorAccess(
  auth: ShareAuth,
  email: string,
): Promise<CreatorAccessUser | null> {
  const query = new URLSearchParams({ email });
  return send<{ user: CreatorAccessUser | null }>(
    `/api/share/creator-access?${query.toString()}`,
    auth,
  ).then((body) => body.user);
}

export function setCreatorAccess(
  auth: ShareAuth,
  userId: string,
  isCreatorPro: boolean,
): Promise<CreatorAccessUser> {
  return send<{ user: CreatorAccessUser }>("/api/share/creator-access", auth, "POST", {
    userId,
    isCreatorPro,
  }).then((body) => body.user);
}
