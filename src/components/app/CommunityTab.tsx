import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Heart,
  MessageCircle,
  PenSquare,
  Search,
  UserCircle2,
  CalendarDays,
  User,
  Users,
  UserPlus,
  UserCheck,
} from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import { useAppStore, uid, type Comment, type Article } from "@/lib/app-store";
import { ScreenHeader, RoleTag, ProfileAvatar } from "./ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActivityDetailDialog } from "./ActivityDetailDialog";
import { PostDetailDialog } from "./PostDetailDialog";
import { cn } from "@/lib/utils";

export function CommunityTab({
  onProfile,
  onArticle,
}: {
  onProfile: (id: string) => void;
  onArticle: (id: string) => void;
}) {
  const { state, update, tryTemplate, toggleFollow, isFollowing } = useAppStore();
  const { t } = useI18n();
  const [postId, setPostId] = useState<string | null>(null);
  const [tab, setTab] = useState<"posts" | "articles" | "schedules" | "following">("posts");
  const [articleOpen, setArticleOpen] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aTags, setATags] = useState("");
  const [aBody, setABody] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);

  const posts = useMemo(
    () =>
      state.posts.filter((p) =>
        query.trim()
          ? p.body.toLowerCase().includes(query.trim().toLowerCase()) ||
            p.authorName.toLowerCase().includes(query.trim().toLowerCase())
          : true,
      ),
    [state.posts, query],
  );

  const publicTemplates = state.templates.filter((t) => t.isPublic);

  const followedMembers = state.members.filter((m) => isFollowing(m.id));

  const toggleLike = (id: string) =>
    update((prev) => ({
      ...prev,
      posts: prev.posts.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p,
      ),
    }));

  const addComment = (id: string) => {
    if (!comment.trim() || !state.profile) return;
    const c: Comment = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      text: comment.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    update((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === id ? { ...p, comments: [...p.comments, c] } : p)),
    }));
    setComment("");
    setCommentFor(null);
  };

  const addCommentText = (id: string, text: string) => {
    if (!state.profile) return;
    const c: Comment = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      text,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    update((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === id ? { ...p, comments: [...p.comments, c] } : p)),
    }));
  };

  const articles = useMemo(
    () =>
      state.articles.filter((a) =>
        query.trim()
          ? a.title.toLowerCase().includes(query.trim().toLowerCase()) ||
            a.authorName.toLowerCase().includes(query.trim().toLowerCase()) ||
            a.tags.some((t) => t.toLowerCase().includes(query.trim().toLowerCase()))
          : true,
      ),
    [state.articles, query],
  );

  const publishArticle = () => {
    if (!aTitle.trim() || !aBody.trim() || !state.profile) return;
    const words = aBody.trim().split(/\s+/).length;
    const article: Article = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      title: aTitle.trim(),
      excerpt: aBody.trim().slice(0, 140),
      body: aBody.trim(),
      tags: aTags
        .split(",")
        .map((t) => t.trim())
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
    setATitle("");
    setATags("");
    setABody("");
    setArticleOpen(false);
    toast.success("Article published");
  };

  const publish = () => {
    if (!body.trim() || !state.profile) return;
    const post = {
      id: uid(),
      authorId: state.profile.id,
      authorName: state.profile.name,
      authorRole: state.profile.role,
      authorLocation: state.profile.location,
      kind: "Story" as const,
      body: body.trim(),
      likes: 0,
      liked: false,
      reactions: {},
      myReactions: [],
      comments: [],
      reposts: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };

    update((prev) => ({ ...prev, posts: [post, ...prev.posts] }));
    setBody("");
    setOpen(false);
    toast.success(t("community.posted"));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader title={t("community.title")} subtitle={t("community.subtitle")} />

      <div className="space-y-3 border-b border-border bg-surface px-5 py-3 md:px-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts or members..."
              className="h-9 rounded-full bg-card pl-9 text-sm"
            />
          </div>
          <Button
            className="h-9 rounded-full"
            onClick={() => (tab === "articles" ? setArticleOpen(true) : setOpen(true))}
          >
            <PenSquare className="size-4" /> {tab === "articles" ? "Write" : "Post"}
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-full bg-muted p-1">
          {(["posts", "articles", "schedules", "following"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full py-1.5 text-[11px] font-semibold capitalize transition-colors",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="hide-scrollbar grid min-h-0 flex-1 content-start gap-3 overflow-y-auto bg-surface px-5 py-4 md:grid-cols-2 md:gap-4 md:px-8">
        {tab === "posts"
          ? posts.map((p) => (
              <div key={p.id} className="soft-card p-4">
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => onProfile(p.authorId)}
                    className="flex items-center gap-2 text-left"
                  >
                    <ProfileAvatar
                      name={p.authorName}
                      color={
                        state.members.find((m) => m.id === p.authorId)?.color ??
                        (state.profile?.id === p.authorId ? state.profile.color : "bg-primary")
                      }
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-semibold">{p.authorName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        <RoleTag role={p.authorRole} /> · {p.authorLocation}
                      </p>
                    </div>
                  </button>
                  {state.profile?.id === p.authorId ? (
                    <span className="tag-base bg-accent text-accent-foreground">{p.kind}</span>
                  ) : (
                    <Button
                      size="sm"
                      variant={isFollowing(p.authorId) ? "outline" : "default"}
                      className="h-7"
                      onClick={() => toggleFollow(p.authorId)}
                    >
                      {isFollowing(p.authorId) ? (
                        <>
                          <UserCheck className="size-3.5" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="size-3.5" /> Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <button type="button" onClick={() => setPostId(p.id)} className="w-full text-left">
                  <pre className="mt-3 line-clamp-4 whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                    {p.body}
                  </pre>
                  <p className="mt-2 text-[11px] font-semibold text-primary">
                    Open post & {p.authorName.split(" ")[0]}'s shared schedules →
                  </p>
                </button>
                <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleLike(p.id)}
                    className={cn("flex items-center gap-1", p.liked && "text-primary")}
                  >
                    <Heart className={cn("size-3.5", p.liked && "fill-current")} /> {p.likes} Likes
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentFor(commentFor === p.id ? null : p.id)}
                    className="flex items-center gap-1"
                  >
                    <MessageCircle className="size-3.5" /> {p.comments.length} Comments
                  </button>
                </div>
                {p.comments.length ? (
                  <div className="mt-2 space-y-1 border-l-2 border-border pl-3">
                    {p.comments.map((c) => (
                      <p key={c.id} className="text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => onProfile(c.authorId)}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {c.authorName}
                        </button>
                        : {c.text}
                      </p>
                    ))}
                  </div>
                ) : null}
                {commentFor === p.id ? (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment"
                      className="h-8 text-xs"
                    />
                    <Button size="sm" className="h-8" onClick={() => addComment(p.id)}>
                      Send
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          : null}

        {tab === "articles"
          ? articles.map((a) => (
              <div key={a.id} className="soft-card p-4">
                <button type="button" onClick={() => onArticle(a.id)} className="text-left">
                  <p className="text-sm font-bold leading-snug">{a.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.excerpt}</p>
                </button>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onProfile(a.authorId)}
                    className="flex items-center gap-2 text-left"
                  >
                    <ProfileAvatar
                      name={a.authorName}
                      color={
                        state.members.find((m) => m.id === a.authorId)?.color ??
                        (state.profile?.id === a.authorId ? state.profile.color : "bg-primary")
                      }
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold">{a.authorName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        <RoleTag role={a.authorRole} /> · {a.readMinutes} min read
                      </p>
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => onArticle(a.id)}
                  >
                    Read
                  </Button>
                </div>
              </div>
            ))
          : null}

        {tab === "articles" && !articles.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground md:col-span-2">
            No articles yet.
          </p>
        ) : null}

        {tab === "schedules"
          ? publicTemplates.map((t) => (
              <div key={t.id} className="soft-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <span className="tag-base bg-success/15 text-success">Public</span>
                </div>
                <button
                  type="button"
                  onClick={() => onProfile(t.ownerId)}
                  className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
                >
                  <UserCircle2 className="size-3" />
                  {state.members.find((m) => m.id === t.ownerId)?.name ?? "You"}
                </button>
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
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="h-7 flex-1" onClick={() => tryTemplate(t.id)}>
                    Try this schedule
                  </Button>
                </div>
              </div>
            ))
          : null}

        {tab === "schedules" && !publicTemplates.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground md:col-span-2">
            No shared schedules yet.
          </p>
        ) : null}

        {tab === "following" ? (
          followedMembers.length ? (
            followedMembers.map((m) => {
              const theirPosts = state.posts.filter((p) => p.authorId === m.id);
              return (
                <div key={m.id} className="soft-card p-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onProfile(m.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <ProfileAvatar name={m.name} color={m.color} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          <RoleTag role={m.role} /> · {m.location}
                        </p>
                      </div>
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => toggleFollow(m.id)}
                    >
                      <UserCheck className="size-3.5" /> Following
                    </Button>
                  </div>

                  {theirPosts.length ? (
                    <div className="mt-3 space-y-2">
                      {theirPosts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPostId(p.id)}
                          className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary"
                        >
                          <span className="tag-base bg-accent text-accent-foreground">
                            {p.kind}
                          </span>
                          <pre className="mt-1 line-clamp-3 whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                            {p.body}
                          </pre>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {p.likes} likes · {p.comments.length} comments
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">No posts yet.</p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground md:col-span-2">
              You are not following anyone yet. Tap Follow on a post or profile.
            </p>
          )
        ) : null}
      </div>

      <Dialog open={articleOpen} onOpenChange={setArticleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Write an article</DialogTitle>
            <DialogDescription>
              Share a longer piece about neurodiverse development with the community.
            </DialogDescription>
          </DialogHeader>
          <Input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Title" />
          <Input
            value={aTags}
            onChange={(e) => setATags(e.target.value)}
            placeholder="Tags, comma separated"
          />
          <Textarea
            value={aBody}
            onChange={(e) => setABody(e.target.value)}
            placeholder="Write your article..."
            rows={8}
          />
          <Button onClick={publishArticle}>Publish article</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New post</DialogTitle>
            <DialogDescription>
              Share a win, a question, or a tip with the community.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
          />
          <Button onClick={publish}>Publish</Button>
        </DialogContent>
      </Dialog>

      <ActivityDetailDialog activityId={activityId} onClose={() => setActivityId(null)} />

      <PostDetailDialog
        post={state.posts.find((p) => p.id === postId) ?? null}
        onClose={() => setPostId(null)}
        onLike={toggleLike}
        onComment={addCommentText}
        onOpenProfile={onProfile}
      />
    </div>
  );
}
