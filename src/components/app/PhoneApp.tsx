import {
  Activity,
  Baby,
  CalendarDays,
  Heart,
  Globe,
  CircleHelp,
  UserRound,
  Stethoscope,
} from "lucide-react";
import { Navigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { isClerkConfigured } from "@/lib/clerk";
import { isClerkCreatorPro, isClerkPro, type ClerkNameSource } from "@/lib/clerk-profile";
import { demoRolesAllowed } from "@/lib/demo-roles";
import { canUseFounderRole, founderEmailsFromClerk } from "@/lib/founder-role";
import { accountChrome, tabsForAccount, type AppTabKey } from "@/lib/pro-access";
import { useCalendarStore } from "@/lib/calendar/store";
import { useDevShareUser } from "@/lib/share/dev-session";
import { useAppStore } from "@/lib/app-store";
import { ActivitiesTab } from "./ActivitiesTab";
import { ChildrenTab } from "./ChildrenTab";
import { ScheduleTab } from "./ScheduleTab";
import { JourneyTab } from "./JourneyTab";
import { CommunityTab } from "./CommunityTab";
import { HelpTab, type HelpFocus } from "./HelpTab";
import { ActivityDetailDialog } from "./ActivityDetailDialog";
import { HelperChat, OpenHelperProvider } from "./HelperChat";
import { ProfileTab } from "./ProfileTab";
import { ProTab } from "./ProTab";
import { ProfileView } from "./ProfileView";
import { CommunityProfile } from "./community/CommunityProfile";
import { CommunitySocialProvider } from "./community/social-context";
import { ArticleView } from "./ArticleView";
import { AuthLoading } from "./AuthScreen";
import { BrandLogo } from "./BrandLogo";
import { DemoRoleBar } from "./DemoRoleBar";

export type TabKey = AppTabKey;

const TAB_META: Record<TabKey, { labelKey: string; icon: typeof Activity }> = {
  activities: { labelKey: "nav.activities", icon: Activity },
  children: { labelKey: "nav.children", icon: Baby },
  pro: { labelKey: "nav.pro", icon: Stethoscope },
  schedule: { labelKey: "nav.schedule", icon: CalendarDays },
  journey: { labelKey: "nav.journey", icon: Heart },
  community: { labelKey: "nav.community", icon: Globe },
  help: { labelKey: "nav.help", icon: CircleHelp },
  profile: { labelKey: "nav.profile", icon: UserRound },
};

function devShareFlags(devShare: string | null) {
  if (!import.meta.env.DEV || !devShare) return { pro: false, creator: false, founder: false };
  const parts = devShare.split("|");
  const creator = parts[4] === "1";
  return {
    pro: parts[3] === "1" || creator,
    creator,
    founder: canUseFounderRole([parts[1]]),
  };
}

function AppShell({
  tab,
  onTab,
  accountIsPro,
  showCreated,
}: {
  tab: TabKey;
  onTab: (t: TabKey) => void;
  accountIsPro: boolean;
  showCreated: boolean;
}) {
  const { state } = useAppStore();
  const cal = useCalendarStore();
  const { t } = useI18n();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [helpNonce, setHelpNonce] = useState(0);
  const [helperOpen, setHelperOpen] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [helpFocus, setHelpFocus] = useState<HelpFocus | null>(null);
  const clearHelpFocus = useCallback(() => setHelpFocus(null), []);
  const isPro = accountIsPro;
  const hasLinkedChildren = cal.hydrated && cal.myChildren.length > 0;
  const tabs = tabsForAccount(isPro, hasLinkedChildren);

  useEffect(() => {
    if (tab === "pro" && !isPro) onTab("activities");
    if (tab === "children" && (isPro || !hasLinkedChildren)) onTab("activities");
  }, [tab, isPro, hasLinkedChildren, onTab]);

  const [tabEpoch, setTabEpoch] = useState(0);

  const goTab = (key: TabKey, opts?: { keepFocus?: boolean }) => {
    const same = key === tab && !articleId && !profileId;
    setArticleId(null);
    setProfileId(null);
    setActivityId(null);
    setHelperOpen(false);
    // Recreate Help so a temporary country lookup does not outlive this visit.
    if (key === "help") setHelpNonce((n) => n + 1);
    if (same) {
      // A helper tap sets the article, then asks for Help. Do not wipe that focus.
      if (!opts?.keepFocus) setHelpFocus(null);
      if (key === "pro") cal.selectChild(null);
      setTabEpoch((n) => n + 1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const root = document.querySelector(".app-screen");
          if (!(root instanceof HTMLElement)) return;
          window.scrollTo(0, 0);
          for (const node of [root, ...root.querySelectorAll("*")]) {
            if (node instanceof HTMLElement && node.scrollTop > 0) node.scrollTop = 0;
          }
        });
      });
    }
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
  ) : profileId?.startsWith("social:") ? (
    <CommunityProfile
      userId={profileId.slice("social:".length)}
      onBack={() => setProfileId(null)}
    />
  ) : profileId ? (
    <ProfileView
      id={profileId}
      onBack={() => setProfileId(null)}
      onArticle={(id) => setArticleId(id)}
    />
  ) : (
    {
      activities: <ActivitiesTab key={tabEpoch} />,
      children: hasLinkedChildren ? (
        <ChildrenTab key={tabEpoch} />
      ) : (
        <ActivitiesTab key={tabEpoch} />
      ),
      pro: <ProTab key={tabEpoch} showCreated={showCreated} />,
      schedule: <ScheduleTab key={tabEpoch} />,
      journey: <JourneyTab key={tabEpoch} />,
      community: (
        <CommunityTab
          key={tabEpoch}
          onProfile={(id) => setProfileId(id)}
          onArticle={(id) => setArticleId(id)}
        />
      ),
      help: <HelpTab key={helpNonce} focus={helpFocus} onFocusHandled={clearHelpFocus} />,
      profile: <ProfileTab key={tabEpoch} />,
    }[tab === "pro" && !isPro ? "activities" : tab]
  );

  return (
    <CommunitySocialProvider>
      <OpenHelperProvider onOpen={() => setHelperOpen(true)}>
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
            <DemoRoleBar
              onChoose={() => {
                setArticleId(null);
                setProfileId(null);
              }}
            />
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
                    tab === key && !articleId && !profileId
                      ? "text-primary"
                      : "text-muted-foreground",
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
        <HelperChat
          open={helperOpen}
          onOpenChange={setHelperOpen}
          onOpenActivity={(id) => {
            setHelperOpen(false);
            setActivityId(id);
          }}
          onOpenHelp={(hub, itemId) => {
            setHelperOpen(false);
            setHelpFocus({ kind: "item", hub, itemId });
            goTab("help", { keepFocus: true });
          }}
          onOpenSupport={() => {
            setHelperOpen(false);
            setHelpFocus({ kind: "support" });
            goTab("help", { keepFocus: true });
          }}
        />
        <ActivityDetailDialog activityId={activityId} onClose={() => setActivityId(null)} />
      </OpenHelperProvider>
    </CommunitySocialProvider>
  );
}

function ClerkGatedApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { state, devDemo, prototypeDemo, hydrated } = useAppStore();
  const devShare = useDevShareUser();
  const demoOverlay =
    hydrated &&
    ((import.meta.env.DEV && (prototypeDemo || devDemo)) ||
      (prototypeDemo && demoRolesAllowed(window.location.hostname)));
  const clerkUser = user as ClerkNameSource | null | undefined;
  const dev = devShareFlags(devShare);
  const chrome = accountChrome({
    demoOverlay,
    profile: state.profile,
    clerkIsPro: clerkUser ? isClerkPro(clerkUser) : false,
    clerkIsCreatorPro: clerkUser ? isClerkCreatorPro(clerkUser) : false,
    founder: clerkUser ? canUseFounderRole(founderEmailsFromClerk(clerkUser)) : false,
    devPro: dev.pro,
    devCreator: dev.creator,
    devFounder: dev.founder,
  });

  if (!isLoaded || !hydrated) return <AuthLoading />;
  if (isSignedIn || demoOverlay || devShare) {
    return <AppShell {...props} accountIsPro={chrome.isPro} showCreated={chrome.showCreated} />;
  }
  return <Navigate to="/sign-in" />;
}

function LocalGatedApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const { state, devDemo, prototypeDemo, hydrated } = useAppStore();
  const devShare = useDevShareUser();
  const demoOverlay =
    hydrated &&
    ((import.meta.env.DEV && (prototypeDemo || devDemo)) ||
      (prototypeDemo && demoRolesAllowed(window.location.hostname)));
  const dev = devShareFlags(devShare);
  const chrome = accountChrome({
    demoOverlay,
    profile: state.profile,
    clerkIsPro: false,
    clerkIsCreatorPro: false,
    founder: false,
    devPro: dev.pro,
    devCreator: dev.creator,
    devFounder: dev.founder,
  });
  if (!hydrated) return <AuthLoading />;
  if (demoOverlay || devShare) {
    return <AppShell {...props} accountIsPro={chrome.isPro} showCreated={chrome.showCreated} />;
  }
  return <Navigate to="/sign-in" />;
}

export function PhoneApp(props: { tab: TabKey; onTab: (t: TabKey) => void }) {
  if (isClerkConfigured()) return <ClerkGatedApp {...props} />;
  return <LocalGatedApp {...props} />;
}
