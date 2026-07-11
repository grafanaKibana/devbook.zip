---
publish: true
created: 2026-07-11T21:42:02.226Z
modified: 2026-07-11T21:42:02.226Z
published: 2026-07-11T21:42:02.226Z
tags:
  - FolderNote
topic:
  - Programming
subtopic:
  - NET
summary: "The .NET CLR execution engine: JIT compilation, garbage collection, type safety, and threading."
status: Creation
priority: High
level:
  - "4"
---

# Intro

The .NET runtime (Common Language Runtime / CLR) is the execution engine that makes managed code work: it compiles IL to native code via JIT, manages memory through garbage collection, enforces type safety, and handles threading. Understanding the runtime matters for any senior .NET developer because most production performance issues — latency spikes, memory growth, thread pool starvation — are runtime problems, not application logic bugs.

Three areas are covered here: the **CLR itself** (how code gets compiled and executed), **garbage collection** (how memory is managed, GC modes, and tuning levers), and **memory leaks** (how managed code still leaks and how to diagnose it). The common thread is that the runtime automates most things, but the edge cases where automation breaks down are exactly the scenarios that cause production incidents.

A practical example: your API handles 1000 req/s fine in testing. In production under sustained load, P99 latency spikes to 2 seconds every 30 seconds. The cause is Gen2 GC pauses from large object heap allocations you never noticed in dev. Diagnosing this requires understanding GC generations, the large object heap threshold, and how to interpret GC event traces.

<nav style="--card-accent: 244, 63, 94;" class="folder-structure-map" aria-label="Runtime section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Common Language Runtime">Common Language Runtime</span></span></div><p class="db-card-summary">.NET's execution engine compiling IL to native code and managing memory and types.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/Runtime/Common Language Runtime.md" data-tooltip-position="top" aria-label="Common Language Runtime">Common Language Runtime</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Garbage Collector">Garbage Collector</span></span></div><p class="db-card-summary">The CLR's automatic memory manager reclaiming unreachable objects generationally.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/Runtime/Garbage Collector.md" data-tooltip-position="top" aria-label="Garbage Collector">Garbage Collector</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Memory Leaks">Memory Leaks</span></span></div><p class="db-card-summary">Useless objects still reachable from GC roots, plus unfreed unmanaged memory and handles.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/Runtime/Memory Leaks.md" data-tooltip-position="top" aria-label="Memory Leaks">Memory Leaks</a></span></article></div><style>
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--card-accent, 125, 125, 125));
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}

.folder-structure-map {
\--card-accent: 16, 185, 129;
\--map-gap: 0.75rem;
width: 100%;
box-sizing: border-box;
margin: 0.5rem 0 0.75rem;
container-name: folder-map;
container-type: inline-size;
}
.folder-map-children {
/\* Flex (not grid) so each card sizes to its own title — a long title widens
its card and pushes to another row instead of being truncated, and rows
grow to fill the width with no empty tracks when there are few cards. _/
display: flex;
flex-wrap: wrap;
gap: var(--map-gap);
}
.folder-map-node {
/_ No overflow:hidden on a flex item whose min-width:auto collapses to 0: that
would let the card shrink below its title + note-count and clip them.
Without it the card's min size is its content, so long titles widen the card
(and wrap to another row) instead of being cut off. The shared ::before
accent uses border-radius:inherit to stay inside the rounded corners. \*/
flex: 1 1 12rem;
min-height: 2.75rem;
\--db-card-pad: 0.5rem 0.75rem;
}
.folder-map-node .db-card-body {
min-height: 2.75rem;
justify-content: center;
}
.folder-map-node-heading {
display: flex;
align-items: center;
justify-content: space-between;
gap: 0.75rem;
}
.folder-map-node-title-group {
display: flex;
align-items: center;
gap: 0.5rem;
}
.folder-map-node .db-card-title {
white-space: nowrap;
}
.folder-map-node-count {
display: block;
flex: 0 0 auto;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
white-space: nowrap;
}
.folder-map-node .db-card-summary {
display: none;
}
.folder-map-empty {
margin: 1rem 0 0;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
.folder-map-node {
min-height: 6rem;
\--db-card-pad: 0.85rem 0.9rem;
}
.folder-map-node .db-card-body {
min-height: 6rem;
justify-content: flex-start;
}
.folder-map-node .db-card-summary { display: block; }
}
@container folder-map (min-width: 64rem) {
.folder-map-node,
.folder-map-node .db-card-body { min-height: 6.75rem; }
} </style></nav>

## Questions

> [!QUESTION]- What does the CLR do when your application starts, and why does startup behavior matter?
> The CLR loads assemblies, verifies IL safety, JIT-compiles methods on first call (or uses tiered compilation to optimize hot paths later), sets up the GC, and initializes the thread pool.
> This matters because startup latency, JIT warmup effects, and thread pool sizing all affect real-world behavior — especially for serverless and containerized deployments with cold starts.

> [!QUESTION]- How does garbage collection affect production latency, and what are the main tuning levers?
> GC pauses application threads (in workstation GC) or background-collects (in server GC) to reclaim memory. Gen0/Gen1 collections are fast; Gen2 collections are expensive and can cause visible latency spikes.
> Main tuning levers: choose Server vs Workstation GC mode, minimize large object heap allocations (objects over 85KB), reduce Gen2 promotion rates by controlling object lifetimes, and use `GC.TryStartNoGCRegion` for latency-critical paths.
> Always measure with GC event traces (dotnet-counters, PerfView) before tuning — premature GC optimization often makes things worse.

> [!QUESTION]- Can managed code have memory leaks, and what are the common causes?
> Yes. Common causes: event handler subscriptions never unsubscribed, static collections that grow indefinitely, closures capturing references unexpectedly, and finalizer queue stalls blocking reclamation.
> These are not OS-level leaks but logical leaks — the GC cannot collect objects that are still reachable through a live reference chain, even if the application no longer needs them.

## References

- [.NET runtime overview (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/clr) — CLR architecture and execution model.
- [Garbage collection fundamentals (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) — GC generations, modes, and behavior.
- [Memory management and garbage collection (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/) — Full GC documentation hub.
- [Diagnosing memory leaks with dotnet-dump (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-memory-leak) — Step-by-step leak diagnosis.
- [Pro .NET Memory Management (Konrad Kokosa)](https://prodotnetmemory.com/) — Practitioner deep-dive into .NET memory internals and GC tuning.
