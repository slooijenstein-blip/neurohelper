import {
  FamilyError,
  type Actor,
  type ChildDetail,
  type ChildSummary,
  type DayPlan,
  type TimeBlock,
} from "./types";

export type FamilyClient = {
  listChildren(): Promise<ChildSummary[]>;
  createChild(input: { displayName: string; ageBand: string }): Promise<ChildDetail>;
  getChild(childId: string): Promise<ChildDetail>;
  updateChild(
    childId: string,
    patch: { displayName?: string; ageBand?: string },
  ): Promise<ChildDetail>;
  deleteChild(childId: string): Promise<void>;
  invite(
    childId: string,
    input: { email: string; role: string },
  ): Promise<{ token: string; inviteUrl: string; email: string }>;
  cancelInvite(childId: string, inviteId: string): Promise<ChildDetail>;
  peekInvite(
    token: string,
  ): Promise<{ childDisplayName: string; role: string; invitedEmail: string }>;
  acceptInvite(token: string): Promise<ChildDetail>;
  getPlan(childId: string, date: string): Promise<DayPlan>;
  savePlan(childId: string, date: string, blocks: TimeBlock[]): Promise<DayPlan>;
  deletePlan(childId: string, date: string): Promise<void>;
  setBlockDone(childId: string, date: string, blockId: string, done: boolean): Promise<DayPlan>;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new FamilyError(
        res.status || 500,
        "server_error",
        "Family sharing is not available on this host.",
      );
    }
  }
  if (!res.ok) {
    const row = data && typeof data === "object" ? (data as { error?: string; code?: string }) : {};
    throw new FamilyError(res.status, row.code || "error", row.error || "Request failed.");
  }
  return data as T;
}

export function createHttpFamilyClient(getToken: () => Promise<string | null>): FamilyClient {
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = await getToken();
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);
    const res = await fetch(path, { ...init, headers });
    return parseResponse<T>(res);
  };

  return {
    async listChildren() {
      const data = await request<{ children: ChildSummary[] }>("/api/family/children");
      return data.children;
    },
    async createChild(input) {
      const data = await request<{ child: ChildDetail }>("/api/family/children", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return data.child;
    },
    async getChild(childId) {
      const data = await request<{ child: ChildDetail }>(`/api/family/children/${childId}`);
      return data.child;
    },
    async updateChild(childId, patch) {
      const data = await request<{ child: ChildDetail }>(`/api/family/children/${childId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      return data.child;
    },
    async deleteChild(childId) {
      await request(`/api/family/children/${childId}`, { method: "DELETE" });
    },
    async invite(childId, input) {
      return request(`/api/family/children/${childId}/invites`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    async cancelInvite(childId, inviteId) {
      const data = await request<{ child: ChildDetail }>(
        `/api/family/children/${childId}/invites/${inviteId}`,
        { method: "DELETE" },
      );
      return data.child;
    },
    async peekInvite(token) {
      return request(`/api/family/invites/${encodeURIComponent(token)}`);
    },
    async acceptInvite(token) {
      const data = await request<{ child: ChildDetail }>(
        `/api/family/invites/${encodeURIComponent(token)}/accept`,
        { method: "POST", body: "{}" },
      );
      return data.child;
    },
    async getPlan(childId, date) {
      const data = await request<{ plan: DayPlan }>(
        `/api/family/children/${childId}/plan?date=${encodeURIComponent(date)}`,
      );
      return data.plan;
    },
    async savePlan(childId, date, blocks) {
      const data = await request<{ plan: DayPlan }>(`/api/family/children/${childId}/plan`, {
        method: "PUT",
        body: JSON.stringify({ date, blocks }),
      });
      return data.plan;
    },
    async deletePlan(childId, date) {
      await request(`/api/family/children/${childId}/plan?date=${encodeURIComponent(date)}`, {
        method: "DELETE",
      });
    },
    async setBlockDone(childId, date, blockId, done) {
      const data = await request<{ plan: DayPlan }>(
        `/api/family/children/${childId}/plan/blocks/${blockId}`,
        { method: "PATCH", body: JSON.stringify({ date, done }) },
      );
      return data.plan;
    },
  };
}

export function createServiceFamilyClient(
  service: import("./family-service").FamilyService,
  actor: Actor,
): FamilyClient {
  return {
    listChildren: () => service.listChildren(actor),
    createChild: (input) => service.createChild(actor, input),
    getChild: (childId) => service.getChild(actor, childId),
    updateChild: (childId, patch) =>
      service.updateChild(actor, childId, {
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.ageBand !== undefined &&
        (patch.ageBand === "1-2" ||
          patch.ageBand === "3-5" ||
          patch.ageBand === "6-8" ||
          patch.ageBand === "9-12")
          ? { ageBand: patch.ageBand }
          : {}),
      }),
    deleteChild: (childId) => service.deleteChild(actor, childId),
    invite: async (childId, input) => {
      const result = await service.invite(actor, childId, input);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      return {
        ...result,
        inviteUrl: `${origin}/invite/${encodeURIComponent(result.token)}`,
      };
    },
    cancelInvite: (childId, inviteId) => service.cancelInvite(actor, childId, inviteId),
    peekInvite: (token) => service.peekInvite(token),
    acceptInvite: (token) => service.acceptInvite(actor, token),
    getPlan: (childId, date) => service.getPlan(actor, childId, date),
    savePlan: (childId, date, blocks) => service.savePlan(actor, childId, date, blocks),
    deletePlan: (childId, date) => service.deletePlan(actor, childId, date),
    setBlockDone: (childId, date, blockId, done) =>
      service.setBlockDone(actor, childId, date, blockId, done),
  };
}
