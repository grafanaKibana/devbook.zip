# steptrace — Algorithm Visualizer Framework

Interactive, step-by-step algorithm-visualizer cards that live in both the Obsidian editor and the published Quartz site, sourced from a single `steptrace` fence in any note. The engine is one self-contained, dependency-free UMD module — authored as small per-topic fragments under `src/` and **stitched** into a single file that runs verbatim on both hosts.

## File Map

| File | Role | Edit? |
|------|------|-------|
| `src/` | **Single source of truth**: the engine, split into small fragments of ONE shared-scope IIFE — prologue, §1 styles, §2 registry, §3 recorders, §4 **one file per algorithm** (`src/40-algorithms/`), §5 render, §6 player, §7 mount, epilogue. Two-digit filename prefixes define the stitch order. | **Edit often** — all algorithm changes and visual tweaks go here. |
| `obsidian-plugin.js` | Obsidian bootstrap (appended to the engine via sync). Registers the `steptrace` code-block processor, wires theme tokens, and binds mount/destroy lifecycle. | Edit rarely — only if Obsidian integration changes. |
| `manifest.json` | Obsidian plugin manifest (id drives folder name). | Edit rarely — version bumps only. |
| `sync.mjs` | Build script: stitches the `src/` fragments into the engine (byte-for-byte, plain concat, no compilation), then writes `Vault/.obsidian/plugins/<id>/main.js` (engine + obsidian-plugin.js) and `Web/quartz/static/steptrace/engine.js` (engine only). Exports `stitch()`. | Rarely — only if the build itself changes. |
| `watch.mjs` | Dev watcher: re-runs the stitch on every save under `src/` (or `obsidian-plugin.js` / `manifest.json`), so `steptrace:sync` no longer has to be run by hand. Zero-dependency `fs.watch`. | Rarely. |
| `../components/steptrace.tsx` | Quartz component: inlines CSS, provides afterDOMLoaded hydrator that loads `/static/steptrace/engine.js` at runtime and mounts cards on SPA nav. Registered in quartz.ts. | Edit rarely — Quartz integration only. |
| `../transformers/steptrace-block.ts` | Quartz transformer: converts ```steptrace fence blocks (JSON config) into `<div class="steptrace-mount" data-config>` elements. Registered in quartz.ts. | Never — handles all fences automatically. |
| `../../quartz.ts` | Registers both Steptrace component and SteptraceBlock transformer in Quartz config. | Edit only if plugin paths change. |
| `Vault/.obsidian/plugins/steptrace/main.js` | **GENERATED** — stitch of `src/` + obsidian-plugin.js. Banner says "do not edit". | Never hand-edit — regenerate via `npm run steptrace:sync`. |
| `Vault/.obsidian/plugins/steptrace/manifest.json` | **GENERATED** — copy of manifest.json. | Never hand-edit — regenerate via `npm run steptrace:sync`. |
| `Web/quartz/static/steptrace/engine.js` | **GENERATED** — stitch of `src/`, served at runtime. Banner says "do not edit". | Never hand-edit — regenerate via `npm run steptrace:sync`. |

## The Single Source of Truth: src/

The engine is authored as fragments of ONE UMD module under `src/`. They are **not** ES modules: each is a raw slice of the same `(function(){ … })()` IIFE and shares its scope with all the others, so a `const` or `function` declared in one is visible to the rest. `sync.mjs` reads them in filename order and concatenates them **verbatim** — no bundler, no transforms — so the assembled engine is byte-for-byte what a single hand-authored file would be. The two-digit prefixes are the whole ordering mechanism; adding a fragment is just dropping a correctly-numbered `.js` file into `src/` (or `src/40-algorithms/`).

| File(s) | Section | What lives here | Edit when... |
|---------|---------|-----------------|--------------|
| `00-prologue.js` | — | UMD wrapper open + `VERSION`. Opens the shared IIFE scope. | Never — boilerplate. |
| `10-styles.js` | **STYLES** | All CSS: colors, layout, transitions. Tied to `--st-*` tokens so hosts rebind the palette without touching this. | Tweaking visual appearance, changing layout, adjusting animations. |
| `20-registry.js` | **REGISTRY** | `registerSort()`, `registerGraph()`, … `buildFrames()` — extension API and frame-building entry point. | Rarely; sets the contract for algorithms. |
| `30-recorders.js` | **RECORDERS** | Turn `ops.*` calls (e.g., `ops.swap(i, j)`, `ops.visit(n)`) into immutable step frames. Per-renderer kind (Sort, Graph, Search, String, Pointers, DP, UnionFind, Bits, Backtrack, RecTree). | Changing what information is captured per step. |
| `40-algorithms/*.js` | **ALGORITHMS** | 22 built-ins, **one file each**: 6 sorts · 5 graph (bfs, dfs, dijkstra, prim, topological-sort) · 2 search (binary, linear) · 2 string (kmp, rabin-karp) · 2 pointer (two-pointers, sliding-window) · lcs · union-find · kernighan-popcount · n-queens · fibonacci. Each file is one `registerX()` block. `00-header.js` is the section banner. | Adding a new algorithm (drop one file here). |
| `50-render.js` | **RENDER** | DOM builder: HTML structure with semantic classes and data-driven geometry (no inline styles for colors/layout — those live entirely in STYLES). | Never for appearance — only if DOM structure changes. |
| `60-player.js` | **PLAYER** | Transport controls: play, pause, step, speed. Iterates precomputed frames. Step-back is a free re-render (no history). | Tweaking playback behavior. |
| `70-mount.js` | **MOUNT** | Assembles a card into a given `root` element: parses config, runs the algorithm once (to build frames), wires the player, and returns `{ destroy }` for cleanup. | Never — orchestration only. |
| `90-epilogue.js` | — | The public-API `return { … }` object + UMD wrapper close. | When exporting a new `registerX` from the registry. |

> Because the fragments are indented for their assembled context (inside the IIFE) rather than as standalone modules, `src/` is listed in `Web/.prettierignore`. The assembled engine (`Web/quartz/static/steptrace/engine.js`) stays prettier-checked, so formatting is still enforced on the output.

Every card derives a teaching layer from its immutable frames:

- **Invariant** explains why the current operation is safe for that algorithm.
- **Milestones** divide the scrubber into semantic phases such as passes, probes, settled nodes, DP rows, and traceback.
- **Result** replaces the invariant on the terminal frame with the concrete output and relevant operation counts.
- State changes use symbols, line patterns, or geometry as well as color.

After editing anything under `src/`, run:
```bash
npm run steptrace:sync     # one-shot stitch
# — or, for a tight dev loop —
npm run steptrace:watch    # re-stitch automatically on every save
```

Both regenerate the two host copies: the Obsidian plugin and the Quartz static server file. `watch.mjs` only removes the manual sync step; the host still has to reload (see below).

### Why plain concat and not esbuild / source maps

The stitch is a deliberate verbatim concatenation, not a bundle. Keeping it a plain concat means the generated artifacts stay **byte-identical** to hand-authoring the engine as one file (the split introduced zero behavior change — only the banner line differs), it preserves the module's "no build, no dependencies" property, and it keeps the shared-scope IIFE model intact with no ESM conversion. A bundler (esbuild) was considered for source maps that point stack traces back to the fragment files, but it would wrap each fragment as a module (breaking shared scope) or require offset-tracked map generation, and it trades away the byte-identical guarantee — so it was left out. Line numbers in stack traces refer to the assembled engine; the section/algorithm is easy to locate from the banner comments.

## The Two Hosts

Each host loads engine.js independently. Neither reads the other's files at build or run time — they can be added or removed without side effects.

### Obsidian

**Load path:** `Vault/.obsidian/plugins/steptrace/main.js` (concatenated at build time)

**How it works:**
1. `obsidian-plugin.js` runs after the engine (same process, same globalThis) and registers the `steptrace` code-block processor.
2. On render, it parses the fence config (flat JSON), calls `steptrace.mount(root, config, host)`, and wraps the handle in Obsidian's `MarkdownRenderChild` lifecycle. The runtime-only host adapter supplies Obsidian's native `SliderComponent`; Quartz omits it and uses the engine's HTML range fallback.
3. Theme tokens (`--st-*`) are bound to Obsidian's CSS variables at plugin load.
4. The `.hotreload` marker signals the Hot Reload community plugin to refresh.

**Steps after editing `src/`:**
```bash
npm run steptrace:sync     # Regenerate main.js and manifest.json (or run steptrace:watch once)
```
Then reload the plugin in Obsidian:
- *Cmd+P* → "Reload app without saving", or
- Enable/disable the plugin in *Settings → Community plugins → Steptrace*, or
- Use the Hot Reload community plugin (if installed — the `.hotreload` marker is written by the sync, so with `steptrace:watch` running the plugin reloads on its own).

### Quartz

**Load path:** Engine loaded at runtime from `/static/steptrace/engine.js` (copied at build time)

**How it works:**
1. The `SteptraceBlock` transformer (at build time) rewrites each ```steptrace fence into `<div class="steptrace-mount" data-config="{…}">`.
2. The `Steptrace` component (registered in quartz.ts) provides `afterDOMLoaded` hydration and CSS.
3. At runtime, a hydrator script (lazy-loaded `<script>`) fetches `/static/steptrace/engine.js` and mounts every `.steptrace-mount` div on page nav or SPA `render` event.
4. Theme tokens are bound to Quartz's CSS variables in the component.
5. `addCleanup()` hooks stop timers/listeners on navigation.

**Steps:**
- After editing `src/`: `npm run steptrace:sync` (or a running `steptrace:watch`) writes a fresh copy to `Web/quartz/static/steptrace/engine.js`.
- Quartz detects the change and rebuilds automatically (or run `quartz build`).

**Publishing gotcha:**
Quartz builds from `Web/content/`, NOT the live Vault. A steptrace fence added to a note in the Vault is not visible on the published site until it is mirrored into `Web/content/` (via your publish workflow, e.g., git sync, Syncer, or manual copy).

## How to Change Things

### Add an Algorithm

1. Add a new file under `src/40-algorithms/` — copy the numbering of the block it should follow (e.g. `23-my-sort.js`). One file = one `registerX()` block:
   ```js
   // src/40-algorithms/23-my-sort.js
   // ─────────────────────────────── my-sort ───────────────────────────────
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
   Match the surrounding indentation (2 spaces — the file is a slice of the IIFE body). No `import`/`export`: `registerSort` and friends are in scope from `20-registry.js`.
2. Run `npm run steptrace:sync` (or leave `npm run steptrace:watch` running — it re-stitches on save).
3. Reload the Obsidian plugin (Cmd+P → "Reload app without saving").
4. Add a fence to a note:
   ```steptrace
   { "algorithm": "insertion-sort", "array": [5, 2, 9, 1] }
   ```

See the header comment in `src/40-algorithms/00-header.js` / `20-registry.js` for the available `ops.*` methods per kind.

### Tweak Visual Appearance (Colors, Layout, Animations)

1. Open `src/10-styles.js`.
2. Edit the CSS. All colors are `--st-*` tokens (mapped to internal `--_*`) so hosts can rebind via the cascade without touching this file.
3. Run `npm run steptrace:sync` (or `steptrace:watch`).
4. In Obsidian: reload the plugin.
5. In Quartz: rebuild (`quartz build`).

### Add a New Renderer Kind (New Visual Primitive)

1. Add a new recorder class in `src/30-recorders.js` that captures the ops for your kind.
2. Add render logic in `src/50-render.js` that builds the DOM for this kind.
3. Add CSS for the new kind in `src/10-styles.js`.
4. Export `registerYourKind()` from the registry (`src/20-registry.js`), add it to the public API in `src/90-epilogue.js`, and call it from an algorithm file in `src/40-algorithms/`.
5. Run `npm run steptrace:sync`, reload both hosts.

## Where It Can Fail

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Card doesn't render in Obsidian (blank or "steptrace: mount failed") | The fence config is invalid JSON, or the algorithm doesn't exist. | Check the fence in the note: valid JSON in the code block? Algorithm name matches a file in `src/40-algorithms/`? |
| Card renders but is unstyled (no colors, squished) in Obsidian | The engine didn't run (main.js is stale) or Obsidian theme tokens are missing. | Run `npm run steptrace:sync` and reload the plugin (Cmd+P → "Reload app without saving"). |
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
