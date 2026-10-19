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
import {
  googleTranslateUrl,
  languageCode,
  sameLanguage,
  translateCommunityText,
  translatorLanguage,
} from "./community-translate.ts";

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

describe("community translate", () => {
  it("maps the app language and builds a free Google Translate link", () => {
    assert.equal(translatorLanguage("es"), "es");
    assert.equal(translatorLanguage("es-ES"), "es");
    assert.equal(translatorLanguage("en"), "en");
    assert.equal(languageCode("es-ES"), "es");
    assert.equal(languageCode("und"), null);
    assert.equal(sameLanguage("en-US", "en"), true);
    assert.equal(sameLanguage("es", "en"), false);
    const url = new URL(googleTranslateUrl("Hola #calma", "en"));
    assert.equal(url.origin + url.pathname, "https://translate.google.com/");
    assert.equal(url.searchParams.get("sl"), "auto");
    assert.equal(url.searchParams.get("tl"), "en");
    assert.equal(url.searchParams.get("text"), "Hola #calma");
  });

  it("uses the on-device translator when the source language is known", async () => {
    const result = await translateCommunityText("We waited.", "es", {
      detect: async () => "en",
      canTranslate: async () => true,
      translate: async (text, source, target) => `${text} (${source}->${target})`,
    });
    assert.deepEqual(result, { kind: "text", text: "We waited. (en->es)" });
  });

  it("leaves a post that is already in the app language", async () => {
    const result = await translateCommunityText("Esperamos.", "es", {
      detect: async () => "es-ES",
      canTranslate: async () => true,
      translate: async () => "should not run",
    });
    assert.deepEqual(result, { kind: "already" });
  });

  it("opens Google Translate when this browser cannot translate", async () => {
    const result = await translateCommunityText("We waited.", "es", {});
    assert.equal(result.kind, "link");
    if (result.kind !== "link") return;
    assert.equal(new URL(result.url).searchParams.get("tl"), "es");
    const failed = await translateCommunityText("Bonjour.", "es", {
      detect: async () => "fr",
      canTranslate: async () => false,
      translate: async () => "should not run",
    });
    assert.equal(failed.kind, "link");
  });
});
