/* Resume renderer: loads resume.json and renders it in the chosen language. */
(() => {
  "use strict";

  const LANGS = ["hu", "en"];
  const DEFAULT_LANG = "hu";   // shown unless ?lang= or a saved choice says otherwise
  const STORAGE_KEY = "resume.lang";

  const MONTHS = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    hu: ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."],
  };

  const ICONS = {
    mail:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.7 2z"/></svg>',
    pin:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    link:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.4 20.4h-3.5v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6h.1c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zM7.1 20.4H3.6V9h3.5v11.4zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
  };

  let data = null;
  let lang = "en";

  /* ----- helpers ---------------------------------------------------------- */

  const esc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  // t() resolves a translatable value: {en, hu} → string for the current lang.
  const t = (v) => {
    if (v == null) return "";
    if (typeof v === "object" && !Array.isArray(v)) return v[lang] ?? v.en ?? "";
    return v;
  };

  const ui = (key) => t(data.ui?.[key]) || key;

  const has = (arr) => Array.isArray(arr) && arr.length > 0;

  // "2022-03" → "Mar 2022" / "2022. márc."; "2022" → "2022"
  function fmtDate(s) {
    if (!s) return "";
    const [y, m] = String(s).split("-");
    if (!m) return y;
    const mon = MONTHS[lang][parseInt(m, 10) - 1] ?? "";
    return lang === "hu" ? `${y}. ${mon}` : `${mon} ${y}`;
  }

  function fmtRange(start, end) {
    const a = fmtDate(start);
    const b = end ? fmtDate(end) : ui("present");
    return a ? `${a} – ${b}` : b;
  }

  const initials = (name) => String(name || "")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  const prettyUrl = (u) => {
    let d = String(u);
    try { d = decodeURIComponent(d); } catch (_) { /* leave as is */ }
    return d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  };

  const linkIcon = (label) => {
    const l = String(label).toLowerCase();
    if (l.includes("github")) return ICONS.github;
    if (l.includes("linkedin")) return ICONS.linkedin;
    return ICONS.link;
  };

  const chips = (items, cls = "chip") =>
    has(items) ? items.map((s) => `<span class="${cls}">${esc(t(s))}</span>`).join("") : "";

  const stackRow = (items, labelKey = "stack") => has(items)
    ? `<div class="stack"><span class="stack__label">${esc(ui(labelKey))}</span>${chips(items)}</div>`
    : "";

  // Date pill only when the entry actually has dates
  const datePill = (cls, start, end) => (start || end)
    ? `<span class="${cls}">${esc(fmtRange(start, end))}</span>` : "";

  /* ----- sidebar ---------------------------------------------------------- */

  function renderSide() {
    const b = data.basics || {};
    const parts = [];

    const photo = currentPhoto();
    const avatar = photo
      ? `<div class="avatar avatar--photo"><div class="avatar__frame" style="transform:${frameCss(frameFor(photo))}"><img src="${esc(photoSrc(photo))}" alt="${esc(t(b.name))}" onload="this.classList.add(this.naturalWidth >= this.naturalHeight ? 'is-landscape' : 'is-portrait')"></div></div>`
      : `<div class="avatar avatar--initials" aria-hidden="true">${esc(initials(t(b.name)))}</div>`;

    parts.push(`
      <div class="identity">
        ${avatar}
        <div>
          <h1 class="identity__name">${esc(t(b.name))}</h1>
          <p class="identity__title">${esc(t(b.title))}</p>
        </div>
      </div>`);

    const contact = [];
    if (b.location) contact.push(`<li>${ICONS.pin}<span>${esc(t(b.location))}</span></li>`);
    if (b.email)    contact.push(`<li>${ICONS.mail}<a href="mailto:${esc(b.email)}">${esc(b.email)}</a></li>`);
    if (b.phone)    contact.push(`<li>${ICONS.phone}<a href="tel:${esc(b.phone.replace(/\s+/g, ""))}">${esc(b.phone)}</a></li>`);
    if (b.website)  contact.push(`<li>${ICONS.globe}<a href="${esc(b.website)}" target="_blank" rel="noopener">${esc(prettyUrl(b.website))}</a></li>`);
    (b.links || []).forEach((l) => {
      contact.push(`<li>${linkIcon(l.label)}<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(t(l.text) || prettyUrl(l.url))}</a></li>`);
    });
    if (contact.length) {
      parts.push(`
        <section class="side__section">
          <h2 class="side__heading">${esc(ui("contact"))}</h2>
          <ul class="contact">${contact.join("")}</ul>
        </section>`);
    }

    if (has(data.skills)) {
      const groups = data.skills.map((g) => `
        <div class="skillgroup">
          ${g.group ? `<div class="skillgroup__name">${esc(t(g.group))}</div>` : ""}
          <div class="tags">${chips(g.items, "tag")}</div>
        </div>`).join("");
      parts.push(`
        <section class="side__section">
          <h2 class="side__heading">${esc(ui("skills"))}</h2>
          <div>${groups}</div>
        </section>`);
    }

    if (has(data.languages)) {
      const rows = data.languages.map((l) =>
        `<li><span>${esc(t(l.name))}</span><span class="langs__level">${esc(t(l.level))}</span></li>`).join("");
      parts.push(`
        <section class="side__section">
          <h2 class="side__heading">${esc(ui("languages"))}</h2>
          <ul class="langs">${rows}</ul>
        </section>`);
    }

    if (has(data.education)) {
      const rows = data.education.map((e) => `
        <li class="edu">
          <div class="edu__degree">${esc(t(e.degree))}</div>
          <div class="edu__school">${esc(t(e.school))}</div>
          ${datePill("edu__date", e.start, e.end)}
          ${e.note ? `<div class="edu__note">${esc(t(e.note))}</div>` : ""}
        </li>`).join("");
      parts.push(`
        <section class="side__section">
          <h2 class="side__heading">${esc(ui("education"))}</h2>
          <ul class="edus">${rows}</ul>
        </section>`);
    }

    const interests = t(data.interests);
    if (has(interests)) {
      parts.push(`
        <section class="side__section">
          <h2 class="side__heading">${esc(ui("interests"))}</h2>
          <div class="tags interests">${chips(interests, "tag")}</div>
        </section>`);
    }

    document.getElementById("side").innerHTML = parts.join("");
  }

  /* ----- main column ------------------------------------------------------ */

  function section(key, body) {
    return `<section class="section" data-section="${key}">
      <h2 class="section__heading">${esc(ui(key))}</h2>${body}</section>`;
  }

  function renderMain() {
    const parts = [];
    const summary = t(data.basics?.summary);
    if (summary) parts.push(section("summary", `<p class="summary">${esc(summary)}</p>`));

    if (has(data.experience)) {
      const entries = data.experience.map((e) => {
        const org = e.url
          ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(t(e.company))}</a>`
          : `<span>${esc(t(e.company))}</span>`;
        const loc = e.location ? `<span class="sep">·</span>${esc(t(e.location))}` : "";
        const bullets = t(e.bullets);
        return `
          <article class="entry">
            <div class="entry__head">
              <div>
                <h3 class="entry__role">${esc(t(e.role))}</h3>
                <div class="entry__org">${org}${loc}</div>
              </div>
              ${datePill("entry__date", e.start, e.end)}
            </div>
            ${has(bullets) ? `<ul class="bullets">${bullets.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
            ${stackRow(e.stack)}
            ${stackRow(e.skills, "entrySkills")}
          </article>`;
      }).join("");
      parts.push(section("experience", `<div class="timeline">${entries}</div>`));
    }

    if (has(data.projects)) {
      const cards = data.projects.map((p) => {
        const name = p.url
          ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t(p.name))}${ICONS.link}</a>`
          : esc(p.name);
        return `
          <article class="project">
            <h3 class="project__name">${name}</h3>
            <p class="project__desc">${esc(t(p.description))}</p>
            ${stackRow(p.stack)}
          </article>`;
      }).join("");
      parts.push(section("projects", `<div class="projects">${cards}</div>`));
    }

    if (has(data.certificates)) {
      const rows = data.certificates.map((c) => {
        const name = c.url
          ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(t(c.name))}</a>`
          : esc(t(c.name));
        return `
        <div class="row">
          <div class="row__title">${name}</div>
          <div class="row__date">${esc(fmtDate(c.date))}</div>
          ${c.issuer ? `<div class="row__sub">${esc(t(c.issuer))}</div>` : ""}
        </div>`;
      }).join("");
      parts.push(section("certificates", `<div class="rows">${rows}</div>`));
    }

    document.getElementById("main").innerHTML = parts.join("");
  }

  /* ----- photo + framing (basics.photo / photoFrame; ?photos picker) --------
     basics.photoFrame is {scale, x, y}: zoom and offsets in % of the circle, so
     the same numbers frame the 128px screen avatar and the 30mm print avatar.
     The ?photos tool lets candidate photos be tried in this browser. They come
     from two private places, never from the repo: the gitignored assets/photos/
     folder (read from the local dev server's directory listing) and photos
     added with "+" (kept as blobs in IndexedDB). Choice + framing live in
     localStorage; tools/bake_photo.py then bakes the framing into
     assets/photo.webp, the only photo that is published. */

  const PHOTO_KEY = "resume.photo";          // candidate path, or PHOTO_NONE for initials
  const PHOTO_NONE = "none";
  const FRAME_KEY = "resume.photoFrame:";    // + candidate path
  const FRAME_DEFAULT = { scale: 1, x: 0, y: 0 };
  const SCALE_MIN = 1, SCALE_MAX = 10;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const round1 = (v) => Math.round(v * 10) / 10;

  function normFrame(f) {
    return {
      scale: clamp(Number(f?.scale) || 1, SCALE_MIN, SCALE_MAX),
      x: round1(Number(f?.x) || 0),
      y: round1(Number(f?.y) || 0),
    };
  }
  const frameCss = (f) => `translate(${f.x}%, ${f.y}%) scale(${f.scale})`;

  const LOCAL_PREFIX = "local:";             // key of a photo added with "+": local:<filename>
  let folderPhotos = [];                      // paths under assets/photos/ (from the directory listing)
  const localPhotos = new Map();              // key → { name, url (object URL) }
  let photosLoaded = false;

  const photoCandidates = () => [...folderPhotos, ...localPhotos.keys()];
  const isLocalPhoto = (key) => localPhotos.has(key);
  const photoSrc = (key) => localPhotos.get(key)?.url ?? key;

  // What this browser picked: a candidate path, null for "no photo", or
  // undefined when nothing (valid) is saved → resume.json's basics.photo.
  function pickedPhoto() {
    let v = null;
    try { v = localStorage.getItem(PHOTO_KEY); } catch (_) { /* ignore */ }
    if (v === PHOTO_NONE) return null;
    return photoCandidates().includes(v) ? v : undefined;
  }
  function currentPhoto() {
    const picked = pickedPhoto();
    return picked === undefined ? (data.basics?.photo || null) : picked;
  }
  const isCandidate = (src) => !!src && (folderPhotos.includes(src) || localPhotos.has(src));

  // Frame for a photo: browser-local adjustment for a candidate, else resume.json's.
  function frameFor(src) {
    if (isCandidate(src)) {
      try {
        const raw = localStorage.getItem(FRAME_KEY + src);
        if (raw) return normFrame(JSON.parse(raw));
      } catch (_) { /* ignore */ }
    }
    return normFrame(data.basics?.photoFrame || FRAME_DEFAULT);
  }
  function saveFrame(src, f) {
    try { localStorage.setItem(FRAME_KEY + src, JSON.stringify(normFrame(f))); } catch (_) { /* ignore */ }
  }

  // Apply a frame to the live avatar and the picker without re-rendering the sidebar.
  function applyFrame(f) {
    const fr = document.querySelector(".avatar__frame");
    if (fr) fr.style.transform = frameCss(f);
    const slider = document.getElementById("pickerZoom");
    if (slider) slider.value = f.scale;
    const out = document.getElementById("pickerZoomVal");
    if (out) out.textContent = `${f.scale.toFixed(2)}×`;
    const code = document.getElementById("photoCode");
    if (code) code.textContent = photoCode(currentPhoto(), f);
  }

  function photoCode(src, f) {
    if (!src) return `"photo": null`;
    if (!isCandidate(src)) return `"photo": ${JSON.stringify(src)}`;
    const fr = normFrame(f);
    const path = isLocalPhoto(src) ? `"<path to ${localPhotos.get(src).name}>"` : src;
    return `uv run tools/bake_photo.py ${path} ${fr.scale} ${fr.x} ${fr.y}\n\n"photoFrame": ${JSON.stringify(fr)}`;
  }

  /* Candidate sources ------------------------------------------------------- */

  const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
  const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });

  // Anchors of a directory listing (python -m http.server, most dev servers). [] on 404.
  async function listDir(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return [];
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    return [...doc.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"))
      .filter((h) => h && !h.startsWith("/") && !h.startsWith("?") && !h.startsWith("#") && !h.startsWith(".."));
  }

  // assets/photos/**: one level of subfolders first (e.g. full/), then top-level files.
  async function loadFolderPhotos() {
    const dir = "assets/photos/";
    const hrefs = await listDir(dir).catch(() => []);
    const files = [], subs = [];
    hrefs.forEach((h) => { if (h.endsWith("/")) subs.push(h); else if (IMAGE_RE.test(h)) files.push(h); });
    const nested = await Promise.all(subs.map(async (sub) =>
      (await listDir(dir + sub).catch(() => [])).filter((h) => IMAGE_RE.test(h)).map((h) => sub + h)));
    const decode = (h) => { try { return decodeURIComponent(h); } catch (_) { return h; } };
    return [...nested.flat().sort(natural), ...files.sort(natural)].map((h) => dir + decode(h));
  }

  // Photos added with "+" live in IndexedDB (blobs; no localStorage size limit).
  const IDB_NAME = "resume-tools", IDB_STORE = "photos";
  function idbTx(mode, run) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open(IDB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(IDB_STORE, mode);
        const req = run(tx.objectStore(IDB_STORE));
        tx.oncomplete = () => { db.close(); resolve(req?.result); };
        tx.onerror = () => { db.close(); reject(tx.error); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  }
  const idbPut = (key, value) => idbTx("readwrite", (s) => s.put(value, key));
  const idbAll = () => idbTx("readonly", (s) => s.getAll());
  const idbDelete = (key) => idbTx("readwrite", (s) => s.delete(key));

  function registerLocalPhoto(row) {
    const prev = localPhotos.get(row.key);
    if (prev) URL.revokeObjectURL(prev.url);
    localPhotos.set(row.key, { name: row.name, url: URL.createObjectURL(row.blob) });
  }
  async function loadLocalPhotos() {
    if (!("indexedDB" in window)) return;
    const rows = await idbAll().catch(() => []);
    rows.sort((a, b) => a.added - b.added).forEach(registerLocalPhoto);
  }

  const setPick = (v) => {
    try { v == null ? localStorage.removeItem(PHOTO_KEY) : localStorage.setItem(PHOTO_KEY, v); } catch (_) { /* ignore */ }
  };

  async function addPhotoFiles(files) {
    let last = null;
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const row = { key: LOCAL_PREFIX + file.name, name: file.name, blob: file, added: Date.now() };
      try { await idbPut(row.key, row); } catch (_) { /* still usable until reload */ }
      registerLocalPhoto(row);
      last = row.key;
    }
    if (last) setPick(last);
    renderSide();
    renderTools();
  }

  async function removeLocalPhoto(key) {
    const entry = localPhotos.get(key);
    if (!entry) return;
    try { await idbDelete(key); } catch (_) { /* ignore */ }
    URL.revokeObjectURL(entry.url);
    localPhotos.delete(key);
    try {
      localStorage.removeItem(FRAME_KEY + key);
      if (localStorage.getItem(PHOTO_KEY) === key) localStorage.removeItem(PHOTO_KEY);
    } catch (_) { /* ignore */ }
    renderSide();
    renderTools();
  }

  // Load both sources once: for the ?photos tool, or to honour a pick saved in this browser.
  async function loadPhotoCandidates() {
    if (photosLoaded) return;
    let saved = null;
    try { saved = localStorage.getItem(PHOTO_KEY); } catch (_) { /* ignore */ }
    if (!hasFlag("photos") && !saved) return;
    photosLoaded = true;
    const [folder] = await Promise.all([loadFolderPhotos().catch(() => []), loadLocalPhotos()]);
    folderPhotos = folder;
    renderSide();
    renderTools();
  }

  const hasFlag = (name) => new URLSearchParams(location.search).has(name);

  // Drag to pan / wheel to zoom on the avatar itself (only while picking a candidate).
  function bindAvatarGestures() {
    const el = document.querySelector(".avatar--photo");
    const src = currentPhoto();
    if (!el || !isCandidate(src) || !hasFlag("photos") || el.dataset.bound) return;
    el.dataset.bound = "1";
    el.classList.add("is-adjustable");

    let start = null, live = null;
    el.addEventListener("pointerdown", (ev) => {
      start = { px: ev.clientX, py: ev.clientY, f: frameFor(src) };
      live = start.f;
      el.setPointerCapture(ev.pointerId);
      el.classList.add("is-dragging");
      ev.preventDefault();
    });
    el.addEventListener("pointermove", (ev) => {
      if (!start) return;
      // translate % is relative to the frame's width (the circle inside the border)
      const d = el.querySelector(".avatar__frame").offsetWidth;
      live = normFrame({
        scale: start.f.scale,
        x: start.f.x + ((ev.clientX - start.px) / d) * 100,
        y: start.f.y + ((ev.clientY - start.py) / d) * 100,
      });
      applyFrame(live);
    });
    const end = () => {
      if (!start) return;
      saveFrame(src, live);
      start = null;
      el.classList.remove("is-dragging");
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const f = frameFor(src);
      f.scale = clamp(round1(f.scale * 20 - Math.sign(ev.deltaY)) / 20, SCALE_MIN, SCALE_MAX); // 0.05 steps
      saveFrame(src, f);
      applyFrame(normFrame(f));
    }, { passive: false });
  }

  /* ----- photo tool (?photos) ---------------------------------------------- */

  function renderPhotoTool(panel) {
    const list = photoCandidates();
    const picked = pickedPhoto();
    const current = currentPhoto();
    const frame = frameFor(current);
    const name = t(data.basics?.name);
    const thumb = (act, src, label, active, inner) => `
      <button type="button" class="picker__thumb ${active ? "is-active" : ""}" data-act="${act}" ${src ? `data-src="${esc(src)}"` : ""} title="${esc(src || label)}">
        ${inner}<span>${esc(label)}</span>
      </button>`;
    const label = (key) => isLocalPhoto(key)
      ? localPhotos.get(key).name.replace(/\.\w+$/, "")
      : key.replace(/^assets\/photos\//, "").replace(/\.\w+$/, "");
    const thumbs = [
      thumb("none", "", "none", picked === null, `<span class="picker__none">${esc(initials(name))}</span>`),
      data.basics?.photo
        ? thumb("current", "", "current", picked === undefined, `<img src="${esc(data.basics.photo)}" alt="">`) : "",
      ...list.map((key) => thumb("pick", key, label(key), key === picked,
        `<img src="${esc(photoSrc(key))}" alt="" loading="lazy">`)),
      `<button type="button" class="picker__thumb" data-act="add" title="Add photos from this computer (kept in this browser only)">
        <span class="picker__add" aria-hidden="true">+</span><span>add</span>
      </button>
      <input type="file" id="photoAdd" accept="image/*" multiple hidden>`,
    ].join("");
    const isLocal = isLocalPhoto(current);
    const adjust = isCandidate(current) ? `
      <div class="picker__zoom">
        <label for="pickerZoom">Zoom</label>
        <input type="range" id="pickerZoom" min="${SCALE_MIN}" max="${SCALE_MAX}" step="0.05" value="${frame.scale}">
        <output id="pickerZoomVal">${frame.scale.toFixed(2)}×</output>
        <button type="button" class="tool__btn" data-act="reset">Reset</button>
        ${isLocal ? `<button type="button" class="tool__btn" data-act="remove">Remove</button>` : ""}
      </div>
      <div class="tool__hint">Drag the photo to move it · scroll on it to zoom. Run the command below to bake it into assets/photo.webp${isLocal ? ", putting the file's real path in place of the placeholder" : ""}.</div>`
      : `<div class="tool__hint">${list.length
          ? "Pick a photo to frame it."
          : photosLoaded
            ? "No photos yet. Put some in assets/photos/ (gitignored) and serve the folder locally, or add them with +. Nothing here is published."
            : "Loading…"}</div>`;
    panel.innerHTML = `
      <div class="tool__head"><span>Photo</span><button type="button" class="tool__btn" data-act="copy">Copy</button></div>
      <div class="picker__grid">${thumbs}</div>
      ${adjust}
      <pre class="tool__code" id="photoCode">${esc(photoCode(current, frame))}</pre>`;
    bindAvatarGestures();
  }

  function onPhotoClick(ev) {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    switch (btn.dataset.act) {
      case "pick":    setPick(btn.dataset.src); break;
      case "none":    setPick(PHOTO_NONE); break;
      case "current": setPick(null); break;
      case "add":     document.getElementById("photoAdd")?.click(); return;
      case "remove":  removeLocalPhoto(currentPhoto()); return;
      case "reset": {
        const src = currentPhoto();
        if (!isCandidate(src)) return;
        try { localStorage.removeItem(FRAME_KEY + src); } catch (_) { /* ignore */ }
        applyFrame(frameFor(src));
        return;
      }
      case "copy": copyCode(btn, document.getElementById("photoCode")?.textContent || ""); return;
      default: return;
    }
    renderSide();
    renderTools();
  }

  function onPhotoInput(ev) {
    if (ev.target.id === "photoAdd") { addPhotoFiles([...ev.target.files]); return; }
    if (ev.target.id !== "pickerZoom") return;
    const src = currentPhoto();
    if (!isCandidate(src)) return;
    const f = frameFor(src);
    f.scale = Number(ev.target.value);
    saveFrame(src, f);
    applyFrame(normFrame(f));
  }

  function copyCode(btn, text) {
    const label = btn.textContent;
    const done = () => { btn.textContent = "Copied"; setTimeout(() => { btn.textContent = label; }, 1200); };
    navigator.clipboard?.writeText(text).then(done, () => { btn.textContent = "Copy failed"; });
  }

  /* ----- colour themes (resume.json "theme": presets of five key colours) ---
     The active preset's colours are written onto <html> as inline custom
     properties; css/style.css derives every other colour from them.
     Presets created or edited in the ?themes tool live in localStorage until
     their JSON is pasted into resume.json. */

  const THEME_KEY = "resume.theme";                 // preset id chosen in this browser
  const THEME_PRESETS_KEY = "resume.themePresets";  // presets created/edited in this browser
  const THEME_QUERY = "theme";
  const COLOR_KEYS = [
    { key: "side",     css: "--navy",      label: "Sidebar top" },
    { key: "sideDeep", css: "--navy-deep", label: "Sidebar bottom" },
    { key: "accent",   css: "--accent",    label: "Accent" },
    { key: "pageBg",   css: "--page-bg",   label: "Page background" },
    { key: "ink",      css: "--ink",       label: "Text" },
  ];
  const HEX = /^#[0-9a-f]{6}$/i;

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const writeJSON = (key, value) => {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (_) { /* private mode etc. */ }
  };

  // Stylesheet values of the five palette tokens, read once before any override.
  let cssDefaults = null;
  function cssDefault(css) {
    if (!cssDefaults) {
      const cs = getComputedStyle(document.documentElement);
      cssDefaults = Object.fromEntries(COLOR_KEYS.map((c) => [c.css, cs.getPropertyValue(c.css).trim()]));
    }
    return cssDefaults[css];
  }

  function normPreset(p) {
    if (!p || typeof p !== "object" || !p.id) return null;
    const colors = {};
    for (const { key, css } of COLOR_KEYS) {
      const c = String(p.colors?.[key] ?? "").trim();
      colors[key] = HEX.test(c) ? c.toUpperCase() : cssDefault(css).toUpperCase();
    }
    return { id: String(p.id), name: String(p.name || p.id), colors };
  }

  const filePresets  = () => (data.theme?.presets || []).map(normPreset).filter(Boolean);
  const localPresets = () => (readJSON(THEME_PRESETS_KEY, []) || []).map(normPreset).filter(Boolean);

  // File presets in file order (a local copy of the same id replaces it), then local-only ones.
  function allPresets() {
    const file = filePresets(), local = localPresets();
    const out = file.map((p) => local.find((l) => l.id === p.id) || p);
    local.forEach((l) => { if (!file.some((p) => p.id === l.id)) out.push(l); });
    return out;
  }
  const findPreset = (id) => (id ? allPresets().find((p) => p.id === id) : undefined);
  const inFile  = (id) => filePresets().some((p) => p.id === id);
  const inLocal = (id) => localPresets().some((p) => p.id === id);

  function activeThemeId() {
    const q = new URLSearchParams(location.search).get(THEME_QUERY);
    if (findPreset(q)) return q;
    let stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (_) { /* ignore */ }
    if (findPreset(stored)) return stored;
    if (findPreset(data.theme?.active)) return data.theme.active;
    return allPresets()[0]?.id ?? null;
  }

  function applyTheme(preset) {
    const st = document.documentElement.style;
    cssDefault(COLOR_KEYS[0].css);   // make sure defaults are captured before overriding
    COLOR_KEYS.forEach(({ key, css }) => {
      const c = preset?.colors?.[key];
      if (c) st.setProperty(css, c); else st.removeProperty(css);
    });
  }

  function setTheme(id) {
    if (!findPreset(id)) return;
    try { localStorage.setItem(THEME_KEY, id); } catch (_) { /* ignore */ }
    const url = new URL(location.href);
    url.searchParams.set(THEME_QUERY, id);
    history.replaceState(null, "", url);
    applyTheme(findPreset(id));
    renderTools();
  }

  function savePreset(preset) {
    const local = localPresets().filter((p) => p.id !== preset.id);
    local.push(normPreset(preset));
    writeJSON(THEME_PRESETS_KEY, local);
  }
  function forgetLocal(id) {
    const local = localPresets().filter((p) => p.id !== id);
    writeJSON(THEME_PRESETS_KEY, local.length ? local : null);
  }

  const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "preset";

  function duplicatePreset(src) {
    const base = slug(src.name.replace(/\s+copy(\s+\d+)?$/i, "") + "-copy");
    let id = base, n = 2;
    while (findPreset(id)) id = `${base}-${n++}`;
    savePreset({ id, name: `${src.name.replace(/\s+copy(\s+\d+)?$/i, "")} copy${n > 2 ? " " + (n - 1) : ""}`, colors: { ...src.colors } });
    setTheme(id);
  }

  const themeCode = (activeId) =>
    `"theme": ${JSON.stringify({ active: activeId, presets: allPresets() }, null, 2)}`;

  /* ----- tools dock (dev aids enabled by URL flags: ?themes, ?photos) --------- */

  const TOOLS = {
    themes: { render: renderThemeTool, click: onThemeClick, input: onThemeInput },
    photos: { render: renderPhotoTool, click: onPhotoClick, input: onPhotoInput },
  };
  // Events bubble to the dock; hand them to the tool whose panel they came from.
  const toolEvent = (kind) => (ev) => {
    const name = ev.target.closest(".tool")?.dataset.tool;
    TOOLS[name]?.[kind]?.(ev);
  };

  function renderTools() {
    const wanted = Object.keys(TOOLS).filter(hasFlag);
    let dock = document.getElementById("tools");
    if (!wanted.length) { dock?.remove(); return; }
    if (!dock) {
      dock = document.createElement("aside");
      dock.id = "tools";
      dock.className = "tools";
      dock.setAttribute("aria-label", "Tools");
      document.body.appendChild(dock);
      dock.addEventListener("click", toolEvent("click"));
      dock.addEventListener("input", toolEvent("input"));
    }
    wanted.forEach((name) => {
      let panel = dock.querySelector(`[data-tool="${name}"]`);
      if (!panel) {
        panel = document.createElement("section");
        panel.className = "tool";
        panel.dataset.tool = name;
        dock.appendChild(panel);
      }
      TOOLS[name].render(panel);
    });
  }

  function renderThemeTool(panel) {
    const activeId = activeThemeId();
    const active = findPreset(activeId);
    const presets = allPresets();

    const rows = presets.map((p) => {
      const badge = inFile(p.id) && inLocal(p.id) ? "edited" : !inFile(p.id) ? "local" : "";
      const stripes = COLOR_KEYS.map((c) => `<i style="background:${esc(p.colors[c.key])}"></i>`).join("");
      return `
        <button type="button" class="preset ${p.id === activeId ? "is-active" : ""}" data-act="pick" data-id="${esc(p.id)}" title="${esc(p.id)}">
          <span class="preset__swatch" data-swatch="${esc(p.id)}">${stripes}</span>
          <span class="preset__name" data-name="${esc(p.id)}">${esc(p.name)}</span>
          ${badge ? `<span class="preset__badge">${badge}</span>` : ""}
        </button>`;
    }).join("");

    const editor = active ? `
      <div class="editor">
        <input class="editor__name" id="themeName" type="text" value="${esc(active.name)}" aria-label="Preset name" spellcheck="false">
        <div class="editor__colors">
          ${COLOR_KEYS.map((c) => `
            <label class="editor__color">
              <input type="color" data-color="${c.key}" value="${esc(active.colors[c.key])}">
              <span>${esc(c.label)}<small data-hex="${c.key}">${esc(active.colors[c.key])}</small></span>
            </label>`).join("")}
        </div>
        <div class="tool__row">
          <button type="button" class="tool__btn tool__btn--accent" data-act="dup">Duplicate</button>
          ${inFile(activeId) && inLocal(activeId) ? `<button type="button" class="tool__btn" data-act="reset">Reset to resume.json</button>` : ""}
          ${!inFile(activeId) ? `<button type="button" class="tool__btn" data-act="delete">Delete</button>` : ""}
          <button type="button" class="tool__btn" data-act="copy" id="themeCopy">Copy JSON</button>
        </div>
        <div class="tool__hint">Edits save in this browser as you type. Paste the JSON below into resume.json to keep them.</div>
      </div>` : `<div class="tool__hint">No presets in resume.json — add a "theme" block.</div>`;

    panel.innerHTML = `
      <div class="tool__head"><span>Colour presets</span></div>
      <div class="presets">${rows}</div>
      ${editor}
      <pre class="tool__code" id="themeCode">${esc(themeCode(activeId))}</pre>`;
  }

  function onThemeClick(ev) {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    const activeId = activeThemeId();
    const active = findPreset(activeId);
    switch (btn.dataset.act) {
      case "pick":   setTheme(btn.dataset.id); break;
      case "dup":    if (active) duplicatePreset(active); break;
      case "reset":  forgetLocal(activeId); setTheme(activeId); break;
      case "delete":
        forgetLocal(activeId);
        try { if (localStorage.getItem(THEME_KEY) === activeId) localStorage.removeItem(THEME_KEY); } catch (_) { /* ignore */ }
        { const url = new URL(location.href); url.searchParams.delete(THEME_QUERY); history.replaceState(null, "", url); }
        applyTheme(findPreset(activeThemeId()));
        renderTools();
        break;
      case "copy": copyCode(btn, document.getElementById("themeCode")?.textContent || ""); break;
      default: break;
    }
  }

  // Live edits: update the page, the row swatch/name and the JSON in place so
  // the colour picker keeps focus (a full re-render would close it).
  function onThemeInput(ev) {
    const el = ev.target;
    const activeId = activeThemeId();
    const active = findPreset(activeId);
    if (!active) return;
    const dock = document.getElementById("tools");

    if (el.id === "themeName") {
      active.name = el.value.trim() || active.id;
      savePreset(active);
      const nm = dock.querySelector(`[data-name="${CSS.escape(active.id)}"]`);
      if (nm) nm.textContent = active.name;
    } else if (el.dataset.color) {
      const key = el.dataset.color;
      if (!HEX.test(el.value)) return;
      active.colors[key] = el.value.toUpperCase();
      savePreset(active);
      applyTheme(active);
      const hex = dock.querySelector(`[data-hex="${key}"]`);
      if (hex) hex.textContent = active.colors[key];
      const sw = dock.querySelector(`[data-swatch="${CSS.escape(active.id)}"]`);
      if (sw) sw.children[COLOR_KEYS.findIndex((c) => c.key === key)].style.background = active.colors[key];
    } else {
      return;
    }
    // The first edit of a resume.json preset turns it into an "edited" one; patch
    // the badge and Reset button in rather than re-rendering under the picker.
    if (inFile(active.id)) {
      const row = dock.querySelector(".preset.is-active");
      if (row && !row.querySelector(".preset__badge")) row.insertAdjacentHTML("beforeend", '<span class="preset__badge">edited</span>');
      if (!dock.querySelector('[data-act="reset"]')) {
        dock.querySelector('[data-act="dup"]')?.insertAdjacentHTML("afterend",
          '<button type="button" class="tool__btn" data-act="reset">Reset to resume.json</button>');
      }
    }
    const code = document.getElementById("themeCode");
    if (code) code.textContent = themeCode(activeId);
  }

  /* ----- chrome (top bar, title, lang) ----------------------------------- */

  function renderChrome() {
    document.documentElement.lang = lang;
    document.title = `${t(data.basics?.name) || "Resume"} — ${t(data.basics?.title)}`;

    document.querySelectorAll("[data-ui]").forEach((el) => {
      el.textContent = ui(el.dataset.ui);
    });

    const pdf = data.meta?.pdf?.[lang] || `resume-${lang}.pdf`;
    const dl = document.getElementById("downloadBtn");
    dl.href = pdf;
    dl.setAttribute("download", pdf);
    dl.title = ui("download");

    document.querySelectorAll(".lang__btn").forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    document.querySelector(".lang").setAttribute("aria-label", ui("langSwitch"));
  }

  function render() {
    applyTheme(findPreset(activeThemeId()));
    renderChrome();
    renderSide();
    renderMain();
    renderTools();
  }

  function setLang(next, { persist = true } = {}) {
    if (!LANGS.includes(next)) return;
    lang = next;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* private mode etc. */ }
      const url = new URL(location.href);
      url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
    }
    render();
  }

  function initialLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (LANGS.includes(stored)) return stored;
    } catch (_) { /* ignore */ }
    return DEFAULT_LANG;
  }

  /* ----- boot ------------------------------------------------------------- */

  async function boot() {
    const res = await fetch("resume.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`resume.json: HTTP ${res.status}`);
    data = await res.json();

    lang = initialLang();
    render();
    loadPhotoCandidates();   // async; re-renders when the ?photos sources arrive

    document.querySelectorAll(".lang__btn").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
    });
    document.getElementById("printBtn").addEventListener("click", () => window.print());

    document.documentElement.dataset.ready = "1";   // hook for the PDF build script
  }

  boot().catch((err) => {
    console.error(err);
    document.getElementById("main").innerHTML =
      `<p class="summary">Could not load <code>resume.json</code> (${esc(err.message)}). ` +
      `If you opened this file directly, serve it over HTTP instead.</p>`;
  });
})();
