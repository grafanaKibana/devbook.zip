---
title: Welcome to DevBook!
tags:
  - FolderNote
  - MetricsIgnore
  - Template
publish: true
---
```datacorejsx
const { CARD_CSS, squashCss } = await dc.require("Assets/components/devbook-card.jsx");
const { icon } = await dc.require("Assets/components/devbook-icons.jsx");
return function TopicDashboard() {
  const ROOT = (dc.useCurrentFile()?.$path || "Home").split("/")[0];

  const STATUS_PROGRESS = { "not-started": 0, "creation": 33, "ready to repeat": 66, "done": 100 };
  // `mix` is the accent-vs-surface blend for each status segment. Solid tints
  // (not opacity) keep segments crisp on dark backgrounds and over the Quartz
  // dot grid, where a faded alpha would let the background bleed through.
  const STATUS_RAMP = [
    { key: "done", label: "Done", weight: 100, mix: 100 },
    { key: "ready to repeat", label: "Ready to Repeat", weight: 66, mix: 58 },
    { key: "creation", label: "Creation", weight: 33, mix: 30 },
  ];
  const tint = (mix) =>
    mix >= 100
      ? "rgb(var(--topic-rgb))"
      : `color-mix(in srgb, rgb(var(--topic-rgb)) ${mix}%, var(--background-primary, var(--light, #ffffff)))`;

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

  const statsFor = (dir) => {
    const prefix = `${dir}/`;
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

  // Topics are the direct-child folders of ROOT — their FolderNote sits two path
  // segments below ROOT (ROOT/<Folder>/<name>.md). Title, description, colour,
  // icon, and order all come from that note's frontmatter (summary = the card
  // description, exactly like the child cards in the shared folder map), so there
  // is no hard-coded topic list to keep in sync.
  const isTopicHub = (p) =>
    hasTag(p, "FolderNote") &&
    !hasTag(p, "MetricsIgnore") &&
    p.$path.slice(ROOT.length + 1).split("/").length === 2;

  const cards = pages
    .filter(isTopicHub)
    .sort((a, b) => {
      const orderA = Number(firstString(a.value("order")) || Number.MAX_SAFE_INTEGER);
      const orderB = Number(firstString(b.value("order")) || Number.MAX_SAFE_INTEGER);
      return orderA - orderB || a.$name.localeCompare(b.$name);
    })
    .map((fn) => {
      const dir = fn.$path.slice(0, fn.$path.lastIndexOf("/"));
      const rgb = hexToRgbTriple(fn.value("color")) || "125, 125, 125";
      const iconSvg = icon(fn.value("icon"));
      return {
        fn,
        title: fn.$name,
        desc: firstString(fn.value("summary")),
        rgb,
        iconSvg,
        ...statsFor(dir),
      };
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
      return <span style={{ width: `${width}%`, background: tint(seg.mix) }} />;
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
/* Round the trailing edge of the filled portion so the progress ends in a cap, not a hard vertical cut. */
.dc-topic-bar > span:last-child { border-radius: 0 999px 999px 0; }
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
      <style dangerouslySetInnerHTML={{ __html: squashCss(CARD_CSS + CSS) }} />
      <div class="dc-topic-grid">
        {cards.map((c) => (
          <div class={`db-card dc-topic-card dsk-${c.spanDesktop} med-${c.spanMedium} nar-${c.spanNarrow}`} style={{ "--card-accent": c.rgb, "--topic-rgb": c.rgb }}>
            <div class="db-card-body">
              <div class="dc-topic-title">
                <span class="db-card-icon" dangerouslySetInnerHTML={{ __html: c.iconSvg }} />
                <span class="db-card-title">{c.title}</span>
              </div>
              {c.desc ? <p class="db-card-summary">{c.desc}</p> : null}
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
              <span class="dc-topic-legend-sw" style={{ background: tint(seg.mix) }} />
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
