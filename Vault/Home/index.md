---
title: Welcome to DevBook!
tags: [FolderNote, MetricsIgnore]
publish: true
icon: home
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
    { key: "done", tone: "done", label: "Done", weight: 100, mix: 100 },
    { key: "ready to repeat", tone: "ready", label: "Ready", weight: 66, mix: 58 },
    { key: "creation", tone: "creation", label: "in Creation", weight: 33, mix: 30 },
  ];
  const tint = (mix) =>
    mix >= 100
      ? "rgb(var(--topic-rgb))"
      : `color-mix(in srgb, rgb(var(--topic-rgb)) ${mix}%, var(--background-primary, var(--light, #ffffff)))`;
  const heroTint = (seg) => `var(--dc-progress-${seg.tone})`;

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

  const baseCards = pages
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
    });

  const N = baseCards.length;
  const fillSpan = (index, hero, heroSpan, baseSpan) => {
    if (index < hero) return heroSpan;
    const perRow = 12 / baseSpan;
    const rest = N - hero;
    const remainder = rest % perRow;
    if (remainder !== 0 && index - hero >= rest - remainder) return 12 / remainder;
    return baseSpan;
  };
  const cards = baseCards.map((c, index) => ({
    ...c,
    spanDesktop: fillSpan(index, 3, 4, 3),
    spanMedium: fillSpan(index, 2, 6, 4),
    spanNarrow: fillSpan(index, 1, 12, 6),
  }));

  let oDone = 0, oTotal = 0, oPoints = 0;
  const oByStatus = {};
  for (const c of cards) {
    oDone += c.done; oTotal += c.total; oPoints += c.points;
    for (const k of Object.keys(c.byStatus)) oByStatus[k] = (oByStatus[k] ?? 0) + c.byStatus[k];
  }
  const oPct = oTotal > 0 ? Math.round(oPoints / oTotal) : 0;
  let oCumulative = 0;
  const oEndpoints = {};
  for (const seg of STATUS_RAMP) {
    oCumulative += ((oByStatus[seg.key] ?? 0) * seg.weight) / Math.max(oTotal, 1);
    oEndpoints[seg.key] = oCumulative;
  }

  // Filled tiers as cumulative overlapping layers: each spans from the left edge
  // to its running total and stacks above the next (darkest on top), so a darker
  // tier's rounded right cap nests over the lighter one behind it. Every tier
  // ends in a rounded cap, but they read as one continuous bar, not separate pills.
  const segments = (byStatus, total, colorFor = (seg) => tint(seg.mix)) => {
    if (total <= 0) return null;
    let cum = 0;
    return STATUS_RAMP.map((seg, i) => {
      const cnt = byStatus[seg.key] ?? 0;
      cum += (cnt * seg.weight) / total;
      if (cnt <= 0) return null;
      return (
        <span style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${cum}%`, background: colorFor(seg),
          borderRadius: "0 999px 999px 0", zIndex: STATUS_RAMP.length - i,
        }} />
      );
    });
  };

  // Safari/WebKit does not resolve a var() used as the count in `grid-column: span var(--x)`;
  // it drops the declaration and falls back to `span 1`, breaking the grid. Emit static
  // `grid-column: span N` utility classes instead (works in every browser).
  const spanRules = (cls) =>
    Array.from({ length: 12 }, (_, i) => `.dc-topic-card.${cls}-${i + 1} { grid-column: span ${i + 1}; }`).join(" ");

  // Layout + the home-only "1c" card treatment (claude.ai design "DevBook Page B
  // - Glow"). The card's base chrome (.db-card border, radius, neutral surface and
  // the single soft corner glow via .db-card::before, .db-card-title, -summary)
  // comes from the shared CARD_CSS. On top of it the home cards add the 1c signature
  // pieces, which are home-only and NOT shared with the FolderNote hubs:
  //   • .dc-topic-chip  — a tinted rounded tile holding the topic icon, in place of
  //     the bare inline glyph, beside the title.
  //   • .dc-topic-bar   — a framed capsule progress track (accent-bordered pill with
  //     the cumulative status fill nested inside .dc-topic-bar-track), not a flat rail.
  // Each card sets --card-accent for the base chrome and --topic-rgb for the chip,
  // capsule, and Quartz's opaque backing in custom.scss (both = c.rgb).
  const CSS = `
.dc-topic-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 1rem; width: 100%; }
.dc-topic-card { overflow: hidden; cursor: pointer; min-width: 0; min-height: 6.75rem; margin: 0; display: flex; flex-direction: column; }
.dc-topic-card .db-card-body { flex: 1 0 auto; }
.dc-topic-card .db-card-title { font-size: 1.04rem; }
.dc-topic-title { display: flex; gap: 0.6rem; align-items: center; line-height: 1.25; }
.dc-topic-chip { display: grid; place-items: center; flex: 0 0 auto; width: 2.25rem; height: 2.25rem; border-radius: 0.625rem; background: rgba(var(--topic-rgb), 0.13); color: rgb(var(--topic-rgb)); }
.dc-topic-chip svg { display: block; width: 1.3rem; height: 1.3rem; }
.dc-topic-spacer { flex: 1 0 auto; min-height: 0.55em; }
.dc-topic-foot { display: flex; flex-direction: column; gap: 4px; }
.dc-topic-cap { font-size: 0.72rem; display: flex; justify-content: space-between; align-items: baseline; color: var(--text-muted, var(--darkgray, #5f6b7a)); }
.dc-topic-bar { box-sizing: border-box; position: relative; width: 100%; height: 11px; margin-top: 0.15rem; padding: 2px; border-radius: 999px; border: 1px solid rgba(var(--topic-rgb), 0.5); background: var(--background-primary, var(--light, #ffffff)); overflow: hidden; }
.dc-topic-bar-track { box-sizing: border-box; position: relative; height: 100%; border-radius: 999px; overflow: hidden; }
.dc-progress-hero { --topic-rgb: 76, 128, 0; --card-accent: 76, 128, 0; --dc-progress-done: #4c8000; --dc-progress-ready: #70a322; --dc-progress-creation: #9cbd66; --dc-radial-size: clamp(6.75rem, 24cqi, 8rem); overflow: hidden; container-type: inline-size; margin: 0 0 clamp(1rem, 2vw, 1.4rem); animation: db-card-in var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; }
.theme-dark .dc-progress-hero, :root[saved-theme="dark"] .dc-progress-hero { --topic-rgb: 132, 204, 22; --card-accent: 132, 204, 22; --dc-progress-done: #84cc16; --dc-progress-ready: #a3db53; --dc-progress-creation: #c1e88a; }
.dc-progress-hero:hover, .dc-progress-hero:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: none; transform: none; }
.dc-progress-hero:hover::before, .dc-progress-hero:focus-within::before { opacity: 0.78; }
.dc-progress-hero .db-card-body { display: grid; gap: clamp(1rem, 3cqi, 2rem); align-items: center; padding: clamp(1rem, 3cqi, 2rem); }
.dc-progress-copy { min-width: 0; }
p.dc-progress-eyebrow { margin: 0 0 0.45rem; color: rgb(var(--topic-rgb)); font-family: var(--codeFont, var(--font-monospace, monospace)); font-size: 0.75rem; font-weight: 700; line-height: 1.5; letter-spacing: 0.08em; text-transform: uppercase; }
.dc-progress-summary { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
.dc-progress-title, .dc-progress-mobile-value { color: var(--text-normal, var(--dark, #1f2937)); font-size: clamp(1rem, 5cqi, 1.75rem); font-weight: 700; line-height: 1.08; letter-spacing: -0.04em; white-space: nowrap; }
.dc-progress-title { min-width: 0; margin: 0; }
.dc-progress-mobile-value { flex: 0 0 auto; }
ul.dc-progress-statuses { display: none; flex-wrap: wrap; gap: 0.55rem 1.1rem; margin: 1rem 0 0; padding: 0; list-style: none; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; }
.dc-progress-statuses li { display: inline-flex; min-width: max-content; align-items: baseline; gap: 0.35rem; }
/* Obsidian's own list indent (.markdown-rendered ul/li) outranks the rules
   above, so the row lands short of the title's left edge. Kill the indent from
   a selector that outranks it, on both the list and the item, and keep it off
   the display cascade so the container query still governs visibility. */
.dc-progress-copy ul.dc-progress-statuses, .dc-progress-copy ul.dc-progress-statuses li { margin-inline-start: 0; padding-inline-start: 0; text-indent: 0; }
.dc-progress-statuses strong { color: var(--text-normal, var(--dark, #1f2937)); font-family: var(--codeFont, var(--font-monospace, monospace)); font-size: 0.9rem; }
.dc-progress-statuses i { width: 0.55rem; height: 0.55rem; border-radius: 2px; flex: 0 0 auto; }
.dc-progress-visual { display: grid; width: 100%; place-self: stretch; }
.dc-progress-visual svg { display: none; }
.dc-progress-ring { fill: none; stroke-linecap: round; }
.dc-progress-ring--track { stroke: var(--background-modifier-border, var(--lightgray, #d8dee9)); stroke-width: 8; }
.dc-progress-ring--arc { stroke-width: 8; animation: dc-progress-ring-draw 480ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; }
.dc-progress-value { display: none; }
.dc-progress-value strong { font-family: var(--codeFont, var(--font-monospace, monospace)); font-size: 0.75rem; font-weight: 700; line-height: 1; }
.dc-progress-value span { display: none; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-family: var(--codeFont, var(--font-monospace, monospace)); font-size: 0.62rem; line-height: 1.15; letter-spacing: 0.04em; text-transform: uppercase; }
.dc-progress-bar { height: 12px; margin-top: 0; }
@keyframes dc-progress-ring-draw { from { stroke-dasharray: 0 100; } }
@container (min-width: 40rem) {
  .dc-progress-hero .db-card-body { grid-template-columns: minmax(0, 1fr) auto; }
  .dc-progress-summary { display: block; }
  .dc-progress-title { font-size: clamp(1.75rem, 4cqi, 2.25rem); }
  .dc-progress-mobile-value { display: none; }
  ul.dc-progress-statuses { display: flex; }
  .dc-progress-visual { position: relative; width: var(--dc-radial-size); aspect-ratio: 1; gap: 0; padding-top: 0; place-self: center; place-items: center; }
  .dc-progress-visual svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; overflow: visible; transform: rotate(-90deg); }
  /* Everything inside the ring scales off --dc-radial-size, not the card's cqi:
     the ring shrinks in fit mode while cqi does not, and a container-sized
     label overruns the 8-wide stroke. The inline padding keeps the text off
     the arc itself. */
  .dc-progress-value { position: relative; display: grid; place-items: center; padding: 0 calc(var(--dc-radial-size) * 0.14); text-align: center; }
  .dc-progress-value strong { font-family: var(--headerFont, var(--font-interface, sans-serif)); font-size: calc(var(--dc-radial-size) * 0.26); letter-spacing: -0.05em; }
  .dc-progress-value span { display: block; margin-top: 0.06em; font-size: calc(var(--dc-radial-size) * 0.095); }
  .dc-progress-bar { display: none; }
}
/* No child combinators: Syncer freezes this CSS into published Markdown and
   that path escapes ">" to "&gt;", silently killing any rule that uses one.
   The fills reveal by scaling, not by animating width: the segment widths are
   inline percentages, and scaleX(0->1) with a left origin lands on exactly that
   inline width while staying on the compositor.
   --ease-out, never --ease-spring: the track is overflow:hidden, so a curve that
   overshoots would clip a near-full bar flat at 100% and then visibly retreat to
   its real value, which reads as a bug. All three stacked segments share one
   easing and one delay so their z-ordered boundaries stay put every frame. */
@keyframes dc-topic-bar-fill { from { transform: scaleX(0); } }
.dc-topic-bar-track span { transform-origin: left center; animation: dc-topic-bar-fill var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; }
/* Needed on its own: this file's CSS is inlined per-page and custom.scss is not
   loaded at all inside Obsidian, so the --dur-* collapse cannot reach here. */
@media (prefers-reduced-motion: reduce) { .dc-topic-bar-track span, .dc-progress-ring--arc, .dc-progress-hero { animation: none; } }
${spanRules("dsk")}
@media (max-width: 1600px) { ${spanRules("med")} }
@media (max-width: 760px) { ${spanRules("nar")} }
@media (max-width: 430px) { .dc-topic-grid { grid-template-columns: 1fr; } .dc-topic-grid .dc-topic-card { grid-column: span 1; } }
`;

  return (
    <div class="dc-topic-dashboard" style={{ marginTop: "1.5rem" }}>
      <style dangerouslySetInnerHTML={{ __html: squashCss(CARD_CSS + CSS) }} />
      <section class="db-card dc-progress-hero" aria-labelledby="dc-progress-title">
        <div class="db-card-body">
          <div class="dc-progress-copy">
            <p class="dc-progress-eyebrow">Learning overview</p>
            <div class="dc-progress-summary">
              <p class="dc-progress-title" id="dc-progress-title" role="heading" aria-level="2">{oTotal} notes across {N} topics</p>
              <span class="dc-progress-mobile-value" aria-hidden="true">{oPct}%</span>
            </div>
            <ul class="dc-progress-statuses" aria-label="Note lifecycle totals">
              {STATUS_RAMP.map((seg) => (
                <li>
                  <i aria-hidden="true" style={{ background: heroTint(seg) }} />
                  <strong>{oByStatus[seg.key] ?? 0}</strong> {seg.label}
                </li>
              ))}
            </ul>
          </div>
          <div class="dc-progress-visual" role="img" aria-label={`Progress ${oPct} percent. ${oDone} Done, ${oByStatus["ready to repeat"] ?? 0} Ready, and ${oByStatus.creation ?? 0} in Creation.`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle class="dc-progress-ring dc-progress-ring--track" cx="60" cy="60" r="50" pathLength="100" />
              {STATUS_RAMP.slice().reverse().map((seg) => (
                <circle class="dc-progress-ring dc-progress-ring--arc" cx="60" cy="60" r="50" pathLength="100" style={{ stroke: heroTint(seg), strokeDasharray: `${oEndpoints[seg.key]} 100` }} />
              ))}
            </svg>
            <span class="dc-progress-value"><strong>{oPct}%</strong><span>Progress</span></span>
            <div class="dc-topic-bar dc-progress-bar" aria-hidden="true"><div class="dc-topic-bar-track">{segments(oByStatus, oTotal, heroTint)}</div></div>
          </div>
        </div>
      </section>
      <div class="dc-topic-grid">
        {cards.map((c) => (
          <div class={`db-card dc-topic-card dsk-${c.spanDesktop} med-${c.spanMedium} nar-${c.spanNarrow}`} style={{ "--card-accent": c.rgb, "--topic-rgb": c.rgb }}>
            <div class="db-card-body">
              <div class="dc-topic-title">
                <span class="dc-topic-chip" dangerouslySetInnerHTML={{ __html: c.iconSvg }} />
                <span class="db-card-title">{c.title}</span>
              </div>
              {c.desc ? <p class="db-card-summary">{c.desc}</p> : null}
              <div class="dc-topic-spacer" />
              <div class="dc-topic-foot">
                <div class="dc-topic-cap"><span>{c.done}/{c.total} done</span><span>{c.pct}%</span></div>
                <div class="dc-topic-bar"><div class="dc-topic-bar-track">{segments(c.byStatus, c.total)}</div></div>
              </div>
            </div>
            {c.fn ? <span class="db-card-hit"><dc.Link link={c.fn.$link} /></span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
```
