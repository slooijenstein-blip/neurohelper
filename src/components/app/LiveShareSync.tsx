import { useAuth, useUser } from "@clerk/react";
import { useEffect, useRef } from "react";

import { useAppStore, type Profile } from "@/lib/app-store";
import { useCalendarStore } from "@/lib/calendar/store";
import { isClerkConfigured } from "@/lib/clerk";
import { displayNameFromClerk, isClerkPro, type ClerkNameSource } from "@/lib/clerk-profile";
import type { Actor } from "@/lib/share/actions";
import { fetchShareSnapshot, type SnapshotResult } from "@/lib/share/client";
import { useDevShareUser } from "@/lib/share/dev-session";
import { blankAccountState } from "@/lib/share/workspace";

function profileWithPro(profile: Profile, isPro: boolean): Profile {
  const { isPro: _drop, ...rest } = profile;
  return isPro ? { ...rest, isPro: true } : rest;
}

function liveStateFrom(actor: Actor, result: SnapshotResult) {
  if (result.ok) return { state: result.state, status: "ready" as const, isPro: result.isPro };
  return {
    state: blankAccountState(actor),
    status: result.code === "not_configured" ? ("not_configured" as const) : ("error" as const),
    isPro: actor.isPro,
  };
}

function DevLiveShareSync() {
  const devUser = useDevShareUser();
  const { prototypeDemo, hydrated, update } = useAppStore();
  const cal = useCalendarStore();
  const updateRef = useRef(update);
  const attachRef = useRef(cal.attachLive);
  const detachRef = useRef(cal.detachLive);
  updateRef.current = update;
  attachRef.current = cal.attachLive;
  detachRef.current = cal.detachLive;

  useEffect(() => {
    if (!hydrated || !cal.hydrated || !devUser) return;
    if (prototypeDemo) {
      detachRef.current();
      return;
    }
    const [userId, email, name, proFlag] = devUser.split("|");
    const isPro = proFlag === "1";
    const actor: Actor = {
      userId: userId || "user_dev",
      email: email || "member@example.com",
      name: name || "Member",
      isPro,
    };
    updateRef.current((prev) => ({
      ...prev,
      loggedOut: false,
      profile: profileWithPro(
        {
          id: "me",
          clerkUserId: userId || "user_dev",
          name: name || "Member",
          role: isPro ? "Therapist" : "Parent",
          location: prev.profile?.location ?? "",
          bio: prev.profile?.bio ?? "",
          socials: prev.profile?.socials ?? {},
          color: prev.profile?.color ?? "bg-primary",
          ...(prev.profile?.locale ? { locale: prev.profile.locale } : {}),
          ...(prev.profile?.helpCountry ? { helpCountry: prev.profile.helpCountry } : {}),
        },
        isPro,
      ),
    }));

    let cancel = false;
    void (async () => {
      let attached: ReturnType<typeof liveStateFrom>;
      try {
        const result = await fetchShareSnapshot({ token: null, devUser });
        attached = liveStateFrom(actor, result);
      } catch {
        attached = {
          state: blankAccountState(actor),
          status: "error",
          isPro: actor.isPro,
        };
      }
      if (cancel) return;
      attachRef.current({
        getToken: async () => null,
        devUser,
        state: attached.state,
        status: attached.status,
      });
    })();
    return () => {
      cancel = true;
    };
  }, [cal.hydrated, devUser, hydrated, prototypeDemo]);

  return null;
}

function ClerkLiveShareSync() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const { user } = useUser();
  const { prototypeDemo, hydrated, update } = useAppStore();
  const cal = useCalendarStore();
  const updateRef = useRef(update);
  const attachRef = useRef(cal.attachLive);
  const detachRef = useRef(cal.detachLive);
  updateRef.current = update;
  attachRef.current = cal.attachLive;
  detachRef.current = cal.detachLive;

  useEffect(() => {
    if (!hydrated || !cal.hydrated || !isLoaded) return;
    if (prototypeDemo || !isSignedIn || !userId) {
      detachRef.current();
      return;
    }
    const clerkUser = user as ClerkNameSource | null | undefined;
    const actor: Actor = {
      userId,
      email: clerkUser?.primaryEmailAddress?.emailAddress || "member@example.com",
      name: clerkUser ? displayNameFromClerk(clerkUser) : "Member",
      isPro: clerkUser ? isClerkPro(clerkUser) : false,
    };
    let cancel = false;
    void (async () => {
      let attached: ReturnType<typeof liveStateFrom>;
      try {
        const token = await getToken();
        const result = await fetchShareSnapshot({ token, devUser: null });
        attached = liveStateFrom(actor, result);
      } catch {
        attached = {
          state: blankAccountState(actor),
          status: "error",
          isPro: actor.isPro,
        };
      }
      if (cancel) return;
      attachRef.current({
        getToken,
        devUser: null,
        state: attached.state,
        status: attached.status,
      });
      updateRef.current((prev) => {
        if (!prev.profile || Boolean(prev.profile.isPro) === attached.isPro) return prev;
        return { ...prev, profile: profileWithPro(prev.profile, attached.isPro) };
      });
    })();
    return () => {
      cancel = true;
    };
  }, [cal.hydrated, getToken, hydrated, isLoaded, isSignedIn, prototypeDemo, user, userId]);

  return null;
}

export function LiveShareSync() {
  const devUser = useDevShareUser();
  if (isClerkConfigured()) return <ClerkLiveShareSync />;
  if (devUser) return <DevLiveShareSync />;
  return null;
}
