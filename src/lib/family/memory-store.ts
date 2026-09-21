import { emptyDoc, type FamilyDoc, type FamilyStore } from "./types";

export class MemoryFamilyStore implements FamilyStore {
  readonly docs = new Map<string, FamilyDoc>();

  async getDoc(userId: string): Promise<FamilyDoc> {
    const existing = this.docs.get(userId);
    return existing ? structuredClone(existing) : emptyDoc();
  }

  async putDoc(userId: string, doc: FamilyDoc): Promise<void> {
    this.docs.set(userId, structuredClone(doc));
  }
}

export class LocalStorageFamilyStore extends MemoryFamilyStore {
  constructor(private readonly storageKey: string) {
    super();
    this.hydrate();
  }

  private hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, FamilyDoc>;
      for (const [userId, doc] of Object.entries(parsed)) {
        this.docs.set(userId, doc);
      }
    } catch {
      /* ignore corrupt local data */
    }
  }

  override async putDoc(userId: string, doc: FamilyDoc): Promise<void> {
    await super.putDoc(userId, doc);
    if (typeof window === "undefined") return;
    const snapshot: Record<string, FamilyDoc> = {};
    for (const [id, value] of this.docs) snapshot[id] = value;
    window.localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
  }
}
