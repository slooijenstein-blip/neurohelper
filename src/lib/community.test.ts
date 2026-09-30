import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hashtagsIn,
  postMatchesHashtag,
  postTimeParts,
  plainPostBody,
  splitHashtags,
} from "./community.ts";

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
});
