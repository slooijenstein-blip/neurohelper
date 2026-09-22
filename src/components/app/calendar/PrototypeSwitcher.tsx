import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { DEMO_PERSON_IDS, useCalendarStore } from "@/lib/calendar/store";

export function PrototypeSwitcher() {
  const { t } = useI18n();
  const cal = useCalendarStore();

  return (
    <div className="shrink-0 border-b border-border bg-warm/30 px-5 py-3 md:px-8">
      <p className="text-[11px] font-bold uppercase tracking-wide text-warm-foreground">
        {t("calendar.prototype.label")}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{t("calendar.prototype.hint")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            ["therapist", DEMO_PERSON_IDS.therapist],
            ["caregiver", DEMO_PERSON_IDS.caregiver],
            ["helper", DEMO_PERSON_IDS.helper],
          ] as const
        ).map(([role, id]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={cal.activePerson.id === id ? "default" : "outline"}
            onClick={() => {
              cal.switchPersona(id);
              toast.message(t("calendar.prototype.switched", { role: t(`calendar.roles.${role}`) }));
            }}
          >
            {t(`calendar.prototype.as.${role}`)}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            cal.resetDemo();
            toast.success(t("calendar.prototype.reset"));
          }}
        >
          {t("calendar.prototype.reset")}
        </Button>
      </div>
    </div>
  );
}
