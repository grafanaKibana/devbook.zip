---
topic:
  - Programming
subtopic:
  - NET
summary: "A type-safe function pointer for storing, passing, and invoking methods as values."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A delegate is a C# type that describes a callable method signature. A delegate value pairs that signature with a method and, for a closed instance method, its target object. The value can then be stored, passed around, combined with other delegates, and invoked later.

This makes delegates the common mechanism behind callbacks, LINQ operators, strategy-style APIs, and events. Any static or instance method with a compatible signature can be assigned to the delegate type.

```csharp
public delegate decimal PriceCalculator(int quantity, decimal unitPrice);

public static decimal StandardPrice(int q, decimal p) => q * p;

PriceCalculator calc = StandardPrice;
var total = calc(3, 19.99m); // 59.97
```

# Built-in Generic Delegates

- `Action<T...>`: returns `void`
- `Func<T..., TResult>`: returns a value
- `Predicate<T>`: returns `bool` for one input. Its signature matches `Func<T, bool>`, but it remains a different delegate type.

```csharp
Func<int, int, int> add = (a, b) => a + b;
Action<string> log = s => Console.WriteLine(s);
Predicate<int> isEven = n => n % 2 == 0;
```

# Multicast Delegates

A delegate can represent more than one method. `+=` combines invocation lists, `-=` removes an entry, and invoking the result calls its handlers in registration order.

```csharp
Action pipeline = () => Console.WriteLine("Step 1");
pipeline += () => Console.WriteLine("Step 2");
pipeline += () => Console.WriteLine("Step 3");

pipeline();
```

Three details matter at runtime:

- If one handler throws, later handlers are not invoked.
- For non-`void` delegates, only the last handler's return value is returned.
- `-=` removes the last matching handler from the invocation list.

# Variance

Delegate compatibility supports covariance for return values and contravariance for parameters:

- **Covariance**: a method may return a more derived type.
- **Contravariance**: a method may accept a less derived parameter type.

```csharp
class Animal { }
class Dog : Animal { }

Func<Dog> dogFactory = () => new Dog();
Func<Animal> animalFactory = dogFactory; // covariance

Action<Animal> inspectAnimal = a => Console.WriteLine(a.GetType().Name);
Action<Dog> inspectDog = inspectAnimal;   // contravariance
```

# Anonymous Methods and Lambdas

Anonymous methods (`delegate(...) { ... }`) and lambdas (`(...) => ...`) can be converted to delegate instances. Both forms may capture local variables.

```csharp
int threshold = 10;
Func<int, bool> greaterThanThreshold = x => x > threshold;
```

The captured variable becomes shared closure state. It is not copied when the delegate is created.

# Closures

A closure holds variables captured from an outer scope by a lambda or anonymous method. Every delegate that closes over the same variable sees the same storage, including later updates.

```csharp
var handlers = new List<Action>();

for (int i = 0; i < 3; i++)
{
    handlers.Add(() => Console.WriteLine(i));
}

handlers.ForEach(h => h()); // 3, 3, 3
```

The lambda captures the single `for` variable `i`, not its value during each iteration.

```csharp
var handlers = new List<Action>();

for (int i = 0; i < 3; i++)
{
    int copy = i; // capture per-iteration value
    handlers.Add(() => Console.WriteLine(copy));
}

handlers.ForEach(h => h()); // 0, 1, 2
```

The extra local gives each iteration separate storage. This is needed whenever later mutation of shared captured state would change the delegate's meaning, with `for` loop indices being the usual example.

# Allocation, Captures, and Function Pointers

- **Delegates are immutable.** `+=` and `-=` create a new multicast delegate with an updated invocation list through `Delegate.Combine` or `Delegate.Remove`. Frequent subscription changes on a hot path therefore allocate.
- **A capturing lambda needs closure state.** A `static` lambda (C# 9) cannot capture locals, so the compiler rejects accidental captures and may reuse the delegate instance.
- **Static method-group conversions can be cached by the compiler.** C# 11 added cached static method-group conversions, avoiding a fresh delegate allocation when the same conversion is evaluated repeatedly.
- **`DynamicInvoke` uses late-bound invocation.** It performs runtime checks and can box arguments, so a typed call is preferable. A closed delegate binds its target instance. An open delegate receives the target as an argument.
- **Function pointers (`delegate*`, C# 9) remove the delegate object.** They fit narrow `unsafe` or interop paths where the calling convention and lifetime are controlled. They give up delegate safety and composition to get there.

# Pitfalls

- **One exception stops a multicast call.** Later handlers are skipped. When handlers must be isolated, enumerate `GetInvocationList()` and invoke each one inside its own `try/catch`.
- **A non-`void` multicast call exposes only the last return value.** Enumerate the handlers and collect results when every result matters.
- **Captured loop state can drift.** Closures capture variables rather than snapshots, so several handlers may observe the same final value. A per-iteration local creates the intended snapshot.
- **The legacy asynchronous delegate pattern is unsupported on modern .NET.** Calling delegate `BeginInvoke` or `EndInvoke` throws `PlatformNotSupportedException`. `Task`-based APIs are the replacement.

# Questions

> [!QUESTION]- What does a delegate compile to in IL/runtime terms?
> A delegate declaration becomes a sealed type derived from `System.MulticastDelegate` with `Invoke`, `BeginInvoke`, and `EndInvoke` metadata. Delegate instances carry a target object (or null for static methods), a method pointer, and optionally an invocation list. In modern .NET (6+), calling delegate `BeginInvoke`/`EndInvoke` is not supported and throws `PlatformNotSupportedException`.

# References

- [C# language specification: Delegates](https://learn.microsoft.com/dotnet/csharp/language-reference/language-specification/delegates)
- [Migrating delegate BeginInvoke calls for .NET Core](https://devblogs.microsoft.com/dotnet/migrating-delegate-begininvoke-calls-for-net-core/)
