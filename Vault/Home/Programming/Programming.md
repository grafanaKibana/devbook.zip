---
icon: terminal
order: 10
color: "#f43f5e"
topic:
  - Programming
subtopic: []
summary: "Software craft focused on the .NET stack: C#, runtime, web APIs, and concurrency."
tags: [FolderNote]
publish: true
status: Creation
level:
  - "4"
priority: High
---

Programming turns an operational problem into software whose behavior can be explained, tested, and changed. The code is only one part of that result. Contracts, failure handling, runtime cost, and the path from a source change to production all shape whether the system remains useful.

This section is centered on .NET backend work while retaining the surrounding web platform. Its notes connect C# semantics and runtime behavior to API design, browser execution, internationalization, and portable WebAssembly modules. The recurring judgment is where a responsibility belongs and which cost becomes visible when that boundary is wrong.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

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

![[Programming/Programming-Programming-18120000.png|theme-aware]]

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
