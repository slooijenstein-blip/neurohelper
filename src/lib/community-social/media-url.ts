import { CommunityError, LIMITS } from "./limits.ts";
import type { MediaKind, SocialMedia } from "./types.ts";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

export function isPublicBlobUrl(url: string, userId: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    const hosted =
      host.endsWith(".public.blob.vercel-storage.com") || host.endsWith(".blob.vercel-storage.com");
    if (!hosted) return false;
    const path = decodeURIComponent(parsed.pathname);
    return path.includes(`/community/${userId}/`);
  } catch {
    return false;
  }
}

export function localMediaPath(id: string): string {
  return `/api/community/media/${id}`;
}

export function mediaFromUpload(input: {
  url: string;
  kind: MediaKind;
  contentType: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
}): SocialMedia {
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
  };
}

function optionalEdge(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 1 || value > 4000) {
    throw new CommunityError(400, "invalid", "That picture size looks wrong.");
  }
  return Math.round(value);
}
