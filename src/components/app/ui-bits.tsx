import { useI18n } from "@/i18n/I18nProvider";
import { ROLE_MESSAGE_KEY } from "@/i18n/roles";
import { cn } from "@/lib/utils";
import { skillMessageKey } from "@/lib/activity-locale";
import { skillTone, type Skill } from "@/lib/activities-data";
import { roleTone, type Role, type Socials } from "@/lib/app-store";
import type { ReactNode } from "react";
import { Clock, Music2, Instagram, Facebook, Linkedin, Globe } from "lucide-react";

export function SkillTag({ skill }: { skill: Skill }) {
  const { t } = useI18n();
  return <span className={cn("tag-base", skillTone[skill])}>{t(skillMessageKey(skill))}</span>;
}

export function AgeTag({ children }: { children: ReactNode }) {
  return <span className="tag-base bg-secondary text-secondary-foreground">{children}</span>;
}

export function DurationTag({
  minMinutes,
  maxMinutes,
}: {
  minMinutes: number;
  maxMinutes: number;
}) {
  const { t } = useI18n();
  const label =
    minMinutes === maxMinutes
      ? t("activities.durationExact", { count: minMinutes })
      : t("activities.durationRange", { min: minMinutes, max: maxMinutes });
  return (
    <span className="tag-base gap-1 bg-muted text-muted-foreground">
      <Clock className="size-3" />
      {label}
    </span>
  );
}

export function RoleTag({ role }: { role: Role }) {
  const { t } = useI18n();
  return <span className={cn("tag-base", roleTone[role])}>{t(ROLE_MESSAGE_KEY[role])}</span>;
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-card/80 px-5 pb-3 pt-4 backdrop-blur md:px-8 md:pb-4 md:pt-6">
      <div>
        <h2 className="text-lg font-semibold leading-tight md:text-2xl">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(
            "text-sm leading-none",
            n <= value ? "text-warm" : "text-border",
            onChange && "cursor-pointer",
          )}
          aria-label={t("journey.stars", { count: n })}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ProfileAvatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "size-16 text-xl" : size === "sm" ? "size-8 text-xs" : "size-11 text-sm";
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full font-bold text-white shadow-sm",
        color,
        sizeClass,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function SocialBar({ socials, className }: { socials: Socials; className?: string }) {
  const entries = [
    { key: "tiktok", icon: Music2, label: "TikTok" },
    { key: "instagram", icon: Instagram, label: "Instagram" },
    { key: "facebook", icon: Facebook, label: "Facebook" },
    { key: "website", icon: Globe, label: "Website" },
    { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
  ] as const;

  const present = entries.filter((e) => socials[e.key]);
  if (!present.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {present.map((e) => (
        <a
          key={e.key}
          href={socials[e.key]}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border hover:text-primary"
        >
          <e.icon className="size-3.5" />
          {e.label}
        </a>
      ))}
    </div>
  );
}
