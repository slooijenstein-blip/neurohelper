import { describe, expect, it } from "vitest";

import { createAfternoonPlanBlocks } from "./afternoon-plan";
import { FamilyService } from "./family-service";
import { createFamilyHttpHandler } from "./family-http";
import { handleFamilyApi } from "./http.server";
import { createHmacTokenSigner } from "./hmac-token.server";
import { createLocalTokenSigner } from "./local-token";
import { MemoryFamilyStore } from "./memory-store";
import { runFamilyFunction } from "./node-adapter.server";
import { FamilyError, type Actor } from "./types";

const parentA: Actor = { userId: "user_parent_a", email: "parent@example.com", name: "Alex" };
const parentB: Actor = { userId: "user_parent_b", email: "coparent@example.com", name: "Sam" };
const therapist: Actor = { userId: "user_therapist", email: "therapist@example.com", name: "Maya" };
const caregiver: Actor = { userId: "user_caregiver", email: "gran@example.com", name: "Gran" };
const stranger: Actor = { userId: "user_stranger", email: "other@example.com", name: "Other" };

function service() {
  return new FamilyService(new MemoryFamilyStore(), createLocalTokenSigner());
}

describe("shared schedules + family roles", () => {
  it("lets a parent create a child and an afternoon plan, then see it", async () => {
    const api = service();
    const child = await api.createChild(parentA, { displayName: "Nora", ageBand: "3-5" });
    expect(child.displayName).toBe("Nora");
    expect(child.myRole).toBe("parent");
    expect(child.isOwner).toBe(true);

    const date = "2026-09-21";
    const plan = await api.savePlan(parentA, child.id, date, createAfternoonPlanBlocks());
    expect(plan.blocks).toHaveLength(4);
    expect(plan.blocks[0]?.start).toBe("15:00");

    const listed = await api.listChildren(parentA);
    expect(listed.map((item) => item.id)).toContain(child.id);
    const loaded = await api.getPlan(parentA, child.id, date);
    expect(loaded.blocks.map((block) => block.title)).toEqual(
      plan.blocks.map((block) => block.title),
    );
  });

  it("lets an invited parent and therapist open the same plan", async () => {
    const api = service();
    const child = await api.createChild(parentA, { displayName: "Nora", ageBand: "3-5" });
    const date = "2026-09-21";
    await api.savePlan(parentA, child.id, date, createAfternoonPlanBlocks());

    const parentInvite = await api.invite(parentA, child.id, {
      email: parentB.email,
      role: "parent",
    });
    const therapistInvite = await api.invite(parentA, child.id, {
      email: therapist.email,
      role: "therapist",
    });
    await api.acceptInvite(parentB, parentInvite.token);
    await api.acceptInvite(therapist, therapistInvite.token);

    const asParent = await api.getPlan(parentB, child.id, date);
    const asTherapist = await api.getPlan(therapist, child.id, date);
    expect(asParent.blocks).toHaveLength(4);
    expect(asTherapist.blocks.map((block) => block.title)).toEqual(
      asParent.blocks.map((block) => block.title),
    );
  });

  it("shows therapist edits to parents", async () => {
    const api = service();
    const child = await api.createChild(parentA, { displayName: "Nora", ageBand: "3-5" });
    const invite = await api.invite(parentA, child.id, {
      email: therapist.email,
      role: "therapist",
    });
    await api.acceptInvite(therapist, invite.token);

    const date = "2026-09-21";
    await api.savePlan(therapist, child.id, date, [
      {
        id: "blk_main",
        start: "15:00",
        minutes: 20,
        title: "Obstacle course",
        notes: "Cushions and a tunnel",
        done: false,
      },
    ]);

    const seen = await api.getPlan(parentA, child.id, date);
    expect(seen.blocks[0]?.title).toBe("Obstacle course");
    expect(seen.blocks[0]?.notes).toContain("tunnel");
  });

  it("lets a caregiver check off but not delete the plan or invite others", async () => {
    const api = service();
    const child = await api.createChild(parentA, { displayName: "Nora", ageBand: "3-5" });
    const date = "2026-09-21";
    const plan = await api.savePlan(parentA, child.id, date, createAfternoonPlanBlocks());
    const invite = await api.invite(parentA, child.id, {
      email: caregiver.email,
      role: "caregiver",
    });
    await api.acceptInvite(caregiver, invite.token);

    const done = await api.setBlockDone(caregiver, child.id, date, plan.blocks[0]!.id, true);
    expect(done.blocks[0]?.done).toBe(true);

    await expect(api.deletePlan(caregiver, child.id, date)).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
    await expect(
      api.invite(caregiver, child.id, { email: "more@example.com", role: "caregiver" }),
    ).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
    await expect(
      api.savePlan(caregiver, child.id, date, [{ ...plan.blocks[0]!, title: "Changed" }]),
    ).rejects.toMatchObject({ status: 403, code: "forbidden" });
  });

  it("hides another family's child from uninvited users", async () => {
    const api = service();
    const child = await api.createChild(parentA, { displayName: "Nora", ageBand: "3-5" });
    await api.savePlan(parentA, child.id, "2026-09-21", createAfternoonPlanBlocks());

    await expect(api.getChild(stranger, child.id)).rejects.toMatchObject({ status: 404 });
    await expect(api.getPlan(stranger, child.id, "2026-09-21")).rejects.toMatchObject({
      status: 404,
    });
    const listed = await api.listChildren(stranger);
    expect(listed).toEqual([]);
  });

  it("does not let a therapist invite strangers", async () => {
    const api = service();
    const child = await api.createChild(parentA, { displayName: "Nora", ageBand: "3-5" });
    const invite = await api.invite(parentA, child.id, {
      email: therapist.email,
      role: "therapist",
    });
    await api.acceptInvite(therapist, invite.token);
    await expect(
      api.invite(therapist, child.id, { email: "stranger@example.com", role: "caregiver" }),
    ).rejects.toBeInstanceOf(FamilyError);
  });

  it("requires the invited email when accepting", async () => {
    const api = service();
    const child = await api.createChild(parentA, { displayName: "Nora", ageBand: "3-5" });
    const invite = await api.invite(parentA, child.id, {
      email: caregiver.email,
      role: "caregiver",
    });
    await expect(api.acceptInvite(stranger, invite.token)).rejects.toMatchObject({
      status: 403,
      code: "wrong_email",
    });
  });
});

describe("family HTTP health", () => {
  it("returns JSON when invoked as a Web Request with no Node res", async () => {
    const res = await runFamilyFunction(new Request("https://synlumae.com/api/family/health"));
    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(200);
    const body = (await res!.json()) as { ok?: boolean; configured?: boolean; store?: string };
    expect(body.ok).toBe(true);
    expect(body.configured).toBe(false);
    expect(body.store).toBe("none");
  });

  it("accepts a Request-like object that is not instanceof Request", async () => {
    const headers = new Headers();
    const fake = {
      url: "https://synlumae.com/api/family/health",
      method: "GET",
      headers,
    };
    const res = await runFamilyFunction(fake as never);
    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(200);
  });

  it("health does not require CLERK_SECRET_KEY", async () => {
    const res = await handleFamilyApi(new Request("https://synlumae.com/api/family/health"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true });
  });
});

describe("family HTTP permission guards", () => {
  it("returns 404 JSON for uninvited reads", async () => {
    const api = service();
    const child = await api.createChild(parentA, { displayName: "Nora", ageBand: "3-5" });
    const actors = new Map<string, Actor>([
      [parentA.userId, parentA],
      [stranger.userId, stranger],
    ]);
    const handle = createFamilyHttpHandler({
      configured: true,
      storeName: "memory",
      service: api,
      authenticate: async (req) => {
        const id = req.headers.get("x-user") || "";
        return actors.get(id) ?? null;
      },
    });

    const res = await handle(
      new Request(`https://synlumae.com/api/family/children/${child.id}`, {
        headers: { "x-user": stranger.userId },
      }),
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("not_found");
  });
});

describe("invite HMAC tokens", () => {
  it("rejects a tampered token", () => {
    const signer = createHmacTokenSigner("test-secret");
    const token = signer.sign("user_1", "inv_1");
    expect(signer.parse(token + "x")).toBeNull();
    expect(signer.parse(token)?.inviteId).toBe("inv_1");
  });
});
