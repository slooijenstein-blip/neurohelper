import type { Role } from "@/lib/app-store";

export const ROLE_MESSAGE_KEY: Record<Role, string> = {
  Parent: "roles.parent",
  "Legal Guardian": "roles.legalGuardian",
  Teacher: "roles.teacher",
  Therapist: "roles.therapist",
  Creator: "roles.creator",
  Grandparent: "roles.grandparent",
  "Family Member": "roles.familyMember",
  Caregiver: "roles.caregiver",
  Other: "roles.other",
};
