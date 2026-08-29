# StepTrace Design

StepTrace is a teaching instrument for algorithms and data structures. It should make state transitions visible without replacing the explanation around them or turning a note into an animation demo.

This document owns StepTrace-specific design, consistency, and review rules. The repository-wide contract remains [`../../../DESIGN.md`](../../../DESIGN.md). If implementation and this document disagree, verify the implementation, then correct the document or code in the same change.

## Source of truth

- **Status:** Active
- **Last refreshed:** 2026-08-28
- **Product surface:** `steptrace` fenced blocks rendered in Obsidian and Quartz.
- **Source:** `Web/custom/steptrace/src/`.
- **Generated artifacts:** `Web/custom/steptrace/generated/` and `Vault/.obsidian/plugins/steptrace/`.
- **Host bindings:** `src/styles/hosts/obsidian.scss` and `Web/custom/components/styles/steptrace.scss`.
- **Usage:** `steptrace` fences in `Vault/Home/`.

Complexity charts share the Obsidian plugin entry, but their model, rendering, and styles are owned by `Web/custom/complexity/` and the root design contract. Tabsdown owns authored tab structure and interaction.

## Product goal

StepTrace should help a reader answer four questions:

1. What input or structure is being processed?
2. What state is active now?
3. What operation changed the state?
4. What result or invariant follows?

It is not:

- A video player with decorative motion.
- A replacement for note prose, code, tradeoffs, or complexity analysis.
- A canvas for one-off visual languages.
- A generic charting or diagramming library.

## Authored composition

- Every note containing StepTrace uses one outer Tabsdown block with `Visualization` first and `Complexity` second.
- An ordinary Visualization panel begins with its `steptrace` fence. It may contain at most one optional `####` support section after the trace; use unheaded prose when a heading adds no navigation value.
- A multi-variant Visualization panel begins with inner Tabsdown. Each variant keeps its label, begins with one flat `steptrace` fence, and places useful explanation after the fence. Use either one shared outer `####` or at most one `####` in each owning variant, never both. Delete copy that only restates visible controls or the pictured scenario.
- The Complexity panel begins with exactly one version 2 `complexity` fence and contains no heading or Markdown table. Concise unheaded prose may follow only when it supplies a chart-missing assumption, model or resource distinction, or decision-changing failure boundary. Complexity headings, tables, and claims do not appear outside the panel.
- Every DSA complexity figure contains independent Time and Space resources in that order. It exposes an accessible figure name but no visible global chart title.
- Big O is the exception: its version 1 catalogue stays in normal note flow without StepTrace or Tabsdown.
- StepTrace and complexity payload fences use backticks. Nested Tabsdown fences use tildes, with each outer fence longer than every inner tilde fence it contains.

## Design invariants

1. **Show semantic state.** Frames represent algorithm operations, not arbitrary animation beats.
2. **One shell.** Playback visualizations reuse the shared head, stage, Trace/Watch rail, phase, timeline, and transport.
3. **One family per concept shape.** Algorithms with the same visual structure share a renderer and geometry.
4. **Stable geometry.** Nodes, cells, topology, and stage size stay stable when the concept allows it.
5. **Quiet chrome.** The stage reads like an explanatory diagram; controls are visible without dominating it.
6. **Strong state.** Current, frontier, accepted, rejected, result, and inactive states are distinguishable without relying on color alone.
7. **Component responsiveness.** Layout follows the mounted instance's width, not the browser viewport.
8. **Host parity.** Obsidian and Quartz use the same engine, frames, family renderers, and shared styles.
9. **Motion has meaning.** Movement explains a transition and completes within the playback step.
10. **Teardown is part of correctness.** Navigation, tab switching, rerendering, and plugin reload must not leave listeners or stale DOM.

## Information hierarchy

For frame-based visualizations, use this order:

1. **Head:** breadcrumb/algorithm label and step counter.
2. **Stage:** the primary structure and active state.
3. **Trace and Watch:** the current operation and values needed to understand it.
4. **Phase and timeline:** position within the larger algorithm.
5. **Transport and utilities:** step, play/pause, speed, and applicable options.

The stage is primary. Trace and Watch explain it. Controls remain last.

On terminal frames, a concise Result replaces the live trace message instead of adding another panel.

Direct-manipulation structures may replace playback controls with native inputs, selects, actions, and a live result/status area. They still reuse StepTrace tokens, state language, targets, and family primitives.

## Consistency rules

### Algorithm, recorder, and renderer boundaries

- Algorithm descriptors own semantic operations and labels.
- Recorders convert operations into immutable frames.
- Visual families own DOM structure, geometry, and painting.
- `mount.ts` owns the shared shell, responsive mode, keyboard behavior, playback controls, and teardown.
- Host entries adapt loading and native controls; they do not fork the visualization design.
- SCSS owns presentation. Do not inject runtime `<style>` elements.

Do not build frames or family DOM inside an algorithm descriptor. Do not copy a family renderer to change one label or state.

### Layered style ownership

- `src/styles/_tokens.scss` is the only compile-time source for fallback semantic values and the Quartz light/dark palette mixins.
- `src/styles/shared.scss` owns runtime aliases, scales, state paint, shell chrome, and shared mechanical primitives. A shared primitive must replace the same contract in at least two production consumers.
- Family SCSS owns concept geometry, layout, and semantic-role selectors; TypeScript selects roles and retains measured/data-driven geometry, but does not paint them.
- Quartz and Obsidian host files bind the same semantic roles without owning family selectors, state paint, or primitives. Quartz applies the canonical web light/dark palette; Obsidian resolves surfaces, borders, text, accents, and fonts from the active Obsidian theme while reusing the accessible shared state palette.

Mechanically equivalent and close values canonicalize to the shared role even when this causes a small visual shift. A genuinely independent local value uses this exact one-line comment immediately before its declaration: `/* steptrace-exception: <kebab-name> | category=<category> | rationale=<concise text> | evidence=<repo-relative path> */`. Several governed declarations in one rule may share one exception only when they have the same category and rationale: put the comment first inside the rule and append `| properties=<comma-separated-properties>`. Each listed property must occur exactly once as a direct declaration in that rule; the allowlist does not cover unlisted declarations. `<category>` is `semantic`, `responsive`, `geometry`, `accessibility`, `motion`, `interaction`, or `host-parity`; `<kebab-name>` is unique within StepTrace; and `evidence` names a regular file whose real path remains inside the StepTrace evidence root. Enforcement pairs single annotations with the next declaration, rejects malformed, orphaned, duplicate, ambiguous, or missing grouped properties, and keeps excepted values in the raw-value inventory without treating them as shared authority. File-level exceptions do not exist.

The radius, typography, spacing, and motion inventory is exhaustive across authored declarations, local custom properties, Sass variables, and fallback literals regardless of formatting. A nonzero raw literal in those categories must use a shared role or carry the adjacent exception above; generic custom-property and Sass aliases cannot hide it. Every governed shared role lives in `shared.scss` and has at least two real consumers, including consumers reached through semantic aliases. Unique governed values remain local with validated adjacent exceptions. CSS reset keywords and unitless zero do not create a competing style decision.

### Family reuse

Choose the existing family that matches the data shape:

| Concept shape                                         | Preferred family                            |
| ----------------------------------------------------- | ------------------------------------------- |
| Sorting and linear scans                              | `array-sort`                                |
| Indexed search and boundaries                         | `indexed-array-search`, `monotone-boundary` |
| Counting, buckets, and radix passes                   | `distribution-sort`                         |
| Graph traversal and path state                        | `graph-state`                               |
| Graph representation                                  | `graph-representation`                      |
| Binary search trees and balanced trees                | `binary-tree`                               |
| B-trees and related multiway trees                    | `multiway-tree`                             |
| Heap selection and heap forests                       | `heap-selection`                            |
| Recursion, divide-and-conquer, and branch exploration | `execution-tree`                            |
| Dynamic-programming tables and stories                | `matrix-grid`, `dp-story`                   |
| Tries and multi-pattern string structures             | `prefix-character`                          |
| Prefix accumulation                                   | `prefix-sum`                                |
| Intervals                                             | `interval-track`                            |
| Linked nodes and pointer motion                       | `linked-topology`                           |
| Arrays, queues, deques, and circular storage          | `contiguous-storage`                        |
| Hash maps, sets, and filters                          | `hash-index`                                |
| Stacks and monotonic structures                       | `stack-sequence`                            |
| Range-query structures                                | `range-aggregate`                           |
| Disjoint sets                                         | `union-find`                                |

Add a family only when an existing family would misrepresent the structure, not because an algorithm needs different colors, copy, or one local marker.

### Legacy resolution

Nineteen typed adapters preserve the public registration API while routing old descriptors into shared families:

- `array-sort`: Bubble, Insertion, Selection, Quick, Heap, and Merge Sort.
- `graph-state`: BFS, DFS, Prim, and Topological Sort.
- `indexed-array-search`: Binary and Linear Search.
- `string-match`: KMP, Rabin–Karp, Z Algorithm, and Boyer–Moore.
- `indexed-pointer-window`: Two Pointers and Sliding Window.
- `matrix-grid`: LCS.

Exactly two descriptor-owned legacy renderers remain: Kernighan Popcount uses `bit-grid`, and N-Queens uses `backtrack-board`. Expected routing is a test oracle only; actual ownership comes from adapter family metadata or `legacyRenderer` on the descriptor.

### Canonical primitives

Reuse before creating:

- Segmented array shells and rounded endpoints.
- Canonical graph nodes, edges, arrows, and labels.
- Tabsdown-authored tabs; shared buttons, focus treatment, status, legends, and result markers.
- Trace/Watch rows and value hints.
- Lucide transport glyphs.
- Shared state and motion tokens.

Local primitives are acceptable only when the underlying concept has a distinct shape.

### Semantic carrier grammar

Related algorithms share semantic roles and cues even when their concept shapes differ. Per-algorithm names may remain local, but their meaning cannot drift:

- **Blue:** active, current, or the comparison happening now.
- **Amber:** candidate, frontier, open set, pending scope, or held value.
- **Green without a check:** accepted, visited, closed, path, or stored progress.
- **Green with the canonical shared check:** final, sorted, terminal success, or a completed result.
- **Violet:** goal or target.
- **Red:** rejected, invalid, infeasible, or mismatch.
- **Neutral:** untouched, inactive, or contextual state.
- **Underline:** only a true matched or range extent, never a generic emphasis or single-cell completion cue.

A primitive has one primary process role. An independent goal, target, range, or similar overlay may compose with it without replacing that primary role. Reinforce color with text, stroke, fill pattern, shape, badge, or position. Final markers and other semantic children are created with stable primitive topology and shown by state; state-only paint must not recreate geometry or append duplicate markers.

The local legend translates algorithm terminology into this shared grammar; it does not redefine the grammar. Generic StepTrace tests enforce the public API, catalog shape, registry routing, transport, mount teardown, and watcher lifecycle without encoding named algorithms, notes, or exact source carriers. `npm run steptrace:check` owns host-artifact freshness. Production changes belong in `src/`; generated Quartz and Obsidian projections are updated only through `npm run steptrace:build` and are never hand-edited.

Algorithm legends use one default marker: a `0.75rem` circular solid semantic fill with no decorative border and a Title Case label. Terminal success adds the canonical shared check to green; accepted, visited, closed, path, and stored-progress green remain plain. Line, bar, band, edge, and path carriers are exceptions only when their geometry communicates the algorithmic relationship.

## Visual style

### Surface and chrome

- The root visualization has no card border, fill, padding, or decorative shadow.
- The stage remains unboxed like a diagram.
- Borders separate real structure or controls; they are not decoration.
- Control surfaces may use a small radius and functional elevation.
- Do not stack glow, border, fill, and shadow on the same state.

### Typography

- Human UI, headings, trace prose, and narrative labels use `--_font-body`.
- Formulas, values, indices, addresses, counters, and aligned machine state use `--_font-mono`.
- Shared hierarchy uses weights `400` and `600`; a geometry-fitted data label may use a different size only when the available node, cell, or track requires it.
- Do not introduce a third rendered font role or family-specific font stack.
- Keep labels short enough to remain readable without shrinking below the shared scale.

### Spacing and geometry

- Use shared shell spacing before family-local spacing.
- Keep controls at least `44px` on compact or coarse-pointer surfaces.
- Align values and repeated structures to a visible grid.
- Reserve geometry for the largest expected normal state when that prevents frame-to-frame layout shift.
- Tree and graph view bounds include node radius, terminal halos, stroke width, arrowheads, and a small visual gutter on all four sides. Preserve intentional clipping only after those rendered extents fit at compact-boundary and wide widths.
- Prefer reflow, wrapping, and family container queries over scaling the whole visualization.
- Use horizontal scrolling only when reflow or compression would falsify the spatial relationship.

### Motion

Shared motion roles live in `src/styles/shared.scss`:

- Instant: `0ms`.
- Quick: about `70ms` at `1x`.
- Base step tween: `107ms` at `1x`.
- Move: about `180ms` at `1x`.
- Settle: about `320ms` at `1x`.

Rules:

- Enter with deceleration; leave with acceleration.
- Use the soft spring for quiet settling and the snappier spring only for a small transition that benefits from overshoot.
- Use shared duration roles, not raw family-local milliseconds.
- Playback-scaled transitions must finish within the current step budget.
- Animate state changes; do not animate layout merely to make the page feel active.
- Reduced motion removes positional travel. Short color and opacity changes may remain when they preserve comprehension.

## Responsive behavior

- `mount.ts` measures the mounted root and enters compact mode below `704px` inline size.
- Compact mode stacks the stage and rail, exposes Trace/Watch as a nullable exclusive detail switch, gives the timeline its own row, and preserves `44px` controls.
- **Direction:** New or changed family-level adaptations use container queries or measured component state. Existing family viewport-width rules are legacy behavior; do not copy them into new work.
- Media queries remain appropriate for input capabilities such as coarse pointer or reduced motion.
- Focus remains on a useful control when responsive mode changes.
- The compact layout must not hide the current operation, result, or only explanation of a state.

## Interaction rules

### Playback

- Previous and next move exactly one frame.
- Play/pause reflects the actual player state.
- Scrubbing updates the stage, Trace, Watch, phase, counter, and accessible value together.
- Speed affects playback and transition timing without changing frame semantics.
- A StepTrace inside initially hidden Tabsdown panels mounts only when all ancestor panels become visible.
- Hiding a mounted panel pauses playback and preserves its step. Showing it resumes only when it was playing before the hide.
- Rerendering, navigation, and plugin unload disconnect panel observers and destroy the mounted child.
- Quartz destroys mounted StepTrace children on `prenav`, before its global cleanup set and DOM replacement. StepTrace cleanup is idempotent; Tabsdown retains its single global cleanup callback rather than synthetic inner/outer owners.

### Direct manipulation

- Use native inputs, selects, and buttons.
- Validate at the operation boundary and keep the previous usable state when an operation is rejected.
- Disabled controls stay visible when their position teaches the interface.
- Prefer an inline status/result to a toast.

### Empty, invalid, and terminal states

- Invalid JSON or unsupported configuration renders a local readable error.
- Empty structures show their real empty geometry and a short state label.
- Terminal state names the result and leaves the final structure visible.
- An enhancement failure must not replace the surrounding note.

## Accessibility

- Target WCAG 2.2 AA for changed StepTrace UI.
- All transport, scrubbers, detail switches, native options, and structure actions are keyboard reachable. Tabsdown owns keyboard interaction for authored tabs.
- Use visible focus outlines and native disabled semantics.
- Tabsdown supplies tablist/tab/tabpanel roles, roving tab index, and isolated arrow/Home/End navigation for outer and inner authored groups.
- Scrubbers expose current, minimum, maximum, and readable phase/step values.
- Decorative SVG content is hidden. The stage has equivalent labels, Trace, Watch, or result text.
- Dynamic announcements are bounded; do not announce every animated detail.
- Color is never the only state signal.
- Hover details also work through focus or visible text.
- Test reduced motion, coarse pointer, and both themes.

## Content and microcopy

- Name the real operation: “Relax B from 8 to 5,” not “Process node.”
- Trace says what changed in the current frame.
- Watch shows only values needed to understand that frame.
- Phase names the larger algorithm stage.
- Result states the outcome without repeating the entire trace.
- Labels use the algorithm's terminology, not generic UI language.
- Descriptions establish the input or scenario; they do not narrate obvious controls.

## Host parity

Both hosts must share:

- Parsed configuration and validation.
- Algorithm descriptors and frame construction.
- Family DOM and geometry.
- Shared styles and semantic tokens.
- Interaction behavior and teardown contract.
- Tabsdown-authored outer and inner panel structure.
- Lazy mounting and visibility-driven pause, conditional resume, and state retention.

Host parity means the same role and state semantics, not identical computed colors. Obsidian should look native to the active Obsidian theme; Quartz should retain the web palette.

Host-specific code may provide:

- Native loading and lifecycle integration.
- Host token bindings.
- Obsidian's native slider.
- Tabsdown-mounted compact Trace/Watch switches in Obsidian and Quartz, with the shared switch only as a missing-plugin fallback.
- Quartz lazy asset loading and SPA teardown.

A host-specific difference is acceptable only when the same operation, state, result, and fallback remain available.

## Component ownership

| Concern                      | Owner                                              |
| ---------------------------- | -------------------------------------------------- |
| Registry and public API      | `src/engine.ts`, `src/registry.ts`, `src/types.ts` |
| Semantic frames              | `src/recorders.ts`, algorithm-specific recorders   |
| Shared shell and interaction | `src/mount.ts`, `src/player.ts`                    |
| Authored tab interaction     | Tabsdown                                           |
| Panel visibility lifecycle   | `src/mount.ts`                                     |
| Family DOM and geometry      | `src/families/`, `src/render.ts`                   |
| Fallback and Quartz palette  | `src/styles/_tokens.scss`                          |
| Shared tokens and chrome     | `src/styles/shared.scss`                           |
| Family styling               | the matching file under `src/styles/`              |
| Obsidian token binding       | `src/styles/hosts/obsidian.scss`                   |
| Quartz token binding         | `Web/custom/components/styles/steptrace.scss`      |
| Shipped order                | `src/algorithms/index.ts`                          |
| Generated projections        | `build.mjs`; never hand-edited                     |

`npm run steptrace:build` is the sole writer for the six projections: Quartz `generated/engine.js` and `generated/engine.css`, plus Obsidian `main.js`, `styles.css`, `manifest.json`, and `.hotreload`. `npm run steptrace:check` compares all six byte-for-byte with an in-memory build.

## Change checklist

Before adding or changing a visualization:

1. Confirm StepTrace is the right medium; use prose, code, a table, or Mermaid when time/state is not the lesson.
2. Reuse an existing family and primitive where the concept matches.
3. Define initial, representative active, final, empty/invalid, and reduced-motion behavior as applicable.
4. Check compact behavior by component width, not only a narrow browser viewport.
5. Verify keyboard and focus behavior.
6. Compare Obsidian and Quartz.
7. Rebuild generated artifacts.
8. Update this document only when the change establishes or replaces a durable rule.

Run from `Web/`:

```bash
npm run steptrace:test
npm run steptrace:typecheck
npm run steptrace:build
npm run steptrace:check
```

For a changed visual family, capture:

- Obsidian and Quartz.
- Light and dark.
- Desktop and compact.
- Initial, representative active, and final state.
- Reduced motion when motion behavior changed.

### Capture, review, promote

Visual proof is a two-phase immutable-candidate protocol. Candidate capture writes a sealed tree once, records product failures separately from pending visual approvals, and never reads approvals. Independent review may then append ledger entries without changing or recapturing the candidate. Promotion uses `--mode=verify-candidate --run-id=<id>` to revalidate the sealed artifacts, exact capture inputs and environment, product status, and current approval ledger; its closure receipt lives outside the candidate directory.

Every visual mode runs through `steptrace.visual.launcher.mjs`; direct harness execution is rejected. The launcher hashes itself, the visual harness, and every imported local executable module before import, then passes a manifest that the harness verifies immediately. Candidate capture requires `--run-id` and `--producer-agent-id`. Promotion requires the same run id plus `--quartz-receipt` and `--obsidian-receipt`. The launch-manifest hash and exact executable bytes remain part of both pre/post capture snapshots, the candidate seal, and the external capture anchor.

The exclusive capture anchor is `quality-gate/g008-promotion-protocol/capture-anchors/<run-id>.json`. Each screenshot has one canonical contained candidate path; promotion retains its validated bytes and hashes through classification and approval matching, then rechecks the complete anchored candidate tree immediately before the exclusive closure receipt write.

Every current v2 approval requires an exclusive external anchor at `quality-gate/g008-promotion-protocol/review-anchors/<run-id>/<reviewer-agent-id>.json`. It binds the external capture-anchor path and hash, producer agent and harness identity, a distinct reviewer agent and evidence-owned tool identity, an allowed reviewer role, exact review artifacts and hashes, and the complete approval identity set. Path-only reviews and legacy approvals are not trusted.

Current-run real-host receipts are written by the evidence-owned G008 adapters under `quality-gate/g008-promotion-protocol/runners/` to `real-host/g008/<run-id>/<host>/receipt.json`. Quartz uses runner `steptrace-g008-quartz-v1` with `playwright-cli`; Obsidian uses `steptrace-g008-obsidian-v1` with `obsidian-cli`. Promotion accepts only canonical schema-v2 PASS receipts with current runner-file hashes, exact capture/input/source/generated bindings, concrete check and artifact manifests, zero errors, and successful cleanup. Product failures are independently rederived before host or review evidence is consulted.

**Architect WATCH:** review consolidation and real-host execution remain separate evidence lanes. They may exclusively create their anchors and receipts later, but they must not rewrite candidate, baseline, ledger, generated, or promotion artifacts. Raster equivalence retains the strict existing tolerance and never uses recapture consensus.

Automated tests prove contracts; screenshots prove composition. Neither replaces keyboard and interaction checks.

## Avoid

- Per-algorithm copies of shared renderers.
- Family-specific shell, transport, authored tabs, or token vocabularies.
- Raw colors or font stacks where a semantic token exists.
- Viewport-width rules for component layout.
- Layout motion, auto-playing decoration, or a second competing trace panel.
- Shrinking labels or entire stages until they become unreadable.
- Generated-file edits.
- Claims of cross-host completion without checking both hosts.

## Open evidence

- [ ] Capture committed light/dark initial/active/final screenshots of the compact Trace/Watch rail below `704px`.
