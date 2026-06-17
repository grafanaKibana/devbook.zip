# Creation Notes — Content Gap Audit

> Per-note review of **missing useful information** (substance, mechanics, internals, advanced/interview-grade detail) across all **118 `status: Creation` content notes**. Structural section completeness is assumed and not reported here unless a section is empty/stub.
>
> Scope decided with user: **all 118 content notes**, depth = **gaps + internals/advanced**, **gap report first → fill after approval**.
>
> Legend per note: **[tier]** nearly / mid / far · **[pri]** priority. Each bullet = a concrete piece of missing useful info to add.

---

## Status

| Area | Notes | Reviewed |
|------|------:|:--------:|
| 01 Programming | 32 | ✅ |
| 02 Computer Science | 12 | — |
| 03 Data Persistence | 6 | — |
| 04 Networks | 11 | — |
| 05 Architecture | 29 | — |
| 06 Development Practices | 11 | — |
| 07 Security | 10 | — |
| 08 SDLC | 2 | — |
| 09 DevOps | 4 | — |
| 10 Cloud | 1 | — |

---
## 01 Programming

### Concurrency & Parallelism

**Mutex.md** · nearly · High
- `Mutex` is **reentrant/recursive** for the owning thread — N× `WaitOne` requires N× `ReleaseMutex`. Important behavioral fact, currently absent.
- **`WaitHandle.WaitAll` / `WaitAny`** to acquire/await multiple handles atomically (a clean way to avoid lock-ordering deadlocks).
- Cross-platform reality: on Linux/macOS named mutexes are process-lifetime only and not kernel-persisted; behavior diverges from Windows. Ties to the `WaitHandle`/`SafeWaitHandle` base.

**Async Await.md** · nearly · High
- **`IAsyncEnumerable<T>` / `await foreach` / `await using` + `IAsyncDisposable`** (async streams) — entirely missing, a core modern async surface.
- **`ExecutionContext` vs `SynchronizationContext`**: `AsyncLocal<T>` still flows across awaits even with `ConfigureAwait(false)` (corrects the common belief that CA(false) drops ambient state).
- **.NET 8 `ConfigureAwait(ConfigureAwaitOptions)`** (`SuppressThrowing`, `ForceYielding`).
- **State-machine allocation cost**: struct stays on the stack until first suspension, then boxes to heap; `[AsyncMethodBuilder]` / pooled builders / returning `ValueTask` to cut allocations.
- Exception mechanics: `ExceptionDispatchInfo` preserves the original stack across `await`; only the first of multiple exceptions is rethrown.

**Tasks.md** · nearly · High
- **Hot vs cold tasks** and the **`Task.Factory.StartNew` foot-guns**: not async-aware (needs `.Unwrap()`), defaults to `TaskScheduler.Current` (not `.Default`), `LongRunning` flag — and why `Task.Run` is the safe default.
- **`Task.WhenAny` in a loop is O(n²)** and orphans unobserved tasks; **.NET 9 `Task.WhenEach`** is the streaming-completion fix.
- Cached singletons: `Task.CompletedTask`, `Task.FromResult/FromException/FromCanceled`.
- `TaskScheduler` customization; cross-link to `Parallel.ForEachAsync` for bounded fan-out.

**Deadlocks.md** · nearly · High
- **ThreadPool-starvation deadlock** under ASP.NET Core: the note implies console/ASP.NET Core "merely block" safely, but sync-over-async can exhaust the pool and hang the app even without a `SynchronizationContext`. Important correction.
- **`SemaphoreSlim` is NOT reentrant** → recursive acquire self-deadlocks (the async mutual-exclusion gotcha that pairs with the `lock`-can't-span-await advice already present).
- **Livelock** and **lock convoy** as distinct pathologies worth naming.
- DB-level deadlocks (deadlock victim, lock escalation) cross-link; anti-patterns `lock(this)` / `lock(typeof(X))` / locking interned strings.

**Parallelism.md** · nearly · High
- Prose fix: "There **is** two patterns" → grammar.
- **`Partitioner` / custom partitioning** (range vs dynamic/chunked) for load balancing skewed workloads.
- **False sharing / cache-line contention** as a concrete cause of negative scaling (note mentions cache misses but not false sharing / padding).
- **`Parallel.For` with thread-local state** (`localInit`/`localFinally`) for lock-free accumulation; **TPL Dataflow** and **SIMD/`Vector<T>`** as other parallelism axes.

**Semaphore.md** · nearly · High
- **`SemaphoreSlim` is not reentrant** (state it explicitly alongside "no ownership tracking").
- **`WaitAsync` allocates** an async waiter under contention — hot-path consideration; pairing with `Channel<T>` for true FIFO queueing (already hinted).
- Named cross-process `Semaphore` is Windows-only in practice (parity caveat with Mutex).

**ThreadPool.md** · nearly · High
- **Modern .NET (6+) changes**: improved hill-climbing + blocking detection, `DOTNET_ThreadPool_*` / `DOTNET_TieredPGO` env knobs; nuance the flat "1 thread / 500ms" figure.
- **I/O completion on Linux**: the "IOCP thread" model is Windows; Linux uses an epoll-based socket engine — worth noting for cross-platform readers.
- **`IThreadPoolWorkItem` + `UnsafeQueueUserWorkItem`** for allocation-free scheduling; `TaskCreationOptions.LongRunning` spins a dedicated thread (Thread vs pool decision).

**CancellationToken.md** · nearly · High
- **`CancellationToken.Register` callback** semantics + disposing the returned `CancellationTokenRegistration`, and the **deadlock/reentrancy risk** when a registered callback runs synchronously inside `Cancel()` while a lock is held.
- **`CancellationTokenSource.CancelAsync` (.NET 8)** to avoid running callbacks on the canceller's thread; **`TryReset` (.NET 6)** for pooling a CTS.
- **Distinguishing timeout from caller-cancellation** (inspect `token.IsCancellationRequested`; the timeout→`TimeoutException` pattern; .NET 8 `Task.WaitAsync(timeout)`).

### Runtime

**Common Language Runtime.md** · mid · High
- **Tiered compilation internals** in the body (not just a Q): Tier 0 → Tier 1, **OSR (On-Stack Replacement)** for hot loops, **Dynamic PGO** (default in .NET 8).
- **Assembly loading depth**: `AssemblyLoadContext` (collectible/unloadable contexts, plugin isolation), strong naming, probing.
- **Type-system internals**: MethodTable/EEClass, object header + sync-block index, generics instantiation (shared reference-type code vs per-value-type code).
- **CLR memory model**: `volatile`, `Interlocked`, memory barriers, and the two-pass SEH exception model (filter pass then unwind).
- Runtime landscape: CoreCLR vs Mono vs NativeAOT runtime; cross-link to GC/ThreadPool.

**Garbage Collector.md** · mid · High *(already very strong)*
- **Region-based heap (.NET 7+)**: the note describes the **segment** model (`VirtualAlloc`); modern GC uses **regions**. Should be updated/qualified.
- **Card tables / write barriers**: how cross-generational (Gen2→Gen0) references are tracked so ephemeral collections stay cheap — a core internal currently absent.
- **`GCLatencyMode` enumeration + `GC.TryStartNoGCRegion`**, and **DATAS** (Dynamic Adaptation To Application Sizes, .NET 8/9 Server GC).
- **Frozen/NonGC heap (.NET 8)** alongside the already-covered POH; boxing as a hidden allocation source.
- Cleanup: several MS Learn links use the `ru-ru` locale path.

**Memory Leaks.md** · mid · High
- **Broken code snippets to fix**: `My Class(...)`, `publicSomeClass()`, `publicMyClass()`, `public int BUFFER_SIZE` — multiple malformed examples.
- Missing modern leak sources: **`HttpClient` socket exhaustion / `IHttpClientFactory`**, **DI captive dependencies (scoped captured in singleton)**, **`ArrayPool`/`MemoryPool` buffers never returned**, **`AsyncLocal`/`ThreadLocal` retention**, **un-completing `Task` holding continuations**.
- **Diagnosis depth**: `dotnet-gcdump` + two-snapshot delta comparison, `dotnet-trace`, `ConditionalWeakTable` for non-retaining attached state.
- Structural note (assumed, but it's this note's main "unfinished" signal): uses **Links** not **References** and has no **Pitfalls** section.

### ASP.NET Web API

**Middlewares.md** · nearly · High
- **Branching primitives**: `Map` / `MapWhen` / `UseWhen` and terminal `Run` — pipeline branching is absent.
- **Factory-based `IMiddleware`** (per-request, DI-scoped) vs convention-based middleware whose constructor is effectively a **singleton** — so scoped deps must be parameters of `InvokeAsync`, not the constructor. Key correctness point.
- **Endpoint routing**: middleware placed between `UseRouting` and endpoint execution can read the selected endpoint's metadata via `HttpContext.GetEndpoint()`.

**Dependency Injection.md** · nearly · Medium
- **Keyed services (.NET 8)**: `AddKeyedSingleton` + `[FromKeyedServices]` — modern surface, missing.
- **Disposal semantics**: the container disposes the `IDisposable`/`IAsyncDisposable` Transient/Scoped instances it creates — another leak/lifetime vector (don't resolve disposables you also retain).
- **Open-generic registration** in the body (`AddScoped(typeof(IRepo<>), typeof(Repo<>))`); `TryAdd*` / `TryAddEnumerable`, decorators (Scrutor), `ActivatorUtilities.CreateInstance`.

**Filters.md** · nearly · Medium
- Make explicit the **`ServiceFilter` vs `TypeFilter` vs `IFilterFactory`** distinction (TypeFilter needs no DI registration; ServiceFilter does).
- Note that **`[Authorize]` is itself an authorization filter**, and precisely how `Order` interacts with global/controller/action scope.
- Caution against implementing both sync and async interface of a pair; short-circuit pattern = set `context.Result`.

**Authentication.md** · nearly · Medium
- **`IClaimsTransformation`** (augment claims post-auth) and **`JwtBearerEvents`** (`OnTokenValidated` / `OnAuthenticationFailed`) for custom pipelines.
- **Claim-type mapping gotcha**: `JwtSecurityTokenHandler` rewrites short JWT claim names to the long `ClaimTypes.*` URIs unless `MapInboundClaims = false`; note the newer `JsonWebTokenHandler`.
- **OIDC / external & enterprise**: `AddOpenIdConnect`, social logins, `Microsoft.Identity.Web` for Entra ID — only JWT + cookie are covered today.

**Authorization.md** · nearly · Medium
- **`FallbackPolicy` / `DefaultPolicy`** for secure-by-default (require auth everywhere unless `[AllowAnonymous]`).
- **Multiple handlers for one requirement** (OR across handlers — any `Succeed` wins), complementing the existing "stacked attributes = AND".
- **`IAuthorizationMiddlewareResultHandler`** to customize 403/forbidden output; `RequireAssertion` for inline predicates; Minimal-API `RequireAuthorization()`.

**CORS.md** · nearly · Medium
- **`Access-Control-Expose-Headers`** — so client JS can read custom response headers; common real-world omission.
- Spell out **simple vs preflighted** criteria (methods, header allowlist, content-type triggers).
- **`Vary: Origin` caching** pitfall and reinforce CORS is *not* a server-side authorization boundary.

### Other / Standard

**NET Standart.md** · nearly · Medium
- **How the contract resolves at runtime**: `netstandard.dll` façade + type-forwarding to the real runtime assemblies; the **2.0↔2.1 API gap** specifics (`Span<T>` native in 2.1, backported to 2.0 via `System.Memory`).
- **Polyfill ecosystem**: `Microsoft.Bcl.*`, `PolySharp`, and `<LangVersion>` being independent of TFM.
- One line on **why it ended**: .NET 5 unified TFMs and OS-specific TFMs (`net8.0-android` etc.).

**Other/OWIN.md** · nearly · Low
- The actual **AppFunc contract** `Func<IDictionary<string,object>, Task>` beneath `IAppBuilder` — worth showing once.
- Modern incremental-migration tooling: **`System.Web.Adapters`** and **YARP** (referenced obliquely; name them).
- Katana security middleware (`Microsoft.Owin.Security.*` OAuth/JWT) as the historical auth story. (Low priority overall.)

**Other/SignalR.md** · nearly · Low
- **`IHubContext<T>`** to push from controllers/background services (outside a hub) — common and currently missing.
- **Streaming hub methods** (`IAsyncEnumerable`/`ChannelReader`) and **server-to-client `InvokeAsync` client results (.NET 7)**.
- **Connection lifecycle**: `OnConnectedAsync`/`OnDisconnectedAsync`, automatic reconnect, and message-delivery guarantees (at-most-once, no built-in durability); Redis backplane specifics + transport fallback chain (WS → SSE → long polling) and sticky-session requirement.

### Fundamentals

**Generics.md** · nearly · Medium
- **Generic math** — `INumber<T>` + static-abstract interface members (.NET 7+); a major modern capability, absent.
- **Static members are per-closed-type** (`Foo<int>` vs `Foo<string>` have independent statics) — classic gotcha.
- **Reflection over generics** (`MakeGenericType`/`MakeGenericMethod`), inference rules, and newer constraints (`where T : struct, Enum`, `allows ref struct` in C# 13).
- Balance the perf story with **generic code-size bloat** from value-type specialization.

**Reflection.md** · nearly · Medium
- **How to build compiled delegates** (`Expression` trees, `MethodInfo.CreateDelegate`) — the note recommends them but never shows them.
- **`System.Reflection.Emit` / `DynamicMethod`** for runtime codegen (and its AOT-hostility).
- **`UnsafeAccessor` (.NET 8)** as the AOT-safe way to reach private members, vs `BindingFlags.NonPublic`.

**Exception Handling.md** · nearly · Medium
- **Custom exception design**: deriving from `Exception`, constructor conventions, when a custom type earns its keep.
- **`AggregateException` + `Flatten`/`Handle`** (Task/parallel) — absent despite the concurrency notes leaning on it.
- **Global/last-chance handlers**: `AppDomain.UnhandledException`, `TaskScheduler.UnobservedTaskException`, first-chance exceptions.
- **`ExceptionDispatchInfo.Capture().Throw()`** to rethrow across boundaries preserving the stack.

**Foreach.md** · nearly · High
- **Enumerator disposal**: `foreach` disposes an `IDisposable` enumerator in a `finally` — central to iterator cleanup; currently unstated.
- **Struct enumerators / `Span<T>` foreach** are non-allocating, but a struct enumerator **boxes** when accessed via `IEnumerator` — ties to the existing perf tradeoff.
- **`yield` restrictions**: no `yield` inside `try`-with-`catch` (finally only); deferred exceptions surface at enumeration, not at call — classic bug source.

**Methods.md** · nearly · Medium
- **`out` parameters** are missing entirely (ref/in/params covered) — including `out var` and the `TryParse` pattern.
- **`ref return` / `ref readonly return` / `ref` locals**, **local functions vs lambdas** (allocation/capture), **extension methods**, expression-bodied members.
- **Overload resolution** ("betterness", named + optional arg interplay) and method-group→delegate caching (.NET 7).

**Namespaces.md** · nearly · Medium *(thin note)*
- **`using` aliases**, **`using static`**, and **C# 12 alias-any-type** (`using Point = (int X, int Y);`).
- **`extern alias`** explained as a feature (only appears in a pitfall today).
- **`<RootNamespace>` / `<ImplicitUsings>`**, folder conventions, nested-namespace name resolution (most-nested wins).

### Fundamentals / Types

**Classes.md** · nearly · Medium *(very strong already)*
- **Primary constructors for classes (C# 12)** — major modern addition, absent.
- **`required` members (C# 11)** + `init` accessors + object initializers; full access-modifier matrix (`private protected`, `file`-scoped types).
- Constructor chaining (`: this()`), static-ctor vs field-init order (`beforefieldinit`).

**Structs.md** · nearly · Medium *(strong)*
- **Boxing mechanics**: enumerate the implicit-boxing triggers (interface cast, `object`, non-generic LINQ, `params object[]`, interpolation).
- **Memory layout**: `[StructLayout]`, padding/alignment — and *why* the 16-byte heuristic exists.
- **`ref` fields / `scoped` (C# 11)** inside ref structs; primary constructors for structs (C# 12).

**Strings.md** · nearly · Medium *(thinner than siblings)*
- **Low-alloc surface**: `ReadOnlySpan<char>`, `string.Create`, interpolated-string handlers (C# 10), `ArrayPool<char>` — central to a perf-themed note, missing.
- **Encoding/correctness**: UTF-16 internal representation, `char` = UTF-16 code unit, surrogate pairs, `Rune`, grapheme clusters (`StringInfo`) — important correctness gap.
- **Interning depth**: `string.Intern`/`IsInterned`, interned strings live for the process lifetime (a leak vector); `Normalize` for Unicode.

**Records.md** · nearly · Medium *(excellent)*
- Clarify vs **C# 12 primary constructors on plain classes/structs** (records generate properties; class primary-ctor params are merely captured) — likely reader confusion point.
- **`required` on records**, validation/throwing in init bodies, and System.Text.Json constructor-binding behavior.

**Events.md** · nearly · Medium *(strong)*
- **Field-like event thread-safety**: the compiler-generated `add`/`remove` use a lock-free `Interlocked.CompareExchange`, so subscribe/unsubscribe is thread-safe by default — a widely-misunderstood point worth stating (contrast with the custom-lock example shown).
- **`async void` event handlers** problem (unobservable exceptions) — cross-link to Async Await.

**Delegates.md** · nearly · Medium *(strong)*
- **Delegates are immutable**; `+=`/`-=` allocate a new multicast instance each time — perf nuance.
- **Static lambdas (C# 9)** and **method-group conversion caching (.NET 7)** to avoid captures/allocations.
- **Function pointers `delegate*` (C# 9)** as the zero-alloc alternative; `DynamicInvoke` is a slow reflection path; open vs closed delegates.

