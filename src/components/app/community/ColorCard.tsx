import { CloudSun, Leaf, Sparkles, Sun } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import type { CommunityCard } from "@/lib/community";
import { cn } from "@/lib/utils";

const CARD_STYLE: Record<CommunityCard, string> = {
  warm: "from-primary/40 via-warm/80 to-secondary",
  calm: "from-sky-300/55 via-teal-200/45 to-secondary",
  leaf: "from-emerald-300/50 via-lime-200/40 to-secondary",
  sky: "from-indigo-300/45 via-violet-200/40 to-secondary",
};

const CARD_ICON = {
  warm: Sun,
  calm: CloudSun,
  leaf: Leaf,
  sky: Sparkles,
} as const;

export function ColorCard({ card, className }: { card: CommunityCard; className?: string }) {
  const { t } = useI18n();
  const Icon = CARD_ICON[card];
  return (
    <div
      role="img"
      aria-label={t("community.colorCard")}
      className={cn(
        "relative grid h-36 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br",
        CARD_STYLE[card],
        className,
      )}
    >
      <Icon className="size-10 text-foreground/70" />
      <span className="absolute bottom-2 right-2 rounded-full bg-card/85 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {t("community.colorCard")}
      </span>
    </div>
  );
}
