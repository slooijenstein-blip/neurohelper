import { useMemo, useState } from "react";
import { ArrowLeft, Ban, ChevronRight, CircleAlert, HeartHandshake, LifeBuoy, Phone, Star, Stethoscope } from "lucide-react";

import {
  HELP_AUDIENCE_NOTE,
  HELP_BANNER,
  HELP_CLINICIAN_CHIP,
  HELP_CLINICIAN_COPY,
  HELP_EMERGENCY_DISCLAIMER,
  HELP_HUBS,
  emergencyNumberForLocale,
  itemsForHub,
  supportLinksForLocale,
  type HelpHub,
  type HelpItem,
} from "@/lib/help-content";
import { ScreenHeader } from "./ui-bits";
import { Button } from "@/components/ui/button";

type UtilityView = "support" | "clinician" | null;

export function HelpTab() {
  const [hub, setHub] = useState<HelpHub | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [utility, setUtility] = useState<UtilityView>(null);
  const emergency = useMemo(() => emergencyNumberForLocale(), []);
  const supportLinks = useMemo(() => supportLinksForLocale(), []);

  const hubMeta = HELP_HUBS.find((h) => h.id === hub);
  const items = hub ? itemsForHub(hub) : [];
  const item = itemId ? items.find((i) => i.id === itemId) ?? null : null;

  const goHome = () => {
    setHub(null);
    setItemId(null);
    setUtility(null);
  };

  const goHub = () => {
    setItemId(null);
    setUtility(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={item?.title ?? (utility === "support" ? "Find local support" : utility === "clinician" ? "Talk to your clinician" : hubMeta?.title ?? "Help")}
        subtitle={
          item || utility
            ? undefined
            : hubMeta?.subtitle ?? "Caregivers of a neurodivergent child or related needs."
        }
        right={
          hub || utility ? (
            <button
              type="button"
              onClick={item || utility ? (utility ? goHome : goHub) : goHome}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
          ) : undefined
        }
      />

      <p className="shrink-0 border-b border-border bg-warm/40 px-5 py-2 text-[11px] font-semibold leading-snug text-warm-foreground md:px-8">
        {HELP_BANNER}
      </p>

      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface px-5 py-4 md:max-w-3xl md:px-8">
        {item ? (
          <HelpItemDetail item={item} />
        ) : utility === "support" ? (
          <SupportView links={supportLinks} />
        ) : utility === "clinician" ? (
          <ClinicianView />
        ) : hub ? (
          <div className="space-y-3">
            {items.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setItemId(entry.id)}
                className="soft-card flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold leading-snug">{entry.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.audience}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">{HELP_AUDIENCE_NOTE}</p>
            {HELP_HUBS.map((entry) => (
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
                  <p className="font-display text-base font-semibold leading-snug">{entry.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.subtitle}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}

            <div className="pt-2">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Quick help
              </p>
              <div className="space-y-2">
                <Button asChild className="h-11 w-full rounded-full">
                  <a href={`tel:${emergency.number}`}>
                    <Phone className="size-4" />
                    Call emergency services ({emergency.label})
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  onClick={() => setUtility("support")}
                >
                  Find local support
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  onClick={() => setUtility("clinician")}
                >
                  Talk to your clinician
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="shrink-0 border-t border-border bg-card px-5 py-2.5 text-[11px] leading-snug text-muted-foreground md:px-8">
        {HELP_EMERGENCY_DISCLAIMER}
      </p>
    </div>
  );
}

function HelpItemDetail({ item }: { item: HelpItem }) {
  return (
    <div className="space-y-4 pb-4">
      {item.clinicianReviewRequired ? (
        <span className="tag-base bg-secondary text-secondary-foreground">{HELP_CLINICIAN_CHIP}</span>
      ) : null}

      <p className="text-sm text-muted-foreground">{item.audience}</p>

      <div className="rounded-xl border border-warm/50 bg-warm/25 p-3">
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-warm-foreground">
          <Star className="size-3.5" />
          Most important
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
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Do this</p>
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
          Don’t / Avoid
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
          Urgent help
        </p>
        <p className="text-sm leading-relaxed">{item.urgentHelp}</p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Sources</p>
        <ul className="space-y-1.5">
          {item.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
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
            Further reading
          </p>
          <ul className="space-y-1.5">
            {item.furtherReading.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
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

function SupportView({ links }: { links: { label: string; url: string }[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Starting points for local associations and crisis support. This is not a complete list. Ask your clinician for
        services near you.
      </p>
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="soft-card flex items-center gap-3 p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{link.label}</p>
            <p className="truncate text-[11px] text-muted-foreground">{link.url}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}

function ClinicianView() {
  return (
    <div className="soft-card space-y-3 p-4">
      <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Stethoscope className="size-5" />
      </div>
      <p className="text-sm leading-relaxed">{HELP_CLINICIAN_COPY}</p>
    </div>
  );
}
