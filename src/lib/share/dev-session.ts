import { useSyncExternalStore } from "react";

const KEY = "synlumae-share-dev";
const listeners = new Set<() => void>();

/** Local-only stand-in for two Clerk users. Never enabled in a production build. */
export function devShareEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env["VITE_SHARE_DEV_BYPASS"] === "1";
}

export function readDevShareUser(): string | null {
  if (!devShareEnabled() || typeof window === "undefined") return null;
  return window.sessionStorage.getItem(KEY);
}

export function setDevShareUser(value: string | null) {
  if (!devShareEnabled() || typeof window === "undefined") return;
  if (value) window.sessionStorage.setItem(KEY, value);
  else window.sessionStorage.removeItem(KEY);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDevShareUser(): string | null {
  return useSyncExternalStore(subscribe, readDevShareUser, () => null);
}
