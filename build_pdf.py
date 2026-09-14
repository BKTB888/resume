# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright>=1.45"]
# ///
"""Render resume-en.pdf and resume-hu.pdf from index.html using headless Chromium.

Usage:
    uv run playwright install chromium   # once
    uv run build_pdf.py                  # writes resume-*.pdf (+ screenshots/)
    uv run build_pdf.py --theme slate-teal   # render with another colour preset (id from resume.json "theme")
"""
from __future__ import annotations

import argparse
import http.server
import json
import socketserver
import threading
from functools import partial
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "screenshots"
LANGS = ("en", "hu")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_: object) -> None:  # silence request log
        pass


def serve() -> tuple[socketserver.TCPServer, int]:
    handler = partial(QuietHandler, directory=str(ROOT))
    server = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--theme", metavar="ID", help='colour preset id from resume.json "theme.presets" (default: theme.active)')
    args = ap.parse_args()
    theme_q = f"&theme={args.theme}" if args.theme else ""

    pdf_names = json.loads((ROOT / "resume.json").read_text(encoding="utf-8")).get("meta", {}).get("pdf", {})
    server, port = serve()
    SHOTS.mkdir(exist_ok=True)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for lang in LANGS:
                out = ROOT / pdf_names.get(lang, f"resume-{lang}.pdf")
                url = f"http://127.0.0.1:{port}/index.html?lang={lang}{theme_q}"

                page = browser.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=2)
                page.goto(url, wait_until="networkidle")
                page.wait_for_selector("html[data-ready='1']")
                page.evaluate("document.fonts.ready")
                page.wait_for_timeout(400)  # let CSS transitions settle before screenshots

                page.screenshot(path=SHOTS / f"{lang}-desktop.png", full_page=True)
                page.set_viewport_size({"width": 400, "height": 800})
                page.screenshot(path=SHOTS / f"{lang}-mobile.png", full_page=True)

                page.emulate_media(media="print")
                page.pdf(
                    path=str(out),
                    format="A4",
                    print_background=True,
                    prefer_css_page_size=True,
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                )
                page.close()
                print(f"wrote {out.relative_to(ROOT)}")
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
