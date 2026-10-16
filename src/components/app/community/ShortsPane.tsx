import { useEffect, useRef, useState } from "react";
import { Flag, Heart, MessageCircle, Share2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import type { ClientPost } from "@/lib/community-social/types";
import { communityErrorText, useCommunitySocial } from "./social-context";
import { TranslatableText } from "./TranslatableText";

export function ShortsPane({ onReport }: { onReport: (postId: string) => void }) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const scroller = useRef<HTMLDivElement>(null);
  const [soundId, setSoundId] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<ClientPost | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const videos = [...root.querySelectorAll("video")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7 && !reduce) {
            void video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        }
      },
      { root, threshold: [0.7] },
    );
    for (const video of videos) observer.observe(video);
    return () => observer.disconnect();
  }, [social.shorts]);

  const step = (direction: number) => {
    const root = scroller.current;
    if (!root) return;
    root.scrollBy({ top: direction * root.clientHeight, behavior: "smooth" });
  };

  const share = async (post: ClientPost) => {
    const url = window.location.href;
    const text = post.body || t("community.social.shareText");
    try {
      if (navigator.share) await navigator.share({ title: "Synlumae", text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success(t("community.social.shareCopied"));
      }
    } catch {
      /* The share sheet was closed. */
    }
  };

  if (!social.configured) {
    return (
      <div className="px-4 py-8">
        <h2 className="text-base font-semibold">{t("community.social.setupTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("community.social.setupBody")}</p>
      </div>
    );
  }

  if (!social.shorts.length) {
    return (
      <p
        className="px-4 py-10 text-center text-sm text-muted-foreground"
        data-testid="shorts-empty"
      >
        {t("community.social.shortsEmpty")}
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-black text-white">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-semibold">{t("community.social.shortsLabel")}</h2>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="secondary" onClick={() => step(-1)}>
            {t("community.social.prevShort")}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => step(1)}>
            {t("community.social.nextShort")}
          </Button>
        </div>
      </div>
      <div
        ref={scroller}
        data-testid="shorts-feed"
        aria-label={t("community.social.shortsLabel")}
        className="hide-scrollbar min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto"
      >
        {social.shorts.map((post) => {
          const sound = soundId === post.id;
          return (
            <section
              key={post.id}
              className="relative flex h-full shrink-0 snap-start snap-always items-center justify-center"
              data-testid={`short-${post.id}`}
            >
              <video
                src={post.media?.url}
                muted={!sound}
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
                onClick={() => setSoundId(sound ? null : post.id)}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pr-20">
                <p className="text-sm font-semibold">{post.authorName}</p>
                {post.body ? (
                  <TranslatableText
                    text={post.body}
                    testId={`short-${post.id}`}
                    className="pointer-events-auto mt-1 text-sm"
                  />
                ) : null}
              </div>
              <div className="absolute bottom-16 right-3 flex flex-col gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-pressed={sound}
                  aria-label={
                    sound ? t("community.social.soundOff") : t("community.social.soundOn")
                  }
                  data-testid={`short-sound-${post.id}`}
                  onClick={() => setSoundId(sound ? null : post.id)}
                >
                  {sound ? <Volume2 /> : <VolumeX />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-pressed={post.liked}
                  aria-label={t("community.like")}
                  data-testid={`short-like-${post.id}`}
                  onClick={() =>
                    void social
                      .toggleLike(post.id)
                      .catch((err) => toast.error(communityErrorText(t, err)))
                  }
                >
                  <Heart className={post.liked ? "fill-primary text-primary" : ""} />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label={t("community.comment")}
                  onClick={() => setCommentPost(post)}
                >
                  <MessageCircle />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label={t("community.social.share")}
                  onClick={() => void share(post)}
                >
                  <Share2 />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label={t("community.report")}
                  data-testid={`short-report-${post.id}`}
                  onClick={() => onReport(post.id)}
                >
                  <Flag />
                </Button>
              </div>
            </section>
          );
        })}
      </div>
      <Dialog open={commentPost !== null} onOpenChange={(next) => !next && setCommentPost(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("community.comment")}</DialogTitle>
          </DialogHeader>
          <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
            {commentPost?.comments.map((comment) => (
              <li key={comment.id}>
                <span className="font-semibold">{comment.authorName}</span>
                <TranslatableText text={comment.text} testId={`short-comment-${comment.id}`} />
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!commentPost || !draft.trim()) return;
              void social
                .comment(commentPost.id, draft.trim())
                .then(() => {
                  setDraft("");
                  toast.success(t("community.social.commentSent"));
                })
                .catch((err) => toast.error(communityErrorText(t, err)));
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("community.commentPlaceholder")}
              aria-label={t("community.comment")}
            />
            <Button type="submit">{t("community.send")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
