import { CommunityError, LIMITS } from "./limits.ts";
import type { MediaKind, SocialMedia } from "./types.ts";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

const IMAGE_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const VIDEO_EXT: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
};

export function localMediaPath(id: string): string {
  return `/api/community/media/${id}`;
}

export function localUploadId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /^\/api\/community\/media\/(cupl_[a-z0-9]{8,32})$/.exec(url);
  return match?.[1] ?? null;
}

export function isBlobHostUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Pathname only. Never a URL, and only inside this member's community folder. */
export function isOwnedBlobPath(pathname: string, userId: string): boolean {
  if (!userId || !/^[a-zA-Z0-9_-]{1,80}$/.test(userId)) return false;
  const file = blobFileName(pathname);
  if (!file) return false;
  return file.userId === userId;
}

export function isSafeBlobPath(pathname: string): boolean {
  return blobFileName(pathname) !== null;
}

function blobFileName(pathname: string): { userId: string; file: string } | null {
  if (!pathname || pathname.length > 300) return null;
  if (pathname.includes("\\") || pathname.includes("\0") || pathname.includes("://")) return null;
  const parts = pathname.split("/");
  if (parts.length !== 3) return null;
  const [root, userId, file] = parts;
  if (root !== "community" || !userId || !file) return null;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(userId)) return null;
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(file)) return null;
  return { userId, file };
}

export function blobUploadLimits(pathname: string): {
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
} | null {
  const parsed = blobFileName(pathname);
  if (!parsed) return null;
  const ext = parsed.file.split(".").pop()?.toLowerCase() ?? "";
  const image = IMAGE_EXT[ext];
  if (image) return { allowedContentTypes: [image], maximumSizeInBytes: LIMITS.maxImageBytes };
  const video = VIDEO_EXT[ext];
  if (video) return { allowedContentTypes: [video], maximumSizeInBytes: LIMITS.maxVideoBytes };
  return null;
}

export function mediaFromUpload(input: {
  url: string;
  kind: MediaKind;
  contentType: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  blobPath?: string;
}): SocialMedia {
  if (isBlobHostUrl(input.url)) {
    throw new CommunityError(400, "invalid", "That file is not in community storage.");
  }
  const contentType = input.contentType.toLowerCase();
  if (input.kind === "image" && !IMAGE_TYPES.has(contentType)) {
    throw new CommunityError(400, "invalid", "Use a JPEG, PNG, or WebP picture.");
  }
  if (input.kind === "video" && !VIDEO_TYPES.has(contentType)) {
    throw new CommunityError(400, "invalid", "Use an MP4 or MOV video.");
  }
  if (!Number.isFinite(input.bytes) || input.bytes <= 0) {
    throw new CommunityError(400, "invalid", "That file is empty.");
  }
  if (input.kind === "image" && input.bytes > LIMITS.maxImageBytes) {
    throw new CommunityError(400, "invalid", "That picture is too large.");
  }
  if (input.kind === "video" && input.bytes > LIMITS.maxVideoBytes) {
    throw new CommunityError(400, "video_too_big", "That video is too large.");
  }
  if (input.kind === "video") {
    const duration = input.durationSec ?? 0;
    if (duration <= 0 || duration > LIMITS.maxVideoSeconds) {
      throw new CommunityError(400, "video_too_long", "Videos can be up to 60 seconds.");
    }
  }
  const width = optionalEdge(input.width);
  const height = optionalEdge(input.height);
  return {
    kind: input.kind,
    url: input.url,
    contentType,
    bytes: Math.round(input.bytes),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(input.kind === "video" ? { durationSec: Math.round(input.durationSec ?? 0) } : {}),
    ...(input.blobPath ? { blobPath: input.blobPath } : {}),
  };
}

function optionalEdge(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 1 || value > 4000) {
    throw new CommunityError(400, "invalid", "That picture size looks wrong.");
  }
  return Math.round(value);
}
