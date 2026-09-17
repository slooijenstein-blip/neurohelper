import { useState } from "react";
import { Heart, MessageCircle, UserPlus, UserCheck, CalendarDays, Clock } from "lucide-react";

import { useAppStore, type Post } from "@/lib/app-store";
import { RoleTag, ProfileAvatar } from "./ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActivityDetailDialog } from "./ActivityDetailDialog";
import { cn } from "@/lib/utils";

export function PostDetailDialog({
  post,
  onClose,
  onLike,
  onComment,
  onOpenProfile,
}: {
  post: Post | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
  onOpenProfile: (id: string) => void;
}) {
  const { state, tryTemplate, toggleFollow, isFollowing } = useAppStore();
  const [comment, setComment] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);

  if (!post) return null;

  const author =
    state.members.find((m) => m.id === post.authorId) ??
    (state.profile?.id === post.authorId ? state.profile : null);
  const isMe = state.profile?.id === post.authorId;
  const following = isFollowing(post.authorId);
  const templates = state.templates.filter((t) => t.ownerId === post.authorId && t.isPublic);

  return (
    <>
      <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">{post.authorName}'s post</DialogTitle>
            <DialogDescription>
              {post.kind} · {post.createdAt}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <ProfileAvatar name={post.authorName} color={author?.color ?? "bg-primary"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{post.authorName}</p>
              <p className="text-[11px] text-muted-foreground">
                <RoleTag role={post.authorRole} /> · {post.authorLocation}
              </p>
            </div>
            {!isMe ? (
              <Button
                size="sm"
                variant={following ? "outline" : "default"}
                className="h-7"
                onClick={() => toggleFollow(post.authorId)}
              >
                {following ? (
                  <>
                    <UserCheck className="size-3.5" /> Following
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5" /> Follow
                  </>
                )}
              </Button>
            ) : null}
          </div>

          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
            {post.body}
          </pre>

          {templates.length ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Shared schedules
              </p>
              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarDays className="size-3" /> {t.items.length} activities
                    <span className="mx-1">·</span>
                    <Clock className="size-3" />
                    {t.items.reduce((a, i) => a + i.minutes, 0)} mins
                  </div>
                  <ol className="mt-2 list-inside list-decimal space-y-0.5 text-xs text-muted-foreground">
                    {t.items.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => setActivityId(i.activityId)}
                          className="text-left underline-offset-2 hover:text-primary hover:underline"
                        >
                          {i.title} ({i.minutes} mins)
                        </button>
                      </li>
                    ))}
                  </ol>
                  <Button
                    size="sm"
                    className="mt-2 h-7 w-full"
                    onClick={() => tryTemplate(t.id)}
                  >
                    Try this schedule
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={() => onLike(post.id)}
              className={cn("flex items-center gap-1", post.liked && "text-primary")}
            >
              <Heart className={cn("size-3.5", post.liked && "fill-current")} /> {post.likes} Likes
            </button>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3.5" /> {post.comments.length} Comments
            </span>
          </div>

          {post.comments.length ? (
            <div className="space-y-1 border-l-2 border-border pl-3">
              {post.comments.map((c) => (
                <p key={c.id} className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.authorName}</span>: {c.text}
                </p>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8"
              onClick={() => {
                if (!comment.trim()) return;
                onComment(post.id, comment.trim());
                setComment("");
              }}
            >
              Send
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              onClose();
              onOpenProfile(post.authorId);
            }}
          >
            View full profile
          </Button>
        </DialogContent>
      </Dialog>

      <ActivityDetailDialog activityId={activityId} onClose={() => setActivityId(null)} />
    </>
  );
}
