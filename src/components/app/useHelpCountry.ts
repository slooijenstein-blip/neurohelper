import { useCallback, useEffect, useState } from "react";

import { useAppStore } from "@/lib/app-store";
import { getCountry } from "@/lib/help/countries";
import { HELP_COUNTRY_STORAGE_KEY, resolveHelpCountry } from "@/lib/help/detect-country";

function readStoredCountry(): string | null {
  try {
    return window.localStorage.getItem(HELP_COUNTRY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredCountry(code: string) {
  try {
    window.localStorage.setItem(HELP_COUNTRY_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

export function useHelpCountry() {
  const { state, hydrated, update } = useAppStore();
  const [countryCode, setCountryCode] = useState("NL");

  useEffect(() => {
    if (!hydrated) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setCountryCode(
      resolveHelpCountry({
        profileCountry: state.profile?.helpCountry ?? null,
        stored: readStoredCountry(),
        browserLocale: navigator.language,
        timeZone,
      }),
    );
  }, [hydrated, state.profile?.helpCountry]);

  const setCountry = useCallback(
    (next: string) => {
      const code = next.toUpperCase();
      if (!getCountry(code)) return;
      setCountryCode(code);
      writeStoredCountry(code);
      if (state.profile && state.profile.helpCountry !== code) {
        update((prev) =>
          prev.profile ? { ...prev, profile: { ...prev.profile, helpCountry: code } } : prev,
        );
      }
    },
    [state.profile, update],
  );

  return { countryCode, setCountry };
}
