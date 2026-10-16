import type { ShareAuth } from "../share/client.ts";

export type CommunityAuth = ShareAuth & { demoPersona?: string | null };
import type {
  ClientGroup,
  ClientMember,
  ClientPost,
  ClientReport,
  GroupVisibility,
} from "./types.ts";
import type { PreparedMedia } from "./prepare-media.ts";

export class CommunityClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CommunityClientError";
    this.code = code;
  }
}

function authHeaders(auth: CommunityAuth, json = false): Headers {
  const headers = new Headers();
  if (auth.token) headers.set("authorization", `Bearer ${auth.token}`);
  if (auth.devUser && import.meta.env.DEV) headers.set("x-share-dev-user", auth.devUser);
  if (auth.demoPersona) headers.set("x-synlumae-demo-persona", auth.demoPersona);
  if (json) headers.set("content-type", "application/json");
  return headers;
}

async function parse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!response.ok) {
    throw new CommunityClientError(
      body.code || "server_error",
      body.error || "Something went wrong.",
    );
  }
  return body as T;
}

export type CommunitySession = {
  configured: boolean;
  media: "blob" | "local" | "none";
  signedIn: boolean;
  moderator: boolean;
  founder: boolean;
  suspended: boolean;
  userId: string | null;
  name: string | null;
};

export async function fetchCommunityHealth(): Promise<{
  ok: boolean;
  store: string;
  media: "blob" | "local" | "none";
}> {
  const response = await fetch("/api/community/health");
  return parse(response);
}

export async function fetchCommunitySession(auth: CommunityAuth): Promise<CommunitySession> {
  const response = await fetch("/api/community/session", { headers: authHeaders(auth) });
  return parse(response);
}

export async function fetchCommunityFeed(auth: ShareAuth): Promise<ClientPost[]> {
  const response = await fetch("/api/community/feed", { headers: authHeaders(auth) });
  const body = await parse<{ posts: ClientPost[] }>(response);
  return body.posts;
}

export async function fetchCommunityShorts(auth: ShareAuth): Promise<ClientPost[]> {
  const response = await fetch("/api/community/shorts", { headers: authHeaders(auth) });
  const body = await parse<{ posts: ClientPost[] }>(response);
  return body.posts;
}

export async function fetchCommunityGroups(auth: ShareAuth): Promise<ClientGroup[]> {
  const response = await fetch("/api/community/groups", { headers: authHeaders(auth) });
  const body = await parse<{ groups: ClientGroup[] }>(response);
  return body.groups;
}

export async function fetchCommunityGroup(
  auth: ShareAuth,
  id: string,
): Promise<{ group: ClientGroup; members: ClientMember[]; posts: ClientPost[] }> {
  const response = await fetch(`/api/community/groups/${encodeURIComponent(id)}`, {
    headers: authHeaders(auth),
  });
  return parse(response);
}

export async function fetchGroupQueue(
  auth: ShareAuth,
  id: string,
): Promise<{ posts: ClientPost[]; reports: ClientReport[] }> {
  const response = await fetch(`/api/community/groups/${encodeURIComponent(id)}/queue`, {
    headers: authHeaders(auth),
  });
  return parse(response);
}

export async function fetchModerationQueue(auth: ShareAuth): Promise<{
  posts: ClientPost[];
  reports: ClientReport[];
  moderators: string[];
}> {
  const response = await fetch("/api/community/moderation", { headers: authHeaders(auth) });
  return parse(response);
}

async function postJson(auth: ShareAuth, url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(auth, true),
    body: JSON.stringify(body),
  });
  return parse(response);
}

export async function createCommunityPost(
  auth: ShareAuth,
  body: {
    body?: string;
    privacyAck: true;
    consent?: boolean;
    uploadId?: string;
    groupId?: string | null;
    authorRole?: string;
  },
): Promise<ClientPost> {
  const result = (await postJson(auth, "/api/community/posts", body)) as { post: ClientPost };
  return result.post;
}

export async function likeCommunityPost(auth: ShareAuth, id: string): Promise<void> {
  await postJson(auth, `/api/community/posts/${encodeURIComponent(id)}/like`, {});
}

export async function commentCommunityPost(
  auth: ShareAuth,
  id: string,
  text: string,
  authorRole: string,
): Promise<void> {
  await postJson(auth, `/api/community/posts/${encodeURIComponent(id)}/comments`, {
    text,
    authorRole,
  });
}

export async function reportCommunity(
  auth: ShareAuth,
  body: { targetType: "post" | "comment"; postId: string; commentId?: string; reason: string },
): Promise<void> {
  await postJson(auth, "/api/community/reports", body);
}

export async function removeCommunityComment(
  auth: ShareAuth,
  postId: string,
  commentId: string,
): Promise<void> {
  await postJson(
    auth,
    `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/remove`,
    {},
  );
}

export async function reviewCommunityPost(
  auth: ShareAuth,
  id: string,
  action: "approve" | "reject" | "remove",
  reason?: string,
): Promise<void> {
  await postJson(auth, `/api/community/moderation/posts/${encodeURIComponent(id)}`, {
    action,
    reason,
  });
}

export async function suspendCommunityUser(
  auth: ShareAuth,
  userId: string,
  active: boolean,
  reason: string,
): Promise<void> {
  await postJson(auth, "/api/community/moderation/suspend", { userId, active, reason });
}

export async function setCommunityModerator(
  auth: ShareAuth,
  email: string,
  action: "add" | "remove",
): Promise<void> {
  await postJson(auth, "/api/community/moderation/moderators", { email, action });
}

export async function createCommunityGroup(
  auth: ShareAuth,
  body: {
    name: string;
    description: string;
    rules: string;
    visibility: GroupVisibility;
    joinQuestion?: string;
    uploadId?: string;
  },
): Promise<string> {
  const result = (await postJson(auth, "/api/community/groups", body)) as { id: string };
  return result.id;
}

export async function updateCommunityGroup(
  auth: ShareAuth,
  id: string,
  body: {
    name: string;
    description: string;
    rules: string;
    visibility: GroupVisibility;
    joinQuestion?: string;
    uploadId?: string;
  },
): Promise<void> {
  await postJson(auth, `/api/community/groups/${encodeURIComponent(id)}`, body);
}

export async function joinCommunityGroup(
  auth: CommunityAuth,
  id: string,
  answer?: string,
): Promise<"joined" | "requested"> {
  const result = (await postJson(auth, `/api/community/groups/${encodeURIComponent(id)}/join`, {
    ...(answer ? { answer } : {}),
  })) as { status?: "joined" | "requested" };
  return result.status === "requested" ? "requested" : "joined";
}

export async function deleteCommunityGroup(auth: CommunityAuth, id: string): Promise<void> {
  await postJson(auth, `/api/community/groups/${encodeURIComponent(id)}/delete`, {});
}

export async function transferCommunityGroup(
  auth: CommunityAuth,
  id: string,
  userId: string,
): Promise<void> {
  await postJson(auth, `/api/community/groups/${encodeURIComponent(id)}/transfer`, { userId });
}

export async function leaveCommunityGroup(auth: ShareAuth, id: string): Promise<void> {
  await postJson(auth, `/api/community/groups/${encodeURIComponent(id)}/leave`, {});
}

export async function communityMemberAction(
  auth: ShareAuth,
  groupId: string,
  body: { userId: string; action: string; role?: string },
): Promise<void> {
  await postJson(auth, `/api/community/groups/${encodeURIComponent(groupId)}/members`, body);
}

export async function uploadPreparedMedia(
  auth: CommunityAuth,
  userId: string,
  mediaMode: "blob" | "local",
  prepared: PreparedMedia,
): Promise<string> {
  if (mediaMode === "local") {
    const form = new FormData();
    form.set("file", prepared.file);
    form.set("kind", prepared.kind);
    if (prepared.width) form.set("width", String(prepared.width));
    if (prepared.height) form.set("height", String(prepared.height));
    if (prepared.durationSec) form.set("durationSec", String(prepared.durationSec));
    const response = await fetch("/api/community/media", {
      method: "POST",
      headers: authHeaders(auth),
      body: form,
    });
    const body = await parse<{ uploadId: string }>(response);
    return body.uploadId;
  }
  const { upload } = await import("@vercel/blob/client");
  const headers: Record<string, string> = {};
  if (auth.token) headers["authorization"] = `Bearer ${auth.token}`;
  if (auth.devUser && import.meta.env.DEV) headers["x-share-dev-user"] = auth.devUser;
  if (auth.demoPersona) headers["x-synlumae-demo-persona"] = auth.demoPersona;
  const blob = await upload(
    `community/${userId}/${prepared.kind === "image" ? "photo.jpg" : "video.mp4"}`,
    prepared.file,
    {
      access: "public",
      handleUploadUrl: "/api/community/blob",
      contentType: prepared.file.type,
      headers,
    },
  );
  const saved = (await postJson(auth, "/api/community/uploads", {
    url: blob.url,
    kind: prepared.kind,
    contentType: prepared.file.type,
    bytes: prepared.file.size,
    width: prepared.width,
    height: prepared.height,
    durationSec: prepared.durationSec,
  })) as { uploadId: string };
  return saved.uploadId;
}
