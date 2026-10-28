---
topic: [Programming]
subtopic: [NET]
summary: "A type-safe function pointer for storing, passing, and invoking methods as values."
level: ["4"]
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Fundamentals/Types/Delegates"
flashcard_uid: "c751e8da"
---

A delegate is a C# type that describes a callable method signature. A delegate value pairs that signature with a method and, for a closed instance method, its target object. The value can then be stored, passed around, combined with other delegates, and invoked later.

This makes delegates the common mechanism behind callbacks, LINQ operators, strategy-style APIs, and events. Any static or instance method with a compatible signature can be assigned to the delegate type.

```csharp
static decimal StandardPrice(int q, decimal p) => q * p;

PriceCalculator calc = StandardPrice;
var total = calc(3, 19.99m); // 59.97

public delegate decimal PriceCalculator(int quantity, decimal unitPrice);
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
Func<Dog> dogFactory = () => new Dog();
Func<Animal> animalFactory = dogFactory; // covariance

Action<Animal> inspectAnimal = a => Console.WriteLine(a.GetType().Name);
Action<Dog> inspectDog = inspectAnimal;   // contravariance

class Animal { }
class Dog : Animal { }
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
- **`DynamicInvoke` uses late-bound invocation.** It performs runtime checks and can box arguments, so a typed call is preferable. For an instance method, a closed delegate binds its target instance, while an open delegate receives that instance as its first argument.
- **Function pointers (`delegate*`, C# 9) remove the delegate object.** They fit narrow `unsafe` or interop paths where the calling convention and lifetime are controlled. They give up delegate safety and composition to get there.

# Pitfalls

- **One exception stops a multicast call.** Later handlers are skipped. Isolating handlers requires enumerating `GetInvocationList()` and invoking each one inside its own `try/catch`.
- **A non-`void` multicast call exposes only the last return value.** Collecting every result requires enumerating the handlers, invoking each one separately and keeping each return value.
- **Captured loop state can drift.** Closures capture variables rather than snapshots, so several handlers may observe the same final value. A per-iteration local creates the intended snapshot.
- **The legacy asynchronous delegate pattern is unsupported on modern .NET.** Calling delegate `BeginInvoke` or `EndInvoke` throws `PlatformNotSupportedException`. `Task`-based APIs are the replacement.

# Questions

<!-- qard-id: c922b7d0-655f-4f50-89fd-bfc97950ccfa -->
> [!qard]- What is a delegate, and what does a delegate value carry?
> A delegate is a type that represents references to methods with a particular signature. The delegate type fixes the parameter and return types. A delegate value packages a compatible method so it can be stored, passed and invoked later like any other value.
>
> A delegate value carries:
>
> - **Method:** the method to call, which must be compatible with the delegate's signature.
> - **Target (optional):** a delegate closed over an instance method also stores the object the method runs on. A delegate with no bound object, such as one created from an ordinary static method, has no target. Reflection through `Delegate.CreateDelegate` can also create open instance delegates, which receive the instance as an argument, and static delegates closed over their first argument.
> - **Invocation list:** a delegate can combine several methods, for example with `+=`. Invoking it calls each in order.
> 
> ```csharp
> var tenPercent = new Discount(0.10m);
> PriceCalculator calc = tenPercent.Apply; // closed instance delegate: method Apply, target tenPercent
> decimal total = calc(3, 20m);            // runs tenPercent.Apply: 54.00
> 
> public delegate decimal PriceCalculator(int quantity, decimal unitPrice);
> 
> public sealed class Discount
> {
>     private readonly decimal _rate;
>     public Discount(decimal rate) => _rate = rate;
>     public decimal Apply(int quantity, decimal unitPrice) => quantity * unitPrice * (1 - _rate);
> }
> ```
>
> Delegate values are immutable: adding or removing a method produces a new delegate. Lambdas and method groups convert to delegate types, which is how callbacks, LINQ operators and events pass behavior around.
>
> [Microsoft: delegates](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/delegates/) · [C# specification: delegates](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/delegates) · [Microsoft: Delegate.CreateDelegate](https://learn.microsoft.com/en-us/dotnet/api/system.delegate.createdelegate?view=net-10.0)

> [!qard]- When a multicast delegate is invoked, in what order do its methods run, and what happens to return values and exceptions?
> Its methods run synchronously, one after another, in invocation-list order, which is the order in which they were combined. For a non-`void` delegate, the caller receives only the last method's return value. If any method throws, the exception propagates to the caller and the remaining methods are not invoked.
>
> ```csharp
> Func<int> f = () => 1;
> f += () => 2;
> f += () => 3;
> int result = f(); // 3; the results 1 and 2 are discarded
> ```
>
> Consequences:
>
> - **Lost results:** every result is available only by enumerating `GetInvocationList()` and invoking each delegate separately.
> - **One failure skips later handlers:** an event raised with a single call stops at the first subscriber that throws. Isolating subscribers requires invoking each entry from `GetInvocationList()` inside its own `try`/`catch`.
> 
> [C# specification: delegates (delegate invocation)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/delegates)

# References

- [C# language specification: Delegates](https://learn.microsoft.com/dotnet/csharp/language-reference/language-specification/delegates)
- [Migrating delegate BeginInvoke calls for .NET Core](https://devblogs.microsoft.com/dotnet/migrating-delegate-begininvoke-calls-for-net-core/)
