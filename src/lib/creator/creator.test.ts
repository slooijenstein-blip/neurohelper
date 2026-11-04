import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { presentPlanStep } from "../activity-locale.ts";
import { resolveActivity } from "../calendar/activity-steps.ts";
import { FOUNDER_EMAIL } from "../founder-role.ts";
import { createShareDeps, handleShareApi } from "../share/http.ts";
import {
  creatorActivityToCatalog,
  creatorCreditName,
  replacePublishedCreatorActivities,
} from "./catalog.ts";
import { creatorKeyPrefix, metadataWithCreatorPro, parseCreatorInput } from "./rules.ts";

const creator = "user_creator01|alex.rivera@example.com|Alex Rivera|0|1";
const other = "user_other0001|other.pro@example.com|Other Pro|1|1";
const parent = "user_parent001|parent@example.com|Pat Parent|0";
const founder = `user_founder01|${FOUNDER_EMAIL}|Sam|1`;
const stranger = "user_stranger1|stranger@example.com|Stranger|0";

const sample = {
  title: "Bubble turn taking",
  description: "Blow one bubble, then wait for the child to look back before the next.",
  minAge: 1,
  maxAge: 3,
  skill: "Social Skills",
  minutes: 10,
  materials: ["Bubble mix", "Wand"],
  steps: ["Blow one bubble and pause.", "Wait for a look or a reach.", "Blow the next bubble."],
  language: "en",
};

function request(devUser: string | null, pathName: string, method = "GET", body?: unknown) {
  const headers = new Headers();
  if (devUser) headers.set("x-share-dev-user", devUser);
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(body);
  }
  return new Request(`http://localhost${pathName}`, init);
}

function deps() {
  return createShareDeps({ SHARE_STORE: "memory", SHARE_DEV_BYPASS: "1" });
}

describe("creator activity rules", () => {
  it("keeps preview activities out of the production Redis prefix", () => {
    assert.equal(creatorKeyPrefix({ VERCEL_ENV: "preview" }), "synlumae:creator:preview:");
    assert.equal(creatorKeyPrefix({ VERCEL_ENV: "production" }), "synlumae:creator:production:");
    assert.equal(creatorKeyPrefix({}), "synlumae:creator:local:");
  });

  it("turns on Pro when Creator Pro is granted and leaves Pro alone when it is removed", () => {
    const granted = metadataWithCreatorPro({ synlumaeInvite: "invite_1", isPro: false }, true);
    assert.equal(granted["isCreatorPro"], true);
    assert.equal(granted["isPro"], true);
    assert.equal(granted["synlumaeInvite"], "invite_1");
    const removed = metadataWithCreatorPro(granted, false);
    assert.equal(removed["isCreatorPro"], false);
    assert.equal(removed["isPro"], true);
  });

  it("rejects contact details and ages outside 0 to 6", () => {
    assert.equal(parseCreatorInput(sample).minutes, 10);
    assert.throws(() => parseCreatorInput({ ...sample, description: "Email me at a@b.co" }), {
      code: "no_contact",
    });
    assert.throws(() => parseCreatorInput({ ...sample, minAge: 2, maxAge: 1 }), {
      code: "invalid_activity",
    });
    assert.throws(() => parseCreatorInput({ ...sample, maxAge: 8 }), { code: "invalid_activity" });
  });
});

describe("creator activity API", () => {
  it("keeps a new activity private until the founder publishes it, and blocks other editors", async () => {
    const store = deps();
    const denied = await handleShareApi(
      request(parent, "/api/share/creator-activities", "POST", sample),
      store,
    );
    assert.equal(denied.status, 403);

    const created = await handleShareApi(
      request(creator, "/api/share/creator-activities", "POST", sample),
      store,
    );
    assert.equal(created.status, 201);
    const body = (await created.json()) as {
      activity: { id: string; status: string; ownerId: string; ownerName: string };
    };
    assert.equal(body.activity.status, "pending");
    assert.equal(body.activity.ownerId, "user_creator01");
    assert.equal(body.activity.ownerName, "Alex Rivera");
    const id = body.activity.id;

    const published = await handleShareApi(request(null, "/api/share/creator-activities"), store);
    const publicBody = (await published.json()) as { activities: unknown[] };
    assert.equal(publicBody.activities.length, 0);

    const hidden = await handleShareApi(
      request(stranger, `/api/share/creator-activities/${id}`),
      store,
    );
    assert.equal(hidden.status, 404);

    const peek = await handleShareApi(
      request(founder, `/api/share/creator-activities/${id}`),
      store,
    );
    assert.equal(peek.status, 200);

    const editedByOther = await handleShareApi(
      request(other, `/api/share/creator-activities/${id}`, "PATCH", {
        ...sample,
        title: "Taken over",
      }),
      store,
    );
    assert.equal(editedByOther.status, 403);

    const deletedByFounder = await handleShareApi(
      request(founder, `/api/share/creator-activities/${id}`, "DELETE"),
      store,
    );
    assert.equal(deletedByFounder.status, 403);

    const queue = await handleShareApi(
      request(founder, "/api/share/creator-activities?scope=review"),
      store,
    );
    const waiting = (await queue.json()) as { activities: Array<{ id: string }> };
    assert.equal(
      waiting.activities.some((item) => item.id === id),
      true,
    );
    const parentQueue = await handleShareApi(
      request(parent, "/api/share/creator-activities?scope=review"),
      store,
    );
    assert.equal(parentQueue.status, 403);

    const rejected = await handleShareApi(
      request(founder, `/api/share/creator-activities/${id}/review`, "POST", {
        decision: "reject",
        note: "Add one more pause.",
      }),
      store,
    );
    assert.equal(rejected.status, 200);
    const rejectedBody = (await rejected.json()) as {
      activity: { status: string; reviewNote: string };
    };
    assert.equal(rejectedBody.activity.status, "rejected");
    assert.equal(rejectedBody.activity.reviewNote, "Add one more pause.");

    const approved = await handleShareApi(
      request(founder, `/api/share/creator-activities/${id}/review`, "POST", {
        decision: "approve",
        note: "",
      }),
      store,
    );
    const approvedBody = (await approved.json()) as { activity: { status: string } };
    assert.equal(approvedBody.activity.status, "published");

    const live = await handleShareApi(request(null, "/api/share/creator-activities"), store);
    const liveBody = (await live.json()) as {
      activities: Array<{ id: string; title: string; ownerId?: string; reviewNote?: string }>;
    };
    assert.equal(liveBody.activities.length, 1);
    assert.equal(liveBody.activities[0]?.title, "Bubble turn taking");
    assert.equal(liveBody.activities[0]?.ownerId, undefined);
    assert.equal(liveBody.activities[0]?.reviewNote, undefined);

    const edited = await handleShareApi(
      request(creator, `/api/share/creator-activities/${id}`, "PATCH", {
        ...sample,
        title: "Bubble turn taking (slower)",
      }),
      store,
    );
    const editedBody = (await edited.json()) as { activity: { status: string; title: string } };
    assert.equal(editedBody.activity.status, "pending");
    assert.equal(editedBody.activity.title, "Bubble turn taking (slower)");
    const hiddenAgain = await handleShareApi(request(null, "/api/share/creator-activities"), store);
    const hiddenBody = (await hiddenAgain.json()) as { activities: unknown[] };
    assert.equal(hiddenBody.activities.length, 0);

    const removedByOther = await handleShareApi(
      request(other, `/api/share/creator-activities/${id}`, "DELETE"),
      store,
    );
    assert.equal(removedByOther.status, 403);
    const removed = await handleShareApi(
      request(creator, `/api/share/creator-activities/${id}`, "DELETE"),
      store,
    );
    assert.equal(removed.status, 200);
    const gone = await handleShareApi(
      request(creator, `/api/share/creator-activities/${id}`),
      store,
    );
    assert.equal(gone.status, 404);
  });

  it("lets Creator Pro imply Pro on the live snapshot and refuses founder-only grants to everyone else", async () => {
    const store = deps();
    const snapshot = await handleShareApi(request(creator, "/api/share/snapshot"), store);
    const snap = (await snapshot.json()) as { isPro: boolean };
    assert.equal(snap.isPro, true);

    const grant = await handleShareApi(
      request(founder, "/api/share/creator-access?email=alex.rivera@example.com"),
      store,
    );
    assert.equal(grant.status, 503);
    const blocked = await handleShareApi(
      request(creator, "/api/share/creator-access", "POST", {
        userId: "user_other",
        isCreatorPro: true,
      }),
      store,
    );
    assert.equal(blocked.status, 403);
  });

  it("joins a published creator activity into the catalog without translating the written text", () => {
    const catalog = creatorActivityToCatalog({
      id: "cact_testactivity0001",
      ownerName: "Alex Rivera",
      title: "Burbujas lentas",
      description: "Una burbuja y una pausa.",
      minAge: 1,
      maxAge: 3,
      skill: "Social Skills",
      minutes: 10,
      materials: ["Pompas"],
      steps: ["Sopla.", "Espera."],
      language: "es",
      createdAt: "2026-11-04T00:00:00.000Z",
      updatedAt: "2026-11-04T00:00:00.000Z",
    });
    replacePublishedCreatorActivities([catalog]);
    try {
      const resolved = resolveActivity(catalog.id);
      assert.equal(resolved?.title, "Burbujas lentas");
      assert.equal(creatorCreditName(resolved), "Alex Rivera");
      const shown = presentPlanStep(
        {
          activityId: catalog.id,
          title: "Burbujas lentas",
          description: "Una burbuja y una pausa.",
        },
        "en",
      );
      assert.equal(shown.title, "Burbujas lentas");
      assert.equal(resolveActivity("sensory-rice-bin")?.title, "Sensory Rice Bin");
    } finally {
      replacePublishedCreatorActivities([]);
    }
  });
});
