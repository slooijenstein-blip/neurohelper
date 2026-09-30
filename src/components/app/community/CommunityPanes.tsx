import { Search, UserCheck, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { plainPostBody } from "@/lib/community";
import { toDateKey, useAppStore, type Post } from "@/lib/app-store";
import { AddToMyCalendarButton } from "../AddToMyCalendarButton";
import { ProfileAvatar, RoleTag } from "../ui-bits";

function postText(post: Post, t: (key: string) => string) {
  return post.bodyKey ? t(post.bodyKey) : plainPostBody(post.body);
}

export function ArticlesPane({
  query,
  onQuery,
  onWrite,
  onArticle,
  onProfile,
}: {
  query: string;
  onQuery: (value: string) => void;
  onWrite: () => void;
  onArticle: (id: string) => void;
  onProfile: (id: string) => void;
}) {
  const { t } = useI18n();
  const { state } = useAppStore();
  const needle = query.trim().toLowerCase();
  const articles = state.articles.filter((article) =>
    needle
      ? article.title.toLowerCase().includes(needle) ||
        article.authorName.toLowerCase().includes(needle) ||
        article.tags.some((tag) => tag.toLowerCase().includes(needle))
      : true,
  );

  return (
    <div className="px-5 py-4 md:px-8">
      <PaneSearch
        query={query}
        onQuery={onQuery}
        onWrite={onWrite}
        writeLabel={t("community.write")}
      />
      <div className="mt-3 grid content-start gap-3 md:grid-cols-2 md:gap-4">
        {articles.map((article) => (
          <div key={article.id} className="soft-card p-4" data-testid={`article-${article.id}`}>
            <button type="button" onClick={() => onArticle(article.id)} className="text-left">
              <p className="text-sm font-bold leading-snug">{article.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            </button>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onProfile(article.authorId)}
                className="flex min-w-0 items-center gap-2 text-left"
              >
                <ProfileAvatar
                  name={article.authorName}
                  color={memberColor(state, article.authorId)}
                  size="sm"
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{article.authorName}</span>
                  <span className="text-[11px] text-muted-foreground">
                    <RoleTag role={article.authorRole} /> ·{" "}
                    {t("community.readMinutes", { count: article.readMinutes })}
                  </span>
                </span>
              </button>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => onArticle(article.id)}
              >
                {t("profile.view")}
              </Button>
            </div>
          </div>
        ))}
        {!articles.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground md:col-span-2">
            {t("community.noArticles")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SchedulesPane({
  onProfile,
  onActivity,
}: {
  onProfile: (id: string) => void;
  onActivity: (id: string) => void;
}) {
  const { t } = useI18n();
  const { state } = useAppStore();
  const today = toDateKey(new Date());
  const templates = state.templates.filter((template) => template.isPublic);

  return (
    <div className="grid content-start gap-3 px-5 py-4 md:grid-cols-2 md:gap-4 md:px-8">
      {templates.map((template) => (
        <div key={template.id} className="soft-card p-4" data-testid={`schedule-${template.id}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{template.name}</p>
            <span className="tag-base bg-success/15 text-success">{t("profile.public")}</span>
          </div>
          <button
            type="button"
            onClick={() => onProfile(template.ownerId)}
            className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            <UserCircle2 className="size-3" />
            {state.members.find((member) => member.id === template.ownerId)?.name ??
              state.profile?.name ??
              ""}
          </button>
          <ol className="mt-2 list-inside list-decimal space-y-0.5 text-xs text-muted-foreground">
            {template.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onActivity(item.activityId)}
                  className="text-left underline-offset-2 hover:text-primary hover:underline"
                >
                  {item.title} ({t("profile.minutes", { count: item.minutes })})
                </button>
              </li>
            ))}
          </ol>
          <AddToMyCalendarButton
            className="mt-3 h-7 w-full"
            testId={`try-schedule-${template.id}`}
            date={today}
            idleLabel={t("community.trySchedule")}
            routine={{
              templateId: template.id,
              name: template.name,
              items: template.items.map((item) => ({
                activityId: item.activityId,
                title: item.title,
                description: item.description,
                minutes: item.minutes,
                time: item.time,
              })),
            }}
          />
        </div>
      ))}
      {!templates.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground md:col-span-2">
          {t("community.noSchedules")}
        </p>
      ) : null}
    </div>
  );
}

export function FollowingPane({
  onProfile,
  onOpenPost,
}: {
  onProfile: (id: string) => void;
  onOpenPost: (id: string) => void;
}) {
  const { t } = useI18n();
  const { state, toggleFollow, isFollowing } = useAppStore();
  const followed = state.members.filter((member) => isFollowing(member.id));

  if (!followed.length) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground md:px-8">
        {t("community.noFollowing")}
      </p>
    );
  }

  return (
    <div className="grid content-start gap-3 px-5 py-4 md:grid-cols-2 md:gap-4 md:px-8">
      {followed.map((member) => {
        const theirPosts = state.posts.filter((post) => post.authorId === member.id);
        return (
          <div key={member.id} className="soft-card p-4" data-testid={`following-${member.id}`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onProfile(member.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <ProfileAvatar name={member.name} color={member.color} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{member.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    <RoleTag role={member.role} /> · {member.location}
                  </span>
                </span>
              </button>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => toggleFollow(member.id)}
              >
                <UserCheck className="size-3.5" /> {t("profile.following")}
              </Button>
            </div>
            {theirPosts.length ? (
              <div className="mt-3 space-y-2">
                {theirPosts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onOpenPost(post.id)}
                    className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary"
                  >
                    <span className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed">
                      {postText(post, t)}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {post.likes} · {post.comments.length}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">{t("community.noPostsYet")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PaneSearch({
  query,
  onQuery,
  onWrite,
  writeLabel,
}: {
  query: string;
  onQuery: (value: string) => void;
  onWrite?: () => void;
  writeLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t("community.search")}
          className="h-9 rounded-full bg-card pl-9 text-sm"
        />
      </div>
      {onWrite && writeLabel ? (
        <Button className="h-9 rounded-full" data-testid="write-article" onClick={onWrite}>
          {writeLabel}
        </Button>
      ) : null}
    </div>
  );
}

function memberColor(state: ReturnType<typeof useAppStore>["state"], authorId: string) {
  return (
    state.members.find((member) => member.id === authorId)?.color ??
    (state.profile?.id === authorId ? state.profile.color : "bg-primary")
  );
}
