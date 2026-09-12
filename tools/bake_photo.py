# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10"]
# ///
"""Bake a photo picker framing into a square image.

Usage:
    uv run tools/bake_photo.py <source.jpg> <scale> <x> <y> [out] [size]

<scale> <x> <y> are the values from the picker's "photoFrame" line. The
source may be the original full-resolution photo (better quality) or the
same file the picker used; the framing is relative, so both give the same
crop. Writes assets/photo.webp (1000x1000) by default. A .webp or .png
output is masked to the circle (transparent corners); .jpg stays square.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    src = Path(sys.argv[1]).expanduser()
    scale, x, y = (float(v) for v in sys.argv[2:5])
    out = Path(sys.argv[5]) if len(sys.argv) > 5 else ROOT / "assets" / "photo.webp"
    size = int(sys.argv[6]) if len(sys.argv) > 6 else 1000

    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    W, H = img.size

    # The page fits the image to the circle by its short side and centres it,
    # then applies translate(x%, y%) scale(scale) about the circle centre.
    # Work in "frame units" where the circle diameter is 100.
    short, long_ = (H, W) if W >= H else (W, H)
    k = short / 100                              # source px per frame unit
    disp_w, disp_h = W / k, H / k                # displayed image size in frame units
    off_x, off_y = (100 - disp_w) / 2, (100 - disp_h) / 2

    side = 100 / scale                           # visible square, frame units
    fx = 50 - (x + 50) / scale                   # top-left of visible square
    fy = 50 - (y + 50) / scale

    left = (fx - off_x) * k
    top = (fy - off_y) * k
    px = side * k
    box = (round(left), round(top), round(left + px), round(top + px))
    if box[0] < 0 or box[1] < 0 or box[2] > W or box[3] > H:
        print(f"note: framing extends beyond the photo ({box} vs {W}x{H}); edges will be padded")
        canvas = Image.new("RGB", (max(W, box[2]) - min(0, box[0]), max(H, box[3]) - min(0, box[1])), (20, 33, 61))
        canvas.paste(img, (-min(0, box[0]), -min(0, box[1])))
        img = canvas
        box = tuple(v - m for v, m in zip(box, (min(0, box[0]), min(0, box[1])) * 2))

    out.parent.mkdir(parents=True, exist_ok=True)
    square = img.crop(box).resize((size, size), Image.LANCZOS)
    if out.suffix.lower() in (".png", ".webp"):
        # supersampled circular alpha mask for a smooth edge
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
        square.putalpha(mask.resize((size, size), Image.LANCZOS))
        if out.suffix.lower() == ".png":
            square.save(out, "PNG", optimize=True)
        else:
            square.save(out, "WEBP", quality=86, method=6)
    else:
        square.save(out, "JPEG", quality=88, optimize=True)
    print(f"wrote {out} from {src.name} crop {box} ({round(px)}px source)")


if __name__ == "__main__":
    if len(sys.argv) < 5:
        sys.exit(__doc__)
    main()
