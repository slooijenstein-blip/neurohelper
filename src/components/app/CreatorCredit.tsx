import { useI18n } from "@/i18n/I18nProvider";

/** Small label for a published activity written by a Creator Pro professional. */
export function CreatorCredit({ name }: { name?: string | null }) {
  const { t } = useI18n();
  return (
    <p className="text-[11px] font-semibold text-primary" data-testid="creator-credit">
      {name ? t("activities.createdByName", { name }) : t("activities.createdByPro")}
    </p>
  );
}

export function CreatorTranslationNote({ translated }: { translated: boolean }) {
  const { t } = useI18n();
  if (!translated) return null;
  return (
    <p className="text-[11px] text-muted-foreground" data-testid="creator-translated">
      {t("activities.shownTranslated")}
    </p>
  );
}
