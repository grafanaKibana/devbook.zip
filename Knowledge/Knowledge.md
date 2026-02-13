---
tags:
  - FolderNote
---

## Start Here

- [Roadmap](Roadmap.canvas)
- [Browse Topics](Topics.base)

# Topic Coverage

```dataviewjs
const ROOT = "Knowledge";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const notes = dv.pages(`"${ROOT}"`).where((p) => !isFolderNote(p));

const asStringArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  return [];
};

const topicStats = new Map();
const notesWithoutTopic = [];

for (const p of notes) {
  const topics = asStringArray(p.topic);
  if (topics.length === 0) {
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
  const filled = Math.round(pct / 5);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(20 - filled);
  return [topic, `${bar} ${pct}%`, `${s.done}/${s.total}`];
});

rows.sort((a, b) => {
  const pctA = parseInt(a[1].match(/\d+%/)[0]);
  const pctB = parseInt(b[1].match(/\d+%/)[0]);
  return pctA - pctB;
});

dv.table(["Topic", "Completion", "Done"], rows);

if (notesWithoutTopic.length > 0) {
  const noteLinks = notesWithoutTopic
    .map(note => `> - ${note.file.link}`)
    .join('\n');

  const count = notesWithoutTopic.length;
  const label = count === 1 ? "Note" : "Notes";
  dv.paragraph(`> [!warning] ${count} ${label} missing topic\n${noteLinks}`);
}
```

# Status Distribution

```dataviewjs
const ROOT = "Knowledge";
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
  .filter((k) => (counts.get(k) ?? 0) > 0)
  .map((k) => {
    const c = counts.get(k) ?? 0;
    const pct = total > 0 ? Math.round((c / total) * 100) : 0;
    const filled = Math.round(pct / 5);
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(20 - filled);
    return [k, `${bar} ${pct}%`, `${c}`];
  });

dv.table(["Status", "Distribution", "Count"], rows);

```

# Focus

```dataview
TABLE WITHOUT ID
  file.link as "Note",
  topic as "Topic",
  status as "Status",
  priority as "Priority"
FROM "Knowledge"
WHERE !contains(file.tags, "#FolderNote")
  AND (status = "Creation" OR status = "Repetition" OR status = "Ready To Repeat")
SORT priority DESC, file.mtime DESC
LIMIT 12
```

# Recently Updated

```dataview
TABLE WITHOUT ID file.link as "Note"
FROM "Knowledge"
WHERE !contains(file.tags, "#FolderNote")
SORT file.mtime DESC
LIMIT 12
```