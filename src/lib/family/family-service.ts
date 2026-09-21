import {
  canCheckOff,
  canDeleteChild,
  canDeletePlan,
  canEditChildProfile,
  canEditPlan,
  canInvite,
  canSeeInvites,
  canSeeMemberEmails,
  canView,
  isOwner,
  roleOnChild,
} from "./permissions";
import {
  FamilyError,
  emptyPlan,
  isAgeBand,
  isFamilyRole,
  isValidEmail,
  nid,
  normalizeEmail,
  type Actor,
  type AgeBand,
  type ChildDetail,
  type ChildRecord,
  type ChildSummary,
  type DayPlan,
  type FamilyDoc,
  type FamilyRole,
  type FamilyStore,
  type InvitePreview,
  type PublicMember,
  type TimeBlock,
  type TokenSigner,
} from "./types";

const PLAN_RETENTION_DAYS = 21;

function cloneDoc(doc: FamilyDoc): FamilyDoc {
  return structuredClone(doc);
}

function prunePlans(child: ChildRecord, today: Date) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - PLAN_RETENTION_DAYS);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  for (const date of Object.keys(child.plans)) {
    if (date < cutoffKey) delete child.plans[date];
  }
}

function toSummary(child: ChildRecord, actorUserId: string): ChildSummary {
  const role = roleOnChild(child, actorUserId);
  if (!role) {
    throw new FamilyError(404, "not_found", "Child not found.");
  }
  return {
    id: child.id,
    displayName: child.displayName,
    ageBand: child.ageBand,
    myRole: role,
    isOwner: isOwner(child, actorUserId),
    memberCount: child.members.length,
    pendingInviteCount: canSeeInvites(role) ? child.invites.length : 0,
  };
}

function toDetail(child: ChildRecord, actorUserId: string): ChildDetail {
  const role = roleOnChild(child, actorUserId);
  if (!role || !canView(role)) {
    throw new FamilyError(404, "not_found", "Child not found.");
  }
  const members: PublicMember[] = child.members.map((member) => {
    const row: PublicMember = {
      userId: member.userId,
      name: member.name,
      role: member.role,
    };
    if (canSeeMemberEmails(role)) row.email = member.email;
    return row;
  });
  return {
    id: child.id,
    displayName: child.displayName,
    ageBand: child.ageBand,
    myRole: role,
    isOwner: isOwner(child, actorUserId),
    ownerUserId: child.ownerUserId,
    members,
    invites: canSeeInvites(role) ? child.invites : [],
  };
}

function normalizeName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new FamilyError(400, "invalid_name", "Please add a first name.");
  if (trimmed.length > 40)
    throw new FamilyError(400, "invalid_name", "Keep the first name under 40 characters.");
  return trimmed;
}

function requireRole(child: ChildRecord, userId: string): FamilyRole {
  const role = roleOnChild(child, userId);
  if (!role || !canView(role)) {
    throw new FamilyError(404, "not_found", "Child not found.");
  }
  return role;
}

function sanitizeBlocks(input: TimeBlock[]): TimeBlock[] {
  const blocks = input.map((block) => {
    const start = block.start.trim();
    if (!/^\d{2}:\d{2}$/.test(start)) {
      throw new FamilyError(400, "invalid_block", "Start time must look like 15:00.");
    }
    const minutes = Math.round(Number(block.minutes));
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) {
      throw new FamilyError(400, "invalid_block", "Keep each block between 1 and 180 minutes.");
    }
    const title = block.title.trim();
    if (!title) throw new FamilyError(400, "invalid_block", "Each block needs a title.");
    const next: TimeBlock = {
      id: block.id.trim() || nid("blk"),
      start,
      minutes,
      title: title.slice(0, 80),
      notes: block.notes.trim().slice(0, 400),
      done: Boolean(block.done),
    };
    const activityId = block.activityId?.trim();
    if (activityId) next.activityId = activityId.slice(0, 80);
    return next;
  });
  return blocks.sort((a, b) => a.start.localeCompare(b.start));
}

const locks = new Map<string, Promise<void>>();

/** Serialize mutations per user so Clerk metadata read/modify/write does not clobber. */
async function withUserLocks<T>(userIds: string[], fn: () => Promise<T>): Promise<T> {
  const unique = [...new Set(userIds)].sort();
  const acquire = async (): Promise<() => void> => {
    const releases: Array<() => void> = [];
    for (const key of unique) {
      const prev = locks.get(key) ?? Promise.resolve();
      let release: () => void = () => undefined;
      const next = new Promise<void>((resolve) => {
        release = resolve;
      });
      locks.set(
        key,
        prev.then(() => next),
      );
      await prev;
      releases.push(release);
    }
    return () => {
      for (const release of releases.reverse()) release();
    };
  };
  const release = await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

export class FamilyService {
  constructor(
    private readonly store: FamilyStore,
    private readonly tokens: TokenSigner,
  ) {}

  private async loadChild(
    actor: Actor,
    childId: string,
  ): Promise<{ ownerDoc: FamilyDoc; child: ChildRecord; ownerUserId: string }> {
    const actorDoc = await this.store.getDoc(actor.userId);
    const owned = actorDoc.children.find((child) => child.id === childId);
    if (owned) {
      return { ownerDoc: actorDoc, child: owned, ownerUserId: actor.userId };
    }
    const ref = actorDoc.memberships.find((item) => item.childId === childId);
    if (!ref) throw new FamilyError(404, "not_found", "Child not found.");
    const ownerDoc = await this.store.getDoc(ref.ownerUserId);
    const child = ownerDoc.children.find((item) => item.id === childId);
    if (!child) throw new FamilyError(404, "not_found", "Child not found.");
    requireRole(child, actor.userId);
    return { ownerDoc, child, ownerUserId: ref.ownerUserId };
  }

  async listChildren(actor: Actor): Promise<ChildSummary[]> {
    const doc = await this.store.getDoc(actor.userId);
    const out: ChildSummary[] = [];
    const seen = new Set<string>();
    for (const child of doc.children) {
      if (!roleOnChild(child, actor.userId)) continue;
      out.push(toSummary(child, actor.userId));
      seen.add(child.id);
    }
    for (const ref of doc.memberships) {
      if (seen.has(ref.childId)) continue;
      const ownerDoc = await this.store.getDoc(ref.ownerUserId);
      const child = ownerDoc.children.find((item) => item.id === ref.childId);
      if (!child) continue;
      if (!roleOnChild(child, actor.userId)) continue;
      out.push(toSummary(child, actor.userId));
      seen.add(child.id);
    }
    return out;
  }

  async getChild(actor: Actor, childId: string): Promise<ChildDetail> {
    const { child } = await this.loadChild(actor, childId);
    return toDetail(child, actor.userId);
  }

  async createChild(
    actor: Actor,
    input: { displayName: string; ageBand: string },
  ): Promise<ChildDetail> {
    if (!isAgeBand(input.ageBand)) {
      throw new FamilyError(400, "invalid_age_band", "Pick an age band.");
    }
    const displayName = normalizeName(input.displayName);
    const child: ChildRecord = {
      id: nid("ch"),
      displayName,
      ageBand: input.ageBand,
      createdAt: new Date().toISOString(),
      ownerUserId: actor.userId,
      members: [
        {
          userId: actor.userId,
          email: normalizeEmail(actor.email),
          name: actor.name || "Parent",
          role: "parent",
        },
      ],
      invites: [],
      plans: {},
    };
    await withUserLocks([actor.userId], async () => {
      const doc = cloneDoc(await this.store.getDoc(actor.userId));
      doc.children.unshift(child);
      await this.store.putDoc(actor.userId, doc);
    });
    return toDetail(child, actor.userId);
  }

  async updateChild(
    actor: Actor,
    childId: string,
    patch: { displayName?: string; ageBand?: AgeBand },
  ): Promise<ChildDetail> {
    return withUserLocks([actor.userId], async () => {
      const { ownerDoc, child, ownerUserId } = await this.loadChild(actor, childId);
      const role = requireRole(child, actor.userId);
      if (!canEditChildProfile(role)) {
        throw new FamilyError(403, "forbidden", "Only a parent can edit this child profile.");
      }
      const next = cloneDoc(ownerDoc);
      const target = next.children.find((item) => item.id === child.id);
      if (!target) throw new FamilyError(404, "not_found", "Child not found.");
      if (patch.displayName !== undefined) target.displayName = normalizeName(patch.displayName);
      if (patch.ageBand !== undefined) {
        if (!isAgeBand(patch.ageBand))
          throw new FamilyError(400, "invalid_age_band", "Pick an age band.");
        target.ageBand = patch.ageBand;
      }
      await this.store.putDoc(ownerUserId, next);
      return toDetail(target, actor.userId);
    });
  }

  async deleteChild(actor: Actor, childId: string): Promise<void> {
    await withUserLocks([actor.userId], async () => {
      const { ownerDoc, child, ownerUserId } = await this.loadChild(actor, childId);
      const role = requireRole(child, actor.userId);
      if (!canDeleteChild(role, isOwner(child, actor.userId))) {
        throw new FamilyError(
          403,
          "forbidden",
          "Only the parent who added this child can remove them.",
        );
      }
      const next = cloneDoc(ownerDoc);
      next.children = next.children.filter((item) => item.id !== child.id);
      await this.store.putDoc(ownerUserId, next);
    });
  }

  async invite(
    actor: Actor,
    childId: string,
    input: { email: string; role: string },
  ): Promise<{ token: string; email: string; role: FamilyRole; inviteId: string }> {
    const invitedRole = input.role;
    if (!isFamilyRole(invitedRole)) {
      throw new FamilyError(400, "invalid_role", "Pick Parent, Therapist, or Caregiver.");
    }
    if (!isValidEmail(input.email)) {
      throw new FamilyError(400, "invalid_email", "Enter a valid email address.");
    }
    const email = normalizeEmail(input.email);
    if (email === normalizeEmail(actor.email)) {
      throw new FamilyError(400, "invalid_email", "You already have access.");
    }

    return withUserLocks([actor.userId], async () => {
      const { ownerDoc, child, ownerUserId } = await this.loadChild(actor, childId);
      const role = requireRole(child, actor.userId);
      if (!canInvite(role)) {
        throw new FamilyError(
          403,
          "forbidden",
          "Only a parent can invite other people. Ask a parent if you need someone added.",
        );
      }
      const next = cloneDoc(ownerDoc);
      const target = next.children.find((item) => item.id === child.id);
      if (!target) throw new FamilyError(404, "not_found", "Child not found.");
      if (target.members.some((member) => member.email === email)) {
        throw new FamilyError(409, "already_member", "That person already has access.");
      }
      target.invites = target.invites.filter((invite) => invite.email !== email);
      const inviteId = nid("inv");
      target.invites.push({
        id: inviteId,
        email,
        role: invitedRole,
        createdAt: new Date().toISOString(),
        invitedByUserId: actor.userId,
      });
      await this.store.putDoc(ownerUserId, next);
      return {
        token: this.tokens.sign(ownerUserId, inviteId),
        email,
        role: invitedRole,
        inviteId,
      };
    });
  }

  async cancelInvite(actor: Actor, childId: string, inviteId: string): Promise<ChildDetail> {
    return withUserLocks([actor.userId], async () => {
      const { ownerDoc, child, ownerUserId } = await this.loadChild(actor, childId);
      const role = requireRole(child, actor.userId);
      if (!canInvite(role)) {
        throw new FamilyError(403, "forbidden", "Only a parent can manage invites.");
      }
      const next = cloneDoc(ownerDoc);
      const target = next.children.find((item) => item.id === child.id);
      if (!target) throw new FamilyError(404, "not_found", "Child not found.");
      target.invites = target.invites.filter((invite) => invite.id !== inviteId);
      await this.store.putDoc(ownerUserId, next);
      return toDetail(target, actor.userId);
    });
  }

  async peekInvite(token: string): Promise<InvitePreview> {
    const parsed = this.tokens.parse(token);
    if (!parsed) throw new FamilyError(404, "not_found", "This invite link is not valid.");
    const ownerDoc = await this.store.getDoc(parsed.ownerUserId);
    for (const child of ownerDoc.children) {
      const invite = child.invites.find((item) => item.id === parsed.inviteId);
      if (invite) {
        return {
          childDisplayName: child.displayName,
          role: invite.role,
          invitedEmail: invite.email,
        };
      }
    }
    throw new FamilyError(404, "not_found", "This invite is no longer available.");
  }

  async acceptInvite(actor: Actor, token: string): Promise<ChildDetail> {
    const parsed = this.tokens.parse(token);
    if (!parsed) throw new FamilyError(404, "not_found", "This invite link is not valid.");
    const actorEmail = normalizeEmail(actor.email);

    return withUserLocks([parsed.ownerUserId, actor.userId], async () => {
      const ownerDoc = cloneDoc(await this.store.getDoc(parsed.ownerUserId));
      const child = ownerDoc.children.find((item) =>
        item.invites.some((inv) => inv.id === parsed.inviteId),
      );
      if (!child) throw new FamilyError(404, "not_found", "This invite is no longer available.");
      const invite = child.invites.find((item) => item.id === parsed.inviteId);
      if (!invite) throw new FamilyError(404, "not_found", "This invite is no longer available.");
      if (invite.email !== actorEmail) {
        throw new FamilyError(
          403,
          "wrong_email",
          "Sign in with the email this invite was sent to, then open the link again.",
        );
      }
      if (!child.members.some((member) => member.userId === actor.userId)) {
        child.members.push({
          userId: actor.userId,
          email: actorEmail,
          name: actor.name || invite.email.split("@")[0] || "Member",
          role: invite.role,
        });
      }
      child.invites = child.invites.filter((item) => item.id !== invite.id);
      await this.store.putDoc(parsed.ownerUserId, ownerDoc);

      if (actor.userId !== parsed.ownerUserId) {
        const memberDoc = cloneDoc(await this.store.getDoc(actor.userId));
        if (!memberDoc.memberships.some((item) => item.childId === child.id)) {
          memberDoc.memberships.push({
            childId: child.id,
            ownerUserId: parsed.ownerUserId,
            role: invite.role,
          });
          await this.store.putDoc(actor.userId, memberDoc);
        }
      }
      return toDetail(child, actor.userId);
    });
  }

  async getPlan(actor: Actor, childId: string, date: string): Promise<DayPlan> {
    const { child } = await this.loadChild(actor, childId);
    requireRole(child, actor.userId);
    return child.plans[date] ?? emptyPlan(date, actor.userId);
  }

  async savePlan(
    actor: Actor,
    childId: string,
    date: string,
    blocks: TimeBlock[],
  ): Promise<DayPlan> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new FamilyError(400, "invalid_date", "Pick a valid day.");
    }
    return withUserLocks([actor.userId], async () => {
      const { ownerDoc, child, ownerUserId } = await this.loadChild(actor, childId);
      const role = requireRole(child, actor.userId);
      if (!canEditPlan(role)) {
        throw new FamilyError(
          403,
          "forbidden",
          "Caregivers can tick activities as done, but cannot change the plan.",
        );
      }
      const next = cloneDoc(ownerDoc);
      const target = next.children.find((item) => item.id === child.id);
      if (!target) throw new FamilyError(404, "not_found", "Child not found.");
      prunePlans(target, new Date());
      const existing = target.plans[date];
      const plan: DayPlan = {
        id: existing?.id ?? nid("pl"),
        date,
        updatedAt: new Date().toISOString(),
        updatedByUserId: actor.userId,
        blocks: sanitizeBlocks(blocks),
      };
      target.plans[date] = plan;
      await this.store.putDoc(ownerUserId, next);
      return plan;
    });
  }

  async deletePlan(actor: Actor, childId: string, date: string): Promise<void> {
    await withUserLocks([actor.userId], async () => {
      const { ownerDoc, child, ownerUserId } = await this.loadChild(actor, childId);
      const role = requireRole(child, actor.userId);
      if (!canDeletePlan(role)) {
        throw new FamilyError(403, "forbidden", "Only a parent can delete this plan.");
      }
      const next = cloneDoc(ownerDoc);
      const target = next.children.find((item) => item.id === child.id);
      if (!target) throw new FamilyError(404, "not_found", "Child not found.");
      delete target.plans[date];
      await this.store.putDoc(ownerUserId, next);
    });
  }

  async setBlockDone(
    actor: Actor,
    childId: string,
    date: string,
    blockId: string,
    done: boolean,
  ): Promise<DayPlan> {
    return withUserLocks([actor.userId], async () => {
      const { ownerDoc, child, ownerUserId } = await this.loadChild(actor, childId);
      const role = requireRole(child, actor.userId);
      if (!canCheckOff(role)) {
        throw new FamilyError(404, "not_found", "Child not found.");
      }
      const next = cloneDoc(ownerDoc);
      const target = next.children.find((item) => item.id === child.id);
      if (!target) throw new FamilyError(404, "not_found", "Child not found.");
      const plan = target.plans[date];
      if (!plan) throw new FamilyError(404, "not_found", "No plan for this day.");
      const block = plan.blocks.find((item) => item.id === blockId);
      if (!block) throw new FamilyError(404, "not_found", "That activity is not on the plan.");
      block.done = done;
      plan.updatedAt = new Date().toISOString();
      plan.updatedByUserId = actor.userId;
      await this.store.putDoc(ownerUserId, next);
      return plan;
    });
  }
}
