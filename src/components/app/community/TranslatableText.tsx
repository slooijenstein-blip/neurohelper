import { useRef, useState, type ReactNode } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import {
  googleTranslateUrl,
  translateCommunityText,
  translatorLanguage,
} from "@/lib/community-translate";

export function TranslatableText({
  text,
  testId,
  className,
  render,
}: {
  text: string;
  testId: string;
  className?: string;
  render?: (shown: string) => ReactNode;
}) {
  const { t, locale } = useI18n();
  const [view, setView] = useState<"original" | "translated" | "already" | "opened">("original");
  const [translated, setTranslated] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const shown = view === "translated" ? translated : text;

  const onTranslate = async () => {
    if (view === "translated") {
      setView("original");
      return;
    }
    const target = translatorLanguage(locale);
    const id = request.current + 1;
    request.current = id;
    setBusy(true);
    try {
      const result = await translateCommunityText(text, target);
      if (request.current !== id) return;
      if (result.kind === "already") {
        setView("already");
        return;
      }
      if (result.kind === "text") {
        setTranslated(result.text);
        setView("translated");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
      setView("opened");
    } catch {
      if (request.current !== id) return;
      window.open(googleTranslateUrl(text, target), "_blank", "noopener,noreferrer");
      setView("opened");
    } finally {
      if (request.current === id) setBusy(false);
    }
  };

  if (!text.trim()) return null;

  return (
    <div className={className}>
      {render ? render(shown) : <p className="whitespace-pre-wrap">{shown}</p>}
      <button
        type="button"
        className="mt-1 text-xs font-semibold text-primary underline underline-offset-2"
        data-testid={`translate-${testId}`}
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          void onTranslate();
        }}
      >
        {busy
          ? t("community.translating")
          : view === "translated"
            ? t("community.showOriginal")
            : t("community.translate")}
      </button>
      {view === "already" ? (
        <p className="text-[11px] text-muted-foreground" data-testid={`translate-status-${testId}`}>
          {t("community.translateAlready")}
        </p>
      ) : null}
      {view === "opened" ? (
        <p className="text-[11px] text-muted-foreground" data-testid={`translate-status-${testId}`}>
          {t("community.translateOpened")}
        </p>
      ) : null}
    </div>
  );
}
