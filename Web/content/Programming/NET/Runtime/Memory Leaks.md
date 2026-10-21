---
publish: true
created: 2026-10-21T13:29:32.447Z
modified: 2026-10-21T13:29:32.447Z
published: 2026-10-21T13:29:32.447Z
topic:
  - Programming
subtopic:
  - NET
summary: Useless objects still reachable from GC roots, plus unfreed unmanaged memory and handles.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/Runtime/Memory Leaks
flashcard_uid: e5a2c1b5
---

In managed code, a memory leak is usually a lifetime bug: an object has stopped being useful, but a path from a GC root still reaches it. The collector is working correctly. It cannot infer that a reachable object is logically dead. Native allocations and operating-system handles form a second category because the GC does not release them directly.

A leak often appears as retained memory that rises across comparable workload cycles, but process RSS alone is not proof. Heap expansion, allocator high-water marks, caches, JIT data, and native libraries can keep committed memory high without an ever-growing set of useless objects. A container kill or `OutOfMemoryException` is a possible end state, not part of the definition.

Diagnosis starts by separating managed retention from native or handle growth. For managed memory, the next step compares heap snapshots under similar load, identifies types whose retained count or size grows, and inspects a representative instance with `gcroot <address>`. The useful result is not merely the largest type. It is the reference path that explains why an unwanted instance remains reachable.

# Event Handlers

A .NET event normally stores its subscribers as delegates. An instance-method delegate references its target object, so a long-lived publisher can retain a subscriber beyond the subscriber's intended lifetime.

The following subscription creates that reference path:

```csharp
public class MyClass
{
	public MyClass(WiFiManager wiFiManager)
	{
		wiFiManager.WiFiSignalChanged += OnWiFiChanged;
	}

	private void OnWiFiChanged(object sender, WifiEventArgs e)
	{
		// do something useful
  }
}
```

This becomes a leak when `wiFiManager` outlives the useful lifetime of `MyClass` and the subscription remains installed. If both objects have the same lifetime, the reference is harmless. The mechanism and several mitigation choices are illustrated in [5 Techniques to Avoid Memory Leaks When Using Events in C# .NET That You Should Know](https://michaelscodingspot.com/5-techniques-to-avoid-memory-leaks-by-events-in-c-net-you-should-know/).

The preferred fix is explicit lifetime ownership: the code that subscribes also unsubscribes at a deterministic boundary. The [mitigation catalog](https://michaelscodingspot.com/5-techniques-to-avoid-memory-leaks-by-events-in-c-net-you-should-know/) includes self-removing handlers for deliberately one-shot subscriptions. A [weak event pattern](https://docs.microsoft.com/en-us/dotnet/desktop/wpf/advanced/weak-event-patterns?view=netframeworkdesktop-4.8) is useful when publisher and subscriber lifetimes cannot be coordinated, especially in UI infrastructure. A capture-free static or anonymous handler avoids retaining a target object, but an anonymous handler is difficult to remove unless its delegate is stored.

# Capturing Class Members in Anonymous Methods

Closures create a similar reference path outside events. When a lambda reads an instance member, the compiler-generated delegate usually reaches the containing instance.

```csharp
public class MyClass
{
	private JobQueue _jobQueue;
	private int _id;

	public MyClass(JobQueue jobQueue)
	{
		_jobQueue = jobQueue;
	}

	public void Foo()
	{
		_jobQueue.EnqueueJob(() =>
		{
			Logger.Log($"Executing job with ID {_id}");
			// do useful work
		});
	}
}
```

Here the queue retains the delegate, and the delegate retains the `MyClass` instance because `_id` is accessed through `this`. If the queued job lives longer than the logical operation, the whole instance remains reachable.

Capturing a value snapshot can narrow that graph:

```csharp
public class MyClass
{
	public MyClass(JobQueue jobQueue)
	{
		_jobQueue = jobQueue;
	}

	private JobQueue _jobQueue;
	private int _id;

	public void Foo()
	{
		var localId = _id;
		_jobQueue.EnqueueJob(() =>
		{
			Logger.Log($"Executing job with ID {localId}");
			// do something
		});
	}
}
```

Because `localId` is an `int`, this version captures only the value. The change is not purely mechanical: it records `_id` at enqueue time rather than reading its later value at execution time. Copying a reference-type member may still retain a large object graph. [This discussion](https://habr.com/ru/post/589005/#comment_23709379) shows the original retention issue in context.

# Static Variables

Static state is not inherently a leak, but it often gives an accidental reference application-wide lifetime. The collector begins with GC roots and marks everything reachable from them. Unreachable objects can then be reclaimed. [This GC walkthrough](https://habr.com/ru/post/590475/) gives a visual account of that traversal.

Representative roots include references in thread stacks and registers, static fields, GC handles, finalization infrastructure, and interop roots such as managed objects exposed through [COM interop](https://docs.microsoft.com/en-us/dotnet/standard/native-interop/cominterop). The exact root set is a runtime implementation detail, but the diagnostic question is stable: which root owns the path to the unwanted object?

A static collection can retain every object ever added to it:

```csharp
public class MyClass
{
	static List<MyClass> _instances = new List<MyClass>();
	public MyClass()
	{
		_instances.Add(this);
	}
}
```

Each `MyClass` instance remains reachable while the static field and its containing load context remain alive, unless an entry is removed or the collection is cleared. The problem is the unbounded ownership policy, not the `static` keyword by itself.

# Caching

A cache deliberately retains data, so the dividing line between optimization and leak is its admission and eviction policy. A cache keyed by unbounded input can grow with every distinct request:

```csharp
public class ProfilePicExtractor
{
	private Dictionary<int, byte[]> PictureCache { get;set; } = new Dictionary<int, byte[]>();

	public byte[] GetProfilePicByID(int id)
	{
		// Ideally, a synchronization mechanism is used here,
		// but it is omitted to keep the example simple
		if (!PictureCache.ContainsKey(id))
		{
			var picture = GetPictureFromDatabase(id);
			PictureCache[id] = picture;
		}
		return PictureCache[id];
	}

	private byte[] GetPictureFromDatabase(int id)
  {
		// ...
	}
}
```

The example trades database calls for retained image buffers and supplies no limit. A production cache needs a bound derived from memory budget, an eviction rule, and usually expiry for stale data. Concurrency and duplicate-load behavior also need an explicit policy.

`WeakReference<T>` is not a general eviction strategy: collection depends on GC pressure rather than business freshness or a capacity target. It can suit optional, cheaply recomputed data where disappearance at any collection is acceptable. Most service caches need deterministic size and lifetime controls instead.

# Incorrect Data Binding in WPF

WPF binding can extend a source object's lifetime when change tracking falls back to mechanisms that retain the source strongly. For a changing CLR property, implementing `INotifyPropertyChanged` is the normal notification path. Dependency properties provide the framework-native alternative. The exact retention path depends on the binding source, property descriptor, binding mode, and lifetime of the target. [This investigation](https://stackoverflow.com/a/18543350/1229063) demonstrates one such path.

The snippets below focus on the notification shape and omit surrounding view-model boilerplate:

```xml
<UserControl x:Class="WpfApp.MyControl"
		xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
		xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
	<TextBlock Text="{Binding SomeText}"></TextBlock>
</UserControl>
```

A plain CLR property provides no `INotifyPropertyChanged` notification path:

```csharp
public class MyViewModel
{
	public string _someText = "memory leak";

	public string SomeText
	{
		get { return _someText; }
		set { _someText = value; }
	}
}
```

Implementing `INotifyPropertyChanged` lets WPF subscribe through the intended notification mechanism:

```csharp
public class MyViewModel : INotifyPropertyChanged
{
public string _someText = "not a memory leak";

public string SomeText
	{
		get { return _someText; }
		set
		{
			_someText =value;
			PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof (SomeText)));
		}
	}
}
```

The interface controls how WPF observes source changes. Raising `PropertyChanged` remains necessary for correct updates. `OneTime` binding avoids ongoing source-change observation after initialization, while `OneWay` and `TwoWay` require a suitable source notification mechanism. This is a lifetime-sensitive rule, not a promise that every non-notifying property leaks or every notifying source is leak-free.

Dynamic collection views have a related contract. A collection that changes after binding should implement `INotifyCollectionChanged`. `ObservableCollection<T>` is the standard implementation. That requirement primarily governs update semantics. Any leak claim still needs a root path showing which binding component retains which source.

# Long-Lived Threads and Timers

An active thread can keep objects reachable through its stack, and scheduled callbacks can retain their delegate targets. Timers are a common example:

```csharp
public class MyClass
{
	public MyClass()
	{
		Timer timer = new Timer(HandleTick);
		timer.Change(TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(5));
	}

	private void HandleTick(object? state) { /* ... */ }
}
```

A live `System.Threading.Timer` schedules callbacks on thread-pool threads. It does not own a dedicated thread. The local-only timer in this sample is not a stable leak because an active timer does not keep itself alive. Once no reference reaches the timer, the GC may collect it and callbacks may stop.

A retention leak needs a longer-lived root that reaches the timer, whose callback delegate then reaches `MyClass`. Keeping the timer in a field supports reliable operation and deterministic disposal, but the field alone is not proof of a leak: an otherwise unreachable owner-timer cycle is still collectible. The actual fault is a timer retained beyond the owner's intended lifetime without cancellation or disposal.

# Unreleased Unmanaged Memory

Native memory and operating-system handles have explicit ownership rules. Losing the last managed wrapper does not necessarily release the underlying resource unless that wrapper implements reliable cleanup.

```csharp
public class SomeClass
{
	private IntPtr _buffer;

	public SomeClass()
	{
		_buffer = Marshal.AllocHGlobal(1000);
	}

	// do something, but do not free the memory
}
```

`Marshal.AllocHGlobal` allocates native memory ([API documentation](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.marshal.allochglobal?view=net-5.0)). The matching ownership operation is `Marshal.FreeHGlobal`. Without it, collection of `SomeClass` does not free the native block.

An `IDisposable` boundary makes cleanup explicit. The next snippet shows the basic idea, not a complete production implementation:

```csharp
public class SomeClass : IDisposable
{
	private IntPtr _buffer;

	public SomeClass()
	{
		_buffer = Marshal.AllocHGlobal(1000);
		// do something, but do not free the memory
	}

	public void Dispose() => Marshal.FreeHGlobal(_buffer);
}
```

The sample is not idempotent: calling `Dispose` twice can free the same pointer twice. A real owner must guard repeated disposal, clear the pointer, and normally wrap operating-system handles in `SafeHandle`. Native allocators can also suffer [fragmentation](https://stackoverflow.com/questions/3770457/what-is-memory-fragmentation). Unlike compacting managed generations, native allocations generally cannot be relocated transparently while callers hold raw addresses.

# Dispose Not Called

Implementing `IDisposable` defines a cleanup operation. It does not schedule that operation. C# `using` ties disposal to a lexical scope:

```csharp
using (var instance = new MyClass())
{
	// ...
}
```

Semantically, `using` guarantees a `finally`-based disposal path. The following code shows the essential shape. Exact lowering varies with the declaration form and value type:

```csharp
MyClass instance = new MyClass();
try
{
	// ...
}
finally
{
if (instance != null)
	{
		((IDisposable)instance).Dispose();
	}
}
```

Normal control flow and exceptions both pass through the cleanup path. Abrupt process termination remains outside that guarantee.

Types that own disposable fields or native resources follow the [Dispose implementation pattern](https://docs.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose). The example below demonstrates the traditional form for direct native-memory ownership:

```csharp
public class MyClass : IDisposable
{
	private IntPtr _bufferPtr;
	private const int BufferSize = 1024 * 1024; // 1 MB
	private bool _disposed = false;
	
	public MyClass()
	{
		_bufferPtr =  Marshal.AllocHGlobal(BufferSize);
	}

	protected virtual void Dispose(bool disposing)
	{
		if (_disposed)
		return;
		
		if (disposing)
		{
			// clean up managed objects being used
		}

		// clean up unmanaged objects
		Marshal.FreeHGlobal(_bufferPtr);
		_disposed = true;
	}

	public void Dispose()
	{
		Dispose(true);
		GC.SuppressFinalize(this);
	}

	~MyClass()
	{
		Dispose(false);
	}
}
```

When an unreachable instance reaches finalization, its finalizer can release the native buffer if explicit disposal was missed. Finalization is delayed, carries GC cost, and is not a process-shutdown guarantee. The [finalizer guidance](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers) therefore recommends avoiding custom finalizers when `SafeHandle` can own the resource. Explicit disposal suppresses the now-unneeded finalizer.

A finalizer cannot repair a managed retention bug. If a root still reaches the object, it never becomes eligible for finalization, so its native resource remains open as well.

# Modern Lifetime Traps

Current .NET applications add several lifetime traps that may present as memory growth or adjacent resource exhaustion:

- **`HttpClient` connection exhaustion** — creating and disposing a client for every request can churn connection pools and exhaust ephemeral ports because underlying TCP connections are not released immediately. This is resource exhaustion rather than a managed-memory leak. The remedy is either a correctly configured `IHttpClientFactory` client or a long-lived client with an appropriate handler lifetime.
- **DI captive dependencies** — a singleton that captures a scoped service extends that service to singleton lifetime. The built-in container can reject this when scope validation is enabled. Disposable transient or scoped services resolved from the root container are also retained for later disposal. A singleton that must perform scoped work uses an explicit scope created with `IServiceScopeFactory`. Related note: [[Programming/NET/ASP NET Web API/Dependency Injection|Dependency Injection]].
- **Pooled-buffer ownership errors** — a rented `ArrayPool<T>` or `MemoryPool<T>` buffer must be returned or disposed according to its pool contract. Failing to return it defeats reuse and increases allocation pressure. Continuing to use it after return violates ownership and can corrupt another operation's data.
- **Ambient-state retention** — `AsyncLocal<T>` values flow with `ExecutionContext`, so a captured context can retain a value beyond one logical operation. `ThreadLocal<T>` values are tied to participating threads and should be disposed with their owner. Large graphs should not be stored in either without a clear lifetime boundary.
- **Incomplete asynchronous operations** — an incomplete `TaskCompletionSource` does not root itself, but any long-lived owner that retains its task, continuations, or captured state can keep the entire operation graph alive. Cancellation and timeout paths must complete the ownership protocol.
- **`ConditionalWeakTable<TKey,TValue>`** — this is designed for metadata whose lifetime follows its key without keeping that key alive. Its ephemeron semantics also handle a value that refers back to the key. It is a specialized association mechanism, not a replacement for explicit cache bounds.

# Diagnosing in Production

- **`dotnet-gcdump collect`** induces a generation 2 collection and reconstructs a managed heap graph from GC events. It is lighter than a full process dump but still adds target-process work and may need substantial buffers. Meaningful comparisons use snapshots taken at equivalent workload points. Growth is a lead, not proof, until a root path explains it.
- **`dotnet-counters monitor System.Runtime`** provides a low-overhead trend view of selected runtime memory and GC counters. Counter names vary across tool/runtime generations, so the counter set comes from the installed runtime's published list, and alerting relies on workload-adjusted trends rather than one universal threshold.
- **`dotnet-trace`** records allocation and runtime events when the question is where pressure originates. `gcroot <address>` in `dotnet-dump analyze` answers the different question of why a particular managed instance is still reachable.

# Tradeoffs

| Decision | Option A | Option B | When A | When B |
| --- | --- | --- | --- | --- |
| **Event subscription model** | Strong events (standard C# events) | Weak events (`WeakEventManager`) | Publisher and subscriber share a lifetime, or ownership guarantees unsubscription | A long-lived publisher serves transient subscribers whose disposal cannot be coordinated reliably |
| **Caching strategy** | Simple dictionary with a proven finite keyspace | Cache with capacity and eviction | The keyspace and retained value size have a defensible hard bound | Input can grow, entries become stale, or memory budget must be enforced |
| **Native resource cleanup** | `IDisposable` over a `SafeHandle` or other finalizable wrapper | Custom finalizer plus `IDisposable` | A suitable wrapper already owns the native handle. This is the normal choice | The type directly owns a native resource for which no safe wrapper is available |
| **Leak detection approach** | Heap snapshots and root analysis | Continuous counters and traces | Explaining which objects are retained and by what root | Detecting trends, correlating growth with workload, and choosing when to capture deeper evidence |

The governing rule is ownership, not syntax. Each subscription, cache entry, timer, pooled buffer, task, disposable object, and native handle needs an owner and an end-of-life action. `using` is appropriate when the current scope owns a disposable instance. DI-managed and shared objects follow the lifetime of their actual owner. Cache limits should control the dimension that can grow, while expiry is added only when staleness is part of the policy.

# Questions

<!-- qard-id: fd0bb1da-7714-4709-b6a3-752467733b71 -->

> [!qard]- Can a .NET application leak memory even though it has garbage collection?
> Yes. The garbage collector reclaims a managed object only when the object is no longer reachable, and it cannot tell that a reachable object is no longer needed. Resources outside the managed heap can also leak.
>
> - **Managed retention:** an object stays alive while a chain of references from a GC root, such as a static field or a local variable on a thread's stack, still reaches it. An unbounded cache held in a static field keeps its entries reachable. So does a long-lived publisher whose event still holds a subscriber's handler. The GC is working correctly here: it never reclaims data the program can still reach.
> - **Unmanaged resources:** native memory and operating-system resources, such as files or network connections, must be released explicitly, and the GC does not know how to release them. If neither the owner's `Dispose` call nor a finalizable wrapper such as `SafeHandle` releases them, they stay allocated even after the managed wrapper object is collected.
>
> Rising memory alone does not prove a leak, because heap growth, caches and allocators can keep memory high for legitimate reasons. A leak is established by the reference path that keeps unwanted objects alive, or by a native allocation that is never released.
>
> [Microsoft: Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) · [Microsoft: Implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose) · [Microsoft: Debug a memory leak in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-memory-leak)

> [!qard]- How can a suspected memory leak in a running .NET application be diagnosed?
> Diagnosis first confirms a sustained growth trend, then follows the kind of memory that is growing until evidence explains why it is retained. For managed memory, that evidence is the reference path from a GC root to objects that are no longer needed.
>
> 1. **Confirm a trend:** runtime counters, for example from `dotnet-counters`, are compared across comparable workload cycles and at comparable points relative to collections. A single high reading or growth during warm-up is not yet evidence of a leak.
> 2. **Locate the growth:** counters indicate where to look, not the cause. Heap-size readings depend on the measurement. On .NET 9 and later, the runtime's GC heap-size metric, `dotnet.gc.last_collection.heap.size`, includes fragmentation. For apps on .NET 8 and earlier, `dotnet-counters` falls back to legacy EventCounters, whose `gc-heap-size` counter is based on `GC.GetTotalMemory` and excludes fragmentation. GC committed memory also includes capacity ready for future allocations. Whichever measurement is used, a rising heap metric is a lead toward managed retention rather than proof of it. Process memory that rises without matching growth in GC committed memory is a lead toward memory outside the managed heap, such as native allocations or handles.
> 3. **Managed growth, compare heap contents:** dumps taken at equivalent workload points, for example with `dotnet-dump collect`, show which types grow in count or total size. In `dotnet-dump analyze`, `dumpheap -stat` summarizes the heap by type.
> 4. **Managed growth, find the retaining path:** for a representative instance of a growing type, `gcroot <address>` lists the chain of references from a GC root, such as a static field, to that object. The path names the holder, such as a cache without eviction or an event subscription that is never removed. The fix bounds or ends that ownership.
> 5. **Native or handle growth:** this branch needs evidence from its own layer, such as a native allocation or an operating-system handle that is never released. `gcroot` explains only managed reachability, so it cannot establish this cause.
>
> The type that uses the most memory is only a lead until a retaining path explains it. A retaining path proves that an object is reachable. The retention is a leak only when the object is no longer useful.
>
> [Microsoft: Debug a memory leak in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-memory-leak) · [Microsoft: .NET runtime metrics](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/built-in-metrics-runtime) · [Microsoft: Well-known EventCounters in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/available-counters) · [Microsoft: GC.GetTotalMemory](https://learn.microsoft.com/en-us/dotnet/api/system.gc.gettotalmemory) · [Microsoft: dotnet-counters](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-counters) · [Microsoft: Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)

<!-- qard-id: 1bdc896e-a0a2-42f6-94be-29c7f63cf28b -->

> [!qard]- Why is `using` needed when .NET already has garbage collection?
> The garbage collector frees managed memory when allocations or low system memory trigger a collection, not when code has finished with an object. Many objects also hold resources other than managed memory, such as files, network connections or database connections. Those resources are limited, and the GC does not know how to release them. At best, a finalizer releases them at an unpredictable time later, so a resource can stay open long after its last use or be exhausted.
>
> `using` makes the release deterministic. The compiler wraps the scope in `try`/`finally` and calls `Dispose` on the `IDisposable` object in the `finally` block. The resource is therefore released as soon as control leaves the scope, whether normally or through an exception. `await using` does the same for `IAsyncDisposable` by awaiting `DisposeAsync`.
>
> ```csharp
> using (var stream = File.OpenRead(path))
> {
>     // reads from stream
> }
> // stream.Dispose() has run here, even if reading threw
> ```
>
> Disposal releases the resource, not the object's managed memory. The GC still reclaims that memory later, once the object is unreachable.
>
> [Microsoft: using statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/using) · [Microsoft: Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) · [Microsoft: Implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)

<!-- qard-id: 5e311685-41d1-44ae-baf9-516faaecaf4d -->

> [!qard]- How do `IDisposable` and a finalizer differ?
> `Dispose` is deterministic cleanup that the owning code calls when it has finished with a resource. A finalizer is an optional fallback that the garbage collector runs at an unpredictable time after it finds the object unreachable, so that cleanup can still happen if `Dispose` was never called. `IDisposable` itself requires only the `Dispose` method, not a finalizer.
>
> | Aspect | `IDisposable.Dispose` | Finalizer |
> |---|---|---|
> | Trigger | Owning code calls it, directly or through `using`. | The GC queues it to run after finding the object unreachable. |
> | Timing | Runs at a known point, so scarce resources are released promptly. | Runs at an unpredictable time after the object becomes unreachable. .NET 5 and later do not run finalizers when the application exits, so it may never run. |
> | What it can safely clean up | Managed `IDisposable` objects the type owns, plus its unmanaged resources. | Only unmanaged resources the object owns directly. Other managed objects may already have been finalized, because finalization order is undefined. |
> | Cost | An ordinary method call. | Each finalizable object adds an entry that the GC must process in its finalization queue. |
>
> When a type defines its own finalizer, the two work together. `Dispose` performs the cleanup and calls `GC.SuppressFinalize`, so the finalizer runs only when disposal was missed. Most types can avoid an own-type finalizer altogether. A type whose native handle is wrapped in a `SafeHandle` needs no finalizer of its own, because `SafeHandle` already provides finalization for that handle. A custom finalizer is justified only for an unmanaged resource that the type owns directly and that no safe wrapper can hold.
>
> [Microsoft: Implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose) · [Microsoft: Finalizers](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers) · [Microsoft: SafeHandle](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.safehandle)

<!-- qard-id: 56cd4094-8fef-44ac-9e9c-50873f2193f8 -->

> [!qard]- How does the .NET dispose pattern work?
> The pattern routes both cleanup paths through one method, `Dispose(bool disposing)`. Its argument tells it whether owning code called `Dispose` or a finalizer is running.
>
> - **Explicit path:** owning code calls the public, non-virtual `Dispose()`, which calls `Dispose(true)` and then `GC.SuppressFinalize(this)`. With `disposing` set to `true`, the method releases both the managed `IDisposable` objects the type owns and its unmanaged resources. Suppressing finalization tells the GC that cleanup is already done, so it does not run the finalizer.
> - **Finalizer path:** if `Dispose` was never called and the type has a finalizer, the finalizer calls `Dispose(false)`. That call releases only unmanaged resources the object owns directly. It does not touch other managed objects, because finalization order is undefined and they may already have been finalized.
> - **Repeated calls:** `Dispose(bool)` records that disposal has happened and returns early on later calls. Calling `Dispose` more than once is therefore harmless and never releases the same resource twice.
> - **Inheritance:** in an unsealed type, `Dispose(bool)` is `protected virtual`. A derived class overrides it to release its own resources and then calls `base.Dispose(disposing)`.
>
> ```csharp
> public class NativeBuffer : IDisposable
> {
>     private IntPtr _buffer = Marshal.AllocHGlobal(1024);
>     private bool _disposed;
>
>     public void Dispose()
>     {
>         Dispose(true);
>         GC.SuppressFinalize(this);
>     }
>
>     protected virtual void Dispose(bool disposing)
>     {
>         if (_disposed) return;
>         if (disposing)
>         {
>             // Owned managed IDisposable fields are disposed here.
>         }
>         Marshal.FreeHGlobal(_buffer);
>         _buffer = IntPtr.Zero;
>         _disposed = true;
>     }
>
>     ~NativeBuffer() => Dispose(false);
> }
> ```
>
> This type needs a finalizer only because it holds a raw native pointer directly. When a `SafeHandle` owns the native resource, the type implements `Dispose()` and `Dispose(bool)` without a finalizer, and the `SafeHandle` supplies the finalization fallback.
>
> [Microsoft: Implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose) · [Microsoft: Finalizers](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers)

# References

- [Diagnose memory leaks in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-memory-leak)
