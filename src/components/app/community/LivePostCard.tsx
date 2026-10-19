import { useState } from "react";
import { toast } from "sonner";
import { Flag, Heart, MessageCircle, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { postTimeParts, splitHashtags } from "@/lib/community";
import { ROLES, type Role } from "@/lib/app-store";
import { prepareCommunityFile } from "@/lib/community-social/prepare-media";
import type { ClientPerson, ClientPost } from "@/lib/community-social/types";
import { cn } from "@/lib/utils";
import { RoleTag } from "../ui-bits";
import { AuthedMedia } from "./AuthedMedia";
import { PersonPicker } from "./PersonPicker";
import { communityErrorText, useCommunitySocial } from "./social-context";

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
  onOpenProfile,
  onChanged,
}: {
  post: ClientPost;
  moderator: boolean;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
  onReport: (id: string) => void;
  onReportComment: (postId: string, commentId: string) => void;
  onRemove?: (id: string) => void;
  onSuspend?: (userId: string) => void;
  onOpenProfile?: (userId: string) => void;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editTags, setEditTags] = useState<ClientPerson[]>([]);
  const [editShares, setEditShares] = useState<ClientPerson[]>([]);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [nextFile, setNextFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const mine = social.userId === post.authorId;
  const taggedMe = post.tags.some((tag) => tag.userId === social.userId && !mine);
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
          <button
            type="button"
            className="truncate text-left text-sm font-semibold"
            data-testid={`open-author-${post.id}`}
            onClick={() => onOpenProfile?.(post.authorId)}
          >
            {post.authorName}
          </button>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            {role ? <RoleTag role={role} /> : <span>{post.authorRole}</span>}
            <span aria-hidden>·</span>
            <TimeLabel iso={post.createdAt} />
            {post.editedAt ? (
              <span data-testid={`edited-${post.id}`}>{t("community.social.edited")}</span>
            ) : null}
            {post.groupName ? (
              <>
                <span aria-hidden>·</span>
                <span>{post.groupName}</span>
              </>
            ) : null}
          </p>
        </div>
        {mine || (moderator && post.status === "approved") ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("community.actions")}
                data-testid={`post-menu-${post.id}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {mine ? (
                <DropdownMenuItem
                  data-testid={`edit-post-${post.id}`}
                  onClick={() => {
                    setEditBody(post.body);
                    setEditTags(post.tags.map((tag) => ({ ...tag, role: "" })));
                    setEditShares([]);
                    setRemoveMedia(false);
                    setNextFile(null);
                    setEditing(true);
                  }}
                >
                  {t("community.social.editPost")}
                </DropdownMenuItem>
              ) : null}
              {mine ? (
                <DropdownMenuItem
                  data-testid={`delete-post-${post.id}`}
                  onClick={() => setConfirming(true)}
                >
                  {t("community.social.deletePost")}
                </DropdownMenuItem>
              ) : null}
              {moderator && post.status === "approved" ? (
                <DropdownMenuItem onClick={() => onRemove?.(post.id)}>
                  {t("community.social.remove")}
                </DropdownMenuItem>
              ) : null}
              {moderator && post.status === "approved" ? (
                <DropdownMenuItem onClick={() => onSuspend?.(post.authorId)}>
                  {t("community.social.suspend")}
                </DropdownMenuItem>
              ) : null}
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
      {post.tags.length ? (
        <p className="px-4 pb-2 text-[11px] text-muted-foreground" data-testid={`tags-${post.id}`}>
          {t("community.social.taggedWith", {
            names: post.tags.map((tag) => tag.name).join(", "),
          })}
        </p>
      ) : null}
      {taggedMe ? (
        <div className="px-4 pb-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid={`remove-tag-${post.id}`}
            onClick={() => {
              void social
                .untag(post.id)
                .then(() => {
                  toast.success(t("community.social.tagRemoved"));
                  onChanged?.();
                })
                .catch((err) => toast.error(communityErrorText(t, err)));
            }}
          >
            {t("community.social.removeTag")}
          </Button>
        </div>
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
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("community.social.editTitle")}</DialogTitle>
            <DialogDescription>{t("community.social.editSaved")}</DialogDescription>
          </DialogHeader>
          <Textarea
            data-testid={`edit-body-${post.id}`}
            value={editBody}
            onChange={(event) => setEditBody(event.target.value)}
            rows={4}
          />
          {post.media && !removeMedia && !nextFile ? (
            <Button type="button" variant="outline" onClick={() => setRemoveMedia(true)}>
              {t("community.social.removeMedia")}
            </Button>
          ) : null}
          {social.media !== "none" ? (
            <label className="text-xs font-semibold text-primary">
              {t("community.social.replaceMedia")}
              <input
                data-testid={`edit-media-${post.id}`}
                type="file"
                accept="image/*,video/*"
                className="mt-1 block w-full text-xs"
                onChange={(event) => setNextFile(event.target.files?.[0] ?? null)}
              />
            </label>
          ) : null}
          <PersonPicker
            groupId={post.groupId}
            tags={editTags}
            shares={editShares}
            onTags={setEditTags}
            onShares={setEditShares}
            testPrefix="edit-"
          />
          <Button
            type="button"
            data-testid={`save-edit-${post.id}`}
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void (async () => {
                try {
                  let uploadId: string | undefined;
                  if (nextFile) {
                    const prepared = await prepareCommunityFile(nextFile);
                    uploadId = await social.uploadImage(prepared);
                  }
                  await social.editPost(post.id, {
                    body: editBody,
                    tagUserIds: editTags.map((person) => person.userId),
                    ...(editShares.length
                      ? { shareUserIds: editShares.map((person) => person.userId) }
                      : {}),
                    ...(removeMedia ? { removeMedia: true } : {}),
                    ...(uploadId ? { uploadId, consent: true } : {}),
                  });
                  toast.success(t("community.social.editSaved"));
                  setEditing(false);
                  onChanged?.();
                } catch (err) {
                  toast.error(communityErrorText(t, err));
                } finally {
                  setSaving(false);
                }
              })();
            }}
          >
            {t("community.social.saveEdit")}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("community.social.deletePostTitle")}</DialogTitle>
            <DialogDescription>{t("community.social.deletePostBody")}</DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="destructive"
            data-testid={`confirm-delete-${post.id}`}
            onClick={() => {
              void social
                .deletePost(post.id)
                .then(() => {
                  toast.success(t("community.social.postDeleted"));
                  setConfirming(false);
                  onChanged?.();
                })
                .catch((err) => toast.error(communityErrorText(t, err)));
            }}
          >
            {t("community.social.deletePostConfirm")}
          </Button>
        </DialogContent>
      </Dialog>
    </article>
  );
}
