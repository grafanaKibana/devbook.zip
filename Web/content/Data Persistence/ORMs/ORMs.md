---
publish: true
created: 2026-10-17T18:11:50.075Z
modified: 2026-10-17T18:11:50.075Z
published: 2026-10-17T18:11:50.075Z
tags:
  - FolderNote
topic:
  - Data Persistence
subtopic:
  - ORMs
summary: Mappers that translate object graphs and LINQ into SQL, a leaky abstraction to understand.
priority: High
level:
  - "4"
status: Creation
qard-deck: Data Persistence
qard-topic: ORMs/ORMs
flashcard_uid: e49dfe63
---

An Object-Relational Mapper connects an object model to a relational database. It translates queries, materializes rows as objects, tracks changes, and turns those changes into SQL. This removes repetitive data-access code. It does not remove the database's query, transaction, and schema rules.

The SQL and round trips that EF Core generates reveal the actual database work. One LINQ expression may become a selective query, an unsupported translation, or a row-multiplying join. Loading two sibling collections in one query can multiply their rows before materialization. The application still owns query plans, indexes, transaction scope, and migration safety.

<nav style="--card-accent: 249, 115, 22;" class="folder-structure-map" aria-label="ORMs section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Entity Framework">Entity Framework</span></span></div><p class="db-card-summary">Microsoft's .NET ORM: maps C# classes to tables, translates LINQ, and manages migrations.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Data Persistence/ORMs/Entity Framework.md" data-tooltip-position="top" aria-label="Entity Framework">Entity Framework</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid var(--interactive-accent, var(--secondary, #437100)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Questions

<!-- qard-id: d86af7cc-5d66-4a64-a922-47d16ca7ce63 -->

> [!qard]- When is raw SQL a better boundary than an ORM query?
> Raw SQL is a better boundary when a query needs something the ORM cannot express, such as a provider-specific database feature. It is also a better boundary when the SQL the ORM generates has a measured performance problem that cannot be fixed predictably through the ORM. Raw SQL is not automatically faster. The reason to use it is a missing capability or a measured plan problem.
>
> Moving a query into SQL text brings its own obligations:
>
> - **Data values:** values are passed as database parameters, never concatenated into the SQL text. In EF Core, `FromSql` turns interpolated values into parameters (EF Core 7.0 and later; earlier versions use `FromSqlInterpolated`). A `FromSqlRaw` string built by concatenating values reintroduces SQL injection risk.
> - **Identifiers and SQL fragments:** databases do not accept column names, table names or other parts of the SQL structure as parameters. Any dynamic piece is checked against an allow-list of known values before it enters the SQL text.
> - **Provider dependence:** the SQL is written for one database engine, so its tests run against that same engine.
>
> [EF Core: SQL queries](https://learn.microsoft.com/en-us/ef/core/querying/sql-queries)

<!-- qard-id: 254a62e1-7311-4a83-8029-4ff00d16f442 -->

> [!qard]- Why can eager-loading sibling collections be expensive?
> Loading two collections of the same parent in one SQL query joins both of them to the parent. Each parent row is then repeated for every combination of its matching children, so the row count multiplies instead of adding up. EF Core's documentation calls this a cartesian explosion.
>
> For example, `Include(b => b.Posts).Include(b => b.Contributors)` for one blog with 10 posts and 10 contributors returns 10 × 10 = 100 rows for that blog. Each row repeats the blog's columns together with one post and one contributor. The database, the network and EF Core all process the extra rows.
>
> Two mitigations trade this cost for others:
>
> - **Split query** (`AsSplitQuery()`): EF Core loads the blogs and each collection with separate SQL commands, returning about 1 + 10 + 10 rows. The cost is extra round trips. The commands also run at different moments, so an update between them can produce a combined result that never existed at a single point in time. Running them in a serializable or snapshot transaction gives one consistent view, at the cost of that isolation level's own overhead.
> - **Projection:** selecting only the needed columns makes each duplicated row smaller. It does not reduce the number of rows the join produces.
>
> [EF Core: Single vs. split queries](https://learn.microsoft.com/en-us/ef/core/querying/single-split-queries)

# References

- [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html)
