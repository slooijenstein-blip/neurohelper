import type { TokenSigner } from "./types";

function encodeBody(ownerUserId: string, inviteId: string): string {
  const json = JSON.stringify({ o: ownerUserId, i: inviteId });
  if (typeof Buffer !== "undefined") return Buffer.from(json, "utf8").toString("base64url");
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBody(body: string): { o: string; i: string } | null {
  try {
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(body, "base64url").toString("utf8")
        : atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as { o?: unknown; i?: unknown };
    if (typeof parsed.o !== "string" || typeof parsed.i !== "string") return null;
    return { o: parsed.o, i: parsed.i };
  } catch {
    return null;
  }
}

/** Unsigned tokens for the on-device demo store. Not used in production. */
export function createLocalTokenSigner(): TokenSigner {
  return {
    sign(ownerUserId, inviteId) {
      return `local.${encodeBody(ownerUserId, inviteId)}`;
    },
    parse(token) {
      if (!token.startsWith("local.")) return null;
      const parsed = decodeBody(token.slice("local.".length));
      if (!parsed) return null;
      return { ownerUserId: parsed.o, inviteId: parsed.i };
    },
  };
}
