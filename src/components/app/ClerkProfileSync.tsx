import { useUser } from "@clerk/react";
import { useEffect } from "react";

import { useAppStore } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import {
  isLegacyDemoProfile,
  planClerkProfileSync,
  profileFromClerkUser,
} from "@/lib/clerk-profile";

function ClerkProfileSyncInner() {
  const { isLoaded, user } = useUser();
  const { state, update, exitDevDemo, hydrated, devDemo, prototypeDemo } = useAppStore();

  useEffect(() => {
    if (prototypeDemo) return;
    if (!isLoaded || !user || !hydrated) return;

    const plan = planClerkProfileSync({
      existing: state.profile,
      clerkUserId: user.id,
      loggedOut: state.loggedOut,
      devDemo,
    });
    if (plan.action === "skip") return;

    const wasDemo = isLegacyDemoProfile(state.profile);
    const sameUser = state.profile?.clerkUserId === user.id;

    exitDevDemo();
    update((prev) => ({
      ...prev,
      loggedOut: false,
      profile: profileFromClerkUser(user, prev.profile),
      childName: sameUser ? prev.childName : wasDemo ? "" : prev.childName,
      observations: sameUser ? prev.observations : wasDemo ? [] : prev.observations,
      completedCount: sameUser ? prev.completedCount : wasDemo ? 0 : prev.completedCount,
    }));
  }, [
    devDemo,
    exitDevDemo,
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
