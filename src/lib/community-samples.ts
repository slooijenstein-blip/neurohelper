import { demoRolesAllowed } from "./demo-roles.ts";

/** Made-up community people. They are not Clerk accounts. */
export const SAMPLE_MEMBER_IDS = ["maya", "jonas", "priya", "elena", "tom", "zara"] as const;

export const SAMPLE_POST_IDS = [
  "p-down-priya",
  "p-adhd-zara",
  "p-wins-elena",
  "p-autism-jonas",
  "p-calm-tom",
  "p-tips-maya",
] as const;

export const SAMPLE_ARTICLE_IDS = ["a1", "a2", "a3"] as const;

/** Public routines written as if Maya, Jonas, and Priya had posted them. */
export const SAMPLE_TEMPLATE_IDS = ["tpl-fine-motor", "tpl-energy", "tpl-classroom"] as const;

const SAMPLE_MEMBER_SET = new Set<string>(SAMPLE_MEMBER_IDS);
const SAMPLE_POST_SET = new Set<string>(SAMPLE_POST_IDS);
const SAMPLE_ARTICLE_SET = new Set<string>(SAMPLE_ARTICLE_IDS);
const SAMPLE_TEMPLATE_SET = new Set<string>(SAMPLE_TEMPLATE_IDS);

export function isSampleMemberId(id: string): boolean {
  return SAMPLE_MEMBER_SET.has(id);
}

/** Preview and local development keep the sample community. Production does not. */
export function communitySamplesAllowed(hostname: string, dev = false): boolean {
  return dev || demoRolesAllowed(hostname);
}

type SamplePost = {
  id: string;
  authorId: string;
  bodyKey?: string;
  comments: { authorId: string }[];
};
type SampleArticle = { id: string; authorId: string };
type SampleMember = { id: string; followers?: string[] };
type SampleTemplate = {
  id: string;
  ownerId: string;
  isPublic: boolean;
  likes?: number;
  liked?: boolean;
  ratings?: number[];
  tries?: number;
};
type SampleProfile = { followers?: string[] } | null;

export type SampleCommunityState = {
  posts: SamplePost[];
  articles: SampleArticle[];
  members: SampleMember[];
  templates: SampleTemplate[];
  following: string[];
  profile: SampleProfile;
};

function keepFollower(id: string): boolean {
  return !isSampleMemberId(id);
}

/** Drop seeded posts, articles, schedules, likes, and followers from made-up people. */
export function stripCommunitySamples<T extends SampleCommunityState>(state: T): T {
  return {
    ...state,
    posts: state.posts
      .filter(
        (post) =>
          !SAMPLE_POST_SET.has(post.id) &&
          !isSampleMemberId(post.authorId) &&
          !(post.bodyKey && post.bodyKey.startsWith("community.seed.")),
      )
      .map((post) => ({
        ...post,
        comments: post.comments.filter((comment) => keepFollower(comment.authorId)),
      })),
    articles: state.articles.filter(
      (article) => !SAMPLE_ARTICLE_SET.has(article.id) && !isSampleMemberId(article.authorId),
    ),
    members: state.members
      .filter((member) => !isSampleMemberId(member.id))
      .map((member) => ({
        ...member,
        followers: (member.followers ?? []).filter(keepFollower),
      })),
    templates: state.templates
      .filter(
        (template) => !SAMPLE_TEMPLATE_SET.has(template.id) && !isSampleMemberId(template.ownerId),
      )
      .map((template) =>
        template.id === "tpl-morning"
          ? { ...template, isPublic: false, likes: 0, liked: false, ratings: [], tries: 0 }
          : template,
      ),
    following: (state.following ?? []).filter(keepFollower),
    profile: state.profile
      ? { ...state.profile, followers: (state.profile.followers ?? []).filter(keepFollower) }
      : state.profile,
  };
}
