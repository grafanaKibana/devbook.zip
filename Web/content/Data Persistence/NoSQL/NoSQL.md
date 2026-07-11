---
publish: true
created: 2026-07-11T21:41:52.211Z
modified: 2026-07-11T21:41:52.211Z
published: 2026-07-11T21:41:52.211Z
tags:
  - FolderNote
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: Non-relational stores trading the relational model for scalability, flexible schemas, or specialized access.
level:
  - "3"
status: Done
priority: High
---

# Intro

NoSQL is an umbrella term for non-relational data stores that trade some of the relational model (normalized tables + joins) for scalability, flexible schemas, or specialized access patterns.
You reach for it when your workload is better described as "fetch by key", "store a document", "traverse relationships", or "write lots of events" rather than "join many tables".
The hard part is not "NoSQL vs SQL" but selecting the right NoSQL family and modeling your data around your queries.

```mermaid
flowchart TD
  A[Choosing a data store] --> B{Need joins and multi-entity transactions}
  B -->|Yes| C[Relational SQL]
  B -->|No| D{Mostly fetch by id}
  D -->|Yes| E[Key-Value]
  D -->|No| F{Read and write whole aggregates}
  F -->|Yes| G[Document]
  F -->|No| H{High-write time series or wide rows}
  H -->|Yes| I[Wide-Column]
  H -->|No| J{Traverse relationships}
  J -->|Yes| K[Graph]
```

<nav style="--card-accent: 249, 115, 22;" class="folder-structure-map" aria-label="NoSQL section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="NoSQL Database Types">NoSQL Database Types</span></span></div><p class="db-card-summary">The four NoSQL families (document, key-value, wide-column, graph) and their access patterns.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Data Persistence/NoSQL/NoSQL Database Types.md" data-tooltip-position="top" aria-label="NoSQL Database Types">NoSQL Database Types</a></span></article></div><style>
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
accent uses border-radius:inherit to stay inside the rounded corners. _/
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
/_ Empty-section placeholder: reuses the full .db-card chrome (border, accent
glow gradient, background) so it reads as a regular sub-folder card. It only
differs in being non-interactive — no pointer cursor, no hover lift — with the
text centered in the card. _/
.folder-map-node-empty {
cursor: default;
}
.folder-map-node-empty:hover,
.folder-map-node-empty:focus-within {
border-color: var(--background-modifier-border, var(--lightgray, #d8dee9));
background-color: var(--background-primary, var(--light, #ffffff));
box-shadow: 0 0 0 rgba(0, 0, 0, 0);
transform: none;
}
.folder-map-node-empty:hover::before,
.folder-map-node-empty:focus-within::before { opacity: 0.78; }
/_ Higher specificity than the @container .folder-map-node .db-card-body
rules below so the placeholder stays vertically centered at every width. \*/
.folder-structure-map .folder-map-node-empty .db-card-body {
justify-content: center;
align-items: center;
text-align: center;
}
.folder-map-empty-text {
color: var(--text-normal, var(--dark, #1f2937));
font-size: 1rem;
font-weight: 400;
font-style: normal;
line-height: 1.25;
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

## How It Works

NoSQL is not one thing — it is four data models, each shaped around a different access pattern. Pick the family by how you read and write, then model the data around those queries.

Most distributed NoSQL stores sit on the AP side of the [[CAP theorem]]: they favor availability and partition tolerance and offer **eventual** (tunable) consistency rather than the strong, immediately-consistent transactions of a relational database. Modeling is query-first — you denormalize and duplicate data to make the reads you need cheap, accepting write-side duplication as the cost.

## Tradeoffs

| Dimension | Relational (SQL) | NoSQL |
| --- | --- | --- |
| Consistency | Strong, ACID transactions | Often eventual/tunable (BASE) |
| Schema | Fixed, enforced | Flexible, per-record |
| Joins | First-class | Avoided; data is denormalized |
| Scaling | Vertical first; sharding is hard | Horizontal scale-out by design |
| Best for | Complex relationships, integrity | Known access patterns, high scale |

## Questions

> [!QUESTION]- Which NoSQL family fits a user-profile API with very frequent reads by user id?
>
> - Key-value or document store, because the access pattern is dominated by point reads on a single id.
> - Use key-value if it is almost entirely get/put by id with no rich querying.
> - Use document if you read/update an aggregate (profile + preferences) and occasionally query a few indexed fields.
> - Key-value gives the simplest, fastest id lookups but no secondary queries; the document store adds query flexibility at some indexing and storage cost.

> [!QUESTION]- When is NoSQL a bad idea?
>
> - When the core use case needs relational constraints and multi-entity ACID transactions, or queries are fundamentally join-heavy.
> - Forcing those onto NoSQL pushes join logic and consistency into application code, which is error-prone.
> - Often the better move is to keep SQL and add caching, read replicas, or a denormalized read model.
> - NoSQL trades joins and strong consistency for scale and flexible schemas — if you need the former, that trade is a net loss.

> [!QUESTION]- Why does NoSQL push you toward denormalization and data duplication?
>
> - Without joins, the cheapest read is one that fetches a whole aggregate in a single hit.
> - So you model data per query, duplicating fields across documents/rows instead of normalizing them once.
> - That makes reads fast and partition-friendly but means a single logical change may touch many copies.
> - You accept write-side duplication and temporarily inconsistent copies in exchange for fast, scalable reads — the opposite of the normalized SQL bargain.

## References

- [Understand data store models](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-store-overview)
- [Relational vs NoSQL data](https://learn.microsoft.com/dotnet/architecture/cloud-native/relational-vs-nosql-data)
- [Choose a data store](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-stores-getting-started)
- [Designing Data Intensive Applications chapter on storage and retrieval](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/ch04.html)
