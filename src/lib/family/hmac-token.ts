import { createHmac, timingSafeEqual } from "node:crypto";

import type { TokenSigner } from "./types";

function encodeBody(ownerUserId: string, inviteId: string): string {
  return Buffer.from(JSON.stringify({ o: ownerUserId, i: inviteId }), "utf8").toString("base64url");
}

function decodeBody(body: string): { o: string; i: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      o?: unknown;
      i?: unknown;
    };
    if (typeof parsed.o !== "string" || typeof parsed.i !== "string") return null;
    return { o: parsed.o, i: parsed.i };
  } catch {
    return null;
  }
}

function hmac(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** HMAC tokens so invites cannot be forged without CLERK_SECRET_KEY. */
export function createHmacTokenSigner(secret: string): TokenSigner {
  return {
    sign(ownerUserId, inviteId) {
      const body = encodeBody(ownerUserId, inviteId);
      return `${body}.${hmac(secret, body)}`;
    },
    parse(token) {
      const dot = token.lastIndexOf(".");
      if (dot <= 0) return null;
      const body = token.slice(0, dot);
      const sig = token.slice(dot + 1);
      if (!equal(hmac(secret, body), sig)) return null;
      const parsed = decodeBody(body);
      if (!parsed) return null;
      return { ownerUserId: parsed.o, inviteId: parsed.i };
    },
  };
}
