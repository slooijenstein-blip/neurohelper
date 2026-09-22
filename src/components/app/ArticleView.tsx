import { ArrowLeft, Clock, Heart } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import { useAppStore } from "@/lib/app-store";
import { ScreenHeader, ProfileAvatar, RoleTag } from "./ui-bits";
import { cn } from "@/lib/utils";

export function ArticleView({
  id,
  onBack,
  onProfile,
}: {
  id: string;
  onBack: () => void;
  onProfile: (authorId: string) => void;
}) {
  const { state, update } = useAppStore();
  const { t } = useI18n();
  const article = state.articles.find((a) => a.id === id);
  if (!article) return null;

  const author =
    state.members.find((m) => m.id === article.authorId) ??
    (state.profile?.id === article.authorId ? state.profile : null);

  const toggleLike = () =>
    update((prev) => ({
      ...prev,
      articles: prev.articles.map((a) =>
        a.id === article.id ? { ...a, liked: !a.liked, likes: a.likes + (a.liked ? -1 : 1) } : a,
      ),
    }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("article.title")}
        right={
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> {t("common.back")}
          </button>
        }
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface px-5 py-4 md:max-w-3xl md:px-8">
        <div className="soft-card p-4">
          <h3 className="text-base font-bold leading-snug">{article.title}</h3>
          <button
            type="button"
            onClick={() => onProfile(article.authorId)}
            className="mt-3 flex items-center gap-2 text-left"
          >
            <ProfileAvatar
              name={article.authorName}
              color={author?.color ?? "bg-primary"}
              size="sm"
            />
            <div>
              <p className="text-sm font-semibold">{article.authorName}</p>
              <p className="text-[11px] text-muted-foreground">
                <RoleTag role={article.authorRole} /> · {article.createdAt}
              </p>
            </div>
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {article.readMinutes} min read
            </span>
            {article.tags.map((t) => (
              <span key={t} className="tag-base bg-accent text-accent-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="soft-card p-4">
          <div className="space-y-2">
            {article.body.split("\n").map((line, i) => {
              const heading = line.match(/^\*\*(.+)\*\*$/);
              if (heading)
                return (
                  <p key={i} className="pt-2 text-xs font-bold text-foreground">
                    {heading[1]}
                  </p>
                );
              if (!line.trim()) return null;
              return (
                <p key={i} className="text-xs leading-relaxed text-muted-foreground">
                  {line}
                </p>
              );
            })}
          </div>
          <button
            type="button"
            onClick={toggleLike}
            className={cn(
              "mt-4 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground",
              article.liked && "text-primary",
            )}
          >
            <Heart className={cn("size-3.5", article.liked && "fill-current")} />
            {article.likes} Likes
          </button>
        </div>
      </div>
    </div>
  );
}
