import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hashtagsIn,
  postMatchesHashtag,
  postTimeParts,
  plainPostBody,
  splitHashtags,
} from "./community.ts";
import { stripCommunitySamples } from "./community-samples.ts";

describe("community feed", () => {
  const now = new Date(2026, 8, 30, 9, 0, 0);

  it("reads any hashtag and ignores a fixed topic list", () => {
    assert.deepEqual(hashtagsIn("A quiet hour #autism #ADHD #autism"), ["autism", "adhd"]);
    assert.deepEqual(
      splitHashtags("Hello #calma").map((part) => part.type),
      ["text", "tag"],
    );
    assert.equal(postMatchesHashtag("Evening song #autism", null), true);
    assert.equal(postMatchesHashtag("Evening song #autism", "autism"), true);
    assert.equal(postMatchesHashtag("Evening song #Autism", "autism"), true);
    assert.equal(postMatchesHashtag("No tag here", "wins"), false);
    assert.equal(postMatchesHashtag("email well#adhd", "adhd"), false);
  });

  it("describes how long ago a post was", () => {
    assert.equal(
      postTimeParts(new Date(2026, 8, 30, 8, 59, 30).toISOString(), now).kind,
      "justNow",
    );
    assert.deepEqual(postTimeParts(new Date(2026, 8, 30, 8, 40, 0).toISOString(), now), {
      kind: "minutes",
      count: 20,
    });
    assert.deepEqual(postTimeParts(new Date(2026, 8, 30, 6, 0, 0).toISOString(), now), {
      kind: "hours",
      count: 3,
    });
    assert.equal(
      postTimeParts(new Date(2026, 8, 29, 8, 0, 0).toISOString(), now).kind,
      "yesterday",
    );
    assert.equal(postTimeParts("2026-09-10", now).kind, "date");
  });

  it("strips bold marks from shared routine text", () => {
    assert.equal(plainPostBody("I shared **My Routine**"), "I shared My Routine");
  });

  it("drops made-up community people and keeps a real post", () => {
    const stripped = stripCommunitySamples({
      posts: [
        {
          id: "p-down-priya",
          authorId: "priya",
          bodyKey: "community.seed.down",
          comments: [],
        },
        {
          id: "post-real",
          authorId: "user_sam",
          comments: [{ authorId: "maya" }, { authorId: "user_sam" }],
        },
      ],
      articles: [
        { id: "a1", authorId: "elena" },
        { id: "article-real", authorId: "user_sam" },
      ],
      members: [
        { id: "priya", followers: ["user_sam"] },
        { id: "user_sam", followers: ["priya", "user_friend"] },
      ],
      templates: [
        {
          id: "tpl-fine-motor",
          ownerId: "maya",
          isPublic: true,
          likes: 6,
        },
        {
          id: "tpl-morning",
          ownerId: "me",
          isPublic: true,
          likes: 14,
          liked: true,
          ratings: [5],
          tries: 3,
        },
        {
          id: "tpl-mine",
          ownerId: "me",
          isPublic: true,
          likes: 2,
        },
      ],
      following: ["maya", "user_friend"],
      profile: { followers: ["jonas", "user_friend"] },
    });
    assert.deepEqual(
      stripped.posts.map((post) => post.id),
      ["post-real"],
    );
    assert.deepEqual(
      stripped.posts[0]?.comments.map((comment) => comment.authorId),
      ["user_sam"],
    );
    assert.deepEqual(
      stripped.articles.map((article) => article.id),
      ["article-real"],
    );
    assert.deepEqual(
      stripped.members.map((member) => member.id),
      ["user_sam"],
    );
    assert.deepEqual(stripped.members[0]?.followers, ["user_friend"]);
    assert.deepEqual(
      stripped.templates.map((template) => template.id),
      ["tpl-morning", "tpl-mine"],
    );
    assert.equal(stripped.templates[0]?.isPublic, false);
    assert.equal(stripped.templates[0]?.likes, 0);
    assert.equal(stripped.templates[1]?.isPublic, true);
    assert.equal(stripped.templates[1]?.likes, 2);
    assert.deepEqual(stripped.following, ["user_friend"]);
    assert.deepEqual(stripped.profile?.followers, ["user_friend"]);
  });
});
