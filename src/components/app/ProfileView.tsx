import { useMemo, useState } from "react";
import {
  Clock,
  MapPin,
  ArrowLeft,
  CalendarDays,
  BookmarkCheck,
  Sparkles,
  UserPlus,
  UserCheck,
} from "lucide-react";

import { useAppStore } from "@/lib/app-store";
import { ScreenHeader, ProfileAvatar, RoleTag, SocialBar, SkillTag } from "./ui-bits";
import { Button } from "@/components/ui/button";
import { ActivityDetailDialog } from "./ActivityDetailDialog";
import { cn } from "@/lib/utils";

export function ProfileView({
  id,
  onBack,
  onArticle,
}: {
  id: string;
  onBack: () => void;
  onArticle?: (articleId: string) => void;
}) {
  const { state, tryTemplate, toggleFollow, isFollowing } = useAppStore();
  const [showing, setShowing] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);

  const member = state.members.find((m) => m.id === id) ?? state.profile;
  if (!member) return null;

  const publicTemplates = state.templates.filter(
    (t) => t.ownerId === member.id && t.isPublic,
  );
  const publicPosts = state.posts.filter((p) => p.authorId === member.id);
  const memberArticles = state.articles.filter((a) => a.authorId === member.id);

  const load = (templateId: string) => {
    tryTemplate(templateId);
    setShowing(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title="Profile"
        right={
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        }
      />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface px-5 py-4 md:max-w-3xl md:px-8">
        <div className="soft-card flex flex-col items-center p-5 text-center">
          <ProfileAvatar name={member.name} color={member.color} size="lg" />
          <h3 className="mt-3 text-lg font-bold">{member.name}</h3>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <RoleTag role={member.role} />
            {member.location ? (
              <span className="tag-base bg-muted text-muted-foreground">
                <MapPin className="mr-1 inline size-3" />
                {member.location}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{member.bio}</p>
          {state.profile?.id !== member.id ? (
            <Button
              size="sm"
              variant={isFollowing(member.id) ? "outline" : "default"}
              className="mt-3 w-full"
              onClick={() => toggleFollow(member.id)}
            >
              {isFollowing(member.id) ? (
                <>
                  <UserCheck className="size-4" /> Following
                </>
              ) : (
                <>
                  <UserPlus className="size-4" /> Follow {member.name.split(" ")[0]}
                </>
              )}
            </Button>
          ) : null}
          <SocialBar socials={member.socials} className="mt-3 justify-center" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="soft-card p-4">
            <BookmarkCheck className="mb-1 size-5 text-primary" />
            <p className="text-2xl font-bold">{publicTemplates.length}</p>
            <p className="text-[11px] text-muted-foreground">Public routines</p>
          </div>
          <div className="soft-card p-4">
            <Sparkles className="mb-1 size-5 text-warm" />
            <p className="text-2xl font-bold">{publicPosts.length}</p>
            <p className="text-[11px] text-muted-foreground">Posts shared</p>
          </div>
        </div>

        {memberArticles.length ? (
          <div className="soft-card p-4">
            <h4 className="mb-2 text-sm font-semibold">Articles</h4>
            <div className="space-y-2">
              {memberArticles.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onArticle?.(a.id)}
                  className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary"
                >
                  <p className="text-sm font-semibold leading-snug">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{a.excerpt}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {a.readMinutes} min read · {a.likes} likes
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {publicTemplates.length ? (
          <div className="soft-card p-4">
            <h4 className="mb-2 text-sm font-semibold">Public routines</h4>
            <div className="space-y-2">
              {publicTemplates.map((t) => (
                <div key={t.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <span className="tag-base bg-success/15 text-success">Public</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarDays className="size-3" /> {t.items.length} activities
                    <span className="mx-1">·</span>
                    <Clock className="size-3" />
                    {t.items.reduce((a, i) => a + i.minutes, 0)} mins
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1"
                      onClick={() => setShowing(showing === t.id ? null : t.id)}
                    >
                      {showing === t.id ? "Hide" : "View"}
                    </Button>
                    <Button size="sm" className="h-7 flex-1" onClick={() => load(t.id)}>
                      Try it
                    </Button>
                  </div>
                  {showing === t.id ? (
                    <ol className="mt-2 space-y-1 border-t border-border pt-2">
                      {t.items.map((i) => (
                        <li key={i.id} className="text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => setActivityId(i.activityId)}
                            className="text-left underline-offset-2 hover:text-primary hover:underline"
                          >
                            <span className="font-semibold text-foreground">{i.title}</span> ({i.minutes} mins)
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {publicPosts.length ? (
          <div className="soft-card p-4">
            <h4 className="mb-2 text-sm font-semibold">Latest posts</h4>
            <div className="space-y-2">
              {publicPosts.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="tag-base bg-accent text-accent-foreground">{p.kind}</span>
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                    {p.body}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {member.favouriteActivityIds?.length ? (
          <div className="soft-card p-4">
            <h4 className="mb-2 text-sm font-semibold">Favourite activities</h4>
            <div className="flex flex-wrap gap-1.5">
              {member.favouriteActivityIds.map((aid: string) => {
                const act = state.activities.find((a) => a.id === aid);
                if (!act) return null;
                return <SkillTag key={aid} skill={act.skill} />;
              })}
            </div>
          </div>
        ) : null}
      </div>

      <ActivityDetailDialog activityId={activityId} onClose={() => setActivityId(null)} />
    </div>
  );
}
