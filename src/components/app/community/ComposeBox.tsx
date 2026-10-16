import { useState, type ReactNode } from "react";
import { ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import type { CommunityCard } from "@/lib/community";
import { useAppStore } from "@/lib/app-store";
import { ProfileAvatar } from "../ui-bits";
import { ColorCard } from "./ColorCard";

export function ComposeBox({
  onPublish,
  media,
  notice,
}: {
  onPublish: (draft: { body: string; card?: CommunityCard }) => void;
  media?: ReactNode;
  notice?: string;
}) {
  const { t } = useI18n();
  const { state } = useAppStore();
  const [body, setBody] = useState("");
  const [card, setCard] = useState<CommunityCard | null>(null);
  const profile = state.profile;

  const publish = () => {
    if (!body.trim() || !profile) return;
    onPublish({ body: body.trim(), ...(card ? { card } : {}) });
    setBody("");
    setCard(null);
  };

  return (
    <div className="px-4 py-3">
      <div className="soft-card p-3">
        <div className="flex gap-3">
          <ProfileAvatar
            name={profile?.name ?? "?"}
            color={profile?.color ?? "bg-primary"}
            size="sm"
          />
          <Textarea
            data-testid="compose-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("community.composePlaceholder")}
            rows={3}
            className="min-h-16 resize-none border-0 bg-muted shadow-none"
          />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          {t("community.hashtagHint")}
        </p>
        {notice ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{notice}</p>
        ) : null}
        {card ? (
          <div className="mt-3">
            <ColorCard card={card} />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {t("community.colorCardNote")}
            </p>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCard((current) => (current ? null : "warm"))}
            >
              <ImagePlus />
              {card ? t("community.removeCard") : t("community.addCard")}
            </Button>
            {media}
          </div>
          <Button data-testid="compose-post" onClick={publish} disabled={!body.trim() || !profile}>
            {t("community.post")}
          </Button>
        </div>
      </div>
    </div>
  );
}
