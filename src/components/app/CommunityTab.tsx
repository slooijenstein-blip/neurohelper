import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nProvider";
import {
  COMMUNITY_TOPICS,
  REPORT_REASONS,
  comparePostsNewestFirst,
  postMatchesTopic,
  type CommunityFilter,
  type CommunityTopic,
  type ReportReason,
} from "@/lib/community";
import { useCommunityPrefs } from "@/lib/community-local";
import { uid, useAppStore, type Comment, type Post } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import { ScreenHeader } from "./ui-bits";
import { ComposeBox } from "./community/ComposeBox";
import { FeedPost } from "./community/FeedPost";
import { StoriesStrip } from "./community/StoriesStrip";
import { StoryViewer } from "./community/StoryViewer";

export function CommunityTab({
  onProfile,
}: {
  onProfile: (id: string) => void;
  onArticle: (id: string) => void;
}) {
  const { state, update } = useAppStore();
  const { t } = useI18n();
  const prefs = useCommunityPrefs();
  const [filter, setFilter] = useState<CommunityFilter>("all");
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("unkind");

  const posts = useMemo(
    () =>
      state.posts
        .filter((post) => postMatchesTopic(post.topic, filter))
        .sort(comparePostsNewestFirst),
    [state.posts, filter],
  );

  const toggleLike = (id: string) =>
    update((prev) => ({
      ...prev,
      posts: prev.posts.map((post) =>
        post.id === id
          ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
          : post,
      ),
    }));

  const addComment = (id: string) => {
    const text = (drafts[id] ?? "").trim();
    if (!text || !state.profile) return;
    const comment: Comment = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      text,
      createdAt: new Date().toISOString(),
    };
    update((prev) => ({
      ...prev,
      posts: prev.posts.map((post) =>
        post.id === id ? { ...post, comments: [...post.comments, comment] } : post,
      ),
    }));
    setDrafts((prev) => ({ ...prev, [id]: "" }));
  };

  const publish = (draft: { body: string; topic: CommunityTopic; card?: Post["card"] }) => {
    if (!state.profile) return;
    const post: Post = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      authorLocation: state.profile.location,
      kind: "Story",
      body: draft.body,
      topic: draft.topic,
      ...(draft.card ? { card: draft.card } : {}),
      likes: 0,
      liked: false,
      reactions: {},
      myReactions: [],
      comments: [],
      reposts: [],
      createdAt: new Date().toISOString(),
    };
    update((prev) => ({ ...prev, posts: [post, ...prev.posts] }));
    setFilter(draft.topic);
    toast.success(t("community.posted"));
  };

  const submitReport = () => {
    if (!reportId) return;
    prefs.reportPost(reportId);
    toast.success(t("community.reportThanks"));
    setReportId(null);
    setReportReason("unkind");
  };

  const toggleTopic = (topic: CommunityTopic) => {
    const joined = prefs.joined.includes(topic);
    prefs.toggleJoined(topic);
    toast.success(
      t(joined ? "community.leftToast" : "community.joinedToast", {
        topic: t(`community.topics.${topic}`),
      }),
    );
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ScreenHeader title={t("community.title")} subtitle={t("community.subtitle")} />

      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface">
        <div className="mx-auto flex w-full max-w-xl flex-col pb-8">
          <StoriesStrip myStory={prefs.myStory} seen={prefs.seen} onOpen={setStoryIndex} />

          <div className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-2 backdrop-blur">
            <div
              role="radiogroup"
              aria-label={t("community.topicsLabel")}
              className="hide-scrollbar flex gap-2 overflow-x-auto pb-1"
            >
              <TopicChip
                label={t("community.topics.all")}
                active={filter === "all"}
                testId="topic-all"
                onClick={() => setFilter("all")}
              />
              {COMMUNITY_TOPICS.map((topic) => (
                <TopicChip
                  key={topic}
                  label={t(`community.topics.${topic}`)}
                  active={filter === topic}
                  joined={prefs.joined.includes(topic)}
                  testId={`topic-${topic}`}
                  onClick={() => setFilter(topic)}
                />
              ))}
            </div>
            {filter !== "all" ? (
              <div className="mt-2 flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">
                  {t(`community.topicHint.${filter}`)}
                </p>
                <Button
                  size="sm"
                  variant={prefs.joined.includes(filter) ? "outline" : "default"}
                  className="h-7 shrink-0"
                  data-testid="topic-join"
                  onClick={() => toggleTopic(filter)}
                >
                  {prefs.joined.includes(filter) ? t("community.joined") : t("community.join")}
                </Button>
              </div>
            ) : null}
          </div>

          <ComposeBox filter={filter} onPublish={publish} />

          <div
            className="space-y-3 px-4"
            data-testid="community-feed"
            aria-label={t("community.feedLabel")}
          >
            {posts.map((post) => (
              <FeedPost
                key={post.id}
                post={post}
                commentsOpen={!!openComments[post.id]}
                draft={drafts[post.id] ?? ""}
                reported={prefs.reported.includes(post.id)}
                onToggleLike={toggleLike}
                onToggleComments={(id) => setOpenComments((prev) => ({ ...prev, [id]: !prev[id] }))}
                onDraft={(id, value) => setDrafts((prev) => ({ ...prev, [id]: value }))}
                onSubmitComment={addComment}
                onReport={(id) => {
                  setReportReason("unkind");
                  setReportId(id);
                }}
                onOpenProfile={onProfile}
              />
            ))}
            {!posts.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("community.empty")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {storyIndex !== null ? (
        <StoryViewer
          storyIndex={storyIndex}
          myStory={prefs.myStory}
          onIndex={setStoryIndex}
          onClose={() => setStoryIndex(null)}
          onSaveStory={prefs.saveStory}
          onSeen={prefs.markSeen}
        />
      ) : null}

      <Dialog open={reportId !== null} onOpenChange={(open) => !open && setReportId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("community.reportTitle")}</DialogTitle>
            <DialogDescription>{t("community.reportBody")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                aria-pressed={reportReason === reason}
                data-testid={`report-reason-${reason}`}
                onClick={() => setReportReason(reason)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-sm",
                  reportReason === reason
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border",
                )}
              >
                {t(`community.reasons.${reason}`)}
              </button>
            ))}
          </div>
          <Button data-testid="report-submit" onClick={submitReport}>
            {t("community.reportSubmit")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TopicChip({
  label,
  active,
  joined,
  testId,
  onClick,
}: {
  label: string;
  active: boolean;
  joined?: boolean;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground ring-1 ring-border",
      )}
    >
      {joined ? <Check className="size-3" /> : null}
      {label}
    </button>
  );
}
