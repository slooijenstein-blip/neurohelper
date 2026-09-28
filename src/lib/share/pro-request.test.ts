import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { handleShareApi, createShareDeps } from "./http.ts";
import {
  isProRequestAdmin,
  parseProRequestInput,
  pendingForReview,
  proRequestNotifyResult,
  submitProRequest,
  PRO_REQUEST_ADMIN_EMAIL,
} from "./pro-request.ts";
import { createFileShareStore } from "./store.ts";

const parent = "user_parent001|parent@example.com|Pat Parent|0";
const admin = `user_samadmin1|${PRO_REQUEST_ADMIN_EMAIL}|Sam|0`;
const therapist = "user_therapist1|maya@example.com|Maya|1";

const fields = {
  fullName: "Pat Parent",
  email: "Parent@Example.com",
  role: "therapist",
  country: "nl",
  organisation: "Harbour Studio",
  why: "Share weekday plans with parents",
  worksWithFamilies: true,
  isPro: true,
};

function request(devUser: string, pathName: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost${pathName}`, {
    method,
    headers: {
      "x-share-dev-user": devUser,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("pro access requests", () => {
  it("saves a pending request and does not grant Pro", async () => {
    const deps = createShareDeps({ SHARE_STORE: "memory", SHARE_DEV_BYPASS: "1" });
    const saved = await handleShareApi(
      request(parent, "/api/share/pro-request", "POST", fields),
      deps,
    );
    assert.equal(saved.status, 200);
    const body = (await saved.json()) as {
      request: {
        id: string;
        status: string;
        email: string;
        country: string;
        role: string;
        isPro?: boolean;
      };
      notify: { notified: boolean; code: string };
    };
    assert.equal(body.request.status, "pending");
    assert.equal(body.request.email, "parent@example.com");
    assert.equal(body.request.country, "NL");
    assert.equal(body.request.role, "therapist");
    assert.equal(body.request.isPro, undefined);
    assert.equal(body.notify.notified, false);
    assert.equal(body.notify.code, "not_configured");

    const again = await handleShareApi(
      request(parent, "/api/share/pro-request", "POST", { ...fields, why: "Updated line" }),
      deps,
    );
    const updated = (await again.json()) as { request: { id: string; why: string } };
    assert.equal(updated.request.id, body.request.id);
    assert.equal(updated.request.why, "Updated line");

    const own = await handleShareApi(request(parent, "/api/share/pro-request"), deps);
    const ownBody = (await own.json()) as { request: { status: string } };
    assert.equal(ownBody.request.status, "pending");

    const snapshot = await handleShareApi(request(parent, "/api/share/snapshot"), deps);
    const snap = (await snapshot.json()) as { isPro: boolean };
    assert.equal(snap.isPro, false);

    const denied = await handleShareApi(request(parent, "/api/share/pro-requests"), deps);
    assert.equal(denied.status, 403);

    const queue = await handleShareApi(request(admin, "/api/share/pro-requests"), deps);
    assert.equal(queue.status, 200);
    const listed = (await queue.json()) as { requests: Array<{ email: string }> };
    assert.equal(listed.requests.length, 1);
    assert.equal(listed.requests[0]?.email, "parent@example.com");

    const blocked = await handleShareApi(
      request(therapist, "/api/share/pro-request", "POST", fields),
      deps,
    );
    assert.equal(blocked.status, 409);
  });

  it("rejects a request that does not confirm professional work", () => {
    assert.throws(
      () => parseProRequestInput({ ...fields, worksWithFamilies: false }),
      (err: unknown) => (err as { code?: string }).code === "confirm_required",
    );
  });

  it("treats Sam's Gmail as the reviewer and hides accounts that already have Pro", async () => {
    assert.equal(isProRequestAdmin({ email: "Sam.Looijenstein@gmail.com" }), true);
    assert.equal(isProRequestAdmin({ email: "parent@example.com" }), false);
    assert.equal(proRequestNotifyResult(undefined).code, "not_configured");
    assert.equal(proRequestNotifyResult("samlooijenstein@gmail.com").code, "no_mailer");

    const file = path.join(mkdtempSync(path.join(tmpdir(), "pro-")), "store.json");
    const store = createFileShareStore(file);
    const first = await submitProRequest(
      store,
      { userId: "user_parent001", isPro: false },
      parseProRequestInput(fields),
      "2026-09-25T12:00:00.000Z",
    );
    const reloaded = createFileShareStore(file);
    const saved = await reloaded.getProRequest("user_parent001");
    assert.equal(saved?.id, first.id);
    assert.equal(saved?.status, "pending");
    const hidden = await pendingForReview([first], async (userId) => userId === "user_parent001");
    assert.equal(hidden.length, 0);
    const shown = await pendingForReview([first], async () => false);
    assert.equal(shown.length, 1);
  });
});
