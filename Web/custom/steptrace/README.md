# steptrace — Algorithm Visualizer Framework

Interactive, step-by-step algorithm-visualizer cards that live in both the Obsidian editor and the published Quartz site, sourced from a single `steptrace` fence in any note. Built as one self-contained, dependency-free UMD module (`engine.js`) that runs verbatim on both hosts.

## File Map

| File | Role | Edit? |
|------|------|-------|
| `engine.js` | Single source of truth: UMD module with all logic (styles § 1, registry § 2, recorders § 3, algorithms § 4, render § 5, player § 6, mount § 7). | **Edit often** — all algorithm changes and visual tweaks go here. |
| `obsidian-plugin.js` | Obsidian bootstrap (appended to engine via sync). Registers the `steptrace` code-block processor, wires theme tokens, and binds mount/destroy lifecycle. | Edit rarely — only if Obsidian integration changes. |
| `manifest.json` | Obsidian plugin manifest (id drives folder name). | Edit rarely — version bumps only. |
| `sync.mjs` | Build script: concatenates engine.js + obsidian-plugin.js → vault plugin main.js, and copies engine.js → Quartz static dir. Plain concat, no compilation. | Never — maintenance only. |
| `../components/steptrace.tsx` | Quartz component: inlines CSS, provides afterDOMLoaded hydrator that loads `/static/steptrace/engine.js` at runtime and mounts cards on SPA nav. Registered in quartz.ts. | Edit rarely — Quartz integration only. |
| `../transformers/steptrace-block.ts` | Quartz transformer: converts ```steptrace fence blocks (JSON config) into `<div class="steptrace-mount" data-config>` elements. Registered in quartz.ts. | Never — handles all fences automatically. |
| `../../quartz.ts` | Registers both Steptrace component and SteptraceBlock transformer in Quartz config. | Edit only if plugin paths change. |
| `Vault/.obsidian/plugins/steptrace/main.js` | **GENERATED** — concatenation of engine.js + obsidian-plugin.js. Banner says "do not edit". | Never hand-edit — regenerate via `npm run steptrace:sync`. |
| `Vault/.obsidian/plugins/steptrace/manifest.json` | **GENERATED** — copy of manifest.json. | Never hand-edit — regenerate via `npm run steptrace:sync`. |
| `Web/quartz/static/steptrace/engine.js` | **GENERATED** — copy of engine.js served at runtime. Banner says "do not edit". | Never hand-edit — regenerate via `npm run steptrace:sync`. |

## The Single Source of Truth: engine.js

```engine.js``` is a 2600-line UMD module with seven sections (§1–§7):

| § | Section | What lives here | Edit when... |
|---|---------|-----------------|--------------|
| 1 | **STYLES** | All CSS: colors, layout, transitions. Tied to `--st-*` tokens so hosts rebind the palette without touching this. | Tweaking visual appearance, changing layout, adjusting animations. |
| 2 | **REGISTRY** | `registerSort()`, `registerGraph()`, `buildFrames()` — extension API and frame-building entry point. | Rarely; sets the contract for algorithms. |
| 3 | **RECORDERS** | Turn `ops.*` calls (e.g., `ops.swap(i, j)`, `ops.visit(n)`) into immutable step frames. Per-renderer kind (Sort, Graph, Search, String, Pointers, DP, UnionFind). | Changing what information is captured per step. |
| 4 | **ALGORITHMS** | 17 built-ins across 7 renderer kinds: 6 sorts (bubble, insertion, selection, quick, heap, merge) · 5 graph algorithms (bfs, dfs, dijkstra, prim, topological-sort) · binary-search · 2 string (kmp, rabin-karp) · 2 pointer (two-pointers, sliding-window) · lcs · union-find. Each block calls `registerSort()` or `registerGraph()`. | Adding a new algorithm (edit one block here). |
| 5 | **RENDER** | DOM builder: creates HTML structure with semantic classes and data-driven geometry (no inline styles for colors/layout — those live entirely in STYLES §1). | Never for appearance — only if DOM structure changes. |
| 6 | **PLAYER** | Transport controls: play, pause, step, speed. Iterates precomputed frames. Step-back is a free re-render (no history). | Tweaking playback behavior. |
| 7 | **MOUNT** | Assembles a card into a given `root` element: parses config, runs the algorithm once (to build frames), wires the player, and returns `{ destroy }` for cleanup. | Never — orchestration only. |

After editing engine.js, run:
```bash
npm run steptrace:sync
```

This regenerates both host copies: the Obsidian plugin and the Quartz static server file.

## The Two Hosts

Each host loads engine.js independently. Neither reads the other's files at build or run time — they can be added or removed without side effects.

### Obsidian

**Load path:** `Vault/.obsidian/plugins/steptrace/main.js` (concatenated at build time)

**How it works:**
1. `obsidian-plugin.js` runs after the engine (same process, same globalThis) and registers the `steptrace` code-block processor.
2. On render, it parses the fence config (flat JSON), calls `steptrace.mount(root, config)`, and wraps the handle in Obsidian's `MarkdownRenderChild` lifecycle.
3. Theme tokens (`--st-*`) are bound to Obsidian's CSS variables at plugin load.
4. The `.hotreload` marker signals the Hot Reload community plugin to refresh.

**Manual steps after editing engine.js:**
```bash
npm run steptrace:sync     # Regenerate main.js and manifest.json
```
Then reload the plugin in Obsidian:
- *Cmd+P* → "Reload app without saving", or
- Enable/disable the plugin in *Settings → Community plugins → Steptrace*, or
- Use the Hot Reload community plugin (if installed)

### Quartz

**Load path:** Engine loaded at runtime from `/static/steptrace/engine.js` (copied at build time)

**How it works:**
1. The `SteptraceBlock` transformer (at build time) rewrites each ```steptrace fence into `<div class="steptrace-mount" data-config="{…}">`.
2. The `Steptrace` component (registered in quartz.ts) provides `afterDOMLoaded` hydration and CSS.
3. At runtime, a hydrator script (lazy-loaded `<script>`) fetches `/static/steptrace/engine.js` and mounts every `.steptrace-mount` div on page nav or SPA `render` event.
4. Theme tokens are bound to Quartz's CSS variables in the component.
5. `addCleanup()` hooks stop timers/listeners on navigation.

**Manual steps:**
- After editing engine.js: `npm run steptrace:sync` writes a fresh copy to `Web/quartz/static/steptrace/engine.js`.
- Quartz detects the change and rebuilds automatically (or run `quartz build`).

**Publishing gotcha:**
Quartz builds from `Web/content/`, NOT the live Vault. A steptrace fence added to a note in the Vault is not visible on the published site until it is mirrored into `Web/content/` (via your publish workflow, e.g., git sync, Syncer, or manual copy).

## How to Change Things

### Add an Algorithm

1. Open `engine.js` and find section 4 (ALGORITHMS).
2. Pick the matching renderer kind (sort, graph, search, string, pointers, dp, unionfind) and add one block:
   ```js
   registerSort("insertion-sort", { label: "Insertion Sort" }, (input, ops) => {
     // input is the array; ops are: compare, swap, overwrite, candidate, holdKey, markSorted, done
     for (let i = 1; i < input.length; i++) {
       ops.candidate(i)
       for (let j = i - 1; j >= 0; j--) {
         if (ops.compare(j, j + 1, "compare")) ops.swap(j, j + 1, "shift")
       }
       ops.markSorted([0], [i])
     }
     ops.done()
   })
   ```
3. Run `npm run steptrace:sync`.
4. Reload the Obsidian plugin (Cmd+P → "Reload app without saving").
5. Add a fence to a note:
   ```steptrace
   { "algorithm": "insertion-sort", "array": [5, 2, 9, 1] }
   ```

See the header comment in §4 for all available `ops.*` methods per kind.

### Tweak Visual Appearance (Colors, Layout, Animations)

1. Open `engine.js` section 1 (STYLES).
2. Edit the CSS. All colors are `--st-*` tokens (mapped to internal `--_*`) so hosts can rebind via the cascade without touching this file.
3. Run `npm run steptrace:sync`.
4. In Obsidian: reload the plugin.
5. In Quartz: rebuild (`quartz build`).

### Add a New Renderer Kind (New Visual Primitive)

1. Add a new recorder class in section 3 (RECORDERS) that captures the ops for your kind.
2. Add render logic in section 5 (RENDER) that builds the DOM for this kind.
3. Add CSS for the new kind in section 1 (STYLES).
4. Export `registerYourKind()` from the REGISTRY (§2) and call it for your algorithm in section 4 (ALGORITHMS).
5. Run `npm run steptrace:sync`, reload both hosts.

## Where It Can Fail

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Card doesn't render in Obsidian (blank or "steptrace: mount failed") | engine.js config is invalid JSON, or the algorithm doesn't exist. | Check the fence in the note: valid JSON in the code block? Algorithm name matches §4? |
| Card renders but is unstyled (no colors, squished) in Obsidian | engine.js did not run (main.js is stale) or Obsidian theme tokens are missing. | Run `npm run steptrace:sync` and reload the plugin (Cmd+P → "Reload app without saving"). |
| Card doesn't appear on the published Quartz site | Fence is in the Vault but not mirrored to `Web/content/` yet, or `/static/steptrace/engine.js` is stale. | (1) Ensure the note with the fence has been synced to `Web/content/`. (2) Run `npm run steptrace:sync` and `quartz build`. |
| Card shows "steptrace: failed to load engine" on published site | `/static/steptrace/engine.js` returned 404 or a network error. | Check the Quartz build log. Ensure `Web/quartz/static/steptrace/engine.js` exists and is readable. Run `npm run steptrace:sync` and `quartz build`. |
| Card mounts but shows wrong rendering (e.g., graph doesn't layout correctly) | Config is valid but has missing or malformed array/edges/nodes. | Consult the schema below; ensure `algorithm` matches §4 exactly. |

### Config Schema

- **Sort:** `{ "algorithm": <id>, "array"?: number[], "speed"?: number }` — omit `array` for random.
- **Graph:** `{ "algorithm": <id>, "start"?: string, "directed"?: boolean, "nodes"?: [{id, x?, y?}], "edges"?: [{from, to, weight?}], "speed"?: number }` — omit nodes/edges for default; omit node x/y for circular layout; Dijkstra/Prim read edge `weight`; topological-sort needs `directed: true`.
- **Search:** `{ "algorithm": "binary-search", "array": number[] (sorted!), "target": number }`.
- **String:** `{ "algorithm": "kmp" | "rabin-karp", "text": string, "pattern": string }`.
- **Pointers:** `{ "algorithm": "two-pointers" | "sliding-window", "array": number[], "target": number }` — two-pointers expects sorted array.
- **DP:** `{ "algorithm": "lcs", "a": string, "b": string }`.
- **UnionFind:** `{ "algorithm": "union-find", "n": number, "ops"?: [ ["union", a, b] | ["find", x], … ] }`.
