const DROP = new Set(["udta", "meta"]);
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "moof", "traf"]);

export type StripResult = { ok: true; bytes: Uint8Array } | { ok: false; reason: "unparsed" };

function ascii(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function makeBox(type: string, payload: Uint8Array): Uint8Array {
  const size = 8 + payload.length;
  if (size > 0xffff_fff0) throw new Error("box too large");
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, size);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(payload, 8);
  return out;
}

function boxSize(input: Uint8Array, offset: number, end: number): { size: number; header: number } {
  const size32 = readU32(input, offset);
  if (size32 === 1) {
    if (offset + 16 > end) throw new Error("truncated largesize");
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    const high = view.getUint32(offset + 8);
    const low = view.getUint32(offset + 12);
    const size = high * 0x1_0000_0000 + low;
    return { size, header: 16 };
  }
  if (size32 === 0) return { size: end - offset, header: 8 };
  return { size: size32, header: 8 };
}

function rewrite(input: Uint8Array, start: number, end: number): Uint8Array {
  const parts: Uint8Array[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    const { size, header } = boxSize(input, offset, end);
    if (!Number.isFinite(size) || size < header || offset + size > end) throw new Error("bad size");
    const type = ascii(input, offset + 4);
    const boxEnd = offset + size;
    if (!DROP.has(type)) {
      if (CONTAINERS.has(type)) parts.push(makeBox(type, rewrite(input, offset + header, boxEnd)));
      else parts.push(input.slice(offset, boxEnd));
    }
    offset = boxEnd;
  }
  if (offset !== end) throw new Error("trailing bytes");
  return concat(parts);
}

/** Drop location and other user-data boxes from an MP4 or MOV. Playback boxes stay. */
export function stripIsoBmffUserData(input: Uint8Array): StripResult {
  if (input.length < 8) return { ok: false, reason: "unparsed" };
  if (ascii(input, 4) !== "ftyp") return { ok: false, reason: "unparsed" };
  try {
    const bytes = rewrite(input, 0, input.length);
    if (bytes.length < 8 || ascii(bytes, 4) !== "ftyp") return { ok: false, reason: "unparsed" };
    return { ok: true, bytes };
  } catch {
    return { ok: false, reason: "unparsed" };
  }
}
