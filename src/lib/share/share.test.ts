import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Actor, EmailResult } from "./actions.ts";
import { handleShareApi, createShareDeps } from "./http.ts";
import { inviteRedirectUrl, ShareService } from "./service.ts";
import { createMemoryShareStore } from "./store.ts";
import { toDateKey } from "../calendar/types.ts";
import { blankAccountState } from "./workspace.ts";

const origin = "http://localhost:8080";

const therapist: Actor = {
  userId: "user_therapist1",
  email: "maya@example.com",
  name: "Maya",
  isPro: true,
};

const parent: Actor = {
  userId: "user_parent001",
  email: "sam.parent@example.com",
  name: "Sam",
  isPro: false,
};

function serviceWith(mailer?: (email: string, url: string) => Promise<EmailResult>) {
  const sent: Array<{ email: string; redirectUrl: string; token: string }> = [];
  const service = new ShareService(createMemoryShareStore(), async (input) => {
    sent.push(input);
    if (mailer) return mailer(input.email, input.redirectUrl);
    return { sent: true, code: "sent", message: "Invitation email sent." };
  });
  return { service, sent };
}

describe("live sharing", () => {
  it("lets a Pro account invite a parent who then sees only that plan", async () => {
    const { service, sent } = serviceWith();
    await service.snapshot(therapist);

    await service.act(
      therapist,
      {
        type: "addChild",
        childId: "child_alex0001",
        membershipId: "mem_therap01",
        displayName: "Alex",
        ageBand: "3-5",
        tagIds: [],
        now: new Date().toISOString(),
      },
      origin,
    );
    await service.act(
      therapist,
      {
        type: "addChild",
        childId: "child_jord0001",
        membershipId: "mem_therap02",
        displayName: "Jordan",
        ageBand: "6-8",
        tagIds: [],
        now: new Date().toISOString(),
      },
      origin,
    );

    const before = await service.snapshot(therapist);
    const plan = before.state.libraryPlans.find((item) => item.id === "lib_weekday_calm");
    assert.ok(plan);
    const today = toDateKey(new Date());
    await service.act(
      therapist,
      {
        type: "applyLibraryPlan",
        libraryPlanId: plan.id,
        childId: "child_alex0001",
        days: [
          {
            date: today,
            dayId: "day_today001",
            stepIds: plan.steps.map((_, index) => `st_step${String(index).padStart(4, "0")}`),
          },
        ],
        now: new Date().toISOString(),
      },
      origin,
    );

    const invited = await service.act(
      therapist,
      {
        type: "createInvite",
        childId: "child_alex0001",
        email: "Sam.Parent@example.com",
        role: "caregiver",
        displayName: "Sam",
        inviteId: "inv_invite01",
        membershipId: "mem_parent01",
        pendingPersonId: "pending_person01",
        token: "tok_token001",
        now: new Date().toISOString(),
      },
      origin,
    );
    assert.equal(invited.email?.sent, true);
    assert.equal(sent[0]?.redirectUrl, "http://localhost:8080/invite/tok_token001");
    assert.equal(
      invited.state.invites.some((invite) => invite.email === "sam.parent@example.com"),
      true,
    );
    assert.equal(
      invited.state.children.some((child) => child.displayName === "Jordan"),
      true,
    );

    const seen = await service.snapshot(parent);
    assert.equal(seen.isPro, false);
    assert.deepEqual(
      seen.state.children.map((child) => child.displayName),
      ["Alex"],
    );
    const day = seen.state.dayPlans.find(
      (item) => item.childId === "child_alex0001" && item.date === today,
    );
    assert.ok(day);
    assert.ok(day.steps.length >= 3);
    assert.equal(
      day.steps.some((step) => step.activityId === "calming-glitter-bottle"),
      true,
    );
    assert.equal(
      seen.state.libraryPlans.some((item) => item.childId === null),
      false,
    );

    await assert.rejects(
      () =>
        service.act(
          { ...parent, email: "other@example.com" },
          { type: "acceptInvite", token: "tok_token001", now: new Date().toISOString() },
          origin,
        ),
      (err: unknown) =>
        (err as { code?: string }).code === "email_mismatch" ||
        (err as { code?: string }).code === "invite_missing",
    );

    const helper = await service.act(
      parent,
      {
        type: "createInvite",
        childId: "child_alex0001",
        email: "grandma@example.com",
        role: "helper",
        displayName: "Grandma",
        inviteId: "inv_helper001",
        membershipId: "mem_helper001",
        pendingPersonId: "pending_helper01",
        token: "tok_helper001",
        now: new Date().toISOString(),
      },
      origin,
    );
    assert.equal(helper.email?.code, "sent");
    await assert.rejects(
      () =>
        service.act(
          parent,
          {
            type: "createInvite",
            childId: "child_alex0001",
            email: "other@example.com",
            role: "caregiver",
            displayName: "Other",
            inviteId: "inv_badrole01",
            membershipId: "mem_badrole1",
            pendingPersonId: "pending_badrole1",
            token: "tok_badrole01",
            now: new Date().toISOString(),
          },
          origin,
        ),
      (err: unknown) => (err as { code?: string }).code === "role_not_allowed",
    );
  });

  it("still shows an inbound share on a Pro account", async () => {
    const { service } = serviceWith();
    const colleague: Actor = {
      userId: "user_colleague1",
      email: "nia@example.com",
      name: "Nia",
      isPro: true,
    };
    await service.snapshot(colleague);
    await service.act(
      colleague,
      {
        type: "addChild",
        childId: "child_rio00001",
        membershipId: "mem_nia000001",
        displayName: "Rio",
        ageBand: "3-5",
        tagIds: [],
        now: new Date().toISOString(),
      },
      origin,
    );
    await service.act(
      colleague,
      {
        type: "createInvite",
        childId: "child_rio00001",
        email: therapist.email,
        role: "caregiver",
        displayName: "Maya",
        inviteId: "inv_maya00001",
        membershipId: "mem_maya00001",
        pendingPersonId: "pending_maya0001",
        token: "tok_maya0001",
        now: new Date().toISOString(),
      },
      origin,
    );
    const seen = await service.snapshot(therapist);
    assert.equal(seen.isPro, true);
    assert.equal(
      seen.state.children.some((child) => child.displayName === "Rio"),
      true,
    );
    assert.equal(
      seen.state.people.find((person) => person.id === therapist.userId)?.appRole,
      "therapist",
    );
    assert.equal(
      seen.state.memberships.find(
        (membership) =>
          membership.childId === "child_rio00001" && membership.personId === therapist.userId,
      )?.role,
      "caregiver",
    );
  });

  it("accepts a Gmail invite when Google drops the dots", async () => {
    const { service } = serviceWith();
    await service.snapshot(therapist);
    await service.act(
      therapist,
      {
        type: "addChild",
        childId: "child_alex0001",
        membershipId: "mem_therap01",
        displayName: "Alex",
        ageBand: "3-5",
        tagIds: [],
        now: new Date().toISOString(),
      },
      origin,
    );
    await service.act(
      therapist,
      {
        type: "createInvite",
        childId: "child_alex0001",
        email: "sam.parent@gmail.com",
        role: "caregiver",
        displayName: "Sam",
        inviteId: "inv_invite01",
        membershipId: "mem_parent01",
        pendingPersonId: "pending_person01",
        token: "tok_token001",
        now: new Date().toISOString(),
      },
      origin,
    );
    const seen = await service.snapshot({
      ...parent,
      email: "samparent@gmail.com",
      emails: ["samparent@gmail.com"],
    });
    assert.equal(seen.isPro, false);
    assert.equal(seen.state.children[0]?.displayName, "Alex");
  });

  it("refuses patients from an account that is not Pro", async () => {
    const { service } = serviceWith();
    await assert.rejects(
      () =>
        service.act(
          parent,
          {
            type: "addChild",
            childId: "child_nope0001",
            membershipId: "mem_nope0001",
            displayName: "Alex",
            ageBand: "3-5",
            tagIds: [],
            now: new Date().toISOString(),
          },
          origin,
        ),
      (err: unknown) => (err as { code?: string }).code === "pro_required",
    );
  });

  it("keeps the invite when Clerk cannot email an existing user", async () => {
    const { service } = serviceWith(async () => ({
      sent: false,
      code: "already_user",
      message: "That email already has an account.",
    }));
    await service.snapshot(therapist);
    await service.act(
      therapist,
      {
        type: "addChild",
        childId: "child_alex0001",
        membershipId: "mem_therap01",
        displayName: "Alex",
        ageBand: "3-5",
        tagIds: [],
        now: new Date().toISOString(),
      },
      origin,
    );
    const invited = await service.act(
      therapist,
      {
        type: "createInvite",
        childId: "child_alex0001",
        email: "sam.parent@example.com",
        role: "caregiver",
        displayName: "Sam",
        inviteId: "inv_invite01",
        membershipId: "mem_parent01",
        pendingPersonId: "pending_person01",
        token: "tok_token001",
        now: new Date().toISOString(),
      },
      origin,
    );
    assert.equal(invited.email?.code, "already_user");
    const seen = await service.snapshot(parent);
    assert.equal(seen.state.children[0]?.displayName, "Alex");
  });

  it("rejects invite links that leave the app hosts", () => {
    assert.equal(
      inviteRedirectUrl("https://neurohelper-git-preview.vercel.app", "tok_token001"),
      "https://neurohelper-git-preview.vercel.app/invite/tok_token001",
    );
    assert.throws(() => inviteRedirectUrl("https://evil.example", "tok_token001"));
  });

  it("keeps demo patients off a signed-in account when sharing is down", () => {
    const blank = blankAccountState(therapist);
    assert.equal(blank.children.length, 0);
    assert.equal(blank.people[0]?.appRole, "therapist");
    assert.equal(blankAccountState(parent).people[0]?.appRole, "caregiver");
  });

  it("reports when the preview has no store", async () => {
    const deps = createShareDeps({ VERCEL: "1" });
    const response = await handleShareApi(new Request("http://localhost/api/share/health"), deps);
    const body = (await response.json()) as { ok: boolean; store: string; clerk: boolean };
    assert.equal(response.status, 200);
    assert.equal(body.ok, false);
    assert.equal(body.store, "none");
    assert.equal(body.clerk, false);

    const snapshot = await handleShareApi(new Request("http://localhost/api/share/snapshot"), deps);
    assert.equal(snapshot.status, 503);
  });
});
