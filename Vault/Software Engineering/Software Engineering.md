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
const { MarkdownRenderer } = require("obsidian");

const ROOT = "Software Engineering";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const isMetricsIgnored = (p) => (p.file.tags ?? []).includes("#MetricsIgnore");
const curPath = dv.current().file.path;
const notes = dv.pages(`"${ROOT}"`).where(
  (p) => p.file.path !== curPath && !isMetricsIgnored(p) && !isFolderNote(p)
);

const STATUS_PROGRESS = new Map([
  ["Not-Started", 0],
  ["Creation", 25],
  ["Repetition", 50],
  ["Ready To Repeat", 75],
  ["Done", 100],
]);

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
const notesOutsideTopics = [];

for (const p of notes) {
  const seg = folderToSeg(p.file.folder);
  if (!seg) {
    notesOutsideTopics.push(p);
    continue;
  }
  const topic = segToTopic(seg);

  const status = asStringArray(p.status)[0] ?? "";
  const progress = STATUS_PROGRESS.get(status) ?? 0;

  notesWithTopicTotal += 1;
  notesWithTopicPoints += progress;

  const cur = topicStats.get(topic) ?? { total: 0, points: 0, seg };
  cur.total += 1;
  cur.points += progress;
  topicStats.set(topic, cur);
}

// "Done" is expressed in whole-note equivalents: the accumulated progress
// points (0/25/50/75/100 per note) divided by 100. So a topic averaging 25%
// across 32 notes reads as 8/32 done.
const statsFor = (topic) => {
  const s = topicStats.get(topic);
  if (!s) return { pct: 0, done: 0, total: 0 };
  const pct = s.total > 0 ? Math.round(s.points / s.total) : 0;
  const done = Math.round(s.points / 100);
  return { pct, done, total: s.total };
};

// --- Curated cards ------------------------------------------------------------
const cards = [
  ["🧠", "Software Engineering/01 Programming/01 Programming", "Programming", "Languages, .NET internals, paradigms, clean code."],
  ["🖥️", "Software Engineering/02 Computer Science/02 Computer Science", "Computer Science", "Algorithms, data structures, the theory underneath."],
  ["🗄️", "Software Engineering/03 Data Persistence/03 Data Persistence", "Data Persistence", "Databases, indexing, transactions, storage engines."],
  ["🌐", "Software Engineering/04 Networks/04 Networks", "Networks", "Protocols, HTTP, TCP/IP, how packets travel."],
  ["🏛️", "Software Engineering/05 Architecture/05 Architecture", "Architecture", "Distributed systems, patterns, designing for scale."],
  ["🛠️", "Software Engineering/06 Development Practices/06 Development Practices", "Development Practices", "Testing, version control, and the craft."],
  ["🔒", "Software Engineering/07 Security/07 Security", "Security", "Threats, crypto, auth, defensive design."],
  ["🔄", "Software Engineering/08 SDLC/08 SDLC", "SDLC", "How software gets planned, built, and shipped."],
  ["🚀", "Software Engineering/09 DevOps/09 DevOps", "DevOps", "CI/CD, containers, and automation."],
  ["☁️", "Software Engineering/10 Cloud/10 Cloud", "Cloud", "AWS/Azure, serverless, cloud-native design."],
  ["🤖", "Software Engineering/11 AI & ML/11 AI & ML", "AI & ML", "Models, training, applied machine learning."],
];

// Topics that have notes but no curated card → appended so they fill the
// trailing empty cell(s) of the grid instead of dropping their progress.
const curatedTopics = new Set(cards.map((c) => c[2]));
const extraTopics = [...topicStats.entries()]
  .filter(([topic]) => !curatedTopics.has(topic))
  .sort((a, b) => a[0].localeCompare(b[0]));
for (const [topic, s] of extraTopics) {
  const target = `${ROOT}/${s.seg}/${s.seg}`;
  cards.push(["📁", target, topic, ""]);
}

// --- Render the grid; each cell pins its progress bar to the bottom ----------
// Use a Dataview-classed table so it inherits the same (zero) top margin the
// other dashboard tables use, instead of the default markdown table margin.
const wrapper = dv.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const tbody = table.createEl("tbody");
tbody.classList.add("table-view-tbody");

const appendProgress = (parent, pct) => {
  parent.style.textAlign = "center";

  const prog = parent.createEl("progress");
  prog.classList.add("se-progress");
  prog.max = 100;
  prog.value = pct;
  prog.style.display = "block";
  prog.style.width = "100%";

  const line = parent.createEl("div");
  line.style.textAlign = "center";
  line.createEl("span", { text: `${pct}%` });
  return line;
};

const COLS = 3;
const sourcePath = dv.current().file.path;
for (let i = 0; i < cards.length; i += COLS) {
  const tr = tbody.createEl("tr");
  for (let c = 0; c < COLS; c++) {
    const td = tr.createEl("td");
    td.style.verticalAlign = "top";
    // Anchor the footer to the cell's bottom. Table rows equalize cell heights,
    // so absolute `bottom: 0` lands every bar on the same line across a row —
    // regardless of how many lines each description wraps to.
    td.style.position = "relative";
    const card = cards[i + c];
    if (!card) continue;
    const [icon, target, alias, desc] = card;

    // Body reserves vertical room at the bottom for the pinned footer so the
    // text never overlaps the progress bar.
    const body = td.createEl("div");
    body.style.paddingBottom = "3.5em";
    const md = desc
      ? `${icon} **[[${target}|${alias}]]**<br><sub>${desc}</sub>`
      : `${icon} **[[${target}|${alias}]]**`;
    await MarkdownRenderer.render(app, md, body, sourcePath, dv.component);

    const stats = statsFor(alias);
    const foot = td.createEl("div");
    foot.style.position = "absolute";
    foot.style.left = "0.75em";
    foot.style.right = "0.75em";
    foot.style.bottom = "0";
    const line = appendProgress(foot, stats.pct);
    const sub = line.createEl("span", { text: ` · ${stats.done}/${stats.total} done` });
    sub.style.fontSize = "0.8em";
    sub.style.opacity = "0.7";
  }
}

// --- Overall total, rendered as a callout ------------------------------------
const totalPct = notesWithTopicTotal > 0 ? Math.round(notesWithTopicPoints / notesWithTopicTotal) : 0;
const totalDone = Math.round(notesWithTopicPoints / 100);

const callout = dv.container.createEl("div", { cls: "callout" });
callout.setAttribute("data-callout", "done");

const calloutContent = callout.createEl("div", { cls: "callout-content" });
const totalLine = appendProgress(calloutContent, totalPct);
const totalSub = totalLine.createEl("span", { text: ` · ${totalDone}/${notesWithTopicTotal} done` });
totalSub.style.fontSize = "0.8em";
totalSub.style.opacity = "0.7";

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
LIMIT 12
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
