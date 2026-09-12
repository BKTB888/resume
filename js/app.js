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

    const photo = pickedPhoto() || b.photo;
    const avatar = photo
      ? `<div class="avatar avatar--photo"><div class="avatar__frame" style="transform:${frameCss(frameFor(photo))}"><img src="${esc(photo)}" alt="${esc(t(b.name))}" onload="this.classList.add(this.naturalWidth >= this.naturalHeight ? 'is-landscape' : 'is-portrait')"></div></div>`
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

  /* ----- photo picker (only while basics.photoCandidates exists) ---------- */

  const PHOTO_KEY = "resume.photo";
  const FRAME_KEY = "resume.photoFrame:";
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

  // x/y are % of the circle diameter, so the same numbers frame the 128px
  // screen avatar and the 30mm print avatar identically.
  const frameCss = (f) => `translate(${f.x}%, ${f.y}%) scale(${f.scale})`;

  // Frame for a photo: browser-local adjustment for a candidate, else resume.json's.
  function frameFor(src) {
    try {
      const raw = localStorage.getItem(FRAME_KEY + src);
      if (raw) return normFrame(JSON.parse(raw));
    } catch (_) { /* ignore */ }
    return normFrame(data.basics?.photoFrame || FRAME_DEFAULT);
  }

  function saveFrame(src, f) {
    try { localStorage.setItem(FRAME_KEY + src, JSON.stringify(normFrame(f))); } catch (_) { /* ignore */ }
  }

  // Returns the candidate chosen in this browser, if it is still listed.
  function pickedPhoto() {
    const list = data.basics?.photoCandidates;
    if (!has(list)) return null;
    try {
      const v = localStorage.getItem(PHOTO_KEY);
      return list.includes(v) ? v : null;
    } catch (_) { return null; }
  }

  // Apply a frame to the live avatar without re-rendering the whole sidebar.
  function applyFrame(f) {
    const fr = document.querySelector(".avatar__frame");
    if (fr) fr.style.transform = frameCss(f);
    const slider = document.getElementById("pickerZoom");
    if (slider) slider.value = f.scale;
    const out = document.getElementById("pickerZoomVal");
    if (out) out.textContent = `${f.scale.toFixed(2)}×`;
    const code = document.getElementById("pickerCode");
    if (code) code.textContent = pickerCode(pickedPhoto(), f);
  }

  const pickerCode = (src, f) => src
    ? `"photo": "${src}",\n"photoFrame": ${JSON.stringify(normFrame(f))}`
    : `"photo": null`;

  // Drag to pan / wheel to zoom on the avatar itself (only while picking).
  function bindAvatarGestures() {
    const el = document.querySelector(".avatar--photo");
    const src = pickedPhoto();
    if (!el || !src || el.dataset.bound) return;
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

  function renderPicker() {
    const list = data.basics?.photoCandidates;
    let el = document.getElementById("picker");
    if (!has(list)) { el?.remove(); return; }
    if (!el) {
      el = document.createElement("aside");
      el.id = "picker";
      el.className = "picker";
      document.body.appendChild(el);

      el.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-photo]");
        if (btn) {
          try {
            if (btn.dataset.photo) localStorage.setItem(PHOTO_KEY, btn.dataset.photo);
            else localStorage.removeItem(PHOTO_KEY);
          } catch (_) { /* ignore */ }
          renderSide();
          renderPicker();
          return;
        }
        if (ev.target.closest("#pickerReset")) {
          const src = pickedPhoto();
          if (!src) return;
          try { localStorage.removeItem(FRAME_KEY + src); } catch (_) { /* ignore */ }
          applyFrame(frameFor(src));
        }
      });
      el.addEventListener("input", (ev) => {
        if (ev.target.id !== "pickerZoom") return;
        const src = pickedPhoto();
        if (!src) return;
        const f = frameFor(src);
        f.scale = Number(ev.target.value);
        saveFrame(src, f);
        applyFrame(normFrame(f));
      });
    }

    const current = pickedPhoto();
    const frame = current ? frameFor(current) : FRAME_DEFAULT;
    const thumbs = list.map((src) => `
      <button type="button" class="picker__thumb ${src === current ? "is-active" : ""}" data-photo="${esc(src)}" title="${esc(src)}">
        <img src="${esc(src)}" alt="">
        <span>${esc(src.replace(/^assets\/photos\//, "").replace(/\.\w+$/, ""))}</span>
      </button>`).join("");
    const adjust = current ? `
      <div class="picker__zoom">
        <label for="pickerZoom">Zoom</label>
        <input type="range" id="pickerZoom" min="${SCALE_MIN}" max="${SCALE_MAX}" step="0.05" value="${frame.scale}">
        <output id="pickerZoomVal">${frame.scale.toFixed(2)}×</output>
        <button type="button" id="pickerReset" class="picker__reset">Reset</button>
      </div>
      <div class="picker__hint">Drag the photo to move it · scroll on it to zoom</div>` : "";
    el.innerHTML = `
      <div class="picker__head">Photo picker</div>
      <div class="picker__grid">
        <button type="button" class="picker__thumb picker__thumb--none ${current ? "" : "is-active"}" data-photo="" title="No photo (initials)">
          <span class="picker__none">${esc(initials(t(data.basics?.name)))}</span><span>none</span>
        </button>
        ${thumbs}
      </div>
      ${adjust}
      <pre class="picker__path" id="pickerCode">${esc(pickerCode(current, frame))}</pre>`;
    bindAvatarGestures();
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
    renderChrome();
    renderSide();
    renderMain();
    renderPicker();
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
