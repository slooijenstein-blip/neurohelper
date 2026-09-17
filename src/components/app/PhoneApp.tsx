import { Activity, CalendarDays, Heart, Globe, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { ActivitiesTab } from "./ActivitiesTab";
import { ScheduleTab } from "./ScheduleTab";
import { JourneyTab } from "./JourneyTab";
import { CommunityTab } from "./CommunityTab";
import { ProfileTab } from "./ProfileTab";
import { ProfileView } from "./ProfileView";
import { ArticleView } from "./ArticleView";
import { LoginScreen } from "./LoginScreen";
import { useAppStore } from "@/lib/app-store";
import { useState } from "react";

export type TabKey = "activities" | "schedule" | "journey" | "community" | "profile";

const TABS = [
  { key: "activities", label: "Activities", icon: Activity },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "journey", label: "Journey", icon: Heart },
  { key: "community", label: "Community", icon: Globe },
  { key: "profile", label: "Profile", icon: UserRound },
] as const;

export function PhoneApp({
  tab,
  onTab,
}: {
  tab: TabKey;
  onTab: (t: TabKey) => void;
}) {
  const { state } = useAppStore();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);

  if (state.loggedOut || !state.profile) {
    return (
      <div className="phone-shell">
        <div className="min-h-0 flex-1">
          <LoginScreen />
        </div>
      </div>
    );
  }

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

      <nav className="shrink-0 grid grid-cols-5 border-t border-border bg-card px-2 pb-4 pt-2">
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
