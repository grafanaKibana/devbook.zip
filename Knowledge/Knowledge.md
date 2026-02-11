---
tags: [FolderNote]
---

# Knowledge Hub

## Start Here

- [Roadmap](Roadmap.canvas)
- [Browse Topics](Topics.base)

--- start-multi-column: kb_home
```column-settings
number of columns: 2
column size: [62%, 38%]
column spacing: 12px
border: off
shadow: off
```

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

--- column-break ---

## Snapshot

```dataviewjs
const ROOT = "Knowledge";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");
const since = (days) => dv.date("today").minus(dv.duration(`${days} days`));

const notes = dv.pages(`"${ROOT}"`).where((p) => !isFolderNote(p));

const inProgress = notes.where(
  (p) => p.status === "Creation" || p.status === "Repetition" || p.status === "Ready To Repeat",
);
const notStarted = notes.where((p) => p.status === "Not-Started");
const done = notes.where((p) => p.status === "Done");
const unknown = notes.where((p) => typeof p.status !== "string" || p.status.length === 0);

const modified7 = notes.where((p) => p.file.mday && p.file.mday >= since(7));
const modified30 = notes.where((p) => p.file.mday && p.file.mday >= since(30));

dv.list([
  `Notes: ${notes.length}`,
  `In progress: ${inProgress.length}`,
  `Not started: ${notStarted.length}`,
  `Done: ${done.length}`,
  `Missing status: ${unknown.length}`,
  `Updated last 7 days: ${modified7.length}`,
  `Updated last 30 days: ${modified30.length}`,
]);
```

--- end-multi-column

## Progress Over Time

```dataviewjs
const ROOT = "Knowledge";
const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const STATUS_SERIES = [
  { key: "Not-Started", label: "Not started", color: "#9CA3AF" },
  { key: "Creation", label: "Creation", color: "#F59E0B" },
  { key: "Repetition", label: "Repetition", color: "#3B82F6" },
  { key: "Ready To Repeat", label: "Ready to repeat", color: "#14B8A6" },
  { key: "Done", label: "Done", color: "#22C55E" },
  { key: "__OTHER__", label: "Other", color: "#A78BFA" },
  { key: "__MISSING__", label: "Missing", color: "#F87171" },
];

const notes = dv.pages(`"${ROOT}"`).where((p) => !isFolderNote(p));

const today = dv.date("today");
const endWeek = today.startOf("week");
const weeks = 26;
const startWeek = endWeek.minus(dv.duration(`${(weeks - 1) * 7} days`));

const emptyCounts = () => new Map(STATUS_SERIES.map((s) => [s.key, 0]));

const buckets = [];
const bucketsByKey = new Map();
for (let d = startWeek; d.toMillis() <= endWeek.toMillis(); d = d.plus(dv.duration("7 days"))) {
  const key = d.toFormat("yyyy-MM-dd");
  const bucket = { key, date: d, counts: emptyCounts() };
  buckets.push(bucket);
  bucketsByKey.set(key, bucket);
}

const knownStatuses = new Set(STATUS_SERIES.map((s) => s.key));
knownStatuses.delete("__OTHER__");
knownStatuses.delete("__MISSING__");

for (const p of notes) {
  const d = p.file.mday;
  if (!d) continue;

  const wk = d.startOf("week");
  if (wk.toMillis() < startWeek.toMillis() || wk.toMillis() > endWeek.toMillis()) continue;

  const bucket = bucketsByKey.get(wk.toFormat("yyyy-MM-dd"));
  if (!bucket) continue;

  const raw = typeof p.status === "string" ? p.status.trim() : "";
  const statusKey = raw.length === 0 ? "__MISSING__" : knownStatuses.has(raw) ? raw : "__OTHER__";
  bucket.counts.set(statusKey, (bucket.counts.get(statusKey) ?? 0) + 1);
}

const totals = buckets.map((b) => {
  let t = 0;
  for (const s of STATUS_SERIES) t += b.counts.get(s.key) ?? 0;
  return t;
});

const maxTotal = Math.max(1, ...totals);

const wrapper = this.container.createDiv();
wrapper.style.width = "100%";

const legend = wrapper.createDiv();
legend.style.display = "flex";
legend.style.flexWrap = "wrap";
legend.style.gap = "10px";
legend.style.alignItems = "center";
legend.style.margin = "4px 0 10px";

for (const s of STATUS_SERIES) {
  const item = legend.createDiv();
  item.style.display = "flex";
  item.style.alignItems = "center";
  item.style.gap = "6px";
  item.style.whiteSpace = "nowrap";

  const swatch = item.createEl("span");
  swatch.style.display = "inline-block";
  swatch.style.width = "10px";
  swatch.style.height = "10px";
  swatch.style.borderRadius = "2px";
  swatch.style.background = s.color;
  swatch.style.opacity = "0.9";

  item.createEl("span", { text: s.label });
}

const caption = wrapper.createDiv({
  text: "Weekly counts of notes updated (file.mday) by current status.",
});
caption.style.opacity = "0.75";
caption.style.marginBottom = "8px";
caption.style.fontSize = "0.9em";

const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("viewBox", "0 0 1000 260");
svg.setAttribute("preserveAspectRatio", "none");
svg.style.width = "100%";
svg.style.height = "260px";

const bg = document.createElementNS(svgNS, "rect");
bg.setAttribute("x", "0");
bg.setAttribute("y", "0");
bg.setAttribute("width", "1000");
bg.setAttribute("height", "260");
bg.setAttribute("fill", "transparent");
svg.appendChild(bg);

const margin = { l: 46, r: 12, t: 10, b: 34 };
const innerW = 1000 - margin.l - margin.r;
const innerH = 260 - margin.t - margin.b;

const yFor = (v) => margin.t + innerH - (v / maxTotal) * innerH;

for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
  const v = Math.round(maxTotal * frac);
  const y = yFor(v);

  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", String(margin.l));
  line.setAttribute("x2", String(margin.l + innerW));
  line.setAttribute("y1", String(y));
  line.setAttribute("y2", String(y));
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-opacity", "0.12");
  svg.appendChild(line);

  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("x", String(margin.l - 8));
  label.setAttribute("y", String(y + 4));
  label.setAttribute("text-anchor", "end");
  label.setAttribute("font-size", "11");
  label.setAttribute("fill", "currentColor");
  label.setAttribute("fill-opacity", "0.7");
  label.textContent = String(v);
  svg.appendChild(label);
}

const n = buckets.length;
const slotW = innerW / n;
const barW = Math.max(1, slotW * 0.82);

let prevMonth = null;
for (let i = 0; i < n; i++) {
  const b = buckets[i];
  const x = margin.l + i * slotW + (slotW - barW) / 2;
  let stack = 0;

  const g = document.createElementNS(svgNS, "g");
  const title = document.createElementNS(svgNS, "title");
  title.textContent = `${b.date.toFormat("yyyy-LL-dd")}`;
  g.appendChild(title);

  for (const s of STATUS_SERIES) {
    const c = b.counts.get(s.key) ?? 0;
    if (c <= 0) continue;

    const y0 = yFor(stack);
    const y1 = yFor(stack + c);
    const h = Math.max(0, y0 - y1);

    const r = document.createElementNS(svgNS, "rect");
    r.setAttribute("x", String(x));
    r.setAttribute("y", String(y1));
    r.setAttribute("width", String(barW));
    r.setAttribute("height", String(h));
    r.setAttribute("fill", s.color);
    r.setAttribute("fill-opacity", "0.85");
    g.appendChild(r);

    stack += c;
  }

  svg.appendChild(g);

  const month = b.date.toFormat("LLL");
  if (month !== prevMonth) {
    prevMonth = month;

    const tx = x + barW / 2;
    const ty = margin.t + innerH + 20;
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", String(tx));
    t.setAttribute("y", String(ty));
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-size", "11");
    t.setAttribute("fill", "currentColor");
    t.setAttribute("fill-opacity", "0.65");
    t.textContent = month;
    svg.appendChild(t);
  }
}

wrapper.appendChild(svg);
```

--- start-multi-column: kb_work
```column-settings
number of columns: 2
column size: [62%, 38%]
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
LIST WITHOUT ID file.link
FROM "Knowledge"
WHERE !contains(file.tags, "#FolderNote")
SORT file.mtime DESC
LIMIT 12
```

--- end-multi-column
