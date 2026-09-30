export const COMMUNITY_TOPICS = ["autism", "adhd", "down", "calm", "wins", "tips"] as const;

export type CommunityTopic = (typeof COMMUNITY_TOPICS)[number];

export type CommunityFilter = "all" | CommunityTopic;

export const COMMUNITY_CARDS = ["warm", "calm", "leaf", "sky"] as const;

export type CommunityCard = (typeof COMMUNITY_CARDS)[number];

export const REPORT_REASONS = ["unkind", "privacy", "spam", "other"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type CommunityStory = {
  id: string;
  authorId: string;
  slides: { textKey: string }[];
};

/** Seeded caregiver stories. Copy lives in i18n. No photos. */
export const COMMUNITY_STORIES: CommunityStory[] = [
  {
    id: "story-maya",
    authorId: "maya",
    slides: [{ textKey: "community.story.maya.1" }, { textKey: "community.story.maya.2" }],
  },
  {
    id: "story-jonas",
    authorId: "jonas",
    slides: [{ textKey: "community.story.jonas.1" }, { textKey: "community.story.jonas.2" }],
  },
  {
    id: "story-elena",
    authorId: "elena",
    slides: [{ textKey: "community.story.elena.1" }],
  },
  {
    id: "story-zara",
    authorId: "zara",
    slides: [{ textKey: "community.story.zara.1" }, { textKey: "community.story.zara.2" }],
  },
  {
    id: "story-priya",
    authorId: "priya",
    slides: [{ textKey: "community.story.priya.1" }],
  },
  {
    id: "story-tom",
    authorId: "tom",
    slides: [{ textKey: "community.story.tom.1" }, { textKey: "community.story.tom.2" }],
  },
];

export function isCommunityTopic(value: string): value is CommunityTopic {
  return (COMMUNITY_TOPICS as readonly string[]).includes(value);
}

export function postMatchesTopic(topic: string | undefined, filter: CommunityFilter): boolean {
  if (filter === "all") return true;
  return topic === filter;
}

export function parsePostDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function comparePostsNewestFirst(
  a: { createdAt: string },
  b: { createdAt: string },
): number {
  return parsePostDate(b.createdAt).getTime() - parsePostDate(a.createdAt).getTime();
}

export type PostTime =
  | { kind: "justNow" }
  | { kind: "minutes"; count: number }
  | { kind: "hours"; count: number }
  | { kind: "yesterday" }
  | { kind: "date"; date: Date };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function postTimeParts(iso: string, now: Date): PostTime {
  const date = parsePostDate(iso);
  const diff = now.getTime() - date.getTime();
  if (Number.isNaN(date.getTime()) || diff < MINUTE) return { kind: "justNow" };
  if (diff < HOUR) return { kind: "minutes", count: Math.max(1, Math.floor(diff / MINUTE)) };
  if (diff < 24 * HOUR) return { kind: "hours", count: Math.max(1, Math.floor(diff / HOUR)) };
  if (diff < 48 * HOUR) return { kind: "yesterday" };
  return { kind: "date", date };
}

/** Schedule shares store light markdown. The feed shows the words, not the marks. */
export function plainPostBody(body: string): string {
  return body.replace(/\*\*(.*?)\*\*/g, "$1");
}
