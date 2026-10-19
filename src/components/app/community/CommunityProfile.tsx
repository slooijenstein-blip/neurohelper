import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nProvider";
import type { ClientPerson, ClientPost } from "@/lib/community-social/types";
import { cn } from "@/lib/utils";
import { LivePostCard } from "./LivePostCard";
import { useCommunitySocial } from "./social-context";

function PostTile({ post, onOpen }: { post: ClientPost; onOpen: () => void }) {
  const { t } = useI18n();
  const pending = post.status === "pending";
  return (
    <button
      type="button"
      data-testid={`post-tile-${post.id}`}
      className="relative aspect-square overflow-hidden rounded-xl bg-muted text-left"
      onClick={onOpen}
      aria-label={t("community.social.openPost")}
    >
      {post.media?.kind === "image" ? (
        <img src={post.media.url} alt="" className="size-full object-cover" />
      ) : post.media?.kind === "video" ? (
        <span className="grid size-full place-items-center bg-foreground/80 text-background">
          <Play className="size-6" />
        </span>
      ) : (
        <span className="line-clamp-5 p-2 text-[11px] font-semibold leading-snug">{post.body}</span>
      )}
      {pending ? (
        <span
          data-testid="post-in-review"
          className="absolute inset-x-1 bottom-1 rounded-full bg-background/90 px-1.5 py-0.5 text-center text-[10px] font-semibold"
        >
          {t("community.social.inReview")}
        </span>
      ) : null}
    </button>
  );
}

function PostGrid({
  posts,
  empty,
  onOpen,
}: {
  posts: ClientPost[];
  empty: string;
  onOpen: (post: ClientPost) => void;
}) {
  if (!posts.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="grid grid-cols-3 gap-1" data-testid="post-grid">
      {posts.map((post) => (
        <PostTile key={post.id} post={post} onOpen={() => onOpen(post)} />
      ))}
    </div>
  );
}

export function CommunityBoards({
  userId,
  includeShared = false,
}: {
  userId: string;
  includeShared?: boolean;
}) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const [pane, setPane] = useState<"posts" | "tagged">("posts");
  const [posts, setPosts] = useState<ClientPost[]>([]);
  const [tagged, setTagged] = useState<ClientPost[]>([]);
  const [shared, setShared] = useState<ClientPost[]>([]);
  const [open, setOpen] = useState<ClientPost | null>(null);
  const stamp = `${social.posts.length}:${social.group?.posts.length ?? 0}:${social.queue.length}:${social.groupQueue.length}`;

  useEffect(() => {
    if (!social.ready || !social.configured || !userId) return;
    let cancel = false;
    void social.profileOf(userId).then((result) => {
      if (cancel) return;
      setPosts(result.posts);
      setTagged(result.tagged);
    });
    if (includeShared && social.userId === userId) {
      void social.sharedPosts().then((next) => {
        if (!cancel) setShared(next);
      });
    }
    return () => {
      cancel = true;
    };
  }, [includeShared, social, stamp, userId]);

  const tabs = [
    { id: "posts" as const, label: t("community.social.postsTab") },
    { id: "tagged" as const, label: t("community.social.taggedTab") },
  ];

  return (
    <section className="space-y-3" data-testid="community-boards">
      <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={pane === tab.id}
            data-testid={`profile-tab-${tab.id}`}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-semibold",
              pane === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setPane(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {pane === "posts" ? (
        <PostGrid posts={posts} empty={t("community.social.postsEmpty")} onOpen={setOpen} />
      ) : (
        <PostGrid posts={tagged} empty={t("community.social.taggedEmpty")} onOpen={setOpen} />
      )}
      {includeShared && social.userId === userId ? (
        <div data-testid="shared-with-you">
          <h3 className="mb-2 text-sm font-semibold">{t("community.social.sharedTitle")}</h3>
          <PostGrid posts={shared} empty={t("community.social.sharedEmpty")} onOpen={setOpen} />
        </div>
      ) : null}
      <Dialog open={Boolean(open)} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-md"
          data-testid="post-dialog"
        >
          {open ? (
            <LivePostCard
              post={
                posts.find((item) => item.id === open.id) ??
                tagged.find((item) => item.id === open.id) ??
                shared.find((item) => item.id === open.id) ??
                open
              }
              moderator={social.moderator}
              onLike={(id) => void social.toggleLike(id)}
              onComment={(id, text) => void social.comment(id, text)}
              onReport={() => undefined}
              onReportComment={() => undefined}
              onChanged={() => setOpen(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function CommunityProfile({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const [person, setPerson] = useState<ClientPerson | null>(null);

  useEffect(() => {
    if (!social.ready || !social.configured) return;
    let cancel = false;
    void social.profileOf(userId).then((result) => {
      if (!cancel) setPerson(result.person);
    });
    return () => {
      cancel = true;
    };
  }, [social, userId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> {t("common.back")}
        </button>
        <h2 className="truncate text-sm font-semibold" data-testid="community-profile-name">
          {person?.name ?? t("community.social.postsTab")}
        </h2>
      </div>
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface px-4 py-4">
        <CommunityBoards userId={userId} />
      </div>
    </div>
  );
}
