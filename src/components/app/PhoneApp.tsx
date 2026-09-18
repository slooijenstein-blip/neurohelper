import { Activity, CalendarDays, Heart, Globe, UserRound } from "lucide-react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { isClerkConfigured } from "@/lib/clerk";
import { ActivitiesTab } from "./ActivitiesTab";
import { ScheduleTab } from "./ScheduleTab";
import { JourneyTab } from "./JourneyTab";
import { CommunityTab } from "./CommunityTab";
import { ProfileTab } from "./ProfileTab";
import { ProfileView } from "./ProfileView";
import { ArticleView } from "./ArticleView";
import { AuthLoading } from "./AuthScreen";
import { useAppStore } from "@/lib/app-store";

export type TabKey = "activities" | "schedule" | "journey" | "community" | "profile";

const TABS = [
  { key: "activities", label: "Activities", icon: Activity },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "journey", label: "Journey", icon: Heart },
  { key: "community", label: "Community", icon: Globe },
  { key: "profile", label: "Profile", icon: UserRound },
] as const;

function AppShell({ tab, onTab }: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);

  return (
    <div className="phone-shell">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {articleId ? (
          <ArticleView
            id={articleId}
            onBack={() => setArticleId(null)}
            onProfile={(id) => {
              setArticleId(null);
              setProfileId(id);
            }}
          />
        ) : profileId ? (
          <ProfileView
            id={profileId}
            onBack={() => setProfileId(null)}
            onArticle={(id) => setArticleId(id)}
          />
        ) : (
          {
            activities: <ActivitiesTab />,
            schedule: <ScheduleTab />,
            journey: <JourneyTab />,
            community: (
              <CommunityTab
                onProfile={(id) => setProfileId(id)}
                onArticle={(id) => setArticleId(id)}
              />
            ),
            profile: <ProfileTab />,
          }[tab]
        )}
      </div>

      <nav className="grid shrink-0 grid-cols-5 border-t border-border bg-card px-2 pb-4 pt-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setArticleId(null);
              setProfileId(null);
              onTab(key);
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-semibold transition-colors",
              tab === key ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("size-5", tab === key && "fill-primary/15")} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ClerkGatedApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { devDemo, hydrated } = useAppStore();

  if (!isLoaded || !hydrated) return <AuthLoading />;
  if (isSignedIn || (import.meta.env.DEV && devDemo)) return <AppShell {...props} />;
  return <Navigate to="/sign-in" />;
}

function LocalGatedApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const { devDemo, hydrated } = useAppStore();
  if (!hydrated) return <AuthLoading />;
  if (import.meta.env.DEV && devDemo) return <AppShell {...props} />;
  return <Navigate to="/sign-in" />;
}

export function PhoneApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  if (isClerkConfigured()) return <ClerkGatedApp {...props} />;
  return <LocalGatedApp {...props} />;
}
