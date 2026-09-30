import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { useAppStore, type DemoPersona } from "@/lib/app-store";
import { DEMO_PERSONAS, demoRolesAllowed } from "@/lib/demo-roles";
import { cn } from "@/lib/utils";

const LABEL_KEY: Record<DemoPersona, string> = {
  therapist: "demoRoles.therapist",
  parent: "demoRoles.parent",
  grandparent: "demoRoles.grandparent",
};

/** Preview-only persona switch. Hidden on production hosts. Does not write to Clerk. */
export function DemoRoleBar({ onChoose }: { onChoose?: (persona: DemoPersona) => void }) {
  const { t } = useI18n();
  const { prototypeDemo, demoPersona, enterPrototypeDemo, exitPrototypeDemo } = useAppStore();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(demoRolesAllowed(window.location.hostname));
  }, []);

  if (!allowed) return null;

  const choose = (persona: DemoPersona) => {
    enterPrototypeDemo(persona);
    onChoose?.(persona);
  };

  return (
    <div
      data-testid="demo-role-bar"
      className="shrink-0 border-t border-border bg-warm/40 px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">
          {t("demoRoles.label")}
        </p>
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("demoRoles.label")}>
          {DEMO_PERSONAS.map((persona) => {
            const active = prototypeDemo && demoPersona === persona;
            return (
              <button
                key={persona}
                type="button"
                data-testid={`demo-role-${persona}`}
                aria-pressed={active}
                onClick={() => choose(persona)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground ring-1 ring-border",
                )}
              >
                {t(LABEL_KEY[persona])}
              </button>
            );
          })}
        </div>
        {prototypeDemo ? (
          <button
            type="button"
            data-testid="demo-role-account"
            onClick={() => exitPrototypeDemo()}
            className="text-[11px] font-semibold text-muted-foreground underline"
          >
            {t("demoRoles.useAccount")}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{t("demoRoles.hint")}</p>
    </div>
  );
}
