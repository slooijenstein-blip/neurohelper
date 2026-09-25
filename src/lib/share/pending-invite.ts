const KEY = "synlumae-pending-invite";

/** Remember the invite link across a Clerk Google redirect back to home. */
export function rememberPendingInvite(token: string) {
  if (typeof window === "undefined" || !token) return;
  try {
    window.sessionStorage.setItem(KEY, token);
  } catch {
    /* ignore */
  }
}

export function readPendingInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
