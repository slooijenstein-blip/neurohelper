import type { Actor, EmailResult, ShareAction } from "./actions.ts";
import { ShareError } from "./errors.ts";
import { applyShareAction } from "./mutate.ts";
import { actorEmailKeys, emailMatchesActor } from "./names.ts";
import type { ShareStore } from "./store.ts";
import {
  createOwnerWorkspace,
  mergeInbound,
  mergeViews,
  pruneWorkspace,
  stateFromWorkspace,
  viewFor,
  workspaceFromState,
  type Workspace,
} from "./workspace.ts";
import type { CalendarState } from "../calendar/types.ts";

export type InviteMailer = (input: {
  email: string;
  redirectUrl: string;
  token: string;
}) => Promise<EmailResult>;

export type ShareSnapshot = {
  isPro: boolean;
  state: CalendarState;
};

const chains = new Map<string, Promise<unknown>>();

function locked<T>(ownerId: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(ownerId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  chains.set(
    ownerId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function isConflict(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: string }).code === "conflict");
}

export function inviteRedirectUrl(origin: string, token: string): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new ShareError(400, "invalid_origin", "Invalid preview address.");
  }
  const host = url.hostname;
  const allowed =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "synlumae.com" ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".github.io");
  if (!allowed) {
    throw new ShareError(400, "invalid_origin", "That address cannot be used for invites.");
  }
  if (url.protocol !== "https:" && host !== "localhost" && host !== "127.0.0.1") {
    throw new ShareError(400, "invalid_origin", "Invite links must use https.");
  }
  return `${url.protocol}//${url.host}/invite/${encodeURIComponent(token)}`;
}

async function ownerIdFor(store: ShareStore, action: ShareAction, actor: Actor): Promise<string> {
  switch (action.type) {
    case "addChild":
    case "addTherapistTag":
      if (!actor.isPro)
        throw new ShareError(403, "pro_required", "Only a Pro account can do that.");
      return actor.userId;
    case "createLibraryPlan":
      if (action.plan.childId) {
        const owner = await store.ownerForChild(action.plan.childId);
        if (!owner) throw new ShareError(404, "not_found", "Child not found.");
        return owner;
      }
      if (!actor.isPro)
        throw new ShareError(403, "pro_required", "Only a Pro account can add a template.");
      return actor.userId;
    case "setChildTags":
    case "toggleStepDone":
    case "applyLibraryPlan":
    case "useTemplateForPatient":
    case "tweakDayStep":
    case "addDayStep":
    case "replaceDayStep":
    case "removeDayStep":
    case "saveDayBackToLibrary":
    case "createInvite": {
      const owner = await store.ownerForChild(action.childId);
      if (!owner) throw new ShareError(404, "not_found", "Child not found.");
      return owner;
    }
    case "updateLibraryPlan":
    case "deleteLibraryPlan": {
      const owner = await store.ownerForPlan(action.id);
      if (!owner) throw new ShareError(404, "not_found", "Plan not found.");
      return owner;
    }
    case "duplicateLibraryPlan": {
      const owner = await store.ownerForPlan(action.sourceId);
      if (!owner) throw new ShareError(404, "not_found", "Plan not found.");
      return owner;
    }
    case "appendLibraryStep": {
      const owner = await store.ownerForPlan(action.libraryPlanId);
      if (!owner) throw new ShareError(404, "not_found", "Plan not found.");
      return owner;
    }
    case "resendInvite":
    case "removeInvite": {
      const owner = await store.ownerForInvite(action.inviteId);
      if (!owner) throw new ShareError(404, "not_found", "Invite not found.");
      return owner;
    }
    case "changeMemberRole":
    case "removeMember": {
      const owner = await store.ownerForMembership(action.membershipId);
      if (!owner) throw new ShareError(404, "not_found", "Person not found.");
      return owner;
    }
    case "acceptInvite": {
      const owner = await store.ownerForToken(action.token);
      if (!owner)
        throw new ShareError(404, "invite_missing", "This invite is missing or already used.");
      return owner;
    }
    default:
      throw new ShareError(400, "unknown_action", "Unknown action.");
  }
}

export class ShareService {
  private readonly store: ShareStore;
  private readonly mailer: InviteMailer;

  constructor(store: ShareStore, mailer: InviteMailer) {
    this.store = store;
    this.mailer = mailer;
  }

  private async loadOrCreate(actor: Actor, ownerId: string): Promise<Workspace | null> {
    const existing = await this.store.get(ownerId);
    if (existing) return existing;
    if (ownerId !== actor.userId || !actor.isPro) return null;
    const created = createOwnerWorkspace(actor, new Date().toISOString());
    await this.store.save(null, created);
    return created;
  }

  private async autoAccept(ws: Workspace, actor: Actor): Promise<Workspace> {
    const pending = ws.invites.filter(
      (invite) => invite.status === "pending" && emailMatchesActor(invite.email, actor),
    );
    if (pending.length === 0) return ws;
    return locked(ws.ownerUserId, async () => {
      const fresh = (await this.store.get(ws.ownerUserId)) ?? ws;
      let state = stateFromWorkspace(fresh, actor.userId);
      let changed = false;
      for (const invite of fresh.invites) {
        if (invite.status !== "pending" || !emailMatchesActor(invite.email, actor)) continue;
        try {
          state = applyShareAction(state, actor, {
            type: "acceptInvite",
            token: invite.token,
            now: new Date().toISOString(),
          }).state;
          changed = true;
        } catch {
          /* a single bad invite must not hide the rest of the snapshot */
        }
      }
      if (!changed) return fresh;
      const next = pruneWorkspace(
        workspaceFromState(state, fresh.ownerUserId, fresh.rev + 1),
        new Date(),
      );
      await this.store.save(fresh, next);
      return next;
    });
  }

  async snapshot(actor: Actor, inviteToken?: string | null): Promise<ShareSnapshot> {
    const owners = new Set(await this.store.ownersForUser(actor.userId));
    for (const emailKey of actorEmailKeys(actor)) {
      for (const ownerId of await this.store.ownersForEmail(emailKey)) owners.add(ownerId);
    }
    if (inviteToken) {
      const ownerId = await this.store.ownerForToken(inviteToken);
      if (ownerId) owners.add(ownerId);
    }
    if (actor.isPro) owners.add(actor.userId);

    let proWorkspace: Workspace | null = null;
    const views: CalendarState[] = [];
    for (const ownerId of owners) {
      const loaded = await this.loadOrCreate(actor, ownerId);
      if (!loaded) continue;
      const ws = await this.autoAccept(loaded, actor);
      if (actor.isPro && ownerId === actor.userId) {
        proWorkspace = ws;
        continue;
      }
      const view = viewFor(ws, actor);
      if (view.children.length > 0) views.push(view);
    }

    if (proWorkspace) {
      const own = viewFor(proWorkspace, actor);
      return { isPro: true, state: mergeInbound(own, views) };
    }
    return { isPro: false, state: mergeViews(views, actor) };
  }

  async peek(
    token: string,
  ): Promise<{ childDisplayName: string; role: "caregiver" | "helper"; email: string } | null> {
    const ownerId = await this.store.ownerForToken(token);
    if (!ownerId) return null;
    const ws = await this.store.get(ownerId);
    const invite = ws?.invites.find((item) => item.token === token && item.status === "pending");
    if (!ws || !invite) return null;
    const child = ws.children.find((item) => item.id === invite.childId);
    return {
      childDisplayName: child?.displayName ?? "Child",
      role: invite.role,
      email: invite.email,
    };
  }

  async act(
    actor: Actor,
    action: ShareAction,
    origin: string,
  ): Promise<{ state: CalendarState; email: EmailResult | null; inviteId: string | null }> {
    const ownerId = await ownerIdFor(this.store, action, actor);
    const outcome = await locked(ownerId, async () => {
      let email: EmailResult | null = null;
      let inviteId: string | null = null;
      let saved: Workspace | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const previous = await this.loadOrCreate(actor, ownerId);
        if (!previous) throw new ShareError(404, "not_found", "Shared plan not found.");
        const result = applyShareAction(stateFromWorkspace(previous, actor.userId), actor, action);
        const next = pruneWorkspace(
          workspaceFromState(result.state, ownerId, previous.rev + 1),
          new Date(),
        );
        try {
          await this.store.save(previous, next);
          saved = next;
          if (result.invite && (action.type === "createInvite" || action.type === "resendInvite")) {
            inviteId = result.invite.id;
            if (result.invite.status === "pending") {
              email = await this.mailer({
                email: result.invite.email,
                token: result.invite.token,
                redirectUrl: inviteRedirectUrl(origin, result.invite.token),
              });
            }
          }
          break;
        } catch (err) {
          if (isConflict(err) && attempt < 2) continue;
          if (isConflict(err)) {
            throw new ShareError(409, "conflict", "Someone else saved. Try again.");
          }
          throw err;
        }
      }
      if (!saved) throw new ShareError(500, "server_error", "Could not save.");
      return { email, inviteId };
    });
    const snap = await this.snapshot(actor);
    return { state: snap.state, email: outcome.email, inviteId: outcome.inviteId };
  }
}
