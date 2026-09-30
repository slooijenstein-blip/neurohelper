import { useI18n } from "@/i18n/I18nProvider";
import { COMMUNITY_STORIES } from "@/lib/community";
import type { MyStory } from "@/lib/community-local";
import { useAppStore } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "../ui-bits";

export function StoriesStrip({
  myStory,
  seen,
  onOpen,
}: {
  myStory: MyStory | null;
  seen: string[];
  onOpen: (index: number) => void;
}) {
  const { t } = useI18n();
  const { state } = useAppStore();
  const me = state.profile;

  return (
    <div className="px-4 pt-3" aria-label={t("community.storiesLabel")}>
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        <StoryBubble
          testId="story-your"
          label={t("community.yourStory")}
          name={me?.name ?? t("community.yourStory")}
          color={me?.color ?? "bg-primary"}
          unseen={!!myStory}
          dashed={!myStory}
          plus={!myStory}
          onClick={() => onOpen(0)}
        />
        {COMMUNITY_STORIES.map((story, index) => {
          const author = state.members.find((member) => member.id === story.authorId);
          return (
            <StoryBubble
              key={story.id}
              testId={`story-${story.authorId}`}
              label={author?.name ?? story.authorId}
              name={author?.name ?? story.authorId}
              color={author?.color ?? "bg-primary"}
              unseen={!seen.includes(story.id)}
              onClick={() => onOpen(index + 1)}
            />
          );
        })}
      </div>
    </div>
  );
}

function StoryBubble({
  label,
  name,
  color,
  unseen,
  dashed,
  plus,
  onClick,
  testId,
}: {
  label: string;
  name: string;
  color: string;
  unseen: boolean;
  dashed?: boolean;
  plus?: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex w-20 shrink-0 flex-col items-center gap-1"
    >
      <span className="relative">
        <span
          className={cn(
            "block rounded-full p-[2px]",
            dashed
              ? "bg-border"
              : unseen
                ? "bg-gradient-to-tr from-primary via-warm to-primary"
                : "bg-border",
          )}
        >
          <span
            className={cn(
              "block rounded-full bg-card p-[2px]",
              dashed && "border border-dashed border-muted-foreground/40",
            )}
          >
            <ProfileAvatar name={name} color={color} />
          </span>
        </span>
        {plus ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[11px] font-bold leading-none text-primary-foreground ring-2 ring-card">
            +
          </span>
        ) : null}
      </span>
      <span className="line-clamp-2 w-full text-center text-[10px] font-semibold leading-tight text-foreground">
        {label}
      </span>
    </button>
  );
}
