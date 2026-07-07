# steptrace

Interactive, step-by-step **algorithm-visualizer cards** for DevBook — live in both
the Obsidian editor and the published Quartz site, from a single authored code block.

The whole framework is **one file**: [`engine.js`](engine.js) — a dependency-free, UMD
vanilla module (frame engine + registry + renderers + styles). It runs **verbatim** on
both hosts, so there is no bundler and no compile step. Each host is a thin adapter that
binds the theme and calls `mount()`.

## Authoring a card

In any note, add a fenced block with the info-string `steptrace` and a flat JSON body:

~~~markdown
```steptrace
{ "algorithm": "bubble-sort", "array": [5, 2, 9, 1, 5, 6], "speed": 1 }
```
~~~

~~~markdown
```steptrace
{ "algorithm": "bfs", "start": "A" }
```
~~~

**Config schema**

- Sort — `{ "algorithm": "bubble-sort", "array"?: number[], "speed"?: number }`
  (omit `array` for a random one).
- Graph — `{ "algorithm": "bfs", "start"?: string, "directed"?: boolean,
  "nodes"?: [{id,x,y}], "edges"?: [{from,to,weight?}], "speed"?: number }`
  (omit `nodes`/`edges` for the built-in default graph).

Built in: **bubble-sort** and **bfs**.

## Adding an algorithm

**A shipped built-in (appears on the published site too):** add one block in `engine.js`
section 4. An algorithm never builds a frame — it only calls the Recorder's `ops.*`:

```js
// engine.js §4 — ALGORITHMS
registerSort("selection-sort", { label: "Selection sort" }, (input, ops) => {
  // ops.compare(i, j, msg) · ops.swap(i, j, msg) · ops.overwrite(i, v, msg)
  // ops.candidate(i, msg) · ops.holdKey(v) · ops.markSorted([k], [k], msg) · ops.done(msg)
})
registerGraph("dfs", { label: "Depth-first search" }, (input, ops, graph) => {
  const adj = adjacency(graph) // neighbours sorted by id → deterministic
  // ops.enqueue(n, d, msg) · ops.visit(n, msg) · ops.edge(u, v, msg) · ops.done(msg)
})
```

After editing `engine.js`, refresh the Obsidian plugin (Quartz reloads it automatically —
see below):

```
npm run steptrace:sync
```

(The engine also exposes `registerSort` / `registerGraph` at runtime, so a settings-based
"add your own algorithm" UI could be layered on later — none is wired today.)

## How the one file reaches both hosts

`engine.js` is UMD: it sets `globalThis.steptrace` (and `module.exports`), so it needs no
compilation on either side.

- **Quartz** — [`custom/components/steptrace.tsx`](../components/steptrace.tsx) **reads
  `engine.js` at build time and inlines it** into its `afterDOMLoaded` script (then a
  small hydration tail scans `.steptrace-mount`, on the SPA `nav` event, and calls
  `window.steptrace.mount`). So a `quartz build` always picks up `engine.js` edits — no
  copy, no `/static` file, no manual step. [`custom/transformers/steptrace-block.ts`](../transformers/steptrace-block.ts)
  rewrites each `steptrace` fence into `<div class="steptrace-mount" data-config="…">`.
  Both are wired in [`quartz.ts`](../../quartz.ts).
- **Obsidian** — the `steptrace` plugin's `main.js` is `engine.js` + `obsidian-plugin.js`
  concatenated by `sync.mjs` (pure concat — no transform, since UMD runs as-is). It
  registers the `steptrace` code-block processor and binds `--st-*` to Obsidian's
  variables. Run `npm run steptrace:sync` after editing `engine.js` or the bootstrap;
  enable it once in *Settings → Community plugins*.

Both converge on the same `engine.js` + `mount()`; only the theme binding and how the
engine is loaded differ. Why one fence works on both: `steptrace` is off Quartz Syncer's
freeze allowlist, so Syncer commits it raw for the transformer to hydrate.

## Files

| Path | Role |
|---|---|
| `custom/steptrace/engine.js` | **The framework.** One UMD file: §1 styles · §2 registry/API · §3 recorders · §4 algorithms · §5 render · §6 player · §7 mount. Edit visuals in §1, add algorithms in §4. |
| `custom/steptrace/obsidian-plugin.js` | Obsidian bootstrap (concatenated after the engine): code-block processor, theme binding, custom-algorithm settings tab. |
| `custom/steptrace/sync.mjs` | Concatenates engine + bootstrap → the Obsidian plugin `main.js`. No transform. |
| `custom/steptrace/manifest.json` | Obsidian plugin manifest (`id` drives the plugin folder name). |
| `custom/components/steptrace.tsx` | Quartz component — inlines `engine.js` at build + hydration + Quartz theme. |
| `custom/transformers/steptrace-block.ts` | Quartz transformer — `steptrace` fence → mount `<div>`. |
| `Vault/.obsidian/plugins/steptrace/` | **Generated** — the enabled Obsidian plugin (`main.js` + `manifest.json`). |
