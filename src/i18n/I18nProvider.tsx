import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAppStore } from "@/lib/app-store";

import { htmlLang, LOCALE_STORAGE_KEY, resolveLocale, type AppLocale } from "./locales";
import { translate } from "./translate";

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: AppLocale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { state, hydrated, update } = useAppStore();
  const [locale, setLocaleState] = useState<AppLocale>("en");

  useEffect(() => {
    if (!hydrated) return;
    const next = resolveLocale({
      profileLocale: state.profile?.locale ?? null,
      stored: readStoredLocale(),
      browser: navigator.language,
    });
    setLocaleState(next);
    document.documentElement.lang = htmlLang(next);
  }, [hydrated, state.profile?.locale]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      setLocaleState(next);
      writeStoredLocale(next);
      document.documentElement.lang = htmlLang(next);
      if (state.profile && state.profile.locale !== next) {
        update((prev) =>
          prev.profile ? { ...prev, profile: { ...prev.profile, locale: next } } : prev,
        );
      }
    },
    [state.profile, update],
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
