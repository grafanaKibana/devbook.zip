---
title: Welcome to DevBook!
tags:
  - FolderNote
  - MetricsIgnore
  - Template
publish: true
---
```datacorejsx
const { CARD_CSS } = await dc.require("Assets/components/devbook-card.jsx");
return function TopicDashboard() {
  const ROOT = (dc.useCurrentFile()?.$path || "Home").split("/")[0];

  const TOPICS = [
    { folder: "Programming", title: "Programming", desc: "Languages, .NET internals, paradigms, clean code." },
    { folder: "Computer Science", title: "Computer Science", desc: "Algorithms, data structures, the theory underneath." },
    { folder: "Data Persistence", title: "Data Persistence", desc: "Databases, indexing, transactions, storage engines." },
    { folder: "Networks", title: "Networks", desc: "Protocols, HTTP, TCP/IP, how packets travel." },
    { folder: "Architecture", title: "Architecture", desc: "Distributed systems, patterns, designing for scale." },
    { folder: "Development Practices", title: "Development Practices", desc: "Testing, version control, and the craft." },
    { folder: "AI & ML", title: "AI & ML", desc: "Models, training, applied machine learning." },
    { folder: "Security", title: "Security", desc: "Threats, crypto, auth, defensive design." },
    { folder: "Cloud", title: "Cloud", desc: "AWS/Azure, serverless, cloud-native design." },
    { folder: "DevOps", title: "DevOps", desc: "CI/CD, containers, and automation." },
    { folder: "SDLC", title: "SDLC", desc: "How software gets planned, built, and shipped." },
  ];

  const ICONS = {
    "code-2": `<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>`,
    "flask-round": `<path d="M10 2v6.292a7 7 0 1 0 4 0V2"/><path d="M5 15h14"/><path d="M8.5 2h7"/>`,
    database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>`,
    network: `<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>`,
    "building-2": `<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>`,
    "ruler-dimension-line": `<path d="M10 15v-3"/><path d="M14 15v-3"/><path d="M18 15v-3"/><path d="M2 8V4"/><path d="M22 6H2"/><path d="M22 8V4"/><path d="M6 15v-3"/><rect x="2" y="12" width="20" height="8" rx="2"/>`,
    lock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
    "area-chart": `<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 11.207a.5.5 0 0 1 .146-.353l2-2a.5.5 0 0 1 .708 0l3.292 3.292a.5.5 0 0 0 .708 0l4.292-4.292a.5.5 0 0 1 .854.353V16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/>`,
    skull: `<path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/>`,
    cloud: `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`,
    "brain-circuit": `<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8"/><path d="M16 8V5a2 2 0 0 1 2-2"/><circle cx="16" cy="13" r=".5"/><circle cx="18" cy="3" r=".5"/><circle cx="20" cy="21" r=".5"/><circle cx="20" cy="8" r=".5"/>`,
  };
  const DEFAULT_ICON = `<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>`;
  const wrapSvg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  const STATUS_PROGRESS = { "not-started": 0, "creation": 33, "ready to repeat": 66, "done": 100 };
  const STATUS_RAMP = [
    { key: "done", label: "Done", weight: 100, alpha: 1 },
    { key: "ready to repeat", label: "Ready to Repeat", weight: 66, alpha: 0.6 },
    { key: "creation", label: "Creation", weight: 33, alpha: 0.28 },
  ];

  const firstString = (v) =>
    Array.isArray(v) ? (v.length ? String(v[0]).trim() : "") : (v == null ? "" : String(v).trim());
  const hasTag = (p, t) => (p.$tags ?? []).some((x) => String(x).replace(/^#/, "") === t);
  const hexToRgbTriple = (v) => {
    let h = firstString(v).replace(/^#/, "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    const n = parseInt(h, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  };

  const pages = dc.useQuery(`@page and path("${ROOT}")`);

  const folderNoteFor = new Map();
  for (const p of pages) {
    if (!hasTag(p, "FolderNote")) continue;
    const dir = p.$path.slice(0, p.$path.lastIndexOf("/"));
    folderNoteFor.set(dir, p);
  }

  const statsFor = (folder) => {
    const prefix = `${ROOT}/${folder}/`;
    const byStatus = {};
    let total = 0, points = 0, done = 0;
    for (const p of pages) {
      if (!p.$path.startsWith(prefix)) continue;
      if (hasTag(p, "FolderNote") || hasTag(p, "MetricsIgnore")) continue;
      const key = firstString(p.value("status")).toLowerCase();
      total += 1;
      points += STATUS_PROGRESS[key] ?? 0;
      if (key === "done") done += 1;
      byStatus[key] = (byStatus[key] ?? 0) + 1;
    }
    return { pct: total > 0 ? Math.round(points / total) : 0, done, total, points, byStatus };
  };

  const cards = TOPICS
    .map((t) => {
      const fn = folderNoteFor.get(`${ROOT}/${t.folder}`);
      const rgb = hexToRgbTriple(fn?.value("color")) || "125, 125, 125";
      const iconSvg = wrapSvg(ICONS[firstString(fn?.value("icon"))] ?? DEFAULT_ICON);
      return { ...t, fn, rgb, iconSvg, ...statsFor(t.folder) };
    })
    .map((c, index) => ({
      ...c,
      spanDesktop: index < 3 ? 4 : 3,
      spanMedium: index < 2 ? 6 : 4,
      spanNarrow: index === 0 ? 12 : 6,
    }));

  let oDone = 0, oTotal = 0, oPoints = 0;
  const oByStatus = {};
  for (const c of cards) {
    oDone += c.done; oTotal += c.total; oPoints += c.points;
    for (const k of Object.keys(c.byStatus)) oByStatus[k] = (oByStatus[k] ?? 0) + c.byStatus[k];
  }
  const oPct = oTotal > 0 ? Math.round(oPoints / oTotal) : 0;

  const segments = (byStatus, total) =>
    STATUS_RAMP.map((seg) => {
      const cnt = byStatus[seg.key] ?? 0;
      const width = total > 0 ? (cnt * seg.weight) / total : 0;
      if (width <= 0) return null;
      return <span style={{ width: `${width}%`, background: "rgb(var(--topic-rgb))", opacity: seg.alpha }} />;
    });

  // Safari/WebKit does not resolve a var() used as the count in `grid-column: span var(--x)`;
  // it drops the declaration and falls back to `span 1`, breaking the grid. Emit static
  // `grid-column: span N` utility classes instead (works in every browser).
  const spanRules = (cls) =>
    Array.from({ length: 12 }, (_, i) => `.dc-topic-card.${cls}-${i + 1} { grid-column: span ${i + 1}; }`).join(" ");

  // Layout + the home-only progress extension. The card's visual chrome
  // (.db-card, .db-card-icon, .db-card-title, .db-card-summary — same padding,
  // font, colours, and icon sizing as the FolderNote hubs) comes from the shared
  // CARD_CSS. Each card sets --card-accent for that chrome and --topic-rgb for
  // the progress bar / Quartz's opaque backing in custom.scss (both = c.rgb).
  const CSS = `
.dc-topic-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.75rem; width: 100%; }
.dc-topic-card { overflow: hidden; cursor: pointer; min-width: 0; min-height: 6.75rem; margin: 0; display: flex; flex-direction: column; }
.dc-topic-card .db-card-body { flex: 1 0 auto; }
.dc-topic-title { display: flex; gap: 0.5rem; align-items: center; line-height: 1.25; }
.dc-topic-spacer { flex: 1 0 auto; min-height: 0.55em; }
.dc-topic-foot { display: flex; flex-direction: column; gap: 4px; margin-top: 0.6rem; }
.dc-topic-cap { font-size: 0.72rem; display: flex; justify-content: space-between; align-items: baseline; color: var(--text-muted, var(--darkgray, #5f6b7a)); }
.dc-topic-bar { display: flex; width: 100%; height: 5px; border-radius: 4px; margin-top: 0.15rem; overflow: hidden; background: var(--background-modifier-border, var(--lightgray, #d8dee9)); }
.dc-topic-total { margin-top: 0.75rem; padding: 0.75em; border-radius: var(--radius-m, 0.55rem); border: 1px solid rgba(var(--topic-rgb), 0.4); background: rgba(var(--topic-rgb), 0.1); }
.dc-topic-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4em 1.1em; margin-top: 0.7em; font-size: 0.8em; opacity: 0.85; }
.dc-topic-legend-item { display: inline-flex; align-items: center; gap: 0.4em; }
.dc-topic-legend-sw { width: 0.8em; height: 0.8em; border-radius: 3px; flex: 0 0 auto; display: inline-block; background: rgb(var(--topic-rgb)); }
${spanRules("dsk")}
@media (max-width: 1600px) { ${spanRules("med")} }
@media (max-width: 760px) { ${spanRules("nar")} }
@media (max-width: 430px) { .dc-topic-grid { grid-template-columns: 1fr; } .dc-topic-grid .dc-topic-card { grid-column: span 1; } }
`;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <style dangerouslySetInnerHTML={{ __html: CARD_CSS + CSS }} />
      <div class="dc-topic-grid">
        {cards.map((c) => (
          <div class={`db-card dc-topic-card dsk-${c.spanDesktop} med-${c.spanMedium} nar-${c.spanNarrow}`} style={{ "--card-accent": c.rgb, "--topic-rgb": c.rgb }}>
            <div class="db-card-body">
              <div class="dc-topic-title">
                <span class="db-card-icon" dangerouslySetInnerHTML={{ __html: c.iconSvg }} />
                <span class="db-card-title">{c.title}</span>
              </div>
              <p class="db-card-summary">{c.desc}</p>
              <div class="dc-topic-spacer" />
              <div class="dc-topic-foot">
                <div class="dc-topic-cap"><span>{c.done}/{c.total} done</span><span>{c.pct}%</span></div>
                <div class="dc-topic-bar">{segments(c.byStatus, c.total)}</div>
              </div>
            </div>
            {c.fn ? <span class="db-card-hit"><dc.Link link={c.fn.$link} /></span> : null}
          </div>
        ))}
      </div>
      <div class="dc-topic-total" style={{ "--topic-rgb": "0, 200, 83" }}>
        <div class="dc-topic-foot">
          <div class="dc-topic-bar" style={{ height: "0.7em" }}>{segments(oByStatus, oTotal)}</div>
          <div class="dc-topic-cap"><span style={{ opacity: 0.7 }}>{oDone}/{oTotal} done</span><span>{oPct}%</span></div>
        </div>
        <div class="dc-topic-legend">
          {STATUS_RAMP.map((seg) => (
            <span class="dc-topic-legend-item">
              <span class="dc-topic-legend-sw" style={{ opacity: seg.alpha }} />
              <span>{seg.label} · {seg.weight}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

# Welcome to my software engineering notebook

The notes I've written to actually *understand* the stack, not just recall it for an interview. .NET internals, distributed systems, databases, security, cloud, AI/ML, and most of what sits between. Every note goes deep: core mechanics, real examples, the pitfalls that bite in production, and the questions worth being able to answer.

> [!info] Why this exists
> I learn by writing things down and coming back to them. This vault is that process in the open — built on spaced repetition, organized into 11 topic areas, and updated continuously. Browse by topic below, or scroll on for progress and recent activity.
