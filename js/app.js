/* Resume renderer: loads resume.json and renders it in the chosen language. */
(() => {
  "use strict";

  const LANGS = ["en", "hu"];
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

  const prettyUrl = (u) => String(u).replace(/^https?:\/\//, "").replace(/\/$/, "");

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

    const avatar = b.photo
      ? `<img class="avatar" src="${esc(b.photo)}" alt="${esc(t(b.name))}">`
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
      contact.push(`<li>${linkIcon(l.label)}<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(prettyUrl(l.url))}</a></li>`);
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

    if (has(data.education)) {
      const rows = data.education.map((e) => `
        <div class="row">
          <div class="row__title">${esc(t(e.degree))}</div>
          ${datePill("row__date", e.start, e.end)}
          <div class="row__sub">${esc(t(e.school))}</div>
          ${e.note ? `<div class="row__note">${esc(t(e.note))}</div>` : ""}
        </div>`).join("");
      parts.push(section("education", `<div class="rows">${rows}</div>`));
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
    return (navigator.language || "").toLowerCase().startsWith("hu") ? "hu" : "en";
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
