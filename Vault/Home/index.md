---
title: Welcome to DevBook!
tags:
  - FolderNote
  - MetricsIgnore
  - Template
publish: true
---
```datacorejsx
return function TopicDashboard() {
  const ROOT = (dc.useCurrentFile()?.$path || "Home").split("/")[0];

  const TOPICS = [
    { folder: "01 Programming", title: "Programming", desc: "Languages, .NET internals, paradigms, clean code." },
    { folder: "02 Computer Science", title: "Computer Science", desc: "Algorithms, data structures, the theory underneath." },
    { folder: "03 Data Persistence", title: "Data Persistence", desc: "Databases, indexing, transactions, storage engines." },
    { folder: "04 Networks", title: "Networks", desc: "Protocols, HTTP, TCP/IP, how packets travel." },
    { folder: "05 Architecture", title: "Architecture", desc: "Distributed systems, patterns, designing for scale." },
    { folder: "06 Development Practices", title: "Development Practices", desc: "Testing, version control, and the craft." },
    { folder: "08 Security", title: "Security", desc: "Threats, crypto, auth, defensive design." },
    { folder: "11 SDLC", title: "SDLC", desc: "How software gets planned, built, and shipped." },
    { folder: "10 DevOps", title: "DevOps", desc: "CI/CD, containers, and automation." },
    { folder: "09 Cloud", title: "Cloud", desc: "AWS/Azure, serverless, cloud-native design." },
    { folder: "07 AI & ML", title: "AI & ML", desc: "Models, training, applied machine learning." },
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
    .sort((a, b) => a.folder.localeCompare(b.folder));

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

  const CSS = `
.dc-topic-grid { display: flex; flex-wrap: wrap; gap: 1rem; width: 100%; }
.dc-topic-card { position: relative; cursor: pointer; flex: 1 1 240px; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-direction: column; background: transparent; border: 1px solid var(--background-modifier-border, var(--lightgray, #e5e5e5)); border-radius: var(--radius-m, 8px); box-shadow: none; padding: 1rem 1.1rem 1.1rem; transition: border-color 120ms, background-color 120ms; }
.dc-topic-card:hover { border-color: rgba(var(--topic-rgb), 0.5); background: rgba(var(--topic-rgb), 0.1); }
.dc-topic-title { display: flex; gap: 0.55rem; align-items: center; line-height: 1.3; }
.dc-topic-icon { display: flex; align-self: center; color: rgb(var(--topic-rgb)); }
.dc-topic-icon svg { width: 22px; height: 22px; }
.dc-topic-name { font-weight: 600; font-size: 1.02rem; color: rgb(var(--topic-rgb)); }
.dc-topic-body { display: flex; flex-direction: column; flex: 1 1 0%; margin-top: 0.4em; }
.dc-topic-desc { margin: 0; color: var(--text-muted, var(--gray, #9ca3af)); font-size: 0.82rem; line-height: 1.35; }
.dc-topic-spacer { flex: 1 0 auto; min-height: 0.75em; }
.dc-topic-foot { display: flex; flex-direction: column; gap: 4px; }
.dc-topic-cap { font-size: 0.72rem; display: flex; justify-content: space-between; align-items: baseline; color: var(--text-muted, var(--gray, #9ca3af)); }
.dc-topic-bar { display: flex; width: 100%; height: 7px; border-radius: 4px; margin-top: 0.15rem; overflow: hidden; background: var(--background-modifier-border, var(--lightgray, #e5e5e5)); }
.dc-topic-link { position: absolute; inset: 0; z-index: 1; }
.dc-topic-link a { position: absolute; inset: 0; font-size: 0; background: none !important; }
.dc-topic-total { margin-top: 0.75rem; padding: 0.75em; border-radius: var(--radius-m, 8px); border: 1px solid rgba(var(--topic-rgb), 0.4); background: rgba(var(--topic-rgb), 0.1); }
.dc-topic-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4em 1.1em; margin-top: 0.7em; font-size: 0.8em; opacity: 0.85; }
.dc-topic-legend-item { display: inline-flex; align-items: center; gap: 0.4em; }
.dc-topic-legend-sw { width: 0.8em; height: 0.8em; border-radius: 3px; flex: 0 0 auto; display: inline-block; background: rgb(var(--topic-rgb)); }
`;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div class="dc-topic-grid">
        {cards.map((c) => (
          <div class="dc-topic-card" style={{ "--topic-rgb": c.rgb }}>
            <div class="dc-topic-title">
              <span class="dc-topic-icon" dangerouslySetInnerHTML={{ __html: c.iconSvg }} />
              <span class="dc-topic-name">{c.title}</span>
            </div>
            <div class="dc-topic-body">
              <p class="dc-topic-desc">{c.desc}</p>
              <div class="dc-topic-spacer" />
              <div class="dc-topic-foot">
                <div class="dc-topic-cap"><span>{c.done}/{c.total} done</span><span>{c.pct}%</span></div>
                <div class="dc-topic-bar">{segments(c.byStatus, c.total)}</div>
              </div>
            </div>
            {c.fn ? <span class="dc-topic-link"><dc.Link link={c.fn.$link} /></span> : null}
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
