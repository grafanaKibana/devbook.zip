---
tags:
  - FolderNote
  - MetricsIgnore
dg-publish: true
dg-home: true
status:
  - Creation
level:
  - "4"
priority: High
---

# Topic Coverage

```dataviewjs
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

const appendProgress = (td, pct) => {
  const prog = td.createEl("progress");
  prog.classList.add("se-progress");
  prog.max = 100;
  prog.value = pct;

  td.createEl("span", { text: ` ${pct}%` });
};

const asStringArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  return [];
};

const topicStats = new Map();
let notesWithTopicTotal = 0;
let notesWithTopicPoints = 0;
let notesWithTopicDone = 0;

const notesOutsideTopics = [];

const folderToTopic = (folder) => {
  if (typeof folder !== "string") return null;
  if (folder === ROOT) return null;
  if (!folder.startsWith(ROOT + "/")) return null;

  const rel = folder.slice((ROOT + "/").length);
  const seg = rel.split("/")[0] ?? "";
  if (seg.length === 0) return null;

  return seg.replace(/^\d+\s+/, "").trim();
};

for (const p of notes) {
  const topic = folderToTopic(p.file.folder);
  if (!topic) {
    notesOutsideTopics.push(p);
    continue;
  }

  const status = asStringArray(p.status)[0] ?? "";
  const progress = STATUS_PROGRESS.get(status) ?? 0;
  const isDone = status === "Done";

  notesWithTopicTotal += 1;
  notesWithTopicPoints += progress;
  if (isDone) notesWithTopicDone += 1;

  const cur = topicStats.get(topic) ?? { total: 0, points: 0, done: 0 };
  cur.total += 1;
  cur.points += progress;
  if (isDone) cur.done += 1;
  topicStats.set(topic, cur);
}

const rows = [...topicStats.entries()].map(([topic, s]) => {
  const pct = s.total > 0 ? Math.round(s.points / s.total) : 0;
  return { topic, pct, done: s.done, total: s.total };
});

rows.sort((a, b) => b.pct - a.pct || b.total - a.total || a.topic.localeCompare(b.topic));

// Wrap the table so the published site can apply the same Dataview table normalization
// it applies to dataview query blocks.
const wrapper = this.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const thead = table.createEl("thead");
thead.classList.add("table-view-thead");
const hr = thead.createEl("tr");
for (const h of ["Topic", "Progress", "Done"]) {
  const th = hr.createEl("th", { text: h });
}

const tbody = table.createEl("tbody");
tbody.classList.add("table-view-tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  const tdTopic = tr.createEl("td", { text: r.topic });

  const tdProg = tr.createEl("td");
  appendProgress(tdProg, r.pct);

  const tdDone = tr.createEl("td", { text: `${r.done}/${r.total}` });
}

const totalPct = notesWithTopicTotal > 0 ? Math.round(notesWithTopicPoints / notesWithTopicTotal) : 0;
const trTotal = tbody.createEl("tr");
trTotal.classList.add("se-total-row");

trTotal.createEl("td", { text: "Total" });

const tdTotalProg = trTotal.createEl("td");
appendProgress(tdTotalProg, totalPct);

trTotal.createEl("td", { text: `${notesWithTopicDone}/${notesWithTopicTotal}` });

// Display notes that aren't under a top-level topic folder
if (notesOutsideTopics.length > 0) {
  const noteLinks = notesOutsideTopics
    .map(note => `> - [[${note.file.path.replace('.md', '')}|${note.file.name}]]`)
    .join('\n');

  const count = notesOutsideTopics.length;
  const label = count === 1 ? "Note" : "Notes";
  const calloutMarkdown = `> [!warning] ${count} ${label} outside topic folders\n${noteLinks}`;

  dv.paragraph(calloutMarkdown);
}
```

# Status Distribution

```dataviewjs
const ROOT = "Software Engineering";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const isMetricsIgnored = (p) => (p.file.tags ?? []).includes("#MetricsIgnore");

const STATUS_ORDER = ["Done", "Ready To Repeat", "Repetition", "Creation", "Not-Started"];

const appendProgress = (td, pct) => {
  const prog = td.createEl("progress");
  prog.classList.add("se-progress");
  prog.max = 100;
  prog.value = pct;

  td.createEl("span", { text: ` ${pct}%` });
};

const curPath = dv.current().file.path;
const notes = dv.pages(`"${ROOT}"`).where((p) => p.file.path !== curPath && !isMetricsIgnored(p));
const counts = new Map();
const notesWithoutStatus = [];

const asStringArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  return [];
};

for (const p of notes) {
  const raw = asStringArray(p.status)[0] ?? "";
  const isKnown = STATUS_ORDER.includes(raw);
  if (!isKnown) notesWithoutStatus.push(p);
  const key = isKnown ? raw : "Missing";
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

const total = notes.length;
const allKeys = [...STATUS_ORDER, "Missing"];
const rows = allKeys
  .map((k) => {
    const c = counts.get(k) ?? 0;
    const pct = total > 0 ? Math.round((c / total) * 100) : 0;
    return { status: k, pct, count: c };
  })
  .filter((r) => r.status !== "Missing" || r.count > 0);

// Wrap the table so the published site can apply the same Dataview table normalization
// it applies to dataview query blocks.
const wrapper = this.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const thead = table.createEl("thead");
thead.classList.add("table-view-thead");
const hr = thead.createEl("tr");
for (const h of ["Status", "Distribution", "Count"]) {
  const th = hr.createEl("th", { text: h });
}

const tbody = table.createEl("tbody");
tbody.classList.add("table-view-tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  const tdStatus = tr.createEl("td", { text: r.status });

  const tdProg = tr.createEl("td");
  appendProgress(tdProg, r.pct);

  const tdCount = tr.createEl("td", { text: `${r.count}` });
}

// Display notes without status
if (notesWithoutStatus.length > 0) {
  const noteLinks = notesWithoutStatus
    .map(note => `> - [[${note.file.path.replace('.md', '')}|${note.file.name}]]`)
    .join('\n');

  const count = notesWithoutStatus.length;
  const label = count === 1 ? "Note" : "Notes";
  const calloutMarkdown = `> [!warning] ${count} ${label} missing status\n${noteLinks}`;

  dv.paragraph(calloutMarkdown);
}
```

# Priority Distribution

```dataviewjs
const ROOT = "Software Engineering";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const isMetricsIgnored = (p) => (p.file.tags ?? []).includes("#MetricsIgnore");

const PRIORITY_ORDER = ["High", "Medium", "Low"];

const appendProgress = (td, pct) => {
  const prog = td.createEl("progress");
  prog.classList.add("se-progress");
  prog.max = 100;
  prog.value = pct;

  td.createEl("span", { text: ` ${pct}%` });
};

const curPath = dv.current().file.path;
const notes = dv.pages(`"${ROOT}"`).where((p) => p.file.path !== curPath && !isMetricsIgnored(p));
const counts = new Map();
const notesWithoutPriority = [];

const asStringArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  return [];
};

for (const p of notes) {
  const raw = asStringArray(p.priority)[0] ?? "";
  const isKnown = PRIORITY_ORDER.includes(raw);
  if (!isKnown) notesWithoutPriority.push(p);
  const key = isKnown ? raw : "Missing";
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

const total = notes.length;
const allKeys = [...PRIORITY_ORDER, "Missing"];
const rows = allKeys
  .map((k) => {
    const c = counts.get(k) ?? 0;
    const pct = total > 0 ? Math.round((c / total) * 100) : 0;
    return { priority: k, pct, count: c };
  })
  .filter((r) => r.priority !== "Missing" || r.count > 0);

const wrapper = this.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const thead = table.createEl("thead");
thead.classList.add("table-view-thead");
const hr = thead.createEl("tr");
for (const h of ["Priority", "Distribution", "Count"]) {
  hr.createEl("th", { text: h });
}

const tbody = table.createEl("tbody");
tbody.classList.add("table-view-tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  tr.createEl("td", { text: r.priority });

  const tdProg = tr.createEl("td");
  appendProgress(tdProg, r.pct);

  tr.createEl("td", { text: `${r.count}` });
}

// Display notes without priority
if (notesWithoutPriority.length > 0) {
  const noteLinks = notesWithoutPriority
    .map(note => `> - [[${note.file.path.replace('.md', '')}|${note.file.name}]]`)
    .join('\n');

  const count = notesWithoutPriority.length;
  const label = count === 1 ? "Note" : "Notes";
  const calloutMarkdown = `> [!warning] ${count} ${label} missing priority\n${noteLinks}`;

  dv.paragraph(calloutMarkdown);
}
```

# Level Distribution

```dataviewjs
const ROOT = "Software Engineering";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const isMetricsIgnored = (p) => (p.file.tags ?? []).includes("#MetricsIgnore");

const appendProgress = (td, pct) => {
  const prog = td.createEl("progress");
  prog.classList.add("se-progress");
  prog.max = 100;
  prog.value = pct;

  td.createEl("span", { text: ` ${pct}%` });
};

const asStringArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  return [];
};

const curPath = dv.current().file.path;
const notes = dv.pages(`"${ROOT}"`).where((p) => p.file.path !== curPath && !isMetricsIgnored(p));
const counts = new Map();
const numericLevels = new Set();
const notesWithoutLevel = [];

const parseLevelNumber = (p) => {
  const raw = asStringArray(p.level)[0] ?? "";
  if (raw.length === 0) return null;
  const n = Number(raw);
  if (Number.isFinite(n) && String(n) === raw) return n;
  return null;
};

for (const p of notes) {
  const n = parseLevelNumber(p);
  if (n === null) {
    notesWithoutLevel.push(p);
    counts.set("Missing", (counts.get("Missing") ?? 0) + 1);
    continue;
  }

  numericLevels.add(n);
  counts.set(String(n), (counts.get(String(n)) ?? 0) + 1);
}

const total = notes.length;
const levelKeys = [...numericLevels].sort((a, b) => a - b).map(String);
const allKeys = [...levelKeys, "Missing"];
const rows = allKeys
  .map((k) => {
    const c = counts.get(k) ?? 0;
    const pct = total > 0 ? Math.round((c / total) * 100) : 0;
    return { level: k, pct, count: c };
  })
  .filter((r) => r.level !== "Missing" || r.count > 0);

const wrapper = this.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const thead = table.createEl("thead");
thead.classList.add("table-view-thead");
const hr = thead.createEl("tr");
for (const h of ["Level", "Distribution", "Count"]) {
  hr.createEl("th", { text: h });
}

const tbody = table.createEl("tbody");
tbody.classList.add("table-view-tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  tr.createEl("td", { text: r.level });

  const tdProg = tr.createEl("td");
  appendProgress(tdProg, r.pct);

  tr.createEl("td", { text: `${r.count}` });
}

// Display notes without level
if (notesWithoutLevel.length > 0) {
  const noteLinks = notesWithoutLevel
    .map(note => `> - [[${note.file.path.replace('.md', '')}|${note.file.name}]]`)
    .join('\n');

  const count = notesWithoutLevel.length;
  const label = count === 1 ? "Note" : "Notes";
  const calloutMarkdown = `> [!warning] ${count} ${label} missing level\n${noteLinks}`;

  dv.paragraph(calloutMarkdown);
}
```

# Focus

```dataview
TABLE WITHOUT ID
  file.link as "Note",
  join(topic, ", ") as "Topic",
  status as "Status",
  priority as "Priority"
FROM "Software Engineering"
WHERE file.path != this.file.path
  AND !contains(file.tags, "#MetricsIgnore")
  AND (
    contains(status, "Creation")
    OR contains(status, "Repetition")
    OR contains(status, "Ready To Repeat")
  )
SORT priority DESC, file.mtime DESC
LIMIT 12
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
