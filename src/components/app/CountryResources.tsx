import { ExternalLink, Phone } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import {
  countryName,
  FIND_A_HELPLINE_URL,
  getCountry,
  resourceDescription,
  serviceLabel,
  sortedCountries,
  type SupportResource,
} from "@/lib/help/countries";
import { helpLookupMode } from "@/lib/help/detect-country";
import { safeHttpsUrl, telHref } from "@/lib/help/links";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function CountryPicker({
  countryCode,
  onCountry,
}: {
  countryCode: string;
  onCountry: (code: string) => void;
}) {
  const { t, locale } = useI18n();
  const countries = sortedCountries(locale);

  return (
    <div>
      <label
        className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
        htmlFor="help-country"
      >
        {t("help.countryLabel")}
      </label>
      <select
        id="help-country"
        className={selectClass}
        value={countryCode}
        onChange={(event) => onCountry(event.target.value)}
      >
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {countryName(country, locale)}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t("help.countryHelp")}</p>
    </div>
  );
}

export function CountryContextNote({
  countryCode,
  residenceCode,
  onUseResidence,
}: {
  countryCode: string;
  residenceCode: string | null;
  onUseResidence: () => void;
}) {
  const { t, locale } = useI18n();
  const mode = helpLookupMode(residenceCode, countryCode);
  const residence = residenceCode ? getCountry(residenceCode) : undefined;
  const residenceName = residence ? countryName(residence, locale) : "";

  if (mode === "guessed") {
    return (
      <p className="rounded-xl border border-warm/50 bg-warm/25 px-3 py-2 text-sm leading-relaxed">
        {t("help.guessedCountry")}
      </p>
    );
  }

  if (mode === "other") {
    return (
      <div className="rounded-xl border border-warm/50 bg-warm/25 px-3 py-2">
        <p className="text-sm leading-relaxed">
          {t("help.lookupOther", { country: residenceName })}
        </p>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          onClick={onUseResidence}
        >
          {t("help.useHomeCountry", { country: residenceName })}
        </button>
      </div>
    );
  }

  return <p className="text-xs leading-relaxed text-muted-foreground">{t("help.homeCountry")}</p>;
}

export function HelpDisclaimer() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3">
      <p className="text-sm font-semibold text-destructive">{t("help.disclaimerTitle")}</p>
      <p className="mt-1 text-sm leading-relaxed">{t("help.disclaimer")}</p>
    </div>
  );
}

function ResourceCard({ resource }: { resource: SupportResource }) {
  const { t, locale } = useI18n();
  const href = resource.phone ? telHref(resource.phone) : null;
  const site = safeHttpsUrl(resource.url);
  const source = safeHttpsUrl(resource.source);

  return (
    <div className="soft-card space-y-2 p-4">
      <p className="text-sm font-semibold">{resource.name}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {resourceDescription(resource)}
      </p>
      <div className="flex flex-wrap gap-2">
        {href && resource.phone ? (
          <a
            href={href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            <Phone className="size-3.5" />
            {t("help.call", { number: resource.phone })}
          </a>
        ) : null}
        {site ? (
          <a
            href={site}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            {t("help.website")}
          </a>
        ) : null}
      </div>
      {source ? (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[11px] text-muted-foreground underline-offset-2 hover:underline"
        >
          {t("help.source")}
        </a>
      ) : null}
    </div>
  );
}

export function CountryResources({
  countryCode,
  onCountry,
  residenceCode,
  onUseResidence,
}: {
  countryCode: string;
  onCountry: (code: string) => void;
  residenceCode: string | null;
  onUseResidence: () => void;
}) {
  const { t, locale } = useI18n();
  const country = getCountry(countryCode);

  return (
    <div className="space-y-4">
      <HelpDisclaimer />
      <CountryPicker countryCode={countryCode} onCountry={onCountry} />
      <CountryContextNote
        countryCode={countryCode}
        residenceCode={residenceCode}
        onUseResidence={onUseResidence}
      />
      <p className="text-sm text-muted-foreground">{t("help.supportIntro")}</p>

      {!country ? null : (
        <>
          {country.needsReview ? (
            <div className="rounded-xl border border-warm/50 bg-warm/25 p-3">
              <p className="text-sm font-semibold leading-snug">{t("help.needsReview")}</p>
            </div>
          ) : null}
          {country.confidence === "medium" ? (
            <div className="rounded-xl border border-warm/50 bg-warm/25 p-3">
              <p className="text-sm font-semibold leading-snug">{t("help.mediumReview")}</p>
            </div>
          ) : null}
          {locale === "es" &&
          (country.uncertaintyNotes ||
            country.crisisLines.length > 0 ||
            country.caregiverSupport.length > 0) ? (
            <p className="rounded-xl border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {t("help.englishResourceNote")}
            </p>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("help.emergencyHeading")}
            </h3>
            {country.emergencyServices.length ? (
              country.emergencyServices.map((service) => {
                const href = telHref(service.number);
                const body = (
                  <>
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Phone className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold leading-none">
                        {service.number}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {serviceLabel(service, locale)}
                      </p>
                    </div>
                  </>
                );
                const className = "soft-card flex items-center gap-3 p-4";
                return href ? (
                  <a
                    key={`${country.code}-${service.number}-${service.labelEn}`}
                    href={href}
                    className={className}
                  >
                    {body}
                  </a>
                ) : (
                  <div
                    key={`${country.code}-${service.number}-${service.labelEn}`}
                    className={className}
                  >
                    {body}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">{t("help.emergencyMissing")}</p>
            )}
            {country.uncertaintyNotes && !country.needsReview ? (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("help.goodToKnow")}
                </p>
                <p className="mt-1 text-sm leading-relaxed">{country.uncertaintyNotes}</p>
              </div>
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("help.crisisHeading")}
            </h3>
            {country.crisisLines.length ? (
              country.crisisLines.map((line) => <ResourceCard key={line.name} resource={line} />)
            ) : (
              <p className="text-sm text-muted-foreground">{t("help.emptyCrisis")}</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("help.caregiverHeading")}
            </h3>
            {country.caregiverSupport.length ? (
              country.caregiverSupport.map((line) => (
                <ResourceCard key={line.name} resource={line} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("help.emptyCaregiver")}</p>
            )}
          </section>

          <div className="rounded-xl border border-border bg-card p-3">
            <a
              href={FIND_A_HELPLINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {t("help.findHelpline")}
            </a>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("help.findHelplineHelp")}
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t("help.checkedOn", { date: country.lastChecked })}
          </p>

          {country.sources.length ? (
            <section className="space-y-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("help.sources")}
              </h3>
              <ul className="space-y-1.5">
                {country.sources.map((source) => {
                  const href = safeHttpsUrl(source.url);
                  if (!href) return null;
                  return (
                    <li key={source.url}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {source.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
