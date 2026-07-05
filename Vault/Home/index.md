---
tags:
  - FolderNote
  - MetricsIgnore
  - Template
whats-next: false
publish: true
dg-home: true
---

Welcome to my software engineering notebook — the notes I've written to actually *understand* the stack, not just recall it for an interview. .NET internals, distributed systems, databases, security, cloud, AI/ML, and most of what sits between. Every note goes deep: core mechanics, real examples, the pitfalls that bite in production, and the questions worth being able to answer.

> [!info] Why this exists
> I learn by writing things down and coming back to them. This vault is that process in the open — built on spaced repetition, organized into 11 topic areas, and updated continuously. Browse by topic below, or scroll on for progress and recent activity.

# Topics

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
    { folder: "07 Security", title: "Security", desc: "Threats, crypto, auth, defensive design." },
    { folder: "08 SDLC", title: "SDLC", desc: "How software gets planned, built, and shipped." },
    { folder: "09 DevOps", title: "DevOps", desc: "CI/CD, containers, and automation." },
    { folder: "10 Cloud", title: "Cloud", desc: "AWS/Azure, serverless, cloud-native design." },
    { folder: "11 AI & ML", title: "AI & ML", desc: "Models, training, applied machine learning." },
  ];

  // lucide inner-SVG for the icon each topic folder-note declares in `icon`.
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
  const wrapSvg = (inner) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  const STATUS_PROGRESS = { "not-started": 0, "creation": 33, "ready to repeat": 66, "done": 100 };
  const STATUS_RAMP = [
    { key: "done", weight: 100, alpha: 1 },
    { key: "ready to repeat", weight: 66, alpha: 0.6 },
    { key: "creation", weight: 33, alpha: 0.28 },
  ];

  const firstString = (v) =>
    Array.isArray(v) ? (v.length ? String(v[0]).trim() : "") : (v == null ? "" : String(v).trim());
  const hasTag = (p, t) => (p.$tags ?? []).some((x) => String(x).replace(/^#/, "") === t);

  const pages = dc.useQuery(`@page and path("${ROOT}")`);

  // Map each topic folder -> its FolderNote page (for icon + accent colour).
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
    return { pct: total > 0 ? Math.round(points / total) : 0, done, total, byStatus };
  };

  const cards = TOPICS
    .map((t) => {
      const fn = folderNoteFor.get(`${ROOT}/${t.folder}`);
      const color = firstString(fn?.value("color")) || "var(--secondary)";
      const iconSvg = wrapSvg(ICONS[firstString(fn?.value("icon"))] ?? DEFAULT_ICON);
      return { ...t, fn, color, iconSvg, ...statsFor(t.folder) };
    })
    .sort((a, b) => b.pct - a.pct || b.total - a.total || a.title.localeCompare(b.title));

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
        {cards.map((c) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1rem 1.1rem 1.1rem", border: "1px solid var(--lightgray)", borderRadius: "8px", background: "var(--light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <span style={{ color: c.color, display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: c.iconSvg }} />
              <span style={{ fontWeight: 600, fontSize: "1.02rem", flex: 1, lineHeight: 1.2 }}>
                {c.fn ? <dc.Link link={c.fn.$link} /> : c.title}
              </span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: c.color }}>{c.pct}%</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.35, color: "var(--gray)" }}>{c.desc}</p>
            <div style={{ display: "flex", height: "7px", borderRadius: "4px", overflow: "hidden", background: "var(--lightgray)", marginTop: "0.15rem" }}>
              {STATUS_RAMP.map((seg) => {
                const cnt = c.byStatus[seg.key] ?? 0;
                const width = c.total > 0 ? (cnt * seg.weight) / c.total : 0;
                if (width <= 0) return null;
                return <span style={{ width: `${width}%`, height: "100%", background: c.color, opacity: seg.alpha }} />;
              })}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--gray)" }}>{c.done}/{c.total} done</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

# Recently Updated

```dataview
TABLE WITHOUT ID file.link as "Note", file.mtime as "Date"
FROM "Home"
WHERE file.path != this.file.path
  AND !contains(file.tags, "#MetricsIgnore")
SORT file.mtime DESC
LIMIT 10
```
