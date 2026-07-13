# StepTrace

StepTrace renders interactive algorithm traces from one fenced block in both Obsidian and Quartz:

````markdown
```steptrace
{ "algorithm": "bubble-sort", "array": [8, 3, 5, 1] }
```
````

The TypeScript source is shared. esbuild produces the formats each host needs, and Sass produces native stylesheets for each host.

## Source layout

| Path                             | Responsibility                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/engine.ts`                  | Composition root. Creates the registry, registers built-ins, creates `mount()`, and exports the public API. |
| `src/types.ts`                   | Public engine, algorithm, host, and configuration contracts.                                                |
| `src/registry.ts`                | Runtime registration, algorithm lookup, and frame construction.                                             |
| `src/recorders.ts`               | State machines that convert semantic algorithm operations into immutable frames.                            |
| `src/graph.ts`                   | Graph normalization, layout, and adjacency helpers.                                                         |
| `src/render.ts`                  | DOM view factories and frame painters.                                                                      |
| `src/player.ts`                  | Playback transport over precomputed frames.                                                                 |
| `src/mount.ts`                   | Card assembly, controls, keyboard handling, and teardown.                                                   |
| `src/algorithms/*.ts`            | One exported algorithm descriptor per built-in.                                                             |
| `src/algorithms/index.ts`        | Explicit shipped algorithm catalog and display order.                                                       |
| `src/entries/browser.ts`         | Quartz boundary: exposes `globalThis.steptrace`.                                                            |
| `src/entries/obsidian.cts`       | CommonJS TypeScript boundary: bundles the engine and exports the Obsidian plugin class directly.            |
| `src/styles/index.scss`          | Shared StepTrace stylesheet entry.                                                                          |
| `src/styles/hosts/obsidian.scss` | Shared styles plus Obsidian theme-token bindings.                                                           |
| `build.mjs`                      | Builds and verifies all generated artifacts.                                                                |
| `watch.mjs`                      | Rebuilds after TypeScript, SCSS, entry, or manifest changes.                                                |

`engine.ts` is the body of the engine. JavaScript imports define dependency order; `algorithms/index.ts` defines only which algorithms ship and their intentional UI order. There are no wrapper fragments or source-order manifest.

## Generated artifacts

| Artifact                                          | Consumer                                |
| ------------------------------------------------- | --------------------------------------- |
| `generated/engine.js`                             | Quartz classic-script runtime.          |
| `generated/engine.css`                            | Quartz lazy-loaded shared styles.       |
| `Vault/.obsidian/plugins/steptrace/main.js`       | Obsidian CommonJS plugin bundle.        |
| `Vault/.obsidian/plugins/steptrace/styles.css`    | Obsidian shared styles and host tokens. |
| `Vault/.obsidian/plugins/steptrace/manifest.json` | Obsidian plugin metadata.               |

Generated files are committed but never edited by hand.

## Commands

Run from `Web/`:

```bash
npm run steptrace:build      # regenerate Quartz and Obsidian artifacts
npm run steptrace:watch      # rebuild on source changes
npm run steptrace:test       # API, host, stylesheet, watcher, and frame contracts
npm run steptrace:typecheck  # StepTrace TypeScript check
npm run steptrace:check      # non-writing stale-artifact check
```

`npm run check` includes all StepTrace gates before the repository TypeScript and Prettier checks.

If macOS file descriptor limits break the watcher:

```bash
STEPTRACE_WATCH_POLL=1 npm run steptrace:watch
```

## Add an algorithm

1. Add `src/algorithms/<algorithm>.ts` and export a typed descriptor:

   ```ts
   import type { SortAlgorithmDefinition } from "../types"

   export const exampleSort = {
     id: "example-sort",
     kind: "sort",
     meta: { label: "Example sort" },
     run(input, ops) {
       // Drive the recorder through ops.*; do not build frames or DOM here.
     },
   } satisfies SortAlgorithmDefinition
   ```

2. Import the descriptor in `src/algorithms/index.ts` and place it at the intended display position.
3. Add it to the algorithm contract fixture in `steptrace.test.mjs`.
4. Run `npm run steptrace:test` and `npm run steptrace:build`.

No generated file or build-order file changes.

## Change styling

- Shared card or renderer styling: edit the owning file under `src/styles/`.
- Obsidian token bindings: edit `src/styles/hosts/obsidian.scss`.
- Quartz token bindings: edit `custom/components/styles/steptrace.scss`.

The build emits real `.css` files. StepTrace does not serialize SCSS into JavaScript and does not create runtime `<style>` elements.

## Host integration

### Obsidian

Obsidian loads `Vault/.obsidian/plugins/steptrace/main.js` and `styles.css` natively. The plugin entry registers the `steptrace` code-block processor, delegates rendering to `steptrace.mount()`, supplies the native `SliderComponent`, and attaches the returned teardown handle to `MarkdownRenderChild`.

After rebuilding, reload the StepTrace plugin through the command palette. With the Hot Reload community plugin installed, the generated `.hotreload` marker enables automatic reload.

### Quartz

`SteptraceBlock` converts the fence into a `.steptrace-mount` element. The `Steptrace` component loads `/static/steptrace/engine.css` and then `/static/steptrace/engine.js` only when a mount exists. `StepTraceStatic` copies both generated assets during full builds; the watcher mirrors them into an existing `Web/public/` during development.

Quartz builds from `Web/content/`, not the live Vault. A StepTrace fence reaches the published site only after the normal publish sync copies the note.

## Before a PR update

```bash
cd Web
npm run steptrace:test
npm run steptrace:typecheck
npm run steptrace:build
npm run steptrace:check
npm run check
npm run quartz -- build
```

Then smoke-test one card in Obsidian and one in Quartz, including light/dark themes and teardown after navigation or plugin reload.
