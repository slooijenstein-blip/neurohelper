import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { localizedActivity } from "@/lib/activity-locale";
import { browserTranslationDeps } from "@/lib/community-translate";
import type { CatalogActivity } from "@/lib/creator/catalog";
import { localizeCreatorActivities } from "@/lib/creator/localize";

function creatorSignature(catalog: CatalogActivity[]): string {
  return catalog
    .filter((activity) => "creatorName" in activity)
    .map((activity) =>
      [
        activity.id,
        activity.contentLanguage ?? "",
        activity.title,
        activity.description,
        activity.materials.join("\n"),
        activity.steps.join("\n"),
      ].join("\u0001"),
    )
    .join("\u0002");
}

/** Catalog copy for this profile language, including creator activities when the browser can translate them. */
export function useLocalizedCatalog(catalog: CatalogActivity[]): {
  activities: CatalogActivity[];
  translating: boolean;
} {
  const { locale } = useI18n();
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const signature = creatorSignature(catalog);
  const [overrides, setOverrides] = useState<Record<string, CatalogActivity>>({});
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    const creators = catalogRef.current.filter((activity) => "creatorName" in activity);
    if (creators.length === 0) {
      setOverrides({});
      setTranslating(false);
      return;
    }
    let cancel = false;
    setTranslating(true);
    void localizeCreatorActivities(creators, locale, browserTranslationDeps()).then((next) => {
      if (cancel) return;
      setOverrides(next);
      setTranslating(false);
    });
    return () => {
      cancel = true;
    };
  }, [locale, signature]);

  const activities = useMemo(
    () =>
      catalog.map((activity) => {
        const translated = overrides[activity.id];
        if (translated?.translatedInto === locale) return translated;
        return localizedActivity(activity, locale);
      }),
    [catalog, locale, overrides],
  );

  return { activities, translating };
}
