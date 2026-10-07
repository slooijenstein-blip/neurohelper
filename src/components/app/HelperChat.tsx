import { MessageCircle } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { answerHelper, type HelperAnswer, type HelperTopic } from "@/lib/helper";
import { telHref } from "@/lib/help/links";
import type { HelpHub } from "@/lib/help-content";

import { useHelpCountry } from "./useHelpCountry";
import { SkillTag } from "./ui-bits";

const OpenHelperContext = createContext<(() => void) | null>(null);

export function OpenHelperProvider({
  children,
  onOpen,
}: {
  children: ReactNode;
  onOpen: () => void;
}) {
  return <OpenHelperContext.Provider value={onOpen}>{children}</OpenHelperContext.Provider>;
}

export function useOpenHelper(): (() => void) | null {
  return useContext(OpenHelperContext);
}

const QUICK: Array<{ id: string; labelKey: string; topics: HelperTopic[] }> = [
  { id: "meltdown", labelKey: "helper.quick.meltdown", topics: ["meltdown"] },
  { id: "parent", labelKey: "helper.quick.parent", topics: ["caregiver"] },
  { id: "today", labelKey: "helper.quick.today", topics: ["play"] },
  { id: "bedtime", labelKey: "helper.quick.bedtime", topics: ["bedtime"] },
];

type Turn = {
  id: number;
  question: string;
  answer: HelperAnswer;
};

export function HelperChat({
  open,
  onOpenChange,
  onOpenActivity,
  onOpenHelp,
  onOpenSupport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenActivity: (activityId: string) => void;
  onOpenHelp: (hub: HelpHub, itemId: string) => void;
  onOpenSupport: () => void;
}) {
  const { t, locale } = useI18n();
  const { countryCode } = useHelpCountry();
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  const ask = (question: string, topics?: HelperTopic[]) => {
    const text = question.trim();
    if (!text) return;
    const answer = answerHelper({
      text,
      locale,
      countryCode,
      ...(topics ? { topics } : {}),
    });
    setTurns((prev) => [...prev, { id: prev.length + 1, question: text, answer }]);
    setDraft("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(640px,88vh)] max-w-md flex-col gap-3 overflow-hidden p-4 sm:p-5"
        data-testid="helper-panel"
      >
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>{t("helper.title")}</DialogTitle>
          <DialogDescription>{t("helper.subtitle")}</DialogDescription>
        </DialogHeader>
        <p className="rounded-xl bg-warm/40 px-3 py-2 text-[11px] font-semibold leading-snug text-warm-foreground">
          {t("helper.disclaimer")}
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`helper-quick-${item.id}`}
              onClick={() => ask(t(item.labelKey), item.topics)}
              className="rounded-full bg-muted px-3 py-1.5 text-left text-xs font-semibold text-foreground"
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {turns.map((turn) => (
            <div key={turn.id} className="space-y-2">
              <p className="ml-8 rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                {turn.question}
              </p>
              <HelperReply
                answer={turn.answer}
                onOpenActivity={onOpenActivity}
                onOpenHelp={onOpenHelp}
                onOpenSupport={onOpenSupport}
              />
            </div>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
        >
          <Input
            data-testid="helper-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("helper.placeholder")}
          />
          <Button type="submit" data-testid="helper-send">
            {t("helper.send")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HelperReply({
  answer,
  onOpenActivity,
  onOpenHelp,
  onOpenSupport,
}: {
  answer: HelperAnswer;
  onOpenActivity: (activityId: string) => void;
  onOpenHelp: (hub: HelpHub, itemId: string) => void;
  onOpenSupport: () => void;
}) {
  const { t, locale } = useI18n();
  const intro = answer.crisis
    ? t("helper.crisis")
    : answer.matched
      ? t("helper.matched")
      : t("helper.none");
  const href = answer.emergencyNumber ? telHref(answer.emergencyNumber) : null;

  return (
    <div className="space-y-2" data-testid="helper-reply">
      <p className="text-sm leading-snug">{intro}</p>
      {answer.crisis ? (
        <div className="rounded-2xl bg-card p-3 ring-1 ring-border" data-testid="helper-emergency">
          <p className="text-sm font-semibold">
            {t("helper.emergencyTitle", { country: answer.countryName })}
          </p>
          {answer.emergencyNumber && href ? (
            <a className="mt-1 block text-sm font-semibold text-primary" href={href}>
              {t("helper.emergencyCall", { number: answer.emergencyNumber })}
            </a>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("helper.emergencyMissing", { country: answer.countryName })}
            </p>
          )}
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-primary"
            onClick={onOpenSupport}
          >
            {t("helper.seeSupport")}
          </button>
        </div>
      ) : null}
      {answer.guides.map((guide) => (
        <button
          key={guide.id}
          type="button"
          data-testid={`helper-guide-${guide.id}`}
          onClick={() => onOpenHelp(guide.hub, guide.id)}
          className="block w-full rounded-2xl bg-card p-3 text-left ring-1 ring-border"
        >
          <p className="text-sm font-semibold">{guide.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{guide.tip}</p>
          {locale === "es" ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{t("helper.guidesEnglish")}</p>
          ) : null}
          <p className="mt-2 text-xs font-semibold text-primary">{t("helper.seeGuide")}</p>
        </button>
      ))}
      {answer.activities.map((activity) => (
        <button
          key={activity.id}
          type="button"
          data-testid={`helper-activity-${activity.id}`}
          onClick={() => onOpenActivity(activity.id)}
          className="block w-full rounded-2xl bg-card p-3 text-left ring-1 ring-border"
        >
          <p className="text-sm font-semibold">{activity.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{activity.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SkillTag skill={activity.skill} />
            <span className="text-[11px] text-muted-foreground">
              {t("profile.years", { age: `${activity.minAge}–${activity.maxAge}` })}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-primary">{t("helper.seeActivity")}</p>
        </button>
      ))}
    </div>
  );
}

export function HelperLaunch({ testId = "open-helper" }: { testId?: string }) {
  const { t } = useI18n();
  const open = useOpenHelper();
  if (!open) return null;
  return (
    <Button type="button" size="sm" variant="outline" data-testid={testId} onClick={open}>
      <MessageCircle className="mr-1 size-4" /> {t("helper.open")}
    </Button>
  );
}
