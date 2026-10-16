import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import {
  REPORT_REASONS,
  comparePostsNewestFirst,
  plainPostBody,
  postMatchesHashtag,
  type ReportReason,
} from "@/lib/community";
import { useCommunityPrefs } from "@/lib/community-local";
import { uid, useAppStore, type Article, type Comment, type Post } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import { ActivityDetailDialog } from "./ActivityDetailDialog";
import { PostDetailDialog } from "./PostDetailDialog";
import { ArticlesPane, FollowingPane, SchedulesPane } from "./community/CommunityPanes";
import { ComposeBox } from "./community/ComposeBox";
import { FeedPost } from "./community/FeedPost";
import { GroupsPane } from "./community/GroupsPane";
import { LivePostCard } from "./community/LivePostCard";
import { MediaShareButtons } from "./community/MediaShareButtons";
import { ModerationPane } from "./community/ModerationPane";
import { ShortsPane } from "./community/ShortsPane";
import { StoriesStrip } from "./community/StoriesStrip";
import { StoryViewer } from "./community/StoryViewer";
import {
  CommunitySocialProvider,
  communityErrorText,
  useCommunitySocial,
} from "./community/social-context";
import { ScreenHeader } from "./ui-bits";

const BASE_PANES = ["feed", "shorts", "groups", "articles", "following", "schedules"] as const;
type CommunityPane = (typeof BASE_PANES)[number] | "review";

export function CommunityTab(props: {
  onProfile: (id: string) => void;
  onArticle: (id: string) => void;
}) {
  return (
    <CommunitySocialProvider>
      <CommunityTabInner {...props} />
    </CommunitySocialProvider>
  );
}

function CommunityTabInner({
  onProfile,
  onArticle,
}: {
  onProfile: (id: string) => void;
  onArticle: (id: string) => void;
}) {
  const { state, update } = useAppStore();
  const { t } = useI18n();
  const prefs = useCommunityPrefs();
  const social = useCommunitySocial();
  const panes: CommunityPane[] = social.moderator ? [...BASE_PANES, "review"] : [...BASE_PANES];
  const [pane, setPane] = useState<CommunityPane>("feed");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reportId, setReportId] = useState<string | null>(null);
  const [liveReport, setLiveReport] = useState<{ postId: string; commentId?: string } | null>(null);
  const [staffAction, setStaffAction] = useState<{ kind: "remove" | "suspend"; id: string } | null>(
    null,
  );
  const [staffReason, setStaffReason] = useState("");
  const [reportReason, setReportReason] = useState<ReportReason>("unkind");
  const [postId, setPostId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [articleOpen, setArticleOpen] = useState(false);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleTags, setArticleTags] = useState("");
  const [articleBody, setArticleBody] = useState("");

  const posts = useMemo(() => {
    const bodyOf = (post: Post) => (post.bodyKey ? t(post.bodyKey) : plainPostBody(post.body));
    return state.posts
      .filter((post) => postMatchesHashtag(bodyOf(post), activeTag))
      .sort(comparePostsNewestFirst);
  }, [state.posts, activeTag, t]);

  const toggleLike = (id: string) =>
    update((prev) => ({
      ...prev,
      posts: prev.posts.map((post) =>
        post.id === id
          ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
          : post,
      ),
    }));

  const addCommentText = (id: string, text: string) => {
    if (!text.trim() || !state.profile) return;
    const comment: Comment = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    update((prev) => ({
      ...prev,
      posts: prev.posts.map((post) =>
        post.id === id ? { ...post, comments: [...post.comments, comment] } : post,
      ),
    }));
  };

  const addComment = (id: string) => {
    const text = drafts[id] ?? "";
    if (!text.trim()) return;
    addCommentText(id, text);
    setDrafts((prev) => ({ ...prev, [id]: "" }));
  };

  const publish = (draft: { body: string; card?: Post["card"] }) => {
    if (!state.profile) return;
    if (social.configured && social.signedIn && !draft.card) {
      if (social.suspended) {
        toast.error(t("community.social.suspended"));
        return;
      }
      void social
        .publishText(draft.body)
        .then(() => toast.success(t("community.social.postedPending")))
        .catch((err) => toast.error(communityErrorText(t, err)));
      return;
    }
    const post: Post = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      authorLocation: state.profile.location,
      kind: "Story",
      body: draft.body,
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
    setActiveTag(null);
    toast.success(t("community.posted"));
  };

  const publishArticle = () => {
    if (!articleTitle.trim() || !articleBody.trim() || !state.profile) return;
    const words = articleBody.trim().split(/\s+/).length;
    const article: Article = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      title: articleTitle.trim(),
      excerpt: articleBody.trim().slice(0, 140),
      body: articleBody.trim(),
      tags: articleTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      readMinutes: Math.max(1, Math.round(words / 200)),
      likes: 0,
      liked: false,
      reactions: {},
      myReactions: [],
      comments: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    update((prev) => ({ ...prev, articles: [article, ...prev.articles] }));
    setArticleTitle("");
    setArticleTags("");
    setArticleBody("");
    setArticleOpen(false);
    toast.success(t("community.articlePublished"));
  };

  const submitReport = () => {
    if (liveReport) {
      void social
        .report({
          postId: liveReport.postId,
          ...(liveReport.commentId ? { commentId: liveReport.commentId } : {}),
          reason: reportReason,
        })
        .then(() => toast.success(t("community.social.reportSent")))
        .catch((err) => toast.error(communityErrorText(t, err)));
      setLiveReport(null);
      setReportReason("unkind");
      return;
    }
    if (!reportId) return;
    prefs.reportPost(reportId);
    toast.success(t("community.reportThanks"));
    setReportId(null);
    setReportReason("unkind");
  };

  const submitStaff = () => {
    if (!staffAction || !staffReason.trim()) return;
    const action =
      staffAction.kind === "remove"
        ? social.review(staffAction.id, "remove", staffReason.trim())
        : social.suspend(staffAction.id, true, staffReason.trim());
    void action
      .then(() => toast.success(t("community.social.savedChanges")))
      .catch((err) => toast.error(communityErrorText(t, err)));
    setStaffAction(null);
    setStaffReason("");
  };

  const chooseTag = (tag: string) => {
    setActiveTag((current) => (current === tag ? null : tag));
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ScreenHeader title={t("community.title")} subtitle={t("community.subtitle")} />

      <div className="border-b border-border bg-surface px-4 py-2 md:px-8">
        <div
          role="tablist"
          aria-label={t("community.tabsLabel")}
          className="mx-auto flex max-w-xl gap-1 overflow-x-auto rounded-full bg-muted p-1"
        >
          {panes.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={pane === key}
              data-testid={`community-tab-${key}`}
              onClick={() => setPane(key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                pane === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {t(`community.tabs.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "hide-scrollbar min-h-0 flex-1 bg-surface",
          pane === "shorts" ? "flex flex-col overflow-hidden" : "overflow-y-auto",
        )}
      >
        {pane === "feed" ? (
          <div className="mx-auto flex w-full max-w-xl flex-col pb-8">
            <StoriesStrip myStory={prefs.myStory} seen={prefs.seen} onOpen={setStoryIndex} />
            {activeTag ? (
              <div className="flex items-center justify-between gap-2 px-4 pt-3">
                <p className="text-xs font-semibold">
                  {t("community.filteredBy", { tag: activeTag })}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  data-testid="clear-hashtag"
                  onClick={() => setActiveTag(null)}
                >
                  {t("community.showAll")}
                </Button>
              </div>
            ) : null}
            {social.suspended ? (
              <p className="px-4 text-sm text-muted-foreground">
                {t("community.social.suspended")}
              </p>
            ) : null}
            {!social.signedIn && social.ready ? (
              <p className="px-4 text-xs text-muted-foreground">{t("community.social.liveOff")}</p>
            ) : null}
            <ComposeBox
              onPublish={publish}
              notice={t("community.social.privacyLine")}
              media={<MediaShareButtons />}
            />
            <div
              className="space-y-3 px-4"
              data-testid="community-feed"
              aria-label={t("community.feedLabel")}
            >
              {social.posts
                .filter((post) => postMatchesHashtag(post.body, activeTag))
                .map((post) => (
                  <LivePostCard
                    key={post.id}
                    post={post}
                    moderator={social.moderator}
                    onLike={(id) =>
                      void social
                        .toggleLike(id)
                        .catch((err) => toast.error(communityErrorText(t, err)))
                    }
                    onComment={(id, text) =>
                      void social
                        .comment(id, text)
                        .catch((err) => toast.error(communityErrorText(t, err)))
                    }
                    onReport={(id) => {
                      setReportReason("unkind");
                      setLiveReport({ postId: id });
                    }}
                    onReportComment={(postId, commentId) => {
                      setReportReason("unkind");
                      setLiveReport({ postId, commentId });
                    }}
                    onRemove={(id) => {
                      setStaffReason("");
                      setStaffAction({ kind: "remove", id });
                    }}
                    onSuspend={(userId) => {
                      setStaffReason("");
                      setStaffAction({ kind: "suspend", id: userId });
                    }}
                  />
                ))}
              {posts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  commentsOpen={!!openComments[post.id]}
                  draft={drafts[post.id] ?? ""}
                  reported={prefs.reported.includes(post.id)}
                  activeTag={activeTag}
                  onToggleLike={toggleLike}
                  onToggleComments={(id) =>
                    setOpenComments((prev) => ({ ...prev, [id]: !prev[id] }))
                  }
                  onDraft={(id, value) => setDrafts((prev) => ({ ...prev, [id]: value }))}
                  onSubmitComment={addComment}
                  onReport={(id) => {
                    setReportReason("unkind");
                    setReportId(id);
                  }}
                  onOpenProfile={onProfile}
                  onHashtag={chooseTag}
                  onOpen={() => setPostId(post.id)}
                />
              ))}
              {!posts.length && social.posts.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {activeTag
                    ? t("community.emptyHashtag", { tag: activeTag })
                    : t("community.empty")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {pane === "shorts" ? (
          <ShortsPane
            onReport={(id) => {
              setReportReason("unkind");
              setLiveReport({ postId: id });
            }}
          />
        ) : null}

        {pane === "groups" ? (
          <GroupsPane
            onReport={(id) => {
              setReportReason("unkind");
              setLiveReport({ postId: id });
            }}
            onReportComment={(postId, commentId) => {
              setReportReason("unkind");
              setLiveReport({ postId, commentId });
            }}
          />
        ) : null}

        {pane === "review" && social.moderator ? <ModerationPane /> : null}

        {pane === "articles" ? (
          <ArticlesPane
            query={query}
            onQuery={setQuery}
            onWrite={() => setArticleOpen(true)}
            onArticle={onArticle}
            onProfile={onProfile}
          />
        ) : null}

        {pane === "following" ? (
          <FollowingPane onProfile={onProfile} onOpenPost={setPostId} />
        ) : null}

        {pane === "schedules" ? (
          <SchedulesPane onProfile={onProfile} onActivity={setActivityId} />
        ) : null}
      </div>

      {storyIndex !== null && pane === "feed" ? (
        <StoryViewer
          storyIndex={storyIndex}
          myStory={prefs.myStory}
          onIndex={setStoryIndex}
          onClose={() => setStoryIndex(null)}
          onSaveStory={prefs.saveStory}
          onSeen={prefs.markSeen}
        />
      ) : null}

      <Dialog open={articleOpen} onOpenChange={setArticleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("community.writeArticle")}</DialogTitle>
            <DialogDescription>{t("community.writeArticleHelp")}</DialogDescription>
          </DialogHeader>
          <Input
            value={articleTitle}
            onChange={(event) => setArticleTitle(event.target.value)}
            placeholder={t("community.articleTitle")}
          />
          <Input
            value={articleTags}
            onChange={(event) => setArticleTags(event.target.value)}
            placeholder={t("community.articleTags")}
          />
          <Textarea
            value={articleBody}
            onChange={(event) => setArticleBody(event.target.value)}
            placeholder={t("community.articleBody")}
            rows={8}
          />
          <Button data-testid="publish-article" onClick={publishArticle}>
            {t("community.publishArticle")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reportId !== null || liveReport !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReportId(null);
            setLiveReport(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("community.reportTitle")}</DialogTitle>
            <DialogDescription>
              {liveReport ? t("community.social.reportBodyLive") : t("community.reportBody")}
            </DialogDescription>
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

      <Dialog open={staffAction !== null} onOpenChange={(open) => !open && setStaffAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {staffAction?.kind === "suspend"
                ? t("community.social.suspend")
                : t("community.social.remove")}
            </DialogTitle>
            <DialogDescription>{t("community.social.reasonPlaceholder")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={staffReason}
            onChange={(event) => setStaffReason(event.target.value)}
            placeholder={t("community.social.reasonPlaceholder")}
            aria-label={t("community.social.reasonPlaceholder")}
            rows={3}
          />
          <Button data-testid="staff-submit" onClick={submitStaff} disabled={!staffReason.trim()}>
            {t("community.social.remove")}
          </Button>
        </DialogContent>
      </Dialog>

      <ActivityDetailDialog activityId={activityId} onClose={() => setActivityId(null)} />
      <PostDetailDialog
        post={state.posts.find((post) => post.id === postId) ?? null}
        onClose={() => setPostId(null)}
        onLike={toggleLike}
        onComment={addCommentText}
        onOpenProfile={onProfile}
      />
    </div>
  );
}
