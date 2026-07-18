---
topic:
  - Programming
subtopic: []
summary: "A validated portable instruction format with explicit host imports, linear memory, and browser or WASI embeddings."
level:
  - "3"
priority: Medium
status: Creation
publish: true
---

# Intro

WebAssembly (Wasm) is a compact binary instruction format for a typed stack machine. A host validates a module, compiles or interprets it for the current CPU, supplies explicit imports, and invokes its exports. Browsers are one host; a Wasm module has no built-in DOM, files, sockets, clock, or process access. Reach for it when an existing Rust/C/C++ computation must run in a browser, a plugin needs a narrow sandboxed boundary, or one portable module must run under multiple capable hosts.

## Module and Host Boundary

A module contains functions, tables, globals, and optionally one or more linear memories. Validation proves that instruction types and stack effects are well formed before execution. It does not prove the algorithm correct, nor does it stop unsafe source code from corrupting data inside its own linear-memory region.

Imports are the authority boundary. In a browser, JavaScript can supply logging, time, or DOM adapters; the module cannot call those facilities unless the host imports them. Exports expose Wasm functions, memory, tables, or globals to the host.

```javascript
const imports = {
  host: {
    log: value => console.log(value)
  }
};

const { instance } = await WebAssembly.instantiateStreaming(
  fetch("/math.wasm"),
  imports
);

const answer = instance.exports.add(20, 22);
```

Numbers cross this boundary directly. Strings, arrays, and objects usually require an ABI: the caller writes bytes into linear memory and passes an address and length, or generated bindings do that work. Frequent fine-grained crossings can cost more than one coarse call over a larger buffer.

![[System Design 101/c453dd7d84930727fb29087b06076ccef14c3c0fdac74a3de99e7f7ed0df995f.jpg]]

The image captures the compile-and-host relationship but oversimplifies both sides. Modern JavaScript engines also interpret and optimize/JIT code; C++ and Rust are compiled into Wasm instructions, not browser-native machine code shipped unchanged. Wasm can approach native throughput for suitable compute kernels, but it is not automatically faster than JavaScript.

## Browser Wasm versus WASI

The WebAssembly core specification defines execution, not operating-system APIs. The browser embedding adds JavaScript and Web APIs under browser security rules. WASI is a separate family of standard host interfaces for non-browser and component-model workloads. A WASI runtime grants capabilities such as selected directories, streams, clocks, or network access; the module begins without ambient authority and receives only what the host grants.

That sandbox is a boundary, not a complete security argument. Host imports can be overpowered, denial of service still needs resource limits, and modules share whatever data the embedding exposes.

## Transfer, Startup, and .NET

Wasm's binary format supports streaming validation and compilation, but total startup includes network transfer, decompression, compilation, module instantiation, data initialization, and language-runtime startup. Small JavaScript can beat a large Wasm toolchain output before the first useful result. Measure cold start and transferred bytes as well as steady-state CPU time.

Blazor WebAssembly downloads the app, its dependencies, and a .NET runtime into the browser. Razor components and their event handling execute on the browser UI thread, so CPU-heavy work on that path can freeze updates. In .NET 10, a Blazor WebAssembly app can boot a separate .NET runtime in a Web Worker and invoke exported C# methods there, moving suitable computation off the UI thread. That worker has no direct DOM access, adds startup and message-serialization cost, and does not make the component model implicitly multithreaded. Publish compression, trimming, lazy loading, and optional ahead-of-time compilation trade build size and startup against runtime throughput.

## References

- [WebAssembly Core Specification](https://webassembly.github.io/spec/core/) — normative validation, execution, module, instruction, binary, and text formats.
- [WebAssembly JavaScript Interface](https://webassembly.github.io/spec/js-api/) — normative JavaScript objects, compilation, instantiation, imports, exports, and memory integration.
- [WASI introduction](https://wasi.dev/) — standards-track host APIs and the capability-based sandbox outside the browser embedding.
- [Host and deploy Blazor WebAssembly (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/?view=aspnetcore-10.0) — .NET runtime download, browser execution, compression, and deployment mechanics.
- [Blazor with .NET on Web Workers (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/blazor/blazor-with-dotnet-on-web-workers?view=aspnetcore-10.0) — official .NET 10 guidance for moving CPU-intensive C# work to a background Web Worker, including the runtime and interop boundary.
- [Can C, C++, or Rust run in a web browser? (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/is-it-possible-to-run-c-c%2B%2B-or-rust-on-a-web-browser.md) — provenance for the comparison visual; the note corrects its JavaScript and “native code” shorthand.
