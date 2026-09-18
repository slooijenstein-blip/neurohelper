import { useUser } from "@clerk/react";
import { useEffect } from "react";

import { useAppStore } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import { isLegacyDemoProfile, profileFromClerkUser } from "@/lib/clerk-profile";

function ClerkProfileSyncInner() {
  const { isLoaded, user } = useUser();
  const { state, update, exitDevDemo, hydrated, devDemo } = useAppStore();

  useEffect(() => {
    if (!isLoaded || !user || !hydrated) return;

    const nextProfile = profileFromClerkUser(user, state.profile);
    const wasDemo = isLegacyDemoProfile(state.profile);
    const sameUser = state.profile?.clerkUserId === user.id;

    if (sameUser && state.profile?.name === nextProfile.name && !state.loggedOut && !devDemo) {
      return;
    }

    exitDevDemo();
    update((prev) => ({
      ...prev,
      loggedOut: false,
      profile: profileFromClerkUser(user, prev.profile),
      childName: sameUser ? prev.childName : wasDemo ? "" : prev.childName,
      observations: sameUser ? prev.observations : wasDemo ? [] : prev.observations,
      completedCount: sameUser ? prev.completedCount : wasDemo ? 0 : prev.completedCount,
    }));
  }, [devDemo, exitDevDemo, hydrated, isLoaded, state.loggedOut, state.profile, update, user]);

  return null;
}

export function ClerkProfileSync() {
  if (!isClerkConfigured()) return null;
  return <ClerkProfileSyncInner />;
}
