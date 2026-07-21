---
publish: true
created: 2026-07-18T14:02:44.128Z
modified: 2026-07-21T14:44:49.344Z
published: 2026-07-21T14:44:49.344Z
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

Programming is the discipline of translating problems into working software. At the level covered here, that means choosing the right abstractions, managing complexity, and writing code that other engineers can maintain and extend. The focus in this section is on the .NET ecosystem — C# language features, runtime behavior, web API development, and concurrency patterns — because that is where most production backend work happens for .NET-focused teams.

Good programming judgment means knowing when not to use a pattern, understanding runtime costs such as allocations, GC pressure, and synchronization, and choosing maintainable code over unnecessary cleverness.

<nav style="--card-accent: 244, 63, 94;" class="folder-structure-map" aria-label="Programming section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="NET">NET</span></span><span class="folder-map-node-count">34 notes</span></div><p class="db-card-summary">Microsoft's cross-platform runtime and framework for building web, cloud, desktop, and mobile software.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/NET.md" data-tooltip-position="top" aria-label="NET">NET</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Browser Rendering">Browser Rendering</span></span></div><p class="db-card-summary">How a browser turns streamed HTML, CSS, and JavaScript into frames, and where rendering jank begins.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/Browser Rendering.md" data-tooltip-position="top" aria-label="Browser Rendering">Browser Rendering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Internationalization">Internationalization</span></span></div><p class="db-card-summary">Separating locale-sensitive presentation from language, time, money, addresses, and jurisdictional business rules.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/Internationalization.md" data-tooltip-position="top" aria-label="Internationalization">Internationalization</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="WebAssembly">WebAssembly</span></span></div><p class="db-card-summary">A validated portable instruction format with explicit host imports, linear memory, and browser or WASI embeddings.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/WebAssembly.md" data-tooltip-position="top" aria-label="WebAssembly">WebAssembly</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# API contracts and SDK tooling

An API is a contract between software components. For a service API, a client SDK packages the wire contract into language-specific types, authentication, serialization, helpers, documentation, examples, and sometimes build or diagnostic tools. Calling an HTTP API directly exposes the transport and wire schema. Calling it through an SDK buys ergonomics and consistency while adding package lifecycle, generated-code, and abstraction costs.

## The same call two ways

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

![[Assets/Programming/Programming-Programming-18120000.png]]

The visual shows a common HTTP API and client-toolkit relationship, not a definition. APIs are not limited to HTTP, and an SDK may wrap several APIs, local libraries, emulators, generators, and tools. The contract remains the authority; the SDK is one packaged consumer surface.

## Costs and versioning

| Concern | Direct API call | SDK |
| --- | --- | --- |
| Transport exposure | Method, URI, headers, status, and wire schema stay visible | Abstraction is easier to use but can hide useful protocol details |
| Language coupling | Any client that speaks the contract can call it | Each supported language needs design, generation, release, and support |
| Compatibility | Client chooses when to adopt contract changes | Package releases must track additive and breaking API changes |
| Retries | Caller chooses policy per operation | Central policy is consistent but unsafe if it retries non-replayable operations blindly |
| Errors | Wire-level errors are explicit | Typed errors help, but lossy mappings make diagnosis harder |
| Maintenance | Repeated auth, serialization, pagination, and error code | Generated surface drift, package security, docs, examples, and deprecations |

Version the API contract and SDK package separately. An additive server field may need no API version but still justify an SDK release with a new property. A package major version does not make a breaking wire change safe for old clients. Generated SDKs reduce mechanical work only when the OpenAPI description is accurate and generation is reproducible; handwritten layers still earn their keep for idiomatic workflows, pagination, long-running operations, and better errors.

Put retries at the layer that understands replay safety. A generated client can retry a timed-out `GET`; it must not silently replay a charge-creation `POST` unless the API defines an idempotency contract. Keep retry counts, backoff, `Retry-After`, cancellation, and final failure observable to callers.

# References

- [.NET documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/) — entry point for the .NET platform covered in this section.
- [C# language reference (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/) — authoritative reference for the C# language, runtime behavior, and features.
- [The Pragmatic Programmer (Hunt & Thomas)](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — practitioner guide to programming craft and engineering judgment.
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) — normative machine-readable description of operations, payloads, parameters, and security.
- [Kiota design overview (Microsoft Learn)](https://learn.microsoft.com/en-us/openapi/kiota/design) — how OpenAPI drives generated language-specific request builders.
- [Guidelines for using HttpClient (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines) — connection pooling, lifetime, and resilience behavior.
- [API versus SDK (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/api-vs-sdk.md) — provenance for the comparison, narrowed for HTTP and maintenance tradeoffs.
