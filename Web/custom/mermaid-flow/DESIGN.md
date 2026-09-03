# Mermaid Flow design

Mermaid Flow is an additive, removable layer over native Mermaid. The repository-wide visual contract remains in [`../../../DESIGN.md`](../../../DESIGN.md).

## Durable contract

- Mermaid alone owns topology, nodes, label structure, geometry, connector routing, and layout. The plugin updates only an authored final-span metric placeholder and never rewrites native IDs, paths, transforms, styles, or markers.
- One marked `mermaid` fence pairs only with the immediately adjacent strict JSON `mermaid-flow` fence carrying the same ID. Pairing is local and ambiguity fails closed.
- Production behavior lives under `src/`. Undocumented Mermaid SVG knowledge stays inside `MermaidSvgAdapter`; host code owns only discovery, readiness, navigation, and teardown.
- Motion follows plugin-owned copies of native paths. Metrics stay inside their authored nodes, queue load bars are removable SVG children inside those nodes, semantic states use reversible namespaced attributes, and controls use host-native form elements where available.
- Each mount owns its listeners, observers, focus restoration, replacement handling, and idempotent teardown. The Quartz host sanitizes only configured popup clones. No body-wide observer or global SVG animation pause is allowed.
- Obsidian and Quartz consume the same config, state, adapter, renderer, styles, and mount lifecycle. Their six generated projections are build output, not source.
- Reduced motion removes continuous particle travel without removing the diagram, metrics, states, or controls. Keyboard access, visible focus, readable diagnostics, and touch-sized controls remain required.
- Obsidian range controls use the same compact native `SliderComponent` row as StepTrace; Quartz reuses its 2px rail, 12px accent thumb, and focus ring. The primary range occupies the left side of the control row; reset and runtime motion actions stay grouped on the right and wrap below it at narrow container widths.
- Queue simulations integrate transformed arrivals against fixed per-second capacity. They may write only the queue and consumer metrics and load rows declared in their configuration; Pause freezes queue time, Reset clears accumulated values, and teardown cancels the timer without restarting unchanged particle animations.

## Scope

V1 visualizes authored system-design scenarios and local control changes. Bindings allow only bounded affine numeric transforms with optional rounding; live data, telemetry, polling, WebSockets, persistence, arbitrary formulas, Mermaid relayout, and a StepTrace-style timeline are out of scope.
