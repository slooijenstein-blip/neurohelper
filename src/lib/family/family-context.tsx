import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useUser } from "@clerk/react";

import { useAppStore } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import { createHttpFamilyClient, createServiceFamilyClient, type FamilyClient } from "./client";
import { FamilyService } from "./family-service";
import { createLocalTokenSigner } from "./local-token";
import { LocalStorageFamilyStore } from "./memory-store";
import { FamilyError, toDateKey, type Actor, type ChildSummary } from "./types";

const SELECTED_KEY = "synlumae-selected-child";
const LOCAL_STORE_KEY = "synlumae-family-v1";

const DEV_ACTOR: Actor = {
  userId: "dev-sam",
  email: "sam@localhost",
  name: "Sam",
};

type FamilyContextValue = {
  ready: boolean;
  mode: "api" | "local";
  actor: Actor | null;
  client: FamilyClient | null;
  children: ChildSummary[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  refresh: () => Promise<void>;
  error: string | null;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

function readSelected(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

function writeSelected(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(SELECTED_KEY, id);
    else window.localStorage.removeItem(SELECTED_KEY);
  } catch {
    /* ignore */
  }
}

function LocalFamilyInner({
  actor,
  modeBanner,
  children,
}: {
  actor: Actor;
  modeBanner?: boolean;
  children: ReactNode;
}) {
  void modeBanner;
  const service = useMemo(
    () => new FamilyService(new LocalStorageFamilyStore(LOCAL_STORE_KEY), createLocalTokenSigner()),
    [],
  );
  const client = useMemo(() => createServiceFamilyClient(service, actor), [service, actor]);
  return (
    <FamilySession actor={actor} client={client} mode="local">
      {children}
    </FamilySession>
  );
}

function FamilySession({
  actor,
  client,
  mode,
  children,
}: {
  actor: Actor | null;
  client: FamilyClient | null;
  mode: "api" | "local";
  children: ReactNode;
}) {
  const [list, setList] = useState<ChildSummary[]>([]);
  const [selectedChildId, setSelectedChildIdState] = useState<string | null>(readSelected);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const setSelectedChildId = useCallback((id: string | null) => {
    setSelectedChildIdState(id);
    writeSelected(id);
  }, []);

  const refresh = useCallback(async () => {
    if (!client || !actor) {
      setList([]);
      setReady(true);
      return;
    }
    try {
      const next = await client.listChildren();
      setList(next);
      setError(null);
      setSelectedChildIdState((prev) => {
        const current = prev ?? readSelected();
        if (current && next.some((child) => child.id === current)) {
          writeSelected(current);
          return current;
        }
        const fallback = next[0]?.id ?? null;
        writeSelected(fallback);
        return fallback;
      });
    } catch (err) {
      setError(err instanceof FamilyError ? err.message : "Could not load children.");
    } finally {
      setReady(true);
    }
  }, [actor, client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<FamilyContextValue>(
    () => ({
      ready,
      mode,
      actor,
      client,
      children: list,
      selectedChildId,
      setSelectedChildId,
      selectedDate,
      setSelectedDate,
      refresh,
      error,
    }),
    [
      actor,
      client,
      error,
      list,
      mode,
      ready,
      refresh,
      selectedChildId,
      selectedDate,
      setSelectedChildId,
    ],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

function ClerkFamilyInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/family/health")
      .then(async (res) => {
        const data = (await res.json()) as { configured?: boolean };
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const actor = useMemo<Actor | null>(() => {
    if (!user) return null;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return null;
    return {
      userId: user.id,
      email,
      name: user.fullName || user.firstName || email.split("@")[0] || "Member",
    };
  }, [user]);

  const httpClient = useMemo(() => createHttpFamilyClient(() => getToken()), [getToken]);

  if (!isLoaded || configured === null) {
    return (
      <FamilySession actor={null} client={null} mode="api">
        {children}
      </FamilySession>
    );
  }

  if (isSignedIn && configured && actor) {
    return (
      <FamilySession actor={actor} client={httpClient} mode="api">
        {children}
      </FamilySession>
    );
  }

  if (actor) {
    return <LocalFamilyInner actor={actor}>{children}</LocalFamilyInner>;
  }

  return (
    <FamilySession actor={null} client={null} mode="local">
      {children}
    </FamilySession>
  );
}

function ClerkFamilyOrLocal({ children }: { children: ReactNode }) {
  return <ClerkFamilyInner>{children}</ClerkFamilyInner>;
}

export function FamilyStoreProvider({ children }: { children: ReactNode }) {
  const { devDemo } = useAppStore();
  if (devDemo || !isClerkConfigured()) {
    return <LocalFamilyInner actor={DEV_ACTOR}>{children}</LocalFamilyInner>;
  }
  return <ClerkFamilyOrLocal>{children}</ClerkFamilyOrLocal>;
}

export function useFamilyStore() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamilyStore must be used inside FamilyStoreProvider");
  return ctx;
}

export function useOptionalFamilyStore() {
  return useContext(FamilyContext);
}
