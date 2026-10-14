import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { COMMUNITY_STORIES } from "@/lib/community";
import type { MyStory } from "@/lib/community-local";
import { useAppStore } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "../ui-bits";

const STORY_MS = 7000;

export function StoryViewer({
  storyIndex,
  myStory,
  onIndex,
  onClose,
  onSaveStory,
  onSeen,
}: {
  storyIndex: number;
  myStory: MyStory | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  onSaveStory: (text: string) => void;
  onSeen: (id: string) => void;
}) {
  const { t } = useI18n();
  const { state } = useAppStore();
  const [slide, setSlide] = useState(0);
  const [editing, setEditing] = useState(storyIndex === 0 && !myStory);
  const [draft, setDraft] = useState(myStory?.text ?? "");

  const storyCount = 1 + COMMUNITY_STORIES.length;
  const seeded = storyIndex === 0 ? null : COMMUNITY_STORIES[storyIndex - 1];
  const showingForm = storyIndex === 0 && (editing || !myStory);
  const slides =
    storyIndex === 0
      ? myStory
        ? [myStory.text]
        : []
      : (seeded?.slides.map((item) => t(item.textKey)) ?? []);

  useEffect(() => {
    setSlide(0);
    setEditing(storyIndex === 0 && !myStory);
    setDraft(myStory?.text ?? "");
  }, [storyIndex, myStory]);

  useEffect(() => {
    if (seeded) onSeen(seeded.id);
  }, [seeded, onSeen]);

  const goNext = useCallback(() => {
    if (showingForm) return;
    if (slide < slides.length - 1) {
      setSlide((current) => current + 1);
      return;
    }
    if (storyIndex < storyCount - 1) {
      onIndex(storyIndex + 1);
      return;
    }
    onClose();
  }, [onClose, onIndex, showingForm, slide, slides.length, storyCount, storyIndex]);

  const goPrev = useCallback(() => {
    if (showingForm) return;
    if (slide > 0) {
      setSlide((current) => current - 1);
      return;
    }
    if (storyIndex > 0) onIndex(storyIndex - 1);
  }, [onIndex, showingForm, slide, storyIndex]);

  useEffect(() => {
    if (showingForm || slides.length === 0) return;
    const timer = window.setTimeout(() => goNext(), STORY_MS);
    return () => window.clearTimeout(timer);
  }, [goNext, showingForm, slides.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  const author =
    storyIndex === 0
      ? {
          name: state.profile?.name ?? t("community.yourStory"),
          color: state.profile?.color ?? "bg-primary",
        }
      : {
          name: state.members.find((member) => member.id === seeded?.authorId)?.name ?? "",
          color:
            state.members.find((member) => member.id === seeded?.authorId)?.color ?? "bg-primary",
        };

  const save = () => {
    if (!draft.trim()) return;
    onSaveStory(draft.trim());
    setEditing(false);
    toast.success(t("community.storySaved"));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("community.storiesLabel")}
      data-testid="story-viewer"
      className="absolute inset-0 z-30 flex flex-col bg-[oklch(0.24_0.03_25)] text-white"
    >
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        {showingForm ? (
          <div className="h-0.5 flex-1" />
        ) : (
          <div className="flex flex-1 gap-1">
            {slides.map((_, index) => (
              <span key={index} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <span
                  className={cn(
                    "block h-full rounded-full bg-white",
                    index <= slide ? "w-full" : "w-0",
                  )}
                />
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("community.storyClose")}
          data-testid="story-close"
          className="grid size-8 place-items-center rounded-full text-white hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-4">
        <ProfileAvatar name={author.name} color={author.color} size="sm" />
        <p className="text-sm font-semibold">{author.name}</p>
      </div>

      {showingForm ? (
        <div className="flex flex-1 flex-col justify-end gap-3 p-5">
          <p className="text-sm leading-relaxed text-white/80">{t("community.yourStoryEmpty")}</p>
          <Textarea
            data-testid="story-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("community.storyPlaceholder")}
            rows={4}
            className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
          />
          <Button data-testid="story-save" onClick={save} disabled={!draft.trim()}>
            {t("community.addStory")}
          </Button>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col">
          <button
            type="button"
            aria-label={t("community.storyPrev")}
            className="absolute inset-y-0 left-0 w-1/3"
            onClick={goPrev}
          />
          <button
            type="button"
            aria-label={t("community.storyNext")}
            data-testid="story-next"
            className="absolute inset-y-0 right-0 w-1/3"
            onClick={goNext}
          />
          <p className="flex flex-1 items-center px-8 text-center font-display text-2xl leading-snug">
            {slides[slide]}
          </p>
          <div className="relative z-10 flex justify-between px-4 pb-6">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={goPrev}
            >
              {t("community.storyPrev")}
            </Button>
            {storyIndex === 0 ? (
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => setEditing(true)}
              >
                {t("community.addStory")}
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                data-testid="story-next-button"
                onClick={goNext}
              >
                {t("community.storyNext")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
