import type { Skill } from "../activities-data.ts";

export type CreatorLanguage = "en" | "es" | "";
export type CreatorStatus = "pending" | "published" | "rejected";

/** Stored activity. No child fields. */
export type CreatorActivity = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  minAge: number;
  maxAge: number;
  skill: Skill;
  minutes: number;
  materials: string[];
  steps: string[];
  language: CreatorLanguage;
  status: CreatorStatus;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatorActivityInput = {
  title: string;
  description: string;
  minAge: number;
  maxAge: number;
  skill: Skill;
  minutes: number;
  materials: string[];
  steps: string[];
  language: CreatorLanguage;
};

/** Anyone can see this shape. It has no account id and no review note. */
export type PublishedCreatorActivity = {
  id: string;
  ownerName: string;
  title: string;
  description: string;
  minAge: number;
  maxAge: number;
  skill: Skill;
  minutes: number;
  materials: string[];
  steps: string[];
  language: CreatorLanguage;
  createdAt: string;
  updatedAt: string;
};

export type OwnedCreatorActivity = PublishedCreatorActivity & {
  ownerId: string;
  status: CreatorStatus;
  reviewNote: string;
};
