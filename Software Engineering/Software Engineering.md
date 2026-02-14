---
tags:
  - FolderNote
---

## Start Here

- [Roadmap](Roadmap.canvas)
- [Browse Topics](Topics.base)

# Topic Coverage

```dataviewjs
const ROOT = "Software Engineering";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const notes = dv.pages(`"${ROOT}"`).where((p) => !isFolderNote(p));

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
  return { topic, pct, done: s.done, total: s.total, isMissing: false };
});

rows.sort((a, b) => a.pct - b.pct || b.total - a.total || a.topic.localeCompare(b.topic));

const COL_WIDTHS = ["40%", "45%", "15%"];

const table = this.container.createEl("table");
table.style.width = "100%";
table.style.borderCollapse = "collapse";
table.style.tableLayout = "fixed";

const colgroup = table.createEl("colgroup");
for (const w of COL_WIDTHS) {
  const col = colgroup.createEl("col");
  col.style.width = w;
}

const thead = table.createEl("thead");
const hr = thead.createEl("tr");
for (const h of ["Topic", "Completion", "Done"]) {
  const th = hr.createEl("th", { text: h });
  th.style.textAlign = h === "Topic" ? "left" : "right";
  th.style.padding = "6px 8px";
  th.style.borderBottom = "1px solid rgba(127,127,127,0.25)";
  th.style.fontWeight = "600";
}

const tbody = table.createEl("tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  // Apply yellow background for missing topic row
  if (r.isMissing) {
    tr.style.backgroundColor = "rgba(234, 179, 8, 0.15)";
  }

  const tdTopic = tr.createEl("td", { text: r.topic });
  tdTopic.style.padding = "6px 8px";
  tdTopic.style.borderBottom = "1px solid rgba(127,127,127,0.12)";
  if (r.isMissing) {
    tdTopic.style.color = "rgb(234, 179, 8)";
    tdTopic.style.fontWeight = "600";
  }

  const tdProg = tr.createEl("td");
  tdProg.style.padding = "6px 8px";
  tdProg.style.borderBottom = "1px solid rgba(127,127,127,0.12)";
  tdProg.style.textAlign = "right";

  const wrap = tdProg.createDiv();
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "1fr 44px";
  wrap.style.gap = "8px";
  wrap.style.alignItems = "center";

  const prog = document.createElement("progress");
  prog.max = 100;
  prog.value = r.pct;
  prog.style.width = "100%";
  prog.style.height = "12px";
  wrap.appendChild(prog);

  const pct = document.createElement("span");
  pct.textContent = `${r.pct}%`;
  pct.style.opacity = "0.8";
  pct.style.fontVariantNumeric = "tabular-nums";
  pct.style.textAlign = "right";
  wrap.appendChild(pct);

  const tdDone = tr.createEl("td", { text: `${r.done}/${r.total}` });
  tdDone.style.padding = "6px 8px";
  tdDone.style.borderBottom = "1px solid rgba(127,127,127,0.12)";
  tdDone.style.textAlign = "right";
  tdDone.style.fontVariantNumeric = "tabular-nums";
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

const COL_WIDTHS = ["40%", "45%", "15%"];

const table = this.container.createEl("table");
table.style.width = "100%";
table.style.borderCollapse = "collapse";
table.style.tableLayout = "fixed";

const colgroup = table.createEl("colgroup");
for (const w of COL_WIDTHS) {
  const col = colgroup.createEl("col");
  col.style.width = w;
}

const thead = table.createEl("thead");
const hr = thead.createEl("tr");
for (const h of ["Status", "Distribution", "Count"]) {
  const th = hr.createEl("th", { text: h });
  th.style.textAlign = h === "Status" ? "left" : "right";
  th.style.padding = "6px 8px";
  th.style.borderBottom = "1px solid rgba(127,127,127,0.25)";
  th.style.fontWeight = "600";
}

const tbody = table.createEl("tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  if (r.status === "Missing") {
    tr.style.backgroundColor = "rgba(234, 179, 8, 0.15)";
  }

  const tdStatus = tr.createEl("td", { text: r.status });
  tdStatus.style.padding = "6px 8px";
  tdStatus.style.borderBottom = "1px solid rgba(127,127,127,0.12)";
  if (r.status === "Missing") {
    tdStatus.style.color = "rgb(234, 179, 8)";
    tdStatus.style.fontWeight = "600";
  }

  const tdProg = tr.createEl("td");
  tdProg.style.padding = "6px 8px";
  tdProg.style.borderBottom = "1px solid rgba(127,127,127,0.12)";
  tdProg.style.textAlign = "right";

  const wrap = tdProg.createDiv();
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "1fr 44px";
  wrap.style.gap = "8px";
  wrap.style.alignItems = "center";

  const prog = document.createElement("progress");
  prog.max = 100;
  prog.value = r.pct;
  prog.style.width = "100%";
  prog.style.height = "12px";
  wrap.appendChild(prog);

  const pct = document.createElement("span");
  pct.textContent = `${r.pct}%`;
  pct.style.opacity = "0.8";
  pct.style.fontVariantNumeric = "tabular-nums";
  pct.style.textAlign = "right";
  wrap.appendChild(pct);

  const tdCount = tr.createEl("td", { text: `${r.count}` });
  tdCount.style.padding = "6px 8px";
  tdCount.style.borderBottom = "1px solid rgba(127,127,127,0.12)";
  tdCount.style.textAlign = "right";
  tdCount.style.fontVariantNumeric = "tabular-nums";
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
TABLE WITHOUT ID file.link as "Note"
FROM "Software Engineering"
WHERE !contains(file.tags, "#FolderNote")
SORT file.mtime DESC
LIMIT 12
```