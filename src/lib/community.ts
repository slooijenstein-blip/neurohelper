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

export type TextPart = { type: "text"; value: string } | { type: "tag"; value: string };

const HASHTAG = /#[\p{L}\p{N}_]+/gu;

/** Any #word in the text. There is no approved list. */
export function splitHashtags(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(HASHTAG)) {
    const index = match.index ?? 0;
    const prev = index > 0 ? text[index - 1] : "";
    if (prev && /[\p{L}\p{N}_]/u.test(prev)) continue;
    if (index > last) parts.push({ type: "text", value: text.slice(last, index) });
    parts.push({ type: "tag", value: match[0].slice(1) });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  if (!parts.length) parts.push({ type: "text", value: text });
  return parts;
}

export function hashtagsIn(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of splitHashtags(text)) {
    if (part.type !== "tag") continue;
    const key = part.value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(key);
  }
  return tags;
}

export function postMatchesHashtag(body: string, tag: string | null): boolean {
  if (!tag) return true;
  return hashtagsIn(body).includes(tag.toLocaleLowerCase());
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
