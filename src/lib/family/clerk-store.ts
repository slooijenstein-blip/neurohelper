import { createClerkClient } from "@clerk/backend";

import { emptyDoc, type FamilyDoc, type FamilyStore } from "./types";

const METADATA_KEY = "synlumaeFamily";

function asFamilyDoc(value: unknown): FamilyDoc | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Partial<FamilyDoc>;
  if (doc.v !== 1 || !Array.isArray(doc.children) || !Array.isArray(doc.memberships)) return null;
  return value as FamilyDoc;
}

export function createClerkFamilyStore(secretKey: string): FamilyStore {
  let client: ReturnType<typeof createClerkClient> | null = null;
  const clerk = () => {
    client ??= createClerkClient({ secretKey });
    return client;
  };

  return {
    async getDoc(userId) {
      const user = await clerk().users.getUser(userId);
      return asFamilyDoc(user.privateMetadata[METADATA_KEY]) ?? emptyDoc();
    },
    async putDoc(userId, doc) {
      const user = await clerk().users.getUser(userId);
      await clerk().users.updateUser(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          [METADATA_KEY]: doc,
        },
      });
    },
  };
}
