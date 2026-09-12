# /// script
# requires-python = ">=3.11"
# dependencies = ["opencv-python-headless>=4.9,<5", "pillow>=10"]
# ///
"""Detect faces in large photos and write square head-and-shoulders crops.

Usage:
    uv run tools/crop_faces.py <photo.jpg> [<photo.jpg> ...]

Writes assets/photos/<stem-number>-<k>.jpg (800x800) for every face found
and prints a summary. Review the crops and delete the ones you don't want.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "photos"

DETECT_WIDTH = 2000        # downscale for detection; crop from full-res
CROP_FACTOR = 2.3          # crop side relative to detected face width
UP_SHIFT = 0.10            # move crop centre up by this fraction of the side
MIN_FACE_FRAC = 0.03       # ignore faces narrower than 3% of the image width
OUT_SIZE = 800


def detect(img: Image.Image) -> list[tuple[int, int, int, int]]:
    scale = DETECT_WIDTH / img.width
    small = img.resize((DETECT_WIDTH, round(img.height * scale)), Image.LANCZOS)
    gray = cv2.cvtColor(np.asarray(small), cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=6, minSize=(40, 40))
    boxes = []
    for (x, y, w, h) in faces:
        if w < MIN_FACE_FRAC * DETECT_WIDTH:
            continue
        boxes.append(tuple(round(v / scale) for v in (x, y, w, h)))
    # left to right so numbering is stable
    return sorted(boxes, key=lambda b: b[0])


def crop_square(img: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    x, y, w, h = box
    side = round(w * CROP_FACTOR)
    cx = x + w / 2
    cy = y + h / 2 - side * UP_SHIFT
    left = round(cx - side / 2)
    top = round(cy - side / 2)
    # clamp to the image; shrink the square if it doesn't fit at all
    side = min(side, img.width, img.height)
    left = max(0, min(left, img.width - side))
    top = max(0, min(top, img.height - side))
    return img.crop((left, top, left + side, top + side)).resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


def main(paths: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for p in paths:
        src = Path(p).expanduser()
        img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        num = re.search(r"(\d+)(?=\.\w+$)", src.name)
        stem = num.group(1) if num else src.stem
        boxes = detect(img)
        written = []
        for k, box in enumerate(boxes, 1):
            out = OUT / f"{stem}-{k}.jpg"
            crop_square(img, box).save(out, "JPEG", quality=88, optimize=True)
            written.append(out.name)
        print(f"{src.name}: {len(boxes)} face(s) -> {', '.join(written) or '-'}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
