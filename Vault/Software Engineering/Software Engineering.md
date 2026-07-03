---
tags:
  - FolderNote
  - MetricsIgnore
  - Template
dg-publish: true
dg-home: true
---

Welcome to my software engineering notebook — the notes I've written to actually *understand* the stack, not just recall it for an interview. .NET internals, distributed systems, databases, security, cloud, AI/ML, and most of what sits between. Every note goes deep: core mechanics, real examples, the pitfalls that bite in production, and the questions worth being able to answer.

> [!info] Why this exists
> I learn by writing things down and coming back to them. This vault is that process in the open — built on spaced repetition, organized into 11 topic areas, and updated continuously. Browse by topic below, or scroll on for progress and recent activity.

# Topics

```dataviewjs
const { MarkdownRenderer, setIcon } = require("obsidian");

const ROOT = "Software Engineering";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const isMetricsIgnored = (p) => (p.file.tags ?? []).includes("#MetricsIgnore");
const curPath = dv.current().file.path;
const notes = dv.pages(`"${ROOT}"`).where(
  (p) => p.file.path !== curPath && !isMetricsIgnored(p) && !isFolderNote(p)
);

// Keyed by lower-cased status so capitalization drift in note frontmatter
// (e.g. "Ready to Repeat" vs "Ready To Repeat") can't silently score 0.
const STATUS_PROGRESS = new Map([
  ["not-started", 0],
  ["creation", 33],
  ["ready to repeat", 66],
  ["done", 100],
]);
const progressFor = (status) => STATUS_PROGRESS.get(status.toLowerCase()) ?? 0;

// Ordered status ramp powering the multicolour bars + legend. Each in-progress
// status contributes `weight` points; a status's coloured segment is sized to
// its share of those points (count·weight / total), so the filled portion of
// the bar always sums back to the topic's weighted percentage. "Not-Started"
// contributes 0, so it has no segment (it's the empty track).
//
// Each segment is a shade of the card's own accent — rgb(var(--callout-color)),
// the topic colour set from the page's `color` frontmatter — dimmed via element
// opacity so Done reads solid and earlier stages fade out. Ordered Done-first so
// each bar reads completed → earliest stage.
const STATUS_RAMP = [
  { key: "done",            label: "Done",            weight: 100, alpha: 1 },
  { key: "ready to repeat", label: "Ready to Repeat", weight: 66,  alpha: 0.6 },
  { key: "creation",        label: "Creation",        weight: 33,  alpha: 0.28 },
];

const asStringArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  return [];
};

const folderToSeg = (folder) => {
  if (typeof folder !== "string") return null;
  if (folder === ROOT) return null;
  if (!folder.startsWith(ROOT + "/")) return null;
  const rel = folder.slice((ROOT + "/").length);
  const seg = rel.split("/")[0] ?? "";
  return seg.length > 0 ? seg : null;
};
const segToTopic = (seg) => seg.replace(/^\d+\s+/, "").trim();

// --- Coverage stats, keyed by topic name -------------------------------------
const topicStats = new Map();
let notesWithTopicTotal = 0;
let notesWithTopicPoints = 0;
let notesWithTopicDone = 0;
const overallByStatus = new Map();
const notesOutsideTopics = [];

for (const p of notes) {
  const seg = folderToSeg(p.file.folder);
  if (!seg) {
    notesOutsideTopics.push(p);
    continue;
  }
  const topic = segToTopic(seg);

  const status = asStringArray(p.status)[0] ?? "";
  const statusKey = status.toLowerCase();
  const progress = progressFor(status);
  const isDone = statusKey === "done";

  notesWithTopicTotal += 1;
  notesWithTopicPoints += progress;
  if (isDone) notesWithTopicDone += 1;
  overallByStatus.set(statusKey, (overallByStatus.get(statusKey) ?? 0) + 1);

  const cur = topicStats.get(topic) ?? { total: 0, points: 0, done: 0, seg, byStatus: new Map() };
  cur.total += 1;
  cur.points += progress;
  if (isDone) cur.done += 1;
  cur.byStatus.set(statusKey, (cur.byStatus.get(statusKey) ?? 0) + 1);
  topicStats.set(topic, cur);
}

// The bar is weighted across every status (Not-Started/Creation/
// Ready-To-Repeat/Done → 0/33/66/100), so in-progress notes count toward it.
// The "n/m done" counter is separate: a plain count of notes whose status is
// "Done", so it never just mirrors the weighted bar.
const statsFor = (topic) => {
  const s = topicStats.get(topic);
  if (!s) return { pct: 0, done: 0, total: 0, byStatus: new Map() };
  const pct = s.total > 0 ? Math.round(s.points / s.total) : 0;
  return { pct, done: s.done, total: s.total, byStatus: s.byStatus };
};

// --- Curated cards ------------------------------------------------------------
// Each card is [target, alias, description]. The icon + accent colour come from
// the topic page's own frontmatter (see the loop); DEFAULT_ICON is the fallback
// when a page has no `icon` field.
const DEFAULT_ICON = "folder";
const cards = [
  ["Software Engineering/01 Programming/01 Programming", "Programming", "Languages, .NET internals, paradigms, clean code."],
  ["Software Engineering/02 Computer Science/02 Computer Science", "Computer Science", "Algorithms, data structures, the theory underneath."],
  ["Software Engineering/03 Data Persistence/03 Data Persistence", "Data Persistence", "Databases, indexing, transactions, storage engines."],
  ["Software Engineering/04 Networks/04 Networks", "Networks", "Protocols, HTTP, TCP/IP, how packets travel."],
  ["Software Engineering/05 Architecture/05 Architecture", "Architecture", "Distributed systems, patterns, designing for scale."],
  ["Software Engineering/06 Development Practices/06 Development Practices", "Development Practices", "Testing, version control, and the craft."],
  ["Software Engineering/07 Security/07 Security", "Security", "Threats, crypto, auth, defensive design."],
  ["Software Engineering/08 SDLC/08 SDLC", "SDLC", "How software gets planned, built, and shipped."],
  ["Software Engineering/09 DevOps/09 DevOps", "DevOps", "CI/CD, containers, and automation."],
  ["Software Engineering/10 Cloud/10 Cloud", "Cloud", "AWS/Azure, serverless, cloud-native design."],
  ["Software Engineering/11 AI & ML/11 AI & ML", "AI & ML", "Models, training, applied machine learning."],
];

// Topics that have notes but no curated card → appended so they fill the
// trailing empty cell(s) of the grid instead of dropping their progress.
const curatedTopics = new Set(cards.map((c) => c[1]));
const extraTopics = [...topicStats.entries()]
  .filter(([topic]) => !curatedTopics.has(topic))
  .sort((a, b) => a[0].localeCompare(b[0]));
for (const [topic, s] of extraTopics) {
  const target = `${ROOT}/${s.seg}/${s.seg}`;
  cards.push([target, topic, ""]);
}

// Sort cards by coverage, most complete first (tie-break on note count, then name).
cards.sort((a, b) => {
  const sa = statsFor(a[1]);
  const sb = statsFor(b[1]);
  return sb.pct - sa.pct || sb.total - sa.total || a[1].localeCompare(b[1]);
});

// --- Render the grid as a wrapping flex row ----------------------------------
// Flexbox (not a table) so two behaviours fall out for free: every card in a
// row stretches to the tallest one (align-items: stretch is the flex default),
// and a short final row grows its cards to fill the full width (flex-grow)
// instead of leaving an empty hole where the missing cells would be.
const wrapper = dv.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const grid = wrapper.createEl("div");
grid.style.display = "flex";
grid.style.flexWrap = "wrap";
grid.style.gap = "0.6em";
grid.style.width = "100%";

// Multicolour stacked bar: one coloured slice per in-progress status, each sized
// to that status's contribution to the weighted percentage (count·weight/total).
// The slices therefore fill exactly `pct%` of the track; the rest stays empty.
const appendStackedBar = (parent, byStatus, total) => {
  const bar = parent.createEl("div");
  bar.classList.add("se-progress");
  bar.style.display = "flex";
  bar.style.width = "100%";
  bar.style.height = "0.7em";
  bar.style.borderRadius = "999px";
  bar.style.overflow = "hidden";
  bar.style.background = "var(--background-modifier-border)";

  if (total > 0) {
    for (const s of STATUS_RAMP) {
      const cnt = byStatus.get(s.key) ?? 0;
      if (cnt <= 0) continue;
      const widthPct = (cnt * s.weight) / total; // percentage points of the whole bar
      if (widthPct <= 0) continue;
      const seg = bar.createEl("div");
      seg.style.width = `${widthPct}%`;
      seg.style.background = "rgb(var(--callout-color))"; // topic accent (from the card's --callout-color)
      seg.style.opacity = String(s.alpha);
      seg.setAttribute(
        "aria-label",
        `${s.label}: ${cnt} note${cnt === 1 ? "" : "s"} → ${widthPct.toFixed(1)}%`,
      );
    }
  }
  return bar;
};

const appendProgress = (parent, pct, byStatus, total) => {
  parent.style.textAlign = "center";

  appendStackedBar(parent, byStatus, total);

  const line = parent.createEl("div");
  line.style.textAlign = "center";
  line.createEl("span", { text: `${pct}%` });
  return line;
};

// Shared colour legend, rendered once beneath the grid + total.
const appendLegend = (parent) => {
  const legend = parent.createEl("div");
  legend.classList.add("se-progress-legend");
  legend.style.display = "flex";
  legend.style.flexWrap = "wrap";
  legend.style.justifyContent = "center";
  legend.style.gap = "0.4em 1.1em";
  legend.style.marginTop = "0.7em";
  legend.style.fontSize = "0.8em";
  legend.style.opacity = "0.85";
  for (const s of STATUS_RAMP) {
    const item = legend.createEl("span");
    item.style.display = "inline-flex";
    item.style.alignItems = "center";
    item.style.gap = "0.4em";
    const sw = item.createEl("span");
    sw.style.width = "0.8em";
    sw.style.height = "0.8em";
    sw.style.borderRadius = "3px";
    sw.style.flex = "0 0 auto";
    sw.style.background = "rgb(var(--callout-color))"; // follows the enclosing callout's accent
    sw.style.opacity = String(s.alpha);
    sw.style.display = "inline-block";
    item.createEl("span", { text: `${s.label} · ${s.weight}%` });
  }
  return legend;
};

const sourcePath = dv.current().file.path;
// Callout type for each topic card — drives the accent colour of the title bar
// and left border (built like a native `> [!info]` callout). Any built-in type
// works: note/info/todo (blue), tip/abstract (cyan), success/done (green),
// question (yellow), warning (orange), failure/danger/bug (red), example
// (purple), quote (grey).
const CARD_CALLOUT = "quote";

// Style the title link via CSS (not inline) so it can carry a real :hover — it
// takes the callout's accent colour and only underlines on hover, like a link.
const style = wrapper.createEl("style");
style.textContent = `
  .se-topic-card .callout-title-inner a { color: rgb(var(--callout-color)); text-decoration: none; }
  .se-topic-card .callout-title-inner a:hover { text-decoration: underline; }
`;

// Read the icon id + accent colour from a topic page's own frontmatter — the
// same `icon`/`color` fields Notebook Navigator uses — so the page is the single
// source of truth. `icon` accepts a bare Lucide id, a "lucide-…" class, or a
// "provider:name" form; `color` is a hex string.
const iconIdOf = (v) => {
  if (typeof v !== "string") return "";
  let s = v.trim();
  if (s.includes(":")) s = s.slice(s.indexOf(":") + 1);
  return s.replace(/^lucide-/, "");
};
const hexToRgbTriple = (v) => {
  if (typeof v !== "string") return null;
  let h = v.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

for (const card of cards) {
  const [target, alias, desc] = card;
  // Icon + accent colour come from the topic page's own frontmatter (single
  // source of truth); fall back to DEFAULT_ICON / the type default colour.
  const page = dv.page(target);
  const iconName = iconIdOf(page?.icon) || DEFAULT_ICON;
  const colorTriple = hexToRgbTriple(page?.color);

  // Each card is a titled callout AND a flex item. `flex-basis` = a third minus
  // its share of the two inter-card gaps → exactly 3 per row; `flex-grow: 1`
  // lets a short final row widen its cards to span the full width. `min-width:
  // 0` stops a long title from blowing past that basis.
  const callout = grid.createEl("div", { cls: "callout se-topic-card" });
  callout.setAttribute("data-callout", CARD_CALLOUT);
  // Frontmatter colour overrides the type accent for icon + title + border
  // (all read `--callout-color`); no colour → keep the CARD_CALLOUT default.
  if (colorTriple) callout.style.setProperty("--callout-color", colorTriple);
  callout.style.flex = "1 1 calc(33.333% - 0.4em)";
  callout.style.minWidth = "0";
  callout.style.boxSizing = "border-box";
  callout.style.margin = "0";
  callout.style.display = "flex";
  callout.style.flexDirection = "column";
  // Compact, symmetric padding — the default `--callout-padding` has an
  // oversized left indent (room for the title icon) that looks huge in a narrow
  // card; override it so the boxes read tighter than the full-width total.
  callout.style.padding = "0.75em";

  // Title row: a Lucide SVG fills the icon slot (setIcon injects it) and the
  // topic link is the bold title, exactly like a native `> [!info] …` header.
  const title = callout.createEl("div", { cls: "callout-title" });
  const iconEl = title.createEl("div", { cls: "callout-icon" });
  iconEl.style.display = "flex";
  iconEl.style.color = "rgb(var(--callout-color))"; // match the accent, like a native icon
  setIcon(iconEl, iconName);
  // Size the injected SVG relative to the title text.
  const svg = iconEl.querySelector("svg");
  if (svg) {
    svg.style.width = "1.15em";
    svg.style.height = "1.15em";
  }
  const titleInner = title.createEl("div", { cls: "callout-title-inner" });
  titleInner.style.fontWeight = "700";
  await MarkdownRenderer.render(app, `[[${target}|${alias}]]`, titleInner, sourcePath, dv.component);
  // Flatten the <p> Markdown wraps the link in so it sits inline with the icon,
  // and let it inherit the bold weight from the title.
  titleInner.querySelectorAll("p").forEach((p) => {
    p.style.margin = "0";
    p.style.display = "inline";
    p.style.fontWeight = "inherit";
  });
  // Link colour + hover underline are handled by the injected `.se-topic-card`
  // CSS above so the title reads like a native callout header, not a wiki-link.

  const calloutContent = callout.createEl("div", { cls: "callout-content" });
  calloutContent.style.display = "flex";
  calloutContent.style.flexDirection = "column";
  // Top-align the body: description hugs the title, and the flexible spacer
  // below (not centring) is what absorbs the extra height on equalized rows.
  calloutContent.style.justifyContent = "flex-start";
  calloutContent.style.flex = "1";
  calloutContent.style.padding = "0";
  calloutContent.style.marginTop = "0.4em";

  // Description sits directly under the title, at the normal callout body size.
  // Rendered as plain text (not <sub>, which drops the baseline and reads as a
  // gap); its paragraph margins are zeroed so it starts flush at the top.
  const body = calloutContent.createEl("div");
  if (desc) {
    await MarkdownRenderer.render(app, desc, body, sourcePath, dv.component);
    body.querySelectorAll("p").forEach((p) => { p.style.margin = "0"; });
  }

  // Flexible gap: it grows to absorb the extra height when the row is equalized
  // to the tallest card, so every bar lands on the same line. `min-height`
  // keeps a floor of breathing room even on the tallest card in the row.
  const spacer = calloutContent.createEl("div");
  spacer.style.flex = "1 0 auto";
  spacer.style.minHeight = "0.75em";

  const stats = statsFor(alias);
  const foot = calloutContent.createEl("div");
  const line = appendProgress(foot, stats.pct, stats.byStatus, stats.total);
  const sub = line.createEl("span", { text: ` · ${stats.done}/${stats.total} done` });
  sub.style.fontSize = "0.8em";
  sub.style.opacity = "0.7";
}

// --- Overall total, rendered as a callout ------------------------------------
const totalPct = notesWithTopicTotal > 0 ? Math.round(notesWithTopicPoints / notesWithTopicTotal) : 0;
const totalDone = notesWithTopicDone;

const callout = dv.container.createEl("div", { cls: "callout" });
callout.setAttribute("data-callout", "done");

const calloutContent = callout.createEl("div", { cls: "callout-content" });
const totalLine = appendProgress(calloutContent, totalPct, overallByStatus, notesWithTopicTotal);
const totalSub = totalLine.createEl("span", { text: ` · ${totalDone}/${notesWithTopicTotal} done` });
totalSub.style.fontSize = "0.8em";
totalSub.style.opacity = "0.7";

// Colour key for every stacked bar above.
appendLegend(calloutContent);

// --- Notes that aren't under any top-level topic folder ----------------------
if (notesOutsideTopics.length > 0) {
  const noteLinks = notesOutsideTopics
    .map((note) => `> - [[${note.file.path.replace('.md', '')}|${note.file.name}]]`)
    .join('\n');

  const count = notesOutsideTopics.length;
  const label = count === 1 ? "Note" : "Notes";
  const calloutMarkdown = `> [!warning] ${count} ${label} outside topic folders\n${noteLinks}`;

  dv.paragraph(calloutMarkdown);
}
```

# Recently Updated

```dataview
TABLE WITHOUT ID file.link as "Note", file.mtime as "Date"
FROM "Software Engineering"
WHERE file.path != this.file.path
  AND !contains(file.tags, "#MetricsIgnore")
SORT file.mtime DESC
LIMIT 10
```

# Publish Distribution

```dataviewjs
const ROOT = "Software Engineering";
const isMetricsIgnored = (p) => (p.file.tags ?? []).includes("#MetricsIgnore");

const appendProgress = (td, pct) => {
  const prog = td.createEl("progress");
  prog.classList.add("se-progress");
  prog.max = 100;
  prog.value = pct;

  td.createEl("span", { text: ` ${pct}%` });
};

const asBoolean = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return false;
};

const curPath = dv.current().file.path;
const notes = dv.pages(`"${ROOT}"`).where((p) => p.file.path !== curPath && !isMetricsIgnored(p));

let publishedCount = 0;
const unpublishedNotes = [];

for (const p of notes) {
  if (asBoolean(p["dg-publish"])) {
    publishedCount += 1;
  } else {
    unpublishedNotes.push(p);
  }
}

const unpublishedCount = unpublishedNotes.length;
const total = notes.length;
const rows = [
  {
    status: "Published",
    count: publishedCount,
    pct: total > 0 ? Math.round((publishedCount / total) * 100) : 0,
  },
  {
    status: "Unpublished",
    count: unpublishedCount,
    pct: total > 0 ? Math.round((unpublishedCount / total) * 100) : 0,
  },
];

const wrapper = this.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const thead = table.createEl("thead");
thead.classList.add("table-view-thead");
const hr = thead.createEl("tr");
for (const h of ["Publish Status", "Distribution", "Count"]) {
  hr.createEl("th", { text: h });
}

const tbody = table.createEl("tbody");
tbody.classList.add("table-view-tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  tr.createEl("td", { text: r.status });

  const tdProg = tr.createEl("td");
  appendProgress(tdProg, r.pct);

  tr.createEl("td", { text: `${r.count}` });
}

if (unpublishedNotes.length > 0) {
  const noteLinks = unpublishedNotes
    .sort((a, b) => a.file.path.localeCompare(b.file.path))
    .map((note) => `> - [[${note.file.path.replace(".md", "")}|${note.file.name}]]`)
    .join("\n");

  const count = unpublishedNotes.length;
  const label = count === 1 ? "page" : "pages";
  const calloutMarkdown = `> [!info] ${count} unpublished ${label}\n${noteLinks}`;

  dv.paragraph(calloutMarkdown);
}
```

<!-- whats-next:start -->

---

> [!note] Whats next
> **Topics**
> - [[Software Engineering/01 Programming/01 Programming|01 Programming]]
> - [[Software Engineering/02 Computer Science/02 Computer Science|02 Computer Science]]
> - [[Software Engineering/03 Data Persistence/03 Data Persistence|03 Data Persistence]]
> - [[Software Engineering/04 Networks/04 Networks|04 Networks]]
> - [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
> - [[Software Engineering/06 Development Practices/06 Development Practices|06 Development Practices]]
> - [[Software Engineering/07 Security/07 Security|07 Security]]
> - [[Software Engineering/08 SDLC/08 SDLC|08 SDLC]]
> - [[Software Engineering/09 DevOps/09 DevOps|09 DevOps]]
> - [[Software Engineering/10 Cloud/10 Cloud|10 Cloud]]
> - [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
<!-- whats-next:end -->
