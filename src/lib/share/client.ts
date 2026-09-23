import type { CalendarState } from "../calendar/types.ts";
import type { EmailResult, ShareAction } from "./actions.ts";

export type ShareAuth = {
  token: string | null;
  devUser: string | null;
};

export type SnapshotResult =
  { ok: true; isPro: boolean; state: CalendarState } | { ok: false; code: string; message: string };

function authHeaders(auth: ShareAuth): Headers {
  const headers = new Headers();
  if (auth.token) headers.set("authorization", `Bearer ${auth.token}`);
  if (auth.devUser && import.meta.env.DEV) headers.set("x-share-dev-user", auth.devUser);
  return headers;
}

async function readError(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body = (await response.json()) as { code?: string; error?: string };
    return {
      code: body.code || "server_error",
      message: body.error || "Something went wrong. Try again.",
    };
  } catch {
    return { code: "server_error", message: "Something went wrong. Try again." };
  }
}

export async function fetchShareSnapshot(auth: ShareAuth): Promise<SnapshotResult> {
  const response = await fetch("/api/share/snapshot", { headers: authHeaders(auth) });
  if (!response.ok) {
    const err = await readError(response);
    return { ok: false, ...err };
  }
  const body = (await response.json()) as { isPro: boolean; state: CalendarState };
  return { ok: true, isPro: Boolean(body.isPro), state: body.state };
}

export async function postShareAction(
  auth: ShareAuth,
  action: ShareAction,
  origin: string,
): Promise<{ state: CalendarState; email: EmailResult | null; inviteId: string | null }> {
  const headers = authHeaders(auth);
  headers.set("content-type", "application/json");
  const response = await fetch("/api/share/actions", {
    method: "POST",
    headers,
    body: JSON.stringify({ action, origin }),
  });
  if (!response.ok) {
    const err = await readError(response);
    throw new Error(err.message);
  }
  return (await response.json()) as {
    state: CalendarState;
    email: EmailResult | null;
    inviteId: string | null;
  };
}

export async function fetchInvitePreview(
  token: string,
): Promise<{ childDisplayName: string; role: "caregiver" | "helper"; email: string } | null> {
  const response = await fetch(`/api/share/invites/${encodeURIComponent(token)}`);
  if (response.status === 404) return null;
  if (!response.ok) return null;
  return (await response.json()) as {
    childDisplayName: string;
    role: "caregiver" | "helper";
    email: string;
  };
}

export async function acceptInviteOnServer(
  auth: ShareAuth,
  token: string,
  origin: string,
): Promise<{ state: CalendarState; isPro?: boolean }> {
  const headers = authHeaders(auth);
  headers.set("content-type", "application/json");
  const response = await fetch(`/api/share/invites/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    headers,
    body: JSON.stringify({ origin }),
  });
  if (!response.ok) {
    const err = await readError(response);
    throw Object.assign(new Error(err.message), { code: err.code });
  }
  return (await response.json()) as { state: CalendarState };
}
