import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import {
  COMMUNITY_TOPICS,
  type CommunityCard,
  type CommunityFilter,
  type CommunityTopic,
} from "@/lib/community";
import { useAppStore } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "../ui-bits";
import { ColorCard } from "./ColorCard";

export function ComposeBox({
  filter,
  onPublish,
}: {
  filter: CommunityFilter;
  onPublish: (draft: { body: string; topic: CommunityTopic; card?: CommunityCard }) => void;
}) {
  const { t } = useI18n();
  const { state } = useAppStore();
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<CommunityTopic>(filter === "all" ? "tips" : filter);
  const [card, setCard] = useState<CommunityCard | null>(null);
  const profile = state.profile;

  useEffect(() => {
    if (!body.trim() && filter !== "all") setTopic(filter);
  }, [filter, body]);

  const publish = () => {
    if (!body.trim() || !profile) return;
    onPublish({ body: body.trim(), topic, ...(card ? { card } : {}) });
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
        <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
          {t("community.topicLabel")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {COMMUNITY_TOPICS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={topic === item}
              onClick={() => setTopic(item)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                topic === item
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t(`community.topics.${item}`)}
            </button>
          ))}
        </div>
        {card ? (
          <div className="mt-3">
            <ColorCard card={card} />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {t("community.colorCardNote")}
            </p>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCard((current) => (current ? null : "warm"))}
          >
            <ImagePlus />
            {card ? t("community.removeCard") : t("community.addCard")}
          </Button>
          <Button data-testid="compose-post" onClick={publish} disabled={!body.trim() || !profile}>
            {t("community.post")}
          </Button>
        </div>
      </div>
    </div>
  );
}
