import { Activity, Baby, CalendarDays, Heart, Globe, CircleHelp, UserRound } from "lucide-react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/react";
import { useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { isClerkConfigured } from "@/lib/clerk";
import { ActivitiesTab } from "./ActivitiesTab";
import { ChildrenTab } from "./ChildrenTab";
import { ScheduleTab } from "./ScheduleTab";
import { JourneyTab } from "./JourneyTab";
import { CommunityTab } from "./CommunityTab";
import { HelpTab } from "./HelpTab";
import { ProfileTab } from "./ProfileTab";
import { ProfileView } from "./ProfileView";
import { ArticleView } from "./ArticleView";
import { AuthLoading } from "./AuthScreen";
import { BrandLogo } from "./BrandLogo";
import { useAppStore } from "@/lib/app-store";

export type TabKey =
  "activities" | "children" | "schedule" | "journey" | "community" | "help" | "profile";

const TABS = [
  { key: "activities", labelKey: "nav.activities", icon: Activity },
  { key: "children", labelKey: "nav.children", icon: Baby },
  { key: "schedule", labelKey: "nav.schedule", icon: CalendarDays },
  { key: "journey", labelKey: "nav.journey", icon: Heart },
  { key: "community", labelKey: "nav.community", icon: Globe },
  { key: "help", labelKey: "nav.help", icon: CircleHelp },
  { key: "profile", labelKey: "nav.profile", icon: UserRound },
] as const;

function AppShell({ tab, onTab }: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const { state } = useAppStore();
  const { t } = useI18n();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [helpNonce, setHelpNonce] = useState(0);

  const goTab = (key: TabKey) => {
    setArticleId(null);
    setProfileId(null);
    // Recreate Help so a temporary country lookup does not outlive this visit.
    if (key === "help") setHelpNonce((n) => n + 1);
    onTab(key);
  };

  const screen = articleId ? (
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
      children: <ChildrenTab />,
      schedule: <ScheduleTab onOpenChildren={() => goTab("children")} />,
      journey: <JourneyTab />,
      community: (
        <CommunityTab onProfile={(id) => setProfileId(id)} onArticle={(id) => setArticleId(id)} />
      ),
      help: <HelpTab key={helpNonce} />,
      profile: <ProfileTab />,
    }[tab]
  );

  return (
    <div className="phone-shell">
      <aside className="app-sidebar">
        <div className="mb-8 px-2">
          <BrandLogo variant="lockup" className="h-10 w-auto max-w-full" />
          <p className="mt-1 text-xs text-muted-foreground">{t("brand.tagline")}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label={t("nav.label")}>
          {TABS.map(({ key, labelKey, icon: Icon }) => (
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
              <Icon
                className={cn(
                  "size-5",
                  tab === key && !articleId && !profileId && "fill-primary/15",
                )}
              />
              {t(labelKey)}
            </button>
          ))}
        </nav>

        <p className="mt-auto px-2 pt-6 text-[11px] text-muted-foreground">
          {t("brand.signedInAs", { name: state.profile?.name ?? t("roles.caregiver") })}
        </p>
      </aside>

      <div className="app-main">
        <div className="app-screen min-h-0">{screen}</div>
      </div>

      <nav className="app-tabbar" aria-label={t("nav.label")}>
        {TABS.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => goTab(key)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg py-1 text-[8px] font-semibold transition-colors sm:text-[9px]",
              tab === key && !articleId && !profileId ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon
              className={cn("size-5", tab === key && !articleId && !profileId && "fill-primary/15")}
            />
            <span className="leading-tight">{t(labelKey)}</span>
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
