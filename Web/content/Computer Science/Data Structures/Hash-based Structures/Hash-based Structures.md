---
publish: true
created: 2026-07-11T21:40:26.182Z
modified: 2026-07-11T21:40:26.182Z
published: 2026-07-11T21:40:26.182Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Dictionary, hash set, and Bloom filter, trading element ordering for near-O(1) key access.
level:
  - "4"
priority: Medium
status: Not-Started
---

# Intro

Hash-based structures buy near-O(1) access by spending a hash function: the key's hash picks a bucket directly, so cost stays flat whether the collection holds 50 entries or 50 million. The guarantee is statistical, not absolute — it holds only while the hash distributes keys evenly. Skewed distribution (a `GetHashCode` returning constants, or an attacker flooding one bucket) collapses every structure in this family toward an O(n) scan, which is why the `GetHashCode`/`Equals` contract shows up as the top pitfall in each child note.

In .NET this family is `Dictionary<TKey, TValue>` and friends ([[HashMap]]), `HashSet<T>` ([[Hash Set]]), and the roll-your-own [[Bloom Filter]]. Reach for it whenever the access pattern is "by key" or "seen before?" and ordering doesn't matter — the price of hashing is losing order: enumeration order is unspecified for the map and the set, and the Bloom filter can't enumerate at all — it stores bits, not elements.

<nav style="--card-accent: 239, 68, 68;" class="folder-structure-map" aria-label="Hash-based Structures section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Bloom Filter">Bloom Filter</span></span></div><p class="db-card-summary">A probabilistic membership filter using fixed bits, with tunable false positives but never false negatives.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Hash-based Structures/Bloom Filter.md" data-tooltip-position="top" aria-label="Bloom Filter">Bloom Filter</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Hash Set">Hash Set</span></span></div><p class="db-card-summary">A hash-table-backed collection of unique values with O(1) average membership, inserts, and removals.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Hash-based Structures/Hash Set.md" data-tooltip-position="top" aria-label="Hash Set">Hash Set</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="HashMap">HashMap</span></span></div><p class="db-card-summary">Key-value pairs located by hashing in O(1) average, O(n) worst-case time.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Hash-based Structures/HashMap.md" data-tooltip-position="top" aria-label="HashMap">HashMap</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

## Choosing Within the Family

Three structures, one axis: how much you store per element.

| | [[HashMap]] | [[Hash Set]] | [[Bloom Filter]] |
|---|---|---|---|
| Answers | "What value belongs to key k?" | "Is x in the set?" | "Might x be in the set?" |
| Stores per element | Key + value | The element | Nothing — ~10 bits of a shared bit array |
| Wrong answers | Never | Never | False positives (tunable, e.g. 1% at ~10 bits/element); never false negatives |
| Delete | Yes | Yes | No (needs counting/cuckoo variants) |
| .NET | `Dictionary<TKey,TValue>` | `HashSet<T>` | None built in — `BitArray` + k hashes |

```mermaid
flowchart TD
    A{What do you need?} -->|A value back for a key| B[HashMap]
    A -->|Only membership: dedupe, visited, set algebra| C[Hash Set]
    A -->|Membership over a set too large to hold exactly| D[Bloom Filter]
```

A `Dictionary<TKey, bool>` used for membership wastes a value slot per entry and hides the intent, so prefer [[Hash Set]] there. The [[Bloom Filter]] wins when a small false-positive rate is cheaper than the memory: 100M URLs fit in ~120 MB at 1% false positives, versus many gigabytes as a `HashSet<string>`.

The Bloom filter is not a drop-in third option — it's a _pre-filter_ in front of one of the exact structures (or a disk/network lookup). "Definitely not" skips the expensive check; "maybe" falls through to the authoritative source.

## Questions

> [!QUESTION]- When does putting a Bloom filter in front of a HashMap (or disk lookup) pay off?
> When most queries are for **absent** keys and the authoritative lookup is expensive (disk read, network call, or a map too big for RAM). The filter answers "definitely not" from a few bits per element, skipping the expensive path; only "maybe" (true hits plus the ~1% false positives) pays full price. If most queries hit, the filter is pure overhead — every hit still does the real lookup.

> [!QUESTION]- What single failure mode degrades every hash-based structure at once?
> Skewed hash distribution. A weak or non-uniform `GetHashCode` degrades all three: the map and set walk O(n) bucket chains, and the Bloom filter's false-positive rate inflates as correlated hashes concentrate bits. The hash-flooding _attack_ specifically targets the bucketed structures — an attacker packs one chain with chosen keys.

## References

- [Selecting a collection class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class) — Microsoft's decision guide across hash-based and sorted collections.
- [Dictionary\<TKey,TValue> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2) — API reference; the remarks document the hash/equality contract the whole family depends on.
- [Bloom filter (Wikipedia)](https://en.wikipedia.org/wiki/Bloom_filter) — the math behind the bits-per-element vs false-positive-rate tradeoff quoted above.
