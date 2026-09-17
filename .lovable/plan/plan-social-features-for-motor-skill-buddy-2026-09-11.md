# Plan: Social Features for Motor Skill Buddy

## Goal
Make the community feel more like a social feed while adding rich discussion to articles.

## What we'll build

### 1. Threaded article comments
- Add a `comments` array to each `Article` in the store (same shape as post comments, plus `parentId`).
- In `ArticleView.tsx`, render a nested comment tree under the article body.
- Add a "Reply" button on each comment that opens a small input for a threaded reply.
- Allow top-level comments on the article itself.

### 2. Reactions beyond likes
- Add a `reactions` map to `Post` and `Article` (e.g. `{ heart: 3, clap: 1, helpful: 2 }`).
- Show a compact reaction picker (heart, clap, celebrate, helpful) next to the existing like button.
- Track which reactions the current user has already added.
- Keep the existing like count or fold it into the heart reaction.

### 3. Reposts / shares
- Add a `reposts` array to `Post` storing `{ authorId, authorName, createdAt, note? }`.
- Add a "Repost" action on posts and public schedules that lets the demo user add a short note and re-share it to the feed.
- Reposted items appear in the feed with the original content and the re-sharer's note.

### 4. Trending / hashtags
- Auto-extract hashtags (`#word`) from post bodies.
- Show a "Trending" section at the top of the Community tab with the most-used hashtags and a tap-to-filter behavior.
- Filtered feed shows only posts containing the selected hashtag.

### 5. Follower / following counts on profiles
- On each member/profile card, display follower count and following count.
- Update counts automatically when the demo user follows/unfollows someone.

## Files to change
- `src/lib/app-store.tsx` — extend `Article`, `Post`, `Member` types and seed data.
- `src/components/app/ArticleView.tsx` — add threaded comments UI.
- `src/components/app/CommunityTab.tsx` — add reactions, repost, trending hashtags.
- `src/components/app/PostDetailDialog.tsx` — add reactions and repost actions inside the post detail.
- `src/components/app/ProfileView.tsx` — show follower/following counts.
- `src/components/app/ui-bits.tsx` — possibly add a small `ReactionBar` helper.

## Out of scope (unless you say otherwise)
- Real image uploads in posts.
- Notifications bell.
- Public profile wall comments.

## Validation
- `bunx tsgo --noEmit`
- Playwright check that comments, reactions, reposts, and hashtag filtering work.
