# Resume

Bilingual (English / Hungarian) single-page résumé with one-click PDF download.
Plain static files — no build step for the page itself; only the PDFs are pre-rendered.

## Files

| Path | Purpose |
|---|---|
| `resume.json` | **All content lives here.** Edit this, nothing else. |
| `index.html`, `css/style.css`, `js/app.js` | The page. Renders `resume.json` in the chosen language. |
| `resume-en.pdf`, `resume-hu.pdf` | Pre-built PDFs linked from the "Download PDF" button. |
| `build_pdf.py` | Rebuilds both PDFs (and screenshots) with headless Chromium. `--theme <id>` renders another colour preset. |
| `assets/photo.webp` | The photo (square, circle-masked). Optional `basics.photoFrame` `{scale, x, y}` pans/zooms it inside the circle. |
| `assets/photos/` | Local candidate photos for the `?photos` picker. **Gitignored — never published.** |
| `tools/` | `crop_faces.py` (face crops from photos) and `bake_photo.py` (bake a picker framing into `assets/photo.webp`). |

## Editing content

Every translatable value in `resume.json` is an object with both languages:

```json
"title": { "en": "Software Developer", "hu": "Szoftverfejlesztő" }
```

Plain strings (name, email, URLs, skill names) are shared across languages.
Dates are `"YYYY-MM"` or `"YYYY"`; `"end": null` means "present" and is translated automatically.
Empty or missing sections (`projects`, `certificates`, `interests`, …) are simply not rendered.
Section headings and button labels are in the `ui` block.

## Photo

Open the page with **`?photos`** to get a picker panel: an initials avatar, the current photo, and candidates from two private sources:

- any image in `assets/photos/` (one level of subfolders too) — the folder is gitignored and read from the local server's directory listing, so it only works with `uv run python -m http.server`, never on GitHub Pages;
- photos added with the **+** thumb, chosen from anywhere on your computer and kept in the browser (IndexedDB) until you remove them.

Pick one, then drag the avatar to move it and scroll on it (or use the Zoom slider) to enlarge. The choice and framing are saved in your browser only. When it looks right, run the `tools/bake_photo.py` command the panel prints — it writes the framed crop to `assets/photo.webp`, the only photo that is published — then rebuild the PDFs. For a photo added with **+** the browser doesn't know where the file lives, so put its real path in place of the `<path to …>` placeholder. `tools/crop_faces.py photo.jpg …` makes head-and-shoulders crops from full photos.

## Colours

The `theme` block in `resume.json` holds named colour presets; `active` is the one everyone sees:

```json
"theme": {
  "active": "navy-amber",
  "presets": [
    { "id": "navy-amber", "name": "Navy & amber",
      "colors": { "side": "#14213D", "sideDeep": "#0E172B", "accent": "#FCA311", "pageBg": "#E9ECF1", "ink": "#1A1A1A" } }
  ]
}
```

A preset is just five colours (sidebar top/bottom, accent, page background, text); every other tint, rule and shadow is derived from them in `css/style.css` with `color-mix()`.

To try presets out, open the page with **`?themes`** (flags combine: `?themes&photos`) (e.g. `http://localhost:8080/?themes`). A panel appears where you can switch presets, edit the active one's colours and name live, duplicate it into a new preset, and delete or reset ones you changed. Edits are saved in your browser as you type; when you like one, **Copy JSON** and paste the block over `theme` in `resume.json` to make it permanent (and set `active` to it). `?theme=<id>` forces a preset without the panel, and a choice made in the panel is remembered in that browser.

## Preview locally

```sh
uv run python -m http.server 8080
# open http://localhost:8080  (?lang=hu forces Hungarian)
```

The page fetches `resume.json`, so it must be served over HTTP — opening `index.html` directly from disk won't work.

## Rebuild the PDFs

```sh
uv run playwright install chromium   # once
uv run build_pdf.py
```

Writes `resume-en.pdf`, `resume-hu.pdf` and `screenshots/*.png` (desktop + mobile, both languages).
`uv run build_pdf.py --theme slate-teal` renders a different colour preset instead of `theme.active` — handy for judging a preset on paper, but it overwrites the same files, so rebuild without the flag before committing.
The PDFs use the same `@media print` stylesheet as the browser's Print / "Save as PDF", so both look identical.

**Rebuild and commit the PDFs whenever you change `resume.json`** — GitHub Pages serves the committed files.

## Deploy to GitHub Pages

1. Create a repository and push this folder to its `main` branch.
2. Repository → Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
3. The page is live at `https://<username>.github.io/<repo>/` within a minute.
   Send that link to recruiters; the PDF buttons work directly from there.

Language is chosen in this order: `?lang=` in the URL → last choice saved in the browser → Hungarian by default.
