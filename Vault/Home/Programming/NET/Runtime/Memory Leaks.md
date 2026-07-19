---
topic:
  - Programming
subtopic:
  - NET
summary: "Useless objects still reachable from GC roots, plus unfreed unmanaged memory and handles."
level:
  - "4"
priority: High
status: Ready to Repeat

publish: true
---

In garbage-collected environments, "memory leak" means objects that are no longer useful but remain reachable from GC roots — so the collector never reclaims them. The process RSS grows monotonically until an `OutOfMemoryException` crashes the service or the container hits its memory limit and gets OOM-killed. In production, this typically manifests as a slow climb in memory usage over days, with periodic restarts masking the underlying issue until traffic increases and the leak accelerates.

There are two categories. **Managed leaks**: objects held alive by forgotten references (event subscriptions, static caches, closures capturing `this`). The GC works correctly — it just can't collect objects that are technically still reachable. **Unmanaged leaks**: native memory allocated via `Marshal.AllocHGlobal`, P/Invoke, or wrapped OS handles that are never freed, because the GC doesn't manage memory outside the managed heap.

The diagnostic workflow: capture a memory dump (`dotnet-dump collect`), load it in Visual Studio or `dotnet-dump analyze`, and run `dumpheap -stat` to find the largest retained types. For event-related leaks, `gcroot <address>` traces the reference chain from a leaked object back to its GC root — the root is where the fix goes.

Below are 8 of the most common causes. The first 6 are managed leaks; the remaining 2 are unmanaged.

# Event handlers

Events in .NET are notorious for causing memory leaks. The reason is simple: after you subscribe to an event on some object, it will keep a reference to your class where the handler is defined (unless you used an anonymous method that does not capture any members of the class).

Look at this example:

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

So if `wifiManager` is defined outside of `MyClass`, you have a memory leak. `wifiManager` references the `MyClass` instance, which now will never be collected by the garbage collector.

Events really can be dangerous, and there is a dedicated article about this: [5 Techniques to Avoid Memory Leaks When Using Events in C# .NET That You Should Know](https://michaelscodingspot.com/5-techniques-to-avoid-memory-leaks-by-events-in-c-net-you-should-know/).

What can you do in this situation? The [article](https://michaelscodingspot.com/5-techniques-to-avoid-memory-leaks-by-events-in-c-net-you-should-know/) above describes several good practices to avoid memory leaks. Without going into details, here are some of them:

1. Always unsubscribe from events.
2. Use weak event patterns ([Weak Event Pattern](https://docs.microsoft.com/en-us/dotnet/desktop/wpf/advanced/weak-event-patterns?view=netframeworkdesktop-4.8)).
3. If possible, subscribe using anonymous methods that do not capture other members of the class.

# Capturing class members in anonymous methods

It is fairly obvious that using an instance method as an event handler creates a reference from the handler to the object that owns the method. What is much less obvious is that the same thing happens when a class member is captured in an anonymous method.

Here is an example:

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

In this example, the class member `_id` is **captured** by the anonymous method and, as a result, the class instance ends up holding a reference to itself. This means that as long as `_jobQueue` exists and references the anonymous delegate, it [`_jobQueue`] also references the `MyClass` instance.

The fix here is simple: use a local variable instead:

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

If you copy the value into a local variable, the class member will not be captured and you will prevent the leak.

***Note:** if the root cause of the leak in this case is not entirely clear, take a look at [this comment](https://habr.com/ru/post/589005/#comment_23709379).*

# Static variables

Some developers consider static variables to be a bad practice. Nevertheless, when talking about memory leaks, they are important to mention.

Before getting to the point of this section, let's briefly talk about how the .NET garbage collector works. The basic idea is that the GC walks all **root objects** (**GC Roots**, **roots**) and marks them as objects that will **not** be collected. Then it walks all objects referenced by those roots and marks them as well, and so on. Eventually, the GC collects everything that remains unmarked ([a great article about the garbage collector](https://habr.com/ru/post/590475/)).

What is considered a **root object**?

1. The stacks of executing threads.
2. Static variables.
3. Managed objects passed to COM objects via [Interop](https://docs.microsoft.com/en-us/dotnet/standard/native-interop/cominterop).

This means that static variables, and everything they reference, will never be reclaimed by the garbage collector. Here is an example:

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

If you write the code above for some reason, any `MyClass` instance will remain in memory forever, causing a leak.

# Caching

Developers love caching. After all, why perform an operation twice if you can do it once and store the result, right?

That is true, but if you cache without bounds, you will eventually exhaust all available memory. Look at this example:

```csharp
public class ProfilePicExtractor
{
	private Dictionary<int, byte[]> PictureCache { get;set; } = new Dictionary<int, byte[]>();

	public byte[] GetProfilePicByID(int id)
	{
		// Ideally, you should use a synchronization mechanism here,
		// but we omit it to keep the example simple
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

Caching in this example helps reduce expensive database calls, but the cost is memory bloat.

To address this, you can use the following practices:

1. Remove items from the cache that have not been used for some time.
2. Limit the cache size.
3. Use `WeakReference` to store cached objects. `WeakReference` allows the garbage collector to clean up the cache on its own, which in some cases may not be a bad idea. The GC will promote objects that are still in use to older generations so they stay in memory longer. This means frequently used objects will remain in the cache longer, while unused ones will be collected without your explicit involvement.

# Incorrect data binding in WPF

Data binding in WPF can also cause memory leaks. The main rule to prevent leaks is to always use `DependencyObject` or `INotifyPropertyChanged`. If you do not, WPF creates a so-called strong reference to the object, causing a memory leak ([more detailed explanation](https://stackoverflow.com/a/18543350/1229063)).

Example:

```xml
<UserControl x:Class="WpfApp.MyControl"
		xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
		xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
	<TextBlock Text="{Binding SomeText}"></TextBlock>
</UserControl>
```

The class below will remain in memory forever:

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

But this class will not cause a leak:

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

In fact, it does not even matter whether you raise `PropertyChanged` or not; the key point is that the class implements `INotifyPropertyChanged`. This tells the WPF infrastructure not to create a strong reference.

*Memory leaks occur only when the binding mode is* `OneWay` *or* `TwoWay`*. If the binding uses* `OneTime` *or* `OneWayToSource`*, there is no problem.*

Memory leaks in WPF can also happen when binding collections. If the collection does not implement `INotifyCollectionChanged`, you will get a memory leak. You can avoid the problem by using `ObservableCollection`, which implements this interface.

# Threads that never stop

We already discussed how the garbage collector works and what GC roots are. I mentioned that a thread stack is considered a root. A thread stack includes all local variables as well as call stack frames.

If you create an infinite thread that does nothing but keeps references to objects, you will get a memory leak. One way this can happen easily is incorrect use of the `Timer` class. Look at this code:

```csharp
public class MyClass
{
	public MyClass()
	{
		Timer timer = new Timer(HandleTick);
		timer.Change(TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(5));
	}

	private void HandleTick(object state) => // do something
}
```

If you do not stop the timer, it will keep running indefinitely on a separate thread, holding a reference to `MyClass` and preventing it from being collected.

# Unreleased unmanaged memory

So far, we have only talked about managed memory, which is reclaimed by the garbage collector. Unmanaged memory is a different story. Instead of just avoiding references to unneeded objects, you must explicitly free the memory.

Here is a simple example:

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

In this example we used `Marshal.AllocHGlobal` to allocate a block of unmanaged memory ([see the MSDN documentation](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.marshal.allochglobal?view=net-5.0)). If you do not explicitly free the memory via `Marshal.FreeHGlobal`, it will remain allocated in the process heap, causing a leak even after `SomeClass` is collected by the GC.

To prevent such issues, you can add a `Dispose` method to your class to clean up unmanaged resources. For example:

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

*Unmanaged memory leaks can be even worse than managed leaks due to [fragmentation](https://stackoverflow.com/questions/3770457/what-is-memory-fragmentation). The GC can defragment managed memory by moving surviving objects next to each other to free space for new allocations. Unmanaged memory, on the other hand, stays tied to the location where it was allocated.*

# Dispose not called

In the previous example we added a `Dispose` method to release unmanaged resources when they are no longer needed. That is great, but what happens if someone uses the class and never calls `Dispose`?

What you can do is use the C# `using` construct:

```csharp
using (var instance = new MyClass())
{
	// ...
}
```

The construct from the example works for classes that implement `IDisposable` and is compiled into the following code:

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

This is convenient because even if an exception is thrown, `Dispose` will still be called.

For maximum reliability, MSDN suggests the [Dispose implementation pattern](https://docs.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose). Here is an example of how it can be used:

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

Using this pattern helps ensure that even if `Dispose` is not called explicitly, it will still be called by the finalizer when the garbage collector decides to collect the object. If `Dispose` is called manually, the object's finalizer is suppressed and will not run. Suppressing finalization is important because running a finalizer is [relatively expensive](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers) and can cause performance issues.

But keep in mind that Microsoft's `Dispose` pattern is not a silver bullet. If you do not call `Dispose` manually and the object is not collected because of a managed leak, the unmanaged resources will not be released either.

# More modern leak sources (ASP.NET Core era)

The classic eight above predate today's stacks. The leaks (and pseudo-leaks) most teams actually hit now:

- **`HttpClient` socket exhaustion** — `new HttpClient()` per request doesn't leak managed memory, but it leaks **sockets**: each disposed client leaves a connection in `TIME_WAIT`, eventually exhausting ports (`SocketException`). Use `IHttpClientFactory` (or a single long-lived static client) so connections are pooled.
- **DI captive dependencies** — injecting a *scoped* (or transient `IDisposable`) service into a **singleton** pins the shorter-lived object for the app's lifetime. Equivalent to a static reference. Enable scope validation and resolve scoped services via `IServiceScopeFactory` from singletons. See [[Home/Programming/NET/ASP.NET Web API/Dependency Injection|Dependency Injection]].
- **Pooled buffers never returned** — renting from `ArrayPool<T>.Shared` / `MemoryPool<T>` and not returning (or returning then continuing to use) the buffer defeats the pool and grows retained memory.
- **`AsyncLocal<T>` / `ThreadLocal<T>` retention** — values stored in ambient state flow into captured contexts and can outlive their intended scope, keeping large graphs alive. Clear them at the end of the logical operation.
- **Tasks that never complete** — an `await`ed `TaskCompletionSource` that is never `SetResult`/`SetCanceled` keeps the entire async state machine (and everything it captured) alive forever. Always complete or time out every TCS.
- **`ConditionalWeakTable<TKey,TValue>`** is the right tool when you must attach state to an object *without* keeping it alive — the value is collected once the key is unreachable (also how weak-event patterns avoid the event-handler leak above).

# Diagnosing in production

- **`dotnet-gcdump collect`** captures a managed heap graph cheaply (no full process dump). The high-signal workflow is a **two-snapshot delta**: take one gcdump, apply load, take a second, and compare retained-type counts — the types that grew are your leak.
- **`dotnet-counters monitor System.Runtime`** to watch `gc-heap-size`, `gen-2-gc-count`, and GC-handle counts climb in real time; alert before OOM.
- **`dotnet-trace`** for allocation/event tracing when you need to find *where* the allocations originate, then `gcroot <address>` (in `dotnet-dump analyze`) to trace a leaked instance back to the root that holds it — the root is where the fix goes.

# Tradeoffs

| Decision | Option A | Option B | When A | When B |
| --- | --- | --- | --- | --- |
| **Event subscription model** | Strong events (standard C# events) | Weak events (`WeakEventManager`, `ConditionalWeakTable`) | Short-lived subscribers with deterministic unsubscription (e.g., `using` scope) | Long-lived publishers with many transient subscribers (UI frameworks, plugin systems) |
| **Caching strategy** | Unbounded `Dictionary` cache | `MemoryCache` with size limits and eviction | Never — unbounded caches always leak eventually | Always for any cache that grows proportionally with input; set `SizeLimit` and `AbsoluteExpirationRelativeToNow` |
| **Unmanaged resource cleanup** | `IDisposable` only (deterministic, no finalizer) | `IDisposable` plus finalizer safety net | When all callers reliably use `using`/`await using` (internal code, DI-managed lifetimes) | When the type is exposed to external consumers who may forget `Dispose()` — the finalizer catches the leak at the cost of one extra GC cycle |
| **Leak detection approach** | Periodic memory dumps plus manual analysis | Continuous monitoring with `dotnet-counters` / `EventPipe` | Post-incident investigation, deep root-cause analysis | Production monitoring — alert on Gen 2 heap size or GC handle count crossing thresholds before OOM |

**Decision rule**: treat every `IDisposable` as a potential leak. Use `using` statements for all disposable objects. For caches, always set size limits and TTLs — unbounded caches are the number one managed leak pattern in production .NET services.

# Questions

> [!QUESTION]- What is a memory leak? Is it possible in .NET? How?
> A memory leak is memory that is no longer needed but cannot be reclaimed, so the process keeps growing over time.
> Yes, it is possible in .NET:
> - Managed leaks: objects stay reachable (for example via static caches, event subscriptions, long-lived collections), so GC cannot collect them.
> - Unmanaged leaks: native memory/handles are allocated (directly or indirectly) and not released (for example, missing `Dispose()` / `using`).

> [!QUESTION]- What is the call stack? Can it overflow? What happens then?
> The call stack is a per-thread LIFO memory region that stores stack frames for active method calls (return address, parameters, locals, etc.).
> It can overflow (for example, due to deep or infinite recursion or very large stack allocations). In .NET this typically results in `StackOverflowException`, and the process is terminated (it cannot be reliably handled).

> [!QUESTION]- Why do we need `using {}` if there is a GC?
> `using` provides deterministic cleanup for resources that are not just managed memory (file handles, sockets, OS handles, unmanaged buffers). GC runs non-deterministically and does not guarantee timely release of such resources.
> The `using` statement compiles to `try/finally` so `Dispose()` is called even when exceptions occur.

> [!QUESTION]- What is the disposable (dispose) pattern?
> A standard way to implement `IDisposable` so both explicit cleanup (`Dispose()`) and (optionally) finalization are supported.
> Typical shape: `Dispose()` calls `Dispose(true)` and then `GC.SuppressFinalize(this)`; a finalizer (if needed) calls `Dispose(false)`; `Dispose(bool disposing)` releases unmanaged resources and, when `disposing` is true, also disposes managed fields.

# References

- [Garbage collection fundamentals (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) — explains GC roots, reachability, and why managed leaks are possible despite automatic memory management.
- [Implementing a Dispose method (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose) — official pattern for deterministic cleanup of managed and unmanaged resources.
- [Weak event patterns in WPF (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/advanced/weak-event-patterns) — how to subscribe to events without creating strong references that prevent GC.
- [8 Ways You Can Cause Memory Leaks in .NET (Michael's Coding Spot)](https://michaelscodingspot.com/memory-leaks-dotnet/) — practitioner walkthrough of the 8 most common .NET leak patterns with code examples and fixes.
- [5 Techniques to Avoid Memory Leaks by Events in C# .NET (Michael's Coding Spot)](https://michaelscodingspot.com/5-techniques-to-avoid-memory-leaks-by-events-in-c-net-you-should-know/) — event-specific leak patterns and mitigation strategies including weak event and anonymous handler approaches.
