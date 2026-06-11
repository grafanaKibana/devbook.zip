---
tags:
  - FolderNote
  - MetricsIgnore
dg-publish: true
dg-home: true
---

Welcome to my software engineering notebook — the notes I've written to actually *understand* the stack, not just recall it for an interview. .NET internals, distributed systems, databases, security, cloud, AI/ML, and most of what sits between. Every note goes deep: core mechanics, real examples, the pitfalls that bite in production, and the questions worth being able to answer.

> [!info] Why this exists
> I learn by writing things down and coming back to them. This vault is that process in the open — built on spaced repetition, organized into 11 topic areas, and updated continuously. Browse by topic below, or scroll on for progress and recent activity.

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

const asStringArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  return [];
};

const folderToTopic = (folder) => {
  if (typeof folder !== "string") return null;
  if (!folder.startsWith(ROOT + "/")) return null;
  const seg = folder.slice((ROOT + "/").length).split("/")[0] ?? "";
  return seg.length ? seg.replace(/^\d+\s+/, "").trim() : null;
};

const topics = new Set();
let total = 0;
let points = 0;
let done = 0;
for (const p of notes) {
  const topic = folderToTopic(p.file.folder);
  if (topic) topics.add(topic);
  const status = asStringArray(p.status)[0] ?? "";
  total += 1;
  points += STATUS_PROGRESS.get(status) ?? 0;
  if (status === "Done") done += 1;
}
const pct = total > 0 ? Math.round(points / total) : 0;

dv.paragraph(
  `📚 **${total}** notes · 🗂️ **${topics.size}** topics · ✅ **${done}** done · 📈 **${pct}%** overall`
);
```

# Topics

| | | |
|:---|:---|:---|
| 🧠 **[[Software Engineering/01 Programming/01 Programming\|Programming]]**<br><sub>Languages, .NET internals, paradigms, clean code.</sub> | 🖥️ **[[Software Engineering/02 Computer Science/02 Computer Science\|Computer Science]]**<br><sub>Algorithms, data structures, the theory underneath.</sub> | 🗄️ **[[Software Engineering/03 Data Persistence/03 Data Persistence\|Data Persistence]]**<br><sub>Databases, indexing, transactions, storage engines.</sub> |
| 🌐 **[[Software Engineering/04 Networks/04 Networks\|Networks]]**<br><sub>Protocols, HTTP, TCP/IP, how packets travel.</sub> | 🏛️ **[[Software Engineering/05 Architecture/05 Architecture\|Architecture]]**<br><sub>Distributed systems, patterns, designing for scale.</sub> | 🛠️ **[[Software Engineering/06 Development Practices/06 Development Practices\|Development Practices]]**<br><sub>Testing, version control, and the craft.</sub> |
| 🔒 **[[Software Engineering/07 Security/07 Security\|Security]]**<br><sub>Threats, crypto, auth, defensive design.</sub> | 🔄 **[[Software Engineering/08 SDLC/08 SDLC\|SDLC]]**<br><sub>How software gets planned, built, and shipped.</sub> | 🚀 **[[Software Engineering/09 DevOps/09 DevOps\|DevOps]]**<br><sub>CI/CD, containers, and automation.</sub> |
| ☁️ **[[Software Engineering/10 Cloud/10 Cloud\|Cloud]]**<br><sub>AWS/Azure, serverless, cloud-native design.</sub> | 🤖 **[[Software Engineering/11 AI & ML/11 AI & ML\|AI & ML]]**<br><sub>Models, training, applied machine learning.</sub> | |

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
