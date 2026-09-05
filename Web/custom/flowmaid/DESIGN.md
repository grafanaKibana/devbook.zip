# Flowmaid

Flowmaid augments an ordinary Mermaid diagram; it does not become a diagram renderer.

## Ownership

- Mermaid owns topology, node and edge labels, geometry, routing, layout, and the native SVG. Authored labels remain meaningful without Flowmaid.
- One versionless `%% flowmaid` YAML block inside the same `mermaid` fence owns simulation inputs only.
- Flowmaid owns removable metrics, load indicators, particles, controls, diagnostics, and semantic states. Every injected SVG or DOM node is marked as Flowmaid-owned.
- Host-neutral source owns extraction, validation, graph mapping, deterministic simulation, augmentation, controls, and teardown semantics.
- Obsidian and Quartz adapters own only host loading, pairing, lifecycle, and host-native control integration. Generated artifacts and build closures stay isolated by host.

## Lifecycle and interaction

Each Mermaid-render/mount pair has one Flowmaid instance. Replacement SVGs preserve state only when their graph matches; rerenders and navigation destroy that pair's timers, listeners, observers, controls, and owned decoration without touching Mermaid's SVG.

Controls use native buttons and range inputs, or the host's native equivalent. They retain visible focus, 44px targets, value text, polite live announcements, and keyboard behavior. Pause and reset are explicit; `prefers-reduced-motion` removes particles while preserving metrics, states, controls, and meaning. Controls wrap by mounted container width rather than viewport width.

## Parity

The same fence compiles to the same program and simulation in Obsidian and Quartz. Host chrome may differ, but topology, metrics, semantic states, controls, diagnostics, reduced-motion behavior, responsive behavior, and cleanup outcomes must agree. A host-specific capability may enhance presentation only when the native fallback remains complete and the other host is not stranded.
