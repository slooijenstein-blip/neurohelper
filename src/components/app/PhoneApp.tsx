import {
  Activity,
  CalendarDays,
  Heart,
  Globe,
  CircleHelp,
  UserRound,
  Stethoscope,
} from "lucide-react";
import { Navigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { isClerkConfigured } from "@/lib/clerk";
import { isClerkPro, type ClerkNameSource } from "@/lib/clerk-profile";
import { isProAccount, showProChrome, tabsForAccount, type AppTabKey } from "@/lib/pro-access";
import { useDevShareUser } from "@/lib/share/dev-session";
import { ActivitiesTab } from "./ActivitiesTab";
import { ScheduleTab } from "./ScheduleTab";
import { JourneyTab } from "./JourneyTab";
import { CommunityTab } from "./CommunityTab";
import { HelpTab } from "./HelpTab";
import { ProfileTab } from "./ProfileTab";
import { ProTab } from "./ProTab";
import { ProfileView } from "./ProfileView";
import { ArticleView } from "./ArticleView";
import { AuthLoading } from "./AuthScreen";
import { BrandLogo } from "./BrandLogo";
import { useAppStore } from "@/lib/app-store";

export type TabKey = AppTabKey;

const TAB_META: Record<TabKey, { labelKey: string; icon: typeof Activity }> = {
  activities: { labelKey: "nav.activities", icon: Activity },
  pro: { labelKey: "nav.pro", icon: Stethoscope },
  schedule: { labelKey: "nav.schedule", icon: CalendarDays },
  journey: { labelKey: "nav.journey", icon: Heart },
  community: { labelKey: "nav.community", icon: Globe },
  help: { labelKey: "nav.help", icon: CircleHelp },
  profile: { labelKey: "nav.profile", icon: UserRound },
};

function AppShell({
  tab,
  onTab,
  clerkIsPro,
}: {
  tab: TabKey;
  onTab: (t: TabKey) => void;
  clerkIsPro: boolean;
}) {
  const { state, prototypeDemo } = useAppStore();
  const { t } = useI18n();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [helpNonce, setHelpNonce] = useState(0);
  const deviceDemo = import.meta.env.DEV && prototypeDemo && isProAccount(state.profile);
  const isPro = showProChrome({ clerkIsPro, deviceDemo });
  const tabs = tabsForAccount(isPro);

  useEffect(() => {
    if (tab === "pro" && !isPro) onTab("activities");
  }, [tab, isPro, onTab]);

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
      pro: <ProTab />,
      schedule: <ScheduleTab />,
      journey: <JourneyTab />,
      community: (
        <CommunityTab onProfile={(id) => setProfileId(id)} onArticle={(id) => setArticleId(id)} />
      ),
      help: <HelpTab key={helpNonce} />,
      profile: <ProfileTab />,
    }[tab === "pro" && !isPro ? "activities" : tab]
  );

  return (
    <div className="phone-shell">
      <aside className="app-sidebar">
        <div className="mb-8 px-2">
          <BrandLogo variant="lockup" className="h-10 w-auto max-w-full" />
          <p className="mt-1 text-xs text-muted-foreground">{t("brand.tagline")}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label={t("nav.label")}>
          {tabs.map((key) => {
            const { labelKey, icon: Icon } = TAB_META[key];
            return (
              <button
                key={key}
                type="button"
                data-nav={key}
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
            );
          })}
        </nav>

        <p className="mt-auto px-2 pt-6 text-[11px] text-muted-foreground">
          {t("brand.signedInAs", { name: state.profile?.name ?? t("roles.caregiver") })}
        </p>
      </aside>

      <div className="app-main">
        <div className="app-screen min-h-0">{screen}</div>
      </div>

      <nav
        className="app-tabbar"
        aria-label={t("nav.label")}
        style={{ ["--app-tab-count" as string]: String(tabs.length) }}
      >
        {tabs.map((key) => {
          const { labelKey, icon: Icon } = TAB_META[key];
          return (
            <button
              key={key}
              type="button"
              data-nav={key}
              onClick={() => goTab(key)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg py-1 text-[9px] font-semibold transition-colors",
                tab === key && !articleId && !profileId ? "text-primary" : "text-muted-foreground",
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
          );
        })}
      </nav>
    </div>
  );
}

function ClerkGatedApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { devDemo, prototypeDemo, hydrated } = useAppStore();
  const devShare = useDevShareUser();
  const deviceDemo = import.meta.env.DEV && (prototypeDemo || devDemo);
  const clerkIsPro = user ? isClerkPro(user as ClerkNameSource) : false;

  if (!isLoaded || !hydrated) return <AuthLoading />;
  if (isSignedIn || deviceDemo || devShare) return <AppShell {...props} clerkIsPro={clerkIsPro} />;
  return <Navigate to="/sign-in" />;
}

function LocalGatedApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const { devDemo, prototypeDemo, hydrated } = useAppStore();
  const devShare = useDevShareUser();
  const deviceDemo = import.meta.env.DEV && (prototypeDemo || devDemo);
  if (!hydrated) return <AuthLoading />;
  if (deviceDemo || devShare) return <AppShell {...props} clerkIsPro={false} />;
  return <Navigate to="/sign-in" />;
}

export function PhoneApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  if (isClerkConfigured()) return <ClerkGatedApp {...props} />;
  return <LocalGatedApp {...props} />;
}
