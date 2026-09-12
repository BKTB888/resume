# Resume

Bilingual (English / Hungarian) single-page résumé with one-click PDF download.
Plain static files — no build step for the page itself; only the PDFs are pre-rendered.

## Files

| Path | Purpose |
|---|---|
| `resume.json` | **All content lives here.** Edit this, nothing else. |
| `index.html`, `css/style.css`, `js/app.js` | The page. Renders `resume.json` in the chosen language. |
| `resume-en.pdf`, `resume-hu.pdf` | Pre-built PDFs linked from the "Download PDF" button. |
| `build_pdf.py` | Rebuilds both PDFs (and screenshots) with headless Chromium. |
| `assets/photos/` | Candidate photos. While `basics.photoCandidates` lists files, the page shows a **Photo picker** panel (bottom-right) to try them; the choice is saved per browser only. Set `basics.photo` to the winner and remove `photoCandidates` to finalise. Without a photo an initials avatar is shown. |
| `tools/crop_faces.py` | `uv run tools/crop_faces.py photo.jpg …` — detects faces and writes 800×800 head-and-shoulders crops into `assets/photos/`. |

## Editing content

Every translatable value in `resume.json` is an object with both languages:

```json
"title": { "en": "Software Developer", "hu": "Szoftverfejlesztő" }
```

Plain strings (name, email, URLs, skill names) are shared across languages.
Dates are `"YYYY-MM"` or `"YYYY"`; `"end": null` means "present" and is translated automatically.
Empty or missing sections (`projects`, `certificates`, `interests`, …) are simply not rendered.
Section headings and button labels are in the `ui` block.

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
The PDFs use the same `@media print` stylesheet as the browser's Print / "Save as PDF", so both look identical.

**Rebuild and commit the PDFs whenever you change `resume.json`** — GitHub Pages serves the committed files.

## Deploy to GitHub Pages

1. Create a repository and push this folder to its `main` branch.
2. Repository → Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
3. The page is live at `https://<username>.github.io/<repo>/` within a minute.
   Send that link to recruiters; the PDF buttons work directly from there.

Language is chosen in this order: `?lang=` in the URL → last choice saved in the browser → Hungarian by default.
