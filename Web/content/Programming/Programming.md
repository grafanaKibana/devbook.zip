---
publish: true
created: 2026-08-20T20:41:15.662Z
modified: 2026-08-25T13:45:27.875Z
published: 2026-08-25T13:45:27.875Z
tags:
  - FolderNote
icon: terminal
order: 10
color: "#f43f5e"
topic:
  - Programming
subtopic: []
summary: "Software craft focused on the .NET stack: C#, runtime, web APIs, and concurrency."
status: Creation
level:
  - "4"
priority: High
---

Programming turns an operational problem into software whose behavior can be explained, tested, and changed. The code is only one part of that result. Contracts, failure handling, runtime cost, and the path from a source change to production all shape whether the system remains useful.

This section is centered on .NET backend work while retaining the surrounding web platform. Its notes connect C# semantics and runtime behavior to API design, browser execution, internationalization, and portable WebAssembly modules. The recurring judgment is where a responsibility belongs and which cost becomes visible when that boundary is wrong.

<nav style="--card-accent: 244, 63, 94;" class="folder-structure-map" aria-label="Programming section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="NET">NET</span></span><span class="folder-map-node-count">32 notes</span></div><p class="db-card-summary">Microsoft's cross-platform runtime and framework for building web, cloud, desktop, and mobile software.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/NET.md" data-tooltip-position="top" aria-label="NET">NET</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="WebAssembly">WebAssembly</span></span></div><p class="db-card-summary">A validated portable instruction format with explicit host imports, linear memory, and browser or WASI embeddings.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/WebAssembly.md" data-tooltip-position="top" aria-label="WebAssembly">WebAssembly</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# API Contracts and SDK Tooling

An API is a contract between software components. For a service API, a client SDK packages the wire contract into language-specific types, authentication, serialization, helpers, documentation, examples, and sometimes build or diagnostic tools. Calling an HTTP API directly exposes the transport and wire schema. Calling it through an SDK buys ergonomics and consistency while adding package lifecycle, generated-code, and abstraction costs.

## The Same Call Two Ways

For `GET /v1/widgets/{id}`, a manual .NET client owns every HTTP detail:

```csharp
using var request = new HttpRequestMessage(HttpMethod.Get, $"v1/widgets/{id}");
request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

using HttpResponseMessage response = await httpClient.SendAsync(request, ct);
response.EnsureSuccessStatusCode();

Widget widget = (await response.Content.ReadFromJsonAsync<Widget>(ct))!;
```

```csharp
Widget widget = await widgets.GetAsync(id, cancellationToken: ct);
```

The short call did not remove HTTP. The SDK still chooses a base URL, sends credentials, serializes parameters, maps non-success responses, and deserializes the representation. Good SDKs leave escape hatches for response headers, cancellation, raw errors, custom transports, and new server fields.

![[Assets/Programming/Programming-Programming-18120000.png|theme-aware]]

The visual shows a common HTTP API and client-toolkit relationship, not a definition. APIs are not limited to HTTP, and an SDK may wrap several APIs, local libraries, emulators, generators, and tools. The contract remains the authority. The SDK is one packaged consumer surface.

## Costs and Versioning

| Concern | Direct API call | SDK |
| --- | --- | --- |
| Transport exposure | Method, URI, headers, status, and wire schema stay visible | Abstraction is easier to use but can hide useful protocol details |
| Language coupling | Any client that speaks the contract can call it | Each supported language needs design, generation, release, and support |
| Compatibility | Client chooses when to adopt contract changes | Package releases must track additive and breaking API changes |
| Retries | Caller chooses policy per operation | Central policy is consistent but unsafe if it retries non-replayable operations blindly |
| Errors | Wire-level errors are explicit | Typed errors help, but lossy mappings make diagnosis harder |
| Maintenance | Repeated auth, serialization, pagination, and error code | Generated surface drift, package security, docs, examples, and deprecations |

Version the API contract and SDK package separately. An additive server field may need no API version but still justify an SDK release with a new property. A package major version does not make a breaking wire change safe for old clients. Generated SDKs reduce mechanical work only when the OpenAPI description is accurate and generation is reproducible. Handwritten layers still earn their keep for idiomatic workflows, pagination, long-running operations, and better errors.

Put retries at the layer that understands replay safety. A generated client can retry a timed-out `GET`. It must not silently replay a charge-creation `POST` unless the API defines an idempotency contract. Retry counts, backoff, `Retry-After`, cancellation, and final failure remain observable to callers.

# References

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
