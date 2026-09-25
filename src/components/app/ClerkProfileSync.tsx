import { useUser } from "@clerk/react";
import { useEffect } from "react";

import { useAppStore } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import {
  applyClerkProFlag,
  isLegacyDemoProfile,
  planClerkProfileSync,
  profileFromClerkUser,
} from "@/lib/clerk-profile";

function ClerkProfileSyncInner() {
  const { isLoaded, user } = useUser();
  const { state, update, exitDevDemo, exitPrototypeDemo, hydrated, devDemo, prototypeDemo } =
    useAppStore();

  useEffect(() => {
    if (!isLoaded || !user || !hydrated) return;
    if (prototypeDemo) exitPrototypeDemo();

    const plan = planClerkProfileSync({
      existing: prototypeDemo ? null : state.profile,
      clerkUserId: user.id,
      loggedOut: state.loggedOut,
      devDemo,
    });
    const wasDemo = isLegacyDemoProfile(state.profile);
    const sameUser = !prototypeDemo && state.profile?.clerkUserId === user.id;

    exitDevDemo();
    update((prev) => {
      const base =
        plan.action === "bind"
          ? profileFromClerkUser(user, prototypeDemo ? null : prev.profile)
          : prev.profile;
      if (!base) return prev;
      const profile = applyClerkProFlag(base, user);
      if (plan.action === "skip" && profile === prev.profile) return prev;
      return {
        ...prev,
        loggedOut: false,
        profile,
        childName: sameUser ? prev.childName : wasDemo || prototypeDemo ? "" : prev.childName,
        observations: sameUser
          ? prev.observations
          : wasDemo || prototypeDemo
            ? []
            : prev.observations,
        completedCount: sameUser
          ? prev.completedCount
          : wasDemo || prototypeDemo
            ? 0
            : prev.completedCount,
      };
    });
  }, [
    devDemo,
    exitDevDemo,
    exitPrototypeDemo,
    hydrated,
    isLoaded,
    prototypeDemo,
    state.loggedOut,
    state.profile,
    update,
    user,
  ]);

  return null;
}

export function ClerkProfileSync() {
  if (!isClerkConfigured()) return null;
  return <ClerkProfileSyncInner />;
}
