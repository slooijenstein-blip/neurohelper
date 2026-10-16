import { LIMITS } from "./limits.ts";
import { stripIsoBmffUserData } from "./mp4-strip.ts";

export type PreparedMedia = {
  file: File;
  kind: "image" | "video";
  width?: number;
  height?: number;
  durationSec?: number;
};

function fail(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(fail("imageFail", "image"))),
      "image/jpeg",
      quality,
    );
  });
}

async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    fail("imageFail", "image");
  }
  const edge = Math.max(bitmap.width, bitmap.height);
  const scale = edge > LIMITS.maxImageEdge ? LIMITS.maxImageEdge / edge : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) fail("imageFail", "image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  let quality = LIMITS.imageQuality;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > LIMITS.maxImageBytes && quality > 0.5) {
    quality = Math.round((quality - 0.12) * 100) / 100;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > LIMITS.maxImageBytes) fail("imageFail", "image");
  return { blob, width, height };
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0)
        reject(Object.assign(new Error("duration"), { code: "videoLong" }));
      else resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Object.assign(new Error("video"), { code: "videoMeta" }));
    };
    video.src = url;
  });
}

async function prepareVideo(file: File): Promise<PreparedMedia> {
  if (file.size > LIMITS.maxVideoBytes) fail("videoBig", "size");
  const duration = await readDuration(file);
  if (duration > LIMITS.maxVideoSeconds + 0.4) fail("videoLong", "length");
  const stripped = stripIsoBmffUserData(new Uint8Array(await file.arrayBuffer()));
  if (!stripped.ok) fail("videoMeta", "meta");
  if (stripped.bytes.byteLength > LIMITS.maxVideoBytes) fail("videoBig", "size");
  const copy = new Uint8Array(stripped.bytes.byteLength);
  copy.set(stripped.bytes);
  const next = new File([copy], "video.mp4", { type: "video/mp4" });
  return { file: next, kind: "video", durationSec: Math.max(1, Math.round(duration)) };
}

/** Resize photos on a blank canvas so location data is not copied. Short videos lose user-data boxes. */
export async function prepareCommunityFile(file: File): Promise<PreparedMedia> {
  if (file.type.startsWith("video/")) return prepareVideo(file);
  const image = await compressImage(file);
  return {
    file: new File([image.blob], "photo.jpg", { type: "image/jpeg" }),
    kind: "image",
    width: image.width,
    height: image.height,
  };
}
