# Porting the algorithm visualizers into Quartz

Two standalone prototypes — [`sorting.html`](sorting.html) (Bubble / Insertion /
Selection) and [`graph.html`](graph.html) (BFS / DFS / Dijkstra). Each is one
dependency-free file with an inline `<style>` and `<script type="module">`, split
into two pieces: a **pure `buildFrames(input) -> Frame[]` engine** (runs the
algorithm once, emits immutable snapshot frames, no DOM) and a **`Player` + `render`
renderer** (transport that indexes into the precomputed frames). Only the renderer
touches the DOM; step-back is free because every frame is a full state snapshot.

## Attaching to `afterDOMLoaded`

The whole widget already mounts via `document.querySelectorAll('[data-algviz]')`, so
the port is mechanical:

1. **Transformer** (`Web/custom/transformers/`) — parse an in-note fenced ` ```algviz `
   block whose body is the same flat JSON as the prototype's
   `<script type="application/json" class="algviz-config">`, and emit
   `<div data-algviz><script type="application/json" class="algviz-config">…</script></div>`.
   (This is the only new authoring surface; the JSON shape is already frozen.)
2. **Component** (`Web/custom/components/`) — a `QuartzComponent` that renders nothing
   server-side and ships the prototype's `<script>` body verbatim as its
   `afterDOMLoaded` resource. That script's final line — `querySelectorAll('[data-algviz]').forEach(mount)`
   — runs on the published page and hydrates every block. Move the `<style>` into the
   component's `.css`.

`buildFrames` and the `Frame` shape move **untouched** — they are already framework-agnostic and DOM-free.

## Theming & a11y (already wired, nothing to redo)

- Colors read Quartz vars (`--secondary`, `--lightgray`, `--gray`, `--dark`, …) with
  DevBook fallbacks; dark mode honors both `prefers-color-scheme` and Quartz's
  `:root[saved-theme="dark"]`.
- `prefers-reduced-motion: reduce` drops all transitions (mirrors `site-marquee.tsx`).
- Real `<button>`/`<input>`/`<select>` controls, visible focus, `aria-label`s, and an
  `aria-live` region narrating each step in words. Every state is paired with a
  letter/shape/text cue, not color alone.
