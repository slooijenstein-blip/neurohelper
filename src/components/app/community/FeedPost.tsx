import { Flag, Heart, MessageCircle, MoreHorizontal, UserCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { plainPostBody, postTimeParts, splitHashtags } from "@/lib/community";
import { useAppStore, type Comment, type Post } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import { ProfileAvatar, RoleTag } from "../ui-bits";
import { ColorCard } from "./ColorCard";

function PostTime({ iso }: { iso: string }) {
  const { t, locale } = useI18n();
  const parts = postTimeParts(iso, new Date());
  const label =
    parts.kind === "justNow"
      ? t("community.time.justNow")
      : parts.kind === "minutes"
        ? t("community.time.minutes", { count: parts.count })
        : parts.kind === "hours"
          ? t("community.time.hours", { count: parts.count })
          : parts.kind === "yesterday"
            ? t("community.time.yesterday")
            : new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en", {
                day: "numeric",
                month: "short",
              }).format(parts.date);
  return <time dateTime={iso}>{label}</time>;
}

function PostText({
  postId,
  body,
  activeTag,
  onHashtag,
  onOpen,
}: {
  postId: string;
  body: string;
  activeTag: string | null;
  onHashtag: (tag: string) => void;
  onOpen: () => void;
}) {
  const parts = splitHashtags(body);
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`open-post-body-${postId}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer whitespace-pre-wrap px-4 py-3 text-left text-sm leading-relaxed"
    >
      {parts.map((part, index) =>
        part.type === "text" ? (
          <span key={index}>{part.value}</span>
        ) : (
          <button
            key={index}
            type="button"
            data-testid={`hashtag-${postId}-${part.value.toLocaleLowerCase()}`}
            aria-pressed={activeTag === part.value.toLocaleLowerCase()}
            onClick={(event) => {
              event.stopPropagation();
              onHashtag(part.value.toLocaleLowerCase());
            }}
            className={cn(
              "mx-0.5 inline-flex rounded-full px-2 py-0.5 align-baseline text-xs font-semibold",
              activeTag === part.value.toLocaleLowerCase()
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground",
            )}
          >
            #{part.value}
          </button>
        ),
      )}
    </div>
  );
}

function commentText(comment: Comment, t: (key: string) => string) {
  return comment.textKey ? t(comment.textKey) : comment.text;
}

export function FeedPost({
  post,
  commentsOpen,
  draft,
  reported,
  activeTag,
  onToggleLike,
  onToggleComments,
  onDraft,
  onSubmitComment,
  onReport,
  onOpenProfile,
  onHashtag,
  onOpen,
}: {
  post: Post;
  commentsOpen: boolean;
  draft: string;
  reported: boolean;
  activeTag: string | null;
  onToggleLike: (id: string) => void;
  onToggleComments: (id: string) => void;
  onDraft: (id: string, value: string) => void;
  onSubmitComment: (id: string) => void;
  onReport: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onHashtag: (tag: string) => void;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const { state, toggleFollow, isFollowing } = useAppStore();
  const isMe = state.profile?.id === post.authorId;
  const color =
    state.members.find((member) => member.id === post.authorId)?.color ??
    (isMe ? state.profile?.color : undefined) ??
    "bg-primary";
  const body = post.bodyKey ? t(post.bodyKey) : plainPostBody(post.body);
  const hasSharedSchedule =
    Boolean(post.templateId) ||
    state.templates.some((template) => template.ownerId === post.authorId && template.isPublic);

  const colorFor = (authorId: string) =>
    state.members.find((member) => member.id === authorId)?.color ??
    (state.profile?.id === authorId ? state.profile.color : "bg-primary");

  return (
    <article className="soft-card overflow-hidden" data-testid={`post-${post.id}`}>
      <div className="flex items-start gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={() => onOpenProfile(post.authorId)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ProfileAvatar name={post.authorName} color={color} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{post.authorName}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <RoleTag role={post.authorRole} />
              <span aria-hidden>·</span>
              <PostTime iso={post.createdAt} />
            </span>
          </span>
        </button>
        {!isMe ? (
          <Button
            size="sm"
            variant={isFollowing(post.authorId) ? "outline" : "default"}
            className="h-7 shrink-0"
            data-testid={`follow-${post.id}`}
            onClick={() => toggleFollow(post.authorId)}
          >
            {isFollowing(post.authorId) ? (
              <>
                <UserCheck className="size-3.5" /> {t("profile.following")}
              </>
            ) : (
              <>
                <UserPlus className="size-3.5" /> {t("community.follow")}
              </>
            )}
          </Button>
        ) : null}
        {!isMe ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t("community.actions")}
                data-testid={`post-actions-${post.id}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={reported}
                data-testid={`report-${post.id}`}
                onClick={() => onReport(post.id)}
              >
                <Flag />
                {reported ? t("community.reported") : t("community.report")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {post.kind === "Schedule Share" || reported ? (
        <div className="mt-2 flex flex-wrap gap-1.5 px-4">
          {post.kind === "Schedule Share" ? (
            <span className="tag-base bg-secondary text-secondary-foreground">
              {t("community.scheduleShare")}
            </span>
          ) : null}
          {reported ? (
            <span className="tag-base bg-muted text-muted-foreground">
              {t("community.reported")}
            </span>
          ) : null}
        </div>
      ) : null}

      <PostText
        postId={post.id}
        body={body}
        activeTag={activeTag}
        onHashtag={onHashtag}
        onOpen={onOpen}
      />
      <div className="px-4 pb-3">
        <button
          type="button"
          data-testid={`open-post-${post.id}`}
          onClick={onOpen}
          className="text-xs font-semibold text-primary"
        >
          {hasSharedSchedule ? t("community.openPostSchedule") : t("community.openPost")} →
        </button>
      </div>
      {post.card ? <ColorCard card={post.card} className="mx-4 mb-3" /> : null}

      <div className="flex border-t border-border">
        <button
          type="button"
          data-testid={`like-${post.id}`}
          aria-pressed={post.liked}
          aria-label={post.liked ? t("community.unlike") : t("community.like")}
          onClick={() => onToggleLike(post.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold",
            post.liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Heart className={cn("size-4", post.liked && "fill-current")} />
          {post.likes}
        </button>
        <button
          type="button"
          data-testid={`comments-${post.id}`}
          aria-expanded={commentsOpen}
          aria-label={t("community.comment")}
          onClick={() => onToggleComments(post.id)}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="size-4" />
          {post.comments.length}
        </button>
      </div>

      {commentsOpen ? (
        <div className="space-y-2 border-t border-border bg-surface/60 px-4 py-3">
          {post.comments.length ? (
            post.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <button type="button" onClick={() => onOpenProfile(comment.authorId)}>
                  <ProfileAvatar
                    name={comment.authorName}
                    color={colorFor(comment.authorId)}
                    size="sm"
                  />
                </button>
                <div className="min-w-0 rounded-2xl bg-muted px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(comment.authorId)}
                    className="text-xs font-semibold hover:underline"
                  >
                    {comment.authorName}
                  </button>
                  <p className="text-xs leading-relaxed text-foreground">
                    {commentText(comment, t)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">{t("community.noComments")}</p>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              data-testid={`comment-input-${post.id}`}
              value={draft}
              onChange={(event) => onDraft(post.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSubmitComment(post.id);
              }}
              placeholder={t("community.commentPlaceholder")}
              className="h-9 text-xs"
            />
            <Button
              size="sm"
              className="h-9"
              data-testid={`comment-send-${post.id}`}
              onClick={() => onSubmitComment(post.id)}
              disabled={!draft.trim()}
            >
              {t("community.send")}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
