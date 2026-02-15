---
tags:
  - FolderNote
dg-publish: true
dg-home: true
---

# Topic Coverage

```dataviewjs
const ROOT = "Software Engineering";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const notes = dv.pages(`"${ROOT}"`).where((p) => !isFolderNote(p));

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
let missingTopic = 0;
const notesWithoutTopic = [];

for (const p of notes) {
  const topics = asStringArray(p.topic);
  if (topics.length === 0) {
    missingTopic += 1;
    notesWithoutTopic.push(p);
    continue;
  }

  const status = typeof p.status === "string" ? p.status.trim() : "";
  const isDone = status === "Done";

  for (const t of topics) {
    const cur = topicStats.get(t) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (isDone) cur.done += 1;
    topicStats.set(t, cur);
  }
}

const rows = [...topicStats.entries()].map(([topic, s]) => {
  const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
  return { topic, pct, done: s.done, total: s.total };
});

rows.sort((a, b) => a.pct - b.pct || b.total - a.total || a.topic.localeCompare(b.topic));

// Wrap the table so the published site can apply the same Dataview table normalization
// it applies to dataview query blocks.
const wrapper = this.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const thead = table.createEl("thead");
thead.classList.add("table-view-thead");
const hr = thead.createEl("tr");
for (const h of ["Topic", "Completion", "Done"]) {
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

// Display notes without topics
if (notesWithoutTopic.length > 0) {
  const noteLinks = notesWithoutTopic
    .map(note => `> - [[${note.file.path.replace('.md', '')}|${note.file.name}]]`)
    .join('\n');

  const count = notesWithoutTopic.length;
  const label = count === 1 ? "Note" : "Notes";
  const calloutMarkdown = `> [!warning] ${count} ${label} missing topic\n${noteLinks}`;

  dv.paragraph(calloutMarkdown);
}
```

# Status Distribution

```dataviewjs
const ROOT = "Software Engineering";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const STATUS_ORDER = ["Done", "Ready To Repeat", "Repetition", "Creation", "Not-Started"];

const appendProgress = (td, pct) => {
  const prog = td.createEl("progress");
  prog.classList.add("se-progress");
  prog.max = 100;
  prog.value = pct;

  td.createEl("span", { text: ` ${pct}%` });
};

const notes = dv.pages(`"${ROOT}"`).where((p) => !isFolderNote(p));
const counts = new Map();

for (const p of notes) {
  const raw = typeof p.status === "string" ? p.status.trim() : "";
  const key = STATUS_ORDER.includes(raw) ? raw : (raw.length === 0 ? "Missing" : "Other");
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

const total = notes.length;
const allKeys = [...STATUS_ORDER, "Other", "Missing"];
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
```

# Focus

```dataview
TABLE WITHOUT ID
  file.link as "Note",
  topic as "Topic",
  status as "Status",
  priority as "Priority"
FROM "Software Engineering"
WHERE !contains(file.tags, "#FolderNote")
  AND (status = "Creation" OR status = "Repetition" OR status = "Ready To Repeat")
SORT priority DESC, file.mtime DESC
LIMIT 12
```

# Recently Updated

```dataview
TABLE WITHOUT ID file.link as "Note", file.mtime as "Date"
FROM "Software Engineering"
WHERE !contains(file.tags, "#FolderNote")
SORT file.mtime DESC
LIMIT 12
```
