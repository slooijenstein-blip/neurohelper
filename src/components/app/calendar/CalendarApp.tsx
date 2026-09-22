import { ArrowLeft, BookOpen, CalendarDays, CircleHelp, Users, UserRound } from "lucide-react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/react";
import { useEffect, useState, type ReactNode } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { useCalendarStore } from "@/lib/calendar/store";
import { isClerkConfigured } from "@/lib/clerk";
import { useAppStore } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import { AuthLoading } from "../AuthScreen";
import { BrandLogo } from "../BrandLogo";
import { HelpTab } from "../HelpTab";
import { ProfileTab } from "../ProfileTab";
import { ChildrenHome, PatientsTab } from "./PatientsTab";
import { LibraryTab } from "./LibraryTab";
import { PeopleTab } from "./PeopleTab";
import { TodayTab } from "./TodayTab";
import { PrototypeSwitcher } from "./PrototypeSwitcher";

export type CalendarTab =
  | "patients"
  | "today"
  | "library"
  | "people"
  | "help"
  | "profile"
  | "children";

function CalendarShell() {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [tab, setTab] = useState<CalendarTab>("today");
  const [helpNonce, setHelpNonce] = useState(0);
  const [applyFromToday, setApplyFromToday] = useState(false);

  const isTherapist = cal.activePerson.appRole === "therapist";
  const isHelper = cal.activePerson.appRole === "helper";
  const needsChildPicker =
    !isTherapist && cal.myChildren.length !== 1 && !cal.selectedChild;
  const helperWaiting =
    isHelper && cal.myChildren.length === 0;

  useEffect(() => {
    if (isTherapist && !cal.selectedChild && tab !== "patients" && tab !== "help" && tab !== "profile") {
      setTab("patients");
    }
  }, [isTherapist, cal.selectedChild, tab]);

  useEffect(() => {
    if (needsChildPicker && !helperWaiting && tab !== "children" && tab !== "help" && tab !== "profile") {
      setTab("children");
    }
  }, [needsChildPicker, helperWaiting, tab]);

  useEffect(() => {
    if (isHelper && (tab === "library" || tab === "patients")) setTab("today");
  }, [isHelper, tab]);

  const goTab = (key: CalendarTab) => {
    setApplyFromToday(false);
    if (key === "help") setHelpNonce((n) => n + 1);
    setTab(key);
  };

  const primaryTabs: Array<{
    key: CalendarTab;
    labelKey: string;
    icon: typeof CalendarDays;
  }> = isTherapist
    ? [
        { key: "patients", labelKey: "calendar.nav.patients", icon: Users },
        { key: "today", labelKey: "calendar.nav.today", icon: CalendarDays },
        { key: "library", labelKey: "calendar.nav.library", icon: BookOpen },
        { key: "people", labelKey: "calendar.nav.people", icon: UserRound },
      ]
    : isHelper
      ? [
          { key: "today", labelKey: "calendar.nav.today", icon: CalendarDays },
          { key: "people", labelKey: "calendar.nav.people", icon: UserRound },
        ]
      : [
          { key: "today", labelKey: "calendar.nav.today", icon: CalendarDays },
          { key: "library", labelKey: "calendar.nav.library", icon: BookOpen },
          { key: "people", labelKey: "calendar.nav.people", icon: UserRound },
        ];

  const showChildChrome = Boolean(cal.selectedChild) && (tab === "today" || tab === "library" || tab === "people");

  let screen: ReactNode;
  if (tab === "help") {
    screen = <HelpTab key={helpNonce} />;
  } else if (tab === "profile") {
    screen = (
      <div className="flex h-full min-h-0 flex-col">
        <PrototypeSwitcher />
        <div className="min-h-0 flex-1">
          <ProfileTab />
        </div>
      </div>
    );
  } else if (isTherapist && (tab === "patients" || !cal.selectedChild)) {
    screen = (
      <PatientsTab
        onOpenChild={() => {
          setTab("today");
        }}
      />
    );
  } else if (helperWaiting) {
    screen = (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            {t("calendar.helper.waitingTitle")}
          </p>
          <p className="text-xs text-muted-foreground">{t("calendar.helper.waitingBody")}</p>
        </div>
      </div>
    );
  } else if (needsChildPicker || tab === "children") {
    screen = (
      <ChildrenHome
        onOpenChild={() => {
          setTab("today");
        }}
      />
    );
  } else if (tab === "library") {
    screen = (
      <LibraryTab
        applyMode={applyFromToday}
        onApplied={() => {
          setApplyFromToday(false);
          setTab("today");
        }}
      />
    );
  } else if (tab === "people") {
    screen = <PeopleTab />;
  } else {
    screen = (
      <TodayTab
        onOpenLibrary={() => {
          setApplyFromToday(true);
          setTab("library");
        }}
      />
    );
  }

  return (
    <div className="phone-shell">
      <aside className="app-sidebar">
        <div className="mb-8 px-2">
          <BrandLogo variant="lockup" className="h-10 w-auto max-w-full" />
          <p className="mt-1 text-xs text-muted-foreground">{t("calendar.brand.tagline")}</p>
        </div>

        {showChildChrome ? (
          <button
            type="button"
            className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted"
            onClick={() => {
              if (isTherapist) {
                cal.selectChild(null);
                setTab("patients");
              } else if (cal.myChildren.length > 1) {
                cal.selectChild(null);
                setTab("children");
              }
            }}
          >
            <ArrowLeft className="size-4" />
            {isTherapist
              ? t("calendar.nav.backPatients")
              : cal.myChildren.length > 1
                ? t("calendar.nav.backChildren")
                : t("calendar.nav.viewing", { name: cal.selectedChild?.displayName ?? "" })}
          </button>
        ) : null}

        <nav className="flex flex-1 flex-col gap-1" aria-label={t("nav.label")}>
          {primaryTabs.map(({ key, labelKey, icon: Icon }) => {
            const disabled =
              isTherapist &&
              key !== "patients" &&
              key !== "help" &&
              key !== "profile" &&
              !cal.selectedChild;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => goTab(key)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  tab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  disabled && "opacity-40",
                )}
              >
                <Icon className={cn("size-5", tab === key && "fill-primary/15")} />
                {t(labelKey)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTab("help")}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === "help" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <CircleHelp className="size-5" />
            {t("nav.help")}
          </button>
          <button
            type="button"
            onClick={() => goTab("profile")}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === "profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <UserRound className="size-5" />
            {t("nav.profile")}
          </button>
        </nav>

        <p className="mt-auto px-2 pt-6 text-[11px] text-muted-foreground">
          {t("brand.signedInAs", { name: cal.activePerson.name })}
        </p>
      </aside>

      <div className="app-main">
        <div className="app-screen min-h-0">{screen}</div>
      </div>

      <nav className="app-tabbar" aria-label={t("nav.label")}>
        {primaryTabs.map(({ key, labelKey, icon: Icon }) => {
          const disabled =
            isTherapist && key !== "patients" && !cal.selectedChild && key !== "help";
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => goTab(key)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg py-1 text-[9px] font-semibold transition-colors",
                tab === key ? "text-primary" : "text-muted-foreground",
                disabled && "opacity-40",
              )}
            >
              <Icon className={cn("size-5", tab === key && "fill-primary/15")} />
              {t(labelKey)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => goTab("profile")}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg py-1 text-[9px] font-semibold",
            tab === "profile" || tab === "help" ? "text-primary" : "text-muted-foreground",
          )}
        >
          <UserRound className="size-5" />
          {t("nav.profile")}
        </button>
      </nav>
    </div>
  );
}

function ClerkGatedCalendar() {
  const { isLoaded, isSignedIn } = useAuth();
  const { devDemo, prototypeDemo, hydrated } = useAppStore();
  const cal = useCalendarStore();

  if (!isLoaded || !hydrated || !cal.hydrated) return <AuthLoading />;
  if (isSignedIn || prototypeDemo || (import.meta.env.DEV && devDemo)) return <CalendarShell />;
  return <Navigate to="/sign-in" />;
}

function LocalGatedCalendar() {
  const { devDemo, prototypeDemo, hydrated } = useAppStore();
  const cal = useCalendarStore();
  if (!hydrated || !cal.hydrated) return <AuthLoading />;
  if (prototypeDemo || (import.meta.env.DEV && devDemo) || !isClerkConfigured()) {
    return <CalendarShell />;
  }
  return <Navigate to="/sign-in" />;
}

export function CalendarApp() {
  if (isClerkConfigured()) return <ClerkGatedCalendar />;
  return <LocalGatedCalendar />;
}
