import { useState } from "react";
import {
  ArrowLeft,
  Ban,
  ChevronRight,
  CircleAlert,
  HeartHandshake,
  LifeBuoy,
  Phone,
  Star,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { HELP_HUBS, itemsForHub, type HelpHub, type HelpItem } from "@/lib/help-content";
import { getCountry } from "@/lib/help/countries";
import { telHref } from "@/lib/help/links";

import { CountryPicker, CountryResources, HelpDisclaimer } from "./CountryResources";
import { useHelpCountry } from "./useHelpCountry";
import { ScreenHeader } from "./ui-bits";

type UtilityView = "support" | "clinician" | null;

function hubCopy(id: HelpHub, t: (key: string) => string) {
  if (id === "child_overwhelm") {
    return { title: t("help.hubs.childTitle"), subtitle: t("help.hubs.childSubtitle") };
  }
  return { title: t("help.hubs.caregiverTitle"), subtitle: t("help.hubs.caregiverSubtitle") };
}

export function HelpTab() {
  const { t, locale } = useI18n();
  const { countryCode, setCountry } = useHelpCountry();
  const [hub, setHub] = useState<HelpHub | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [utility, setUtility] = useState<UtilityView>(null);

  const country = getCountry(countryCode);
  const primaryNumber = country?.emergencyNumber;
  const primaryHref = primaryNumber ? telHref(primaryNumber) : null;
  const hubMeta = hub ? hubCopy(hub, t) : null;
  const items = hub ? itemsForHub(hub) : [];
  const item = itemId ? (items.find((entry) => entry.id === itemId) ?? null) : null;

  const goHome = () => {
    setHub(null);
    setItemId(null);
    setUtility(null);
  };

  const goHub = () => {
    setItemId(null);
    setUtility(null);
  };

  const title =
    item?.title ??
    (utility === "support"
      ? t("help.findSupport")
      : utility === "clinician"
        ? t("help.clinician")
        : (hubMeta?.title ?? t("help.title")));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={title}
        {...(item || utility ? {} : { subtitle: hubMeta?.subtitle ?? t("help.subtitle") })}
        {...(hub || utility
          ? {
              right: (
                <button
                  type="button"
                  onClick={item || utility ? (utility ? goHome : goHub) : goHome}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                >
                  <ArrowLeft className="size-4" /> {t("common.back")}
                </button>
              ),
            }
          : {})}
      />

      <p className="shrink-0 border-b border-border bg-warm/40 px-5 py-2 text-[11px] font-semibold leading-snug text-warm-foreground md:px-8">
        {t("help.banner")}
      </p>

      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface px-5 py-4 md:max-w-3xl md:px-8">
        {item ? (
          <HelpItemDetail item={item} showEnglishNote={locale === "es"} />
        ) : utility === "support" ? (
          <CountryResources countryCode={countryCode} onCountry={setCountry} />
        ) : utility === "clinician" ? (
          <ClinicianView />
        ) : hub ? (
          <div className="space-y-3">
            {locale === "es" ? <EnglishGuidesNote /> : null}
            {items.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setItemId(entry.id)}
                className="soft-card flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold leading-snug">{entry.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {entry.audience}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <HelpDisclaimer />
            <CountryPicker countryCode={countryCode} onCountry={setCountry} />
            {country?.needsReview ? (
              <p className="rounded-xl border border-warm/50 bg-warm/25 px-3 py-2 text-sm font-semibold leading-snug">
                {t("help.needsReview")}
              </p>
            ) : null}
            {locale === "es" ? <EnglishGuidesNote /> : null}
            <p className="text-xs leading-relaxed text-muted-foreground">{t("help.audience")}</p>
            {HELP_HUBS.map((entry) => {
              const copy = hubCopy(entry.id, t);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setHub(entry.id)}
                  className="soft-card flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    {entry.id === "child_overwhelm" ? (
                      <LifeBuoy className="size-5" />
                    ) : (
                      <HeartHandshake className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold leading-snug">
                      {copy.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{copy.subtitle}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}

            <div className="pt-2">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("help.quickHelp")}
              </p>
              <div className="space-y-2">
                {primaryHref && primaryNumber ? (
                  <Button asChild className="h-11 w-full rounded-full">
                    <a href={primaryHref}>
                      <Phone className="size-4" />
                      {t("help.callEmergency", { number: primaryNumber })}
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-11 w-full rounded-full"
                    onClick={() => setUtility("support")}
                  >
                    <Phone className="size-4" />
                    {country?.emergencyServices.length
                      ? t("help.seeEmergencyNumbers")
                      : t("help.emergencyMissing")}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  onClick={() => setUtility("support")}
                >
                  {t("help.findSupport")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  onClick={() => setUtility("clinician")}
                >
                  {t("help.clinician")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="shrink-0 border-t border-border bg-card px-5 py-2.5 text-[11px] leading-snug text-muted-foreground md:px-8">
        {t("help.disclaimer")}
      </p>
    </div>
  );
}

function EnglishGuidesNote() {
  const { t } = useI18n();
  return (
    <p className="rounded-xl border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {t("help.englishBodyNote")}
    </p>
  );
}

function HelpItemDetail({ item, showEnglishNote }: { item: HelpItem; showEnglishNote: boolean }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4 pb-4">
      {showEnglishNote ? <EnglishGuidesNote /> : null}
      {item.clinicianReviewRequired ? (
        <span className="tag-base bg-secondary text-secondary-foreground">
          {t("help.clinicianChip")}
        </span>
      ) : null}

      <p className="text-sm text-muted-foreground">{item.audience}</p>

      <div className="rounded-xl border border-warm/50 bg-warm/25 p-3">
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-warm-foreground">
          <Star className="size-3.5" />
          {t("help.mostImportant")}
        </p>
        <ul className="space-y-2">
          {item.mostImportant.map((point) => (
            <li key={point} className="text-sm leading-relaxed">
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("help.doThis")}
        </p>
        <ol className="space-y-2">
          {item.steps.map((step, index) => (
            <li key={index} className="soft-card flex gap-3 p-3 text-sm leading-relaxed">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <Ban className="size-3.5" />
          {t("help.avoid")}
        </p>
        <ul className="space-y-2">
          {item.avoid.map((point) => (
            <li key={point} className="soft-card p-3 text-sm leading-relaxed">
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
        <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-destructive">
          <CircleAlert className="size-3.5" />
          {t("help.urgent")}
        </p>
        <p className="text-sm leading-relaxed">{item.urgentHelp}</p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("help.sources")}
        </p>
        <ul className="space-y-1.5">
          {item.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {item.furtherReading?.length ? (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("help.furtherReading")}
          </p>
          <ul className="space-y-1.5">
            {item.furtherReading.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ClinicianView() {
  const { t } = useI18n();
  return (
    <div className="soft-card space-y-3 p-4">
      <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Stethoscope className="size-5" />
      </div>
      <p className="text-sm leading-relaxed">{t("help.clinicianCopy")}</p>
    </div>
  );
}
