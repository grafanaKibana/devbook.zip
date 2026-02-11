---
tags: [FolderNote]
---

## Start Here

- [Roadmap](Roadmap.canvas)
- [Browse Topics](Topics.base)

## Activity

```dataviewjs
const ROOT = "Knowledge";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const year = dv.date("today").year;

const notes = dv.pages(`"${ROOT}"`).where((p) => !isFolderNote(p));

const countsByDate = new Map();
for (const p of notes) {
  const d = p.file.mday;
  if (!d) continue;
  if (d.year !== year) continue;

  const key = d.toFormat("yyyy-MM-dd");
  countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
}

const entries = [...countsByDate.entries()].map(([date, intensity]) => ({
  date,
  intensity,
}));

const maxIntensity = Math.max(1, ...entries.map((e) => e.intensity));

renderHeatmapCalendar(this.container, {
  year,
  intensityScaleStart: 1,
  intensityScaleEnd: maxIntensity,
  entries,
});
```

--- start-multi-column: kb_metrics
```column-settings
number of columns: 2
column size: [65%, 30%]
column spacing: 12px
border: off
shadow: off
```

## Topic Coverage

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
let missingTopic = 0;

for (const p of notes) {
  const topics = asStringArray(p.topic);
  if (topics.length === 0) {
    missingTopic += 1;
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

const header = this.container.createDiv({
  text: `Topics covered: ${rows.length}. Missing topic: ${missingTopic}.`,
});
header.style.opacity = "0.75";
header.style.margin = "6px 0 10px";

const table = this.container.createEl("table");
table.style.width = "100%";
table.style.borderCollapse = "collapse";

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

  const tdTopic = tr.createEl("td", { text: r.topic });
  tdTopic.style.padding = "6px 8px";
  tdTopic.style.borderBottom = "1px solid rgba(127,127,127,0.12)";

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
```

--- column-break ---

## Status Destribution

```dataviewjs
const ROOT = "Knowledge";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const since = (days) => dv.date("today").minus(dv.duration(`${days} days`));

const cssVar = (name, fallback) => {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v.length ? v : fallback;
};

const STATUS_ORDER = [
  { key: "Done", label: "Done", color: cssVar("--color-green", "#22C55E") },
  { key: "Ready To Repeat", label: "Ready to repeat", color: cssVar("--color-cyan", "#14B8A6") },
  { key: "Repetition", label: "Repetition", color: cssVar("--color-blue", "#3B82F6") },
  { key: "Creation", label: "Creation", color: cssVar("--color-orange", "#F59E0B") },
  { key: "Not-Started", label: "Not started", color: cssVar("--text-faint", "#9CA3AF") },
  { key: "__OTHER__", label: "Other", color: cssVar("--color-purple", "#A78BFA") },
  { key: "__MISSING__", label: "Missing", color: cssVar("--color-red", "#F87171") },
];

const notes = dv.pages(`"${ROOT}"`).where((p) => !isFolderNote(p));
const counts = new Map(STATUS_ORDER.map((s) => [s.key, 0]));

const known = new Set(STATUS_ORDER.map((s) => s.key));
known.delete("__OTHER__");
known.delete("__MISSING__");

for (const p of notes) {
  const raw = typeof p.status === "string" ? p.status.trim() : "";
  const key = raw.length === 0 ? "__MISSING__" : known.has(raw) ? raw : "__OTHER__";
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

const total = notes.length;
const segments = STATUS_ORDER
  .map((s) => ({ ...s, count: counts.get(s.key) ?? 0 }))
  .filter((s) => s.count > 0);

let acc = 0;
const stops = segments.map((s) => {
  const pct = total > 0 ? (s.count / total) * 100 : 0;
  const start = acc;
  const end = acc + pct;
  acc = end;
  return { ...s, start, end };
});

const donutBg = stops.length
  ? `conic-gradient(${stops.map((s) => `${s.color} ${s.start.toFixed(2)}% ${s.end.toFixed(2)}%`).join(", ")})`
  : `conic-gradient(${cssVar("--background-modifier-border", "#E5E7EB")} 0% 100%)`;

const wrapper = this.container.createDiv();
wrapper.style.display = "grid";
wrapper.style.gridTemplateColumns = "160px 1fr";
wrapper.style.gap = "12px";
wrapper.style.alignItems = "center";
wrapper.style.marginBottom = "10px";

const donut = wrapper.createDiv();
donut.style.width = "160px";
donut.style.height = "160px";
donut.style.borderRadius = "999px";
donut.style.background = donutBg;
donut.style.position = "relative";
donut.style.boxShadow = "inset 0 0 0 1px rgba(127,127,127,0.25)";

const hole = donut.createDiv();
hole.style.position = "absolute";
hole.style.inset = "22px";
hole.style.borderRadius = "999px";
hole.style.background = cssVar("--background-primary", "transparent");
hole.style.display = "grid";
hole.style.placeItems = "center";
hole.style.textAlign = "center";

const center = hole.createDiv();
center.createEl("div", { text: String(total) }).style.fontSize = "28px";
const sub = center.createEl("div", { text: "notes" });
sub.style.opacity = "0.7";
sub.style.fontSize = "12px";

const legend = wrapper.createDiv();
legend.style.display = "grid";
legend.style.gap = "6px";

for (const s of STATUS_ORDER) {
  const c = counts.get(s.key) ?? 0;
  if (c <= 0) continue;

  const row = legend.createDiv();
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "8px";

  const swatch = row.createEl("span");
  swatch.style.width = "10px";
  swatch.style.height = "10px";
  swatch.style.borderRadius = "2px";
  swatch.style.background = s.color;
  swatch.style.opacity = "0.9";

  const pct = total > 0 ? Math.round((c / total) * 100) : 0;
  row.createEl("span", { text: `${s.label}: ${c} (${pct}%)` });
}

const modified7 = notes.where((p) => p.file.mday && p.file.mday >= since(7));
const modified30 = notes.where((p) => p.file.mday && p.file.mday >= since(30));

dv.list([
  `Updated last 7 days: ${modified7.length}`,
  `Updated last 30 days: ${modified30.length}`,
]);
```

--- end-multi-column

--- start-multi-column: kb_work
```column-settings
number of columns: 2
column size: [65%, 30%]
column spacing: 12px
border: off
shadow: off
```

## Focus

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

--- column-break ---

## Recently Updated

```dataview
TABLE WITHOUT ID file.link
FROM "Knowledge"
WHERE !contains(file.tags, "#FolderNote")
SORT file.mtime DESC
LIMIT 12
```

--- end-multi-column