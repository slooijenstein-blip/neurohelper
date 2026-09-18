import { Activity, CalendarDays, Heart, Globe, CircleHelp, UserRound, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { ActivitiesTab } from "./ActivitiesTab";
import { ScheduleTab } from "./ScheduleTab";
import { JourneyTab } from "./JourneyTab";
import { CommunityTab } from "./CommunityTab";
import { HelpTab } from "./HelpTab";
import { ProfileTab } from "./ProfileTab";
import { ProfileView } from "./ProfileView";
import { ArticleView } from "./ArticleView";
import { LoginScreen } from "./LoginScreen";
import { useAppStore } from "@/lib/app-store";
import { useState } from "react";

export type TabKey = "activities" | "schedule" | "journey" | "community" | "help" | "profile";

const TABS = [
  { key: "activities", label: "Activities", icon: Activity },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "journey", label: "Journey", icon: Heart },
  { key: "community", label: "Community", icon: Globe },
  { key: "help", label: "Help", icon: CircleHelp },
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
  const [helpNonce, setHelpNonce] = useState(0);

  const goTab = (key: TabKey) => {
    setArticleId(null);
    setProfileId(null);
    if (key === "help") setHelpNonce((n) => n + 1);
    onTab(key);
  };

  if (state.loggedOut || !state.profile) {
    return (
      <div className="phone-shell">
        <div className="app-main min-h-0 flex-1 md:items-center md:justify-center md:p-10">
          <div className="app-login-panel h-full min-h-0 md:h-auto md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card md:shadow-lg">
            <LoginScreen />
          </div>
        </div>
      </div>
    );
  }

  const screen =
    articleId ? (
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
        help: <HelpTab key={helpNonce} />,
        profile: <ProfileTab />,
      }[tab]
    );

  return (
    <div className="phone-shell">
      <aside className="app-sidebar">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-tight">NeuroHelper</p>
            <p className="text-xs text-muted-foreground">For neurodiverse families</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => goTab(key)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                tab === key && !articleId && !profileId
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", tab === key && !articleId && !profileId && "fill-primary/15")} />
              {label}
            </button>
          ))}
        </nav>

        <p className="mt-auto px-2 pt-6 text-[11px] text-muted-foreground">
          Signed in as {state.profile.name}
        </p>
      </aside>

      <div className="app-main">
        <div className="app-screen min-h-0">{screen}</div>
      </div>

      <nav className="app-tabbar" aria-label="Main">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => goTab(key)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg py-1 text-[9px] font-semibold transition-colors",
              tab === key && !articleId && !profileId ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("size-5", tab === key && !articleId && !profileId && "fill-primary/15")} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
