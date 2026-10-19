import type { ReportReason } from "../community.ts";

export const MEDIA_KINDS = ["image", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const POST_STATUSES = ["pending", "approved", "rejected", "removed"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const GROUP_VISIBILITIES = ["public", "private", "hidden"] as const;
export type GroupVisibility = (typeof GROUP_VISIBILITIES)[number];

export const GROUP_ROLES = ["owner", "admin", "moderator", "member"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

export const MEMBER_STATUSES = ["active", "requested", "banned"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export type SocialMedia = {
  kind: MediaKind;
  url: string;
  contentType: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
};

export type SocialComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
  status: "visible" | "removed";
};

export type SocialPerson = {
  userId: string;
  name: string;
  role: string;
};

export type SocialTag = {
  userId: string;
  name: string;
};

export type SocialShare = {
  userId: string;
  name: string;
  byUserId: string;
  createdAt: string;
};

export type SocialPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
  status: PostStatus;
  statusReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  editedAt?: string;
  groupId: string | null;
  media: SocialMedia | null;
  privacyAck: boolean;
  consent: boolean;
  likeUserIds: string[];
  comments: SocialComment[];
  tags?: SocialTag[];
  shares?: SocialShare[];
};

export type SocialGroup = {
  id: string;
  name: string;
  description: string;
  rules: string;
  visibility: GroupVisibility;
  coverUrl: string | null;
  joinQuestion: string;
  createdBy: string;
  createdAt: string;
};

export type SocialMembership = {
  groupId: string;
  userId: string;
  name: string;
  role: GroupRole;
  status: MemberStatus;
  answer: string;
  createdAt: string;
};

export type SocialReport = {
  id: string;
  targetType: "post" | "comment";
  postId: string;
  commentId?: string;
  excerpt: string;
  reporterId: string;
  reporterName: string;
  reason: ReportReason;
  note: string;
  createdAt: string;
  status: "open" | "resolved";
};

export type SocialSuspension = {
  userId: string;
  reason: string;
  byUserId: string;
  createdAt: string;
  active: boolean;
};

export type SocialUpload = {
  id: string;
  userId: string;
  media: SocialMedia;
  createdAt: string;
};

export type CommunityDb = {
  posts: SocialPost[];
  groups: SocialGroup[];
  members: SocialMembership[];
  reports: SocialReport[];
  suspensions: SocialSuspension[];
  moderators: string[];
  uploads: SocialUpload[];
  people?: SocialPerson[];
};

export type ClientMedia = {
  kind: MediaKind;
  url: string;
  width?: number;
  height?: number;
  durationSec?: number;
};

export type ClientComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
};

export type ClientTag = {
  userId: string;
  name: string;
};

export type ClientPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
  status: PostStatus;
  statusReason?: string;
  editedAt?: string;
  groupId: string | null;
  groupName?: string;
  media: ClientMedia | null;
  likeCount: number;
  liked: boolean;
  comments: ClientComment[];
  tags: ClientTag[];
};

export type ClientPerson = {
  userId: string;
  name: string;
  role: string;
};

export type ClientGroup = {
  id: string;
  name: string;
  description: string;
  rules: string;
  visibility: GroupVisibility;
  coverUrl: string | null;
  joinQuestion: string;
  memberCount: number;
  myRole: GroupRole | null;
  requested: boolean;
  banned: boolean;
  pendingRequests: number;
};

export type ClientMember = {
  userId: string;
  name: string;
  role: GroupRole;
  status: MemberStatus;
  answer: string;
};

export type ClientReport = {
  id: string;
  targetType: "post" | "comment";
  postId: string;
  commentId?: string;
  excerpt: string;
  reporterName: string;
  reason: ReportReason;
  note: string;
  createdAt: string;
};
