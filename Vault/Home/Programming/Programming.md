---
icon: code-2
order: 10
color: "#f43f5e"
topic:
  - Programming
subtopic: []
summary: "Software craft focused on the .NET stack: C#, runtime, web APIs, and concurrency."
tags:
  - FolderNote
publish: true
status: Creation
level:
  - "4"
priority: High
---

Programming is the discipline of translating problems into working software. At the level covered here, that means choosing the right abstractions, managing complexity, and writing code that other engineers can maintain and extend. The focus in this section is on the .NET ecosystem — C# language features, runtime behavior, web API development, and concurrency patterns — because that is where most production backend work happens for .NET-focused teams.

Good programming judgment means knowing when not to use a pattern, understanding runtime costs such as allocations, GC pressure, and synchronization, and choosing maintainable code over unnecessary cleverness.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

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

![[System Design 101/70ce86f7d519d885776ab629c8ed3f676ad57604ce7042d824d8cd5ecd924444.png]]

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
