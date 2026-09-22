import { useCallback, useEffect, useState } from "react";

import { useAppStore } from "@/lib/app-store";
import {
  helpLookupMode,
  listedCountryCode,
  readStoredResidence,
  resolveHelpCountry,
} from "@/lib/help/detect-country";

/**
 * Help opens on the caregiver's country of residence.
 * A different choice in Help is only for this visit. Leaving Help drops it,
 * because the Help screen is created again from the profile country.
 */
export function useHelpCountry() {
  const { state, hydrated } = useAppStore();
  const residenceCode = listedCountryCode(state.profile?.helpCountry);
  const [resolved, setResolved] = useState("NL");
  const [lookup, setLookup] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setResolved(
      resolveHelpCountry({
        profileCountry: state.profile?.helpCountry ?? null,
        stored: readStoredResidence(),
        browserLocale: navigator.language,
        timeZone,
      }),
    );
    setLookup(null);
  }, [hydrated, state.profile?.helpCountry]);

  const countryCode = lookup ?? resolved;

  const setCountry = useCallback((next: string) => {
    const code = listedCountryCode(next);
    if (!code) return;
    setLookup(code);
  }, []);

  const useResidence = useCallback(() => {
    setLookup(null);
  }, []);

  return {
    countryCode,
    setCountry,
    residenceCode,
    useResidence,
    lookupMode: helpLookupMode(residenceCode, countryCode),
  };
}
