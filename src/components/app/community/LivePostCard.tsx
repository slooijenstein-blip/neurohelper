import { useState } from "react";
import { Flag, Heart, MessageCircle, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { postTimeParts, splitHashtags } from "@/lib/community";
import { ROLES, type Role } from "@/lib/app-store";
import type { ClientPost } from "@/lib/community-social/types";
import { cn } from "@/lib/utils";
import { RoleTag } from "../ui-bits";
import { AuthedMedia } from "./AuthedMedia";

function asRole(value: string): Role | null {
  return (ROLES as readonly string[]).includes(value) ? (value as Role) : null;
}

function TimeLabel({ iso }: { iso: string }) {
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

export function LivePostCard({
  post,
  moderator,
  onLike,
  onComment,
  onReport,
  onReportComment,
  onRemove,
  onSuspend,
}: {
  post: ClientPost;
  moderator: boolean;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
  onReport: (id: string) => void;
  onReportComment: (postId: string, commentId: string) => void;
  onRemove?: (id: string) => void;
  onSuspend?: (userId: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const role = asRole(post.authorRole);
  const statusLabel =
    post.status === "pending"
      ? t("community.social.waiting")
      : post.status === "rejected"
        ? t("community.social.rejected")
        : post.status === "removed"
          ? t("community.social.removed")
          : null;

  const hue = [...post.authorName].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const initials = post.authorName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");

  return (
    <article className="soft-card overflow-hidden" data-testid={`live-post-${post.id}`}>
      <div className="flex items-start gap-2 px-4 pt-4">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-content-center rounded-full text-sm font-semibold"
          style={{ background: `hsl(${hue} 42% 86%)` }}
        >
          {initials || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{post.authorName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            {role ? <RoleTag role={role} /> : <span>{post.authorRole}</span>}
            <span aria-hidden>·</span>
            <TimeLabel iso={post.createdAt} />
            {post.groupName ? (
              <>
                <span aria-hidden>·</span>
                <span>{post.groupName}</span>
              </>
            ) : null}
          </p>
        </div>
        {moderator && post.status === "approved" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("community.actions")}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRemove?.(post.id)}>
                {t("community.social.remove")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSuspend?.(post.authorId)}>
                {t("community.social.suspend")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {statusLabel ? (
        <p className="mx-4 mt-2 rounded-lg bg-accent px-2 py-1 text-xs text-accent-foreground">
          {statusLabel}
          {post.statusReason ? ` — ${post.statusReason}` : ""}
          {post.status === "pending" ? ` ${t("community.social.yourPost")}` : ""}
        </p>
      ) : null}
      {post.body ? (
        <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed">
          {splitHashtags(post.body).map((part, index) =>
            part.type === "text" ? (
              <span key={index}>{part.value}</span>
            ) : (
              <span key={index} className="mx-0.5 font-semibold text-primary">
                #{part.value}
              </span>
            ),
          )}
        </p>
      ) : null}
      {post.media?.kind === "image" ? (
        <AuthedMedia
          url={post.media.url}
          kind="image"
          alt={post.body || t("community.social.photoAlt")}
          className="max-h-96 w-full object-cover"
        />
      ) : null}
      {post.media?.kind === "video" ? (
        <AuthedMedia
          url={post.media.url}
          kind="video"
          controls
          playsInline
          preload="metadata"
          className="max-h-96 w-full bg-black"
        />
      ) : null}
      <div className="flex items-center gap-1 px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={post.liked}
          disabled={post.status !== "approved"}
          data-testid={`live-like-${post.id}`}
          onClick={() => onLike(post.id)}
        >
          <Heart className={cn(post.liked && "fill-primary text-primary")} />
          {post.likeCount}
          <span className="sr-only">{t("community.like")}</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
          <MessageCircle />
          {post.comments.length}
          <span className="sr-only">{t("community.comment")}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid={`live-report-${post.id}`}
          onClick={() => onReport(post.id)}
        >
          <Flag />
          {t("community.report")}
        </Button>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-border px-4 py-3">
          {post.comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("community.noComments")}</p>
          ) : (
            post.comments.map((comment) => (
              <div key={comment.id} className="text-sm">
                <p>
                  <span className="font-semibold">{comment.authorName}</span> {comment.text}
                </p>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-muted-foreground underline"
                  onClick={() => onReportComment(post.id, comment.id)}
                >
                  {t("community.social.reportComment")}
                </button>
              </div>
            ))
          )}
          {post.status === "approved" ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                onComment(post.id, draft.trim());
                setDraft("");
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("community.commentPlaceholder")}
                aria-label={t("community.comment")}
              />
              <Button type="submit" size="sm">
                {t("community.send")}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
