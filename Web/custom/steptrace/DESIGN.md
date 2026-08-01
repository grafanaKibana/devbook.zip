# StepTrace Design

StepTrace is a teaching instrument for algorithms and data structures. It should make state transitions visible without replacing the explanation around them or turning a note into an animation demo.

This document owns StepTrace-specific design, consistency, and review rules. The repository-wide contract remains [`../../../DESIGN.md`](../../../DESIGN.md). If implementation and this document disagree, verify the implementation, then correct the document or code in the same change.

## Source of truth

- **Status:** Active
- **Last refreshed:** 2026-08-01
- **Product surface:** `steptrace` fenced blocks rendered in Obsidian and Quartz.
- **Source:** `Web/custom/steptrace/src/`.
- **Generated artifacts:** `Web/custom/steptrace/generated/` and `Vault/.obsidian/plugins/steptrace/`.
- **Host bindings:** `src/styles/hosts/obsidian.scss` and `Web/custom/components/styles/steptrace.scss`.
- **Usage:** `steptrace` fences in `Vault/Home/`.

Complexity charts share the Obsidian plugin entry and some tab styling, but their model, rendering, and styles are owned by `Web/custom/complexity/` and the root design contract.

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

### Canonical primitives

Reuse before creating:

- Segmented array shells and rounded endpoints.
- Canonical graph nodes, edges, arrows, and labels.
- Shared tabs, buttons, focus treatment, status, legends, and result markers.
- Trace/Watch rows and value hints.
- Lucide transport glyphs.
- Shared state and motion tokens.

Local primitives are acceptable only when the underlying concept has a distinct shape.

### State vocabulary

- **Blue:** current item, active comparison, or present focus.
- **Amber:** frontier, candidate, open set, pending scope, or held value.
- **Green:** accepted, closed, path, stored result, or success.
- **Violet:** goal, competing special state, or secondary semantic emphasis.
- **Neutral:** untouched, inactive, or contextual state.

The local legend is authoritative. Reinforce color with text, stroke, fill pattern, shape, badge, or position. Do not add a color when an existing semantic role fits.

## Visual style

### Surface and chrome

- The root visualization has no card border, fill, padding, or decorative shadow.
- The stage remains unboxed like a diagram.
- Borders separate real structure or controls; they are not decoration.
- Control surfaces may use a small radius and functional elevation.
- Do not stack glow, border, fill, and shadow on the same state.

### Typography

- Headings and interface hierarchy use `--_font-head`.
- Trace prose and labels use `--_font-body`.
- Values, indices, addresses, counters, and aligned state use `--_font-mono`.
- Do not introduce family-specific font stacks.
- Keep labels short enough to remain readable without shrinking below the shared scale.

### Spacing and geometry

- Use shared shell spacing before family-local spacing.
- Keep controls at least `44px` on compact or coarse-pointer surfaces.
- Align values and repeated structures to a visible grid.
- Reserve geometry for the largest expected normal state when that prevents frame-to-frame layout shift.
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
- Hidden tabs pause; returning to a tab preserves its step.

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
- All transport, tabs, scrubbers, detail switches, native options, and structure actions are keyboard reachable.
- Use visible focus outlines and native disabled semantics.
- Tabs use tablist/tab/tabpanel roles, roving tab index, and arrow/Home/End navigation.
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

Host-specific code may provide:

- Native loading and lifecycle integration.
- Host token bindings.
- Obsidian's native slider.
- Obsidian's Tabsdown-mounted compact detail switch; Quartz uses the shared fallback until its Tabsdown plugin exposes the same callable API.
- Quartz lazy asset loading and SPA teardown.

A host-specific difference is acceptable only when the same operation, state, result, and fallback remain available.

## Component ownership

| Concern                      | Owner                                              |
| ---------------------------- | -------------------------------------------------- |
| Registry and public API      | `src/engine.ts`, `src/registry.ts`, `src/types.ts` |
| Semantic frames              | `src/recorders.ts`, algorithm-specific recorders   |
| Shared shell and interaction | `src/mount.ts`, `src/player.ts`                    |
| Family DOM and geometry      | `src/families/`, `src/render.ts`                   |
| Shared tokens and chrome     | `src/styles/shared.scss`                           |
| Family styling               | the matching file under `src/styles/`              |
| Obsidian token binding       | `src/styles/hosts/obsidian.scss`                   |
| Quartz token binding         | `Web/custom/components/styles/steptrace.scss`      |
| Shipped order                | `src/algorithms/index.ts`                          |
| Generated artifacts          | `build.mjs`; never hand-edited                     |

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

Automated tests prove contracts; screenshots prove composition. Neither replaces keyboard and interaction checks.

## Avoid

- Per-algorithm copies of shared renderers.
- Family-specific shell, transport, tabs, or token vocabularies.
- Raw colors or font stacks where a semantic token exists.
- Viewport-width rules for component layout.
- Layout motion, auto-playing decoration, or a second competing trace panel.
- Shrinking labels or entire stages until they become unreadable.
- Generated-file edits.
- Claims of cross-host completion without checking both hosts.

## Open evidence

- [ ] Capture committed light/dark initial/active/final screenshots of the compact Trace/Watch rail below `704px`.
