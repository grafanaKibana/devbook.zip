---
name: excalidraw-authoring
description: Create or modify .excalidraw and .excalidraw.md system-flow diagrams with consistent grouping, nodes, connectors, text binding, and line styles. Use whenever Codex edits an Excalidraw drawing; do not use for raster images or unrelated diagram formats.
---

# Excalidraw authoring

Apply these rules to every Excalidraw element touched during the task while preserving the user's existing work.

## Ownership

- Treat elements created in the current chat as Codex-created and make them comply before completion.
- Treat everything created outside the current chat as user-created. Do not add provenance or ownership metadata.
- Complete requested edits to pre-existing content without restyling it automatically. If touched content remains noncompliant, leave it unchanged and give a concrete, non-blocking suggestion in the final response.
- Do not audit or restyle untouched pre-existing content.

## Visual rules

- Keep groups close around their contents and avoid large unused internal areas.
- Prefer straight two-point arrows. Use at most one bend only to avoid another node or route a return path. Never use staircase routing.
- Fit nodes to their content. Keep widths sufficiently consistent within aligned rows without forcing equal heights.
- Put group labels in quiet space, usually top-left.
- Bind node-related text to its shape.
- Use square corners.
- Use 1.25px node borders and 1.5px arrows.
- Use dashed instance boundaries and dashed infrastructure connections.

## Verification

- Visually review grouping, whitespace, routing, node fit and alignment, label placement, and text placement before completion.
- For task-known current-chat elements, inspect the serialized scene when available: node `roundness` is `null`, node `strokeWidth` is `1.25`, arrow `strokeWidth` is `1.5`, related text has the correct `containerId` and reciprocal text binding, and known instance boundaries and infrastructure connections use `strokeStyle: "dashed"`.
- Use task context and IDs created during the chat to determine semantic roles. Never infer node, boundary, connection, text intent, or provenance from geometry or proximity.
- Preserve the drawing's existing serialization format; do not rewrite compressed Markdown merely to make verification easier.
- Fix violations in current-chat creations. Report remaining issues in touched pre-existing elements only as suggestions unless the user requested or approved the style change.

## Evolving the rules

- Follow task-specific styling requests for the current work.
- When a requested general styling convention appears reusable, propose the exact addition to this skill in the final response.
- Update this skill only after explicit user approval; never silently add inferred visual rules.
