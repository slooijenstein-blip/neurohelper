#!/usr/bin/env python3
"""Crop the Synlumae full mark into favicon + transparent logo assets."""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "brand" / "synlumae-full-mark.jpg"
PUBLIC = ROOT / "public"


def flood_from_edges(seed: np.ndarray) -> np.ndarray:
    h, w = seed.shape
    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_seed(y: int, x: int) -> None:
        if seed[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))

    for x in range(w):
        try_seed(0, x)
        try_seed(h - 1, x)
    for y in range(h):
        try_seed(y, 0)
        try_seed(y, w - 1)

    while q:
        y, x = q.popleft()
        if y:
            try_seed(y - 1, x)
        if y + 1 < h:
            try_seed(y + 1, x)
        if x:
            try_seed(y, x - 1)
        if x + 1 < w:
            try_seed(y, x + 1)
    return bg


def dilate(mask: np.ndarray, times: int = 1) -> np.ndarray:
    out = mask
    for _ in range(times):
        nxt = out.copy()
        nxt[1:, :] |= out[:-1, :]
        nxt[:-1, :] |= out[1:, :]
        nxt[:, 1:] |= out[:, :-1]
        nxt[:, :-1] |= out[:, 1:]
        out = nxt
    return out


def content_bbox(mask: np.ndarray, pad: int = 0) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask)
    if xs.size == 0:
        raise SystemExit("no content found for crop")
    left, top, right, bottom = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    h, w = mask.shape
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(w, right + pad),
        min(h, bottom + pad),
    )


def crop_arr(arr: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
    l, t, r, b = box
    return arr[t:b, l:r]


def to_image(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(arr, "RGBA")


def square_pad(im: Image.Image, pad_ratio: float = 0.1) -> Image.Image:
    arr = np.array(im)
    box = content_bbox(arr[:, :, 3] > 8, pad=0)
    cut = im.crop(box)
    w, h = cut.size
    side = int(round(max(w, h) * (1.0 + pad_ratio)))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cut, ((side - w) // 2, (side - h) // 2), cut)
    return canvas


def flatten_white(im: Image.Image) -> Image.Image:
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, im.convert("RGBA")).convert("RGB")


def fit_on_square(im: Image.Image, size: int, pad_ratio: float, opaque: bool) -> Image.Image:
    squared = square_pad(im, pad_ratio=pad_ratio).resize((size, size), Image.Resampling.LANCZOS)
    return flatten_white(squared) if opaque else squared


def knock_text(rgb: np.ndarray) -> np.ndarray:
    """Black wordmark on white → transparent background, opaque black glyphs."""
    lum = rgb.astype(np.float32).mean(axis=2)
    # Ignore JPEG paper noise; anti-aliased edges become semi-transparent black.
    alpha = np.clip((220.0 - lum) / 220.0, 0.0, 1.0)
    alpha = np.where(lum >= 220, 0.0, alpha)
    alpha = np.where(lum <= 40, 1.0, alpha)
    rgba = np.zeros((rgb.shape[0], rgb.shape[1], 4), dtype=np.uint8)
    rgba[:, :, 3] = (alpha * 255.0).astype(np.uint8)
    # Un-premultiply residual paper so strokes stay neutral black.
    a = np.maximum(alpha, 1e-4)[:, :, None]
    rgb_f = rgb.astype(np.float32)
    unpre = np.clip((rgb_f - 255.0 * (1.0 - a)) / a, 0, 255)
    rgba[:, :, :3] = unpre.astype(np.uint8)
    return rgba


def knock_swooshes(rgb: np.ndarray) -> np.ndarray:
    """Keep black/gray marks; drop connected paper; restore a soft center glow."""
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    lum = rgb.astype(np.float32).mean(axis=2)
    paper = (mn >= 246) & ((mx - mn) <= 10)
    bg = flood_from_edges(paper)

    rgba = np.zeros((rgb.shape[0], rgb.shape[1], 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb
    rgba[:, :, 3] = np.where(bg, 0, 255)
    # Drop leftover JPEG glow so we can paint a smooth disc underneath.
    jpeg_glow = (~bg) & (lum >= 230) & ((mx - mn) <= 28)
    rgba[jpeg_glow, 3] = 0

    # Soften only the pale anti-aliased fringe, not the gray swoosh.
    border = (rgba[:, :, 3] > 0) & dilate(bg | jpeg_glow, 2)
    pale = border & (lum >= 210)
    if pale.any():
        alpha = np.clip((255.0 - lum) / 50.0, 0.0, 1.0)
        rgba[pale, 3] = (alpha[pale] * 255.0).astype(np.uint8)
        a = np.maximum(alpha[pale], 1e-4)[:, None]
        unpre = np.clip((rgb[pale].astype(np.float32) - 255.0 * (1.0 - a)) / a, 0, 255)
        rgba[pale, :3] = unpre.astype(np.uint8)

    # Rebuild the open-center glow so it is not a jagged JPEG cutoff.
    ink = rgba[:, :, 3] > 8
    box = content_bbox(ink, pad=0)
    cx = (box[0] + box[2]) / 2.0
    cy = (box[1] + box[3]) / 2.0
    radius = min(box[2] - box[0], box[3] - box[1]) * 0.22
    yy, xx = np.ogrid[: rgb.shape[0], : rgb.shape[1]]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    glow_a = np.exp(-0.5 * (dist / (radius * 0.55)) ** 2)
    glow_a[dist > radius * 1.35] = 0
    glow_a *= 0.88
    glow = np.zeros_like(rgba)
    glow[:, :, 0] = 255
    glow[:, :, 1] = 244
    glow[:, :, 2] = 214
    glow[:, :, 3] = (glow_a * 255.0).astype(np.uint8)

    swoosh = to_image(rgba)
    base = to_image(glow)
    return np.array(Image.alpha_composite(base, swoosh))


def stacked_logo(icon: np.ndarray, word: np.ndarray, gap: int = 36) -> np.ndarray:
    icon_im = to_image(icon)
    word_im = to_image(word)
    width = max(icon_im.width, word_im.width)
    height = icon_im.height + gap + word_im.height
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    canvas.paste(icon_im, ((width - icon_im.width) // 2, 0), icon_im)
    canvas.paste(word_im, ((width - word_im.width) // 2, icon_im.height + gap), word_im)
    return np.array(canvas)


def horizontal_lockup(icon: np.ndarray, word: np.ndarray) -> np.ndarray:
    icon_h = 320
    icon_im = to_image(icon)
    icon_scaled = icon_im.resize(
        (max(1, round(icon_im.width * icon_h / icon_im.height)), icon_h),
        Image.Resampling.LANCZOS,
    )
    word_h = 148
    word_im = to_image(word)
    word_scaled = word_im.resize(
        (max(1, round(word_im.width * word_h / word_im.height)), word_h),
        Image.Resampling.LANCZOS,
    )
    gap = 28
    canvas = Image.new(
        "RGBA",
        (icon_scaled.width + gap + word_scaled.width, icon_h),
        (0, 0, 0, 0),
    )
    canvas.paste(icon_scaled, (0, 0), icon_scaled)
    canvas.paste(word_scaled, (icon_scaled.width + gap, (icon_h - word_h) // 2), word_scaled)
    return np.array(canvas)


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True)


def main() -> None:
    rgb = np.array(Image.open(SOURCE).convert("RGB"))
    lum = rgb.astype(np.float32).mean(axis=2)
    ink = lum < 240

    row_counts = ink.sum(axis=1)
    bands: list[tuple[int, int]] = []
    in_band = False
    start = 0
    for y, count in enumerate(row_counts):
        if count > 20 and not in_band:
            in_band = True
            start = y
        elif count <= 20 and in_band:
            bands.append((start, y))
            in_band = False
    if in_band:
        bands.append((start, len(row_counts)))
    if len(bands) < 2:
        raise SystemExit(f"expected icon + wordmark bands, found {bands}")

    icon_band = bands[0]
    word_band = bands[-1]
    icon_mask = np.zeros_like(ink)
    icon_mask[icon_band[0] : icon_band[1], :] = ink[icon_band[0] : icon_band[1], :]
    word_mask = np.zeros_like(ink)
    word_mask[word_band[0] : word_band[1], :] = ink[word_band[0] : word_band[1], :]

    icon_box = content_bbox(icon_mask, pad=10)
    word_box = content_bbox(word_mask, pad=4)

    icon = knock_swooshes(crop_arr(rgb, icon_box))
    word = knock_text(crop_arr(rgb, word_box))
    full = stacked_logo(icon, word)
    lockup = horizontal_lockup(icon, word)

    PUBLIC.mkdir(parents=True, exist_ok=True)
    save_png(to_image(full), PUBLIC / "logo.png")
    save_png(to_image(lockup), PUBLIC / "logo-lockup.png")
    save_png(square_pad(to_image(icon), pad_ratio=0.08).resize((512, 512), Image.Resampling.LANCZOS), PUBLIC / "logo-icon.png")

    fit_on_square(to_image(icon), 32, 0.14, True).save(PUBLIC / "favicon-32x32.png", format="PNG", optimize=True)
    fit_on_square(to_image(icon), 180, 0.18, True).save(PUBLIC / "apple-touch-icon.png", format="PNG", optimize=True)
    fit_on_square(to_image(icon), 192, 0.18, True).save(PUBLIC / "icon-192.png", format="PNG", optimize=True)
    fit_on_square(to_image(icon), 512, 0.18, True).save(PUBLIC / "icon-512.png", format="PNG", optimize=True)

    ico_src = fit_on_square(to_image(icon), 256, 0.14, True)
    ico_src.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])

    og = Image.new("RGB", (1200, 630), (255, 255, 255))
    full_rgb = flatten_white(to_image(full))
    target_h = 420
    og_logo = full_rgb.resize((round(full_rgb.width * target_h / full_rgb.height), target_h), Image.Resampling.LANCZOS)
    og.paste(og_logo, ((1200 - og_logo.width) // 2, (630 - og_logo.height) // 2))
    og.save(PUBLIC / "og-image.png", format="PNG", optimize=True)

    print("bands", bands)
    print("icon_box", icon_box, "word_box", word_box)
    print("icon", icon.shape, "word", word.shape, "full", full.shape, "lockup", lockup.shape)
    for p in sorted(PUBLIC.glob("*")):
        if p.suffix.lower() in {".png", ".ico"}:
            im = Image.open(p)
            print(f"  {p.name:24} {im.size} {im.mode}")


if __name__ == "__main__":
    main()
