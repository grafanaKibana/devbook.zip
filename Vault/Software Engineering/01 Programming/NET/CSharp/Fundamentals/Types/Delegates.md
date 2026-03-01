---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Creation
dg-publish: true
---
# Intro

A delegate is a type-safe function pointer in C#. It lets you treat methods as values: store them in variables, pass them to other methods, compose invocation lists, and invoke them later. Delegates are foundational for callbacks, LINQ, strategy-style APIs, and events.

A delegate type defines a method signature. Any method with a compatible signature (static or instance) can be assigned to that delegate variable.

```csharp
public delegate decimal PriceCalculator(int quantity, decimal unitPrice);

public static decimal StandardPrice(int q, decimal p) => q * p;

PriceCalculator calc = StandardPrice;
var total = calc(3, 19.99m); // 59.97
```

### Built-in generic delegates

- `Action<T...>`: returns `void`
- `Func<T..., TResult>`: returns a value
- `Predicate<T>`: predefined delegate with signature `T -> bool` (similar to `Func<T, bool>`, but a different type)

```csharp
Func<int, int, int> add = (a, b) => a + b;
Action<string> log = s => Console.WriteLine(s);
Predicate<int> isEven = n => n % 2 == 0;
```

### Multicast Delegates

Delegates can hold an invocation list (`+=`, `-=`). Calling the delegate invokes handlers in registration order.

```csharp
Action pipeline = () => Console.WriteLine("Step 1");
pipeline += () => Console.WriteLine("Step 2");
pipeline += () => Console.WriteLine("Step 3");

pipeline();
```

Important runtime behavior:

- If one handler throws, later handlers are not invoked.
- For non-`void` delegates, only the last handler's return value is returned.
- `-=` removes the last matching handler from the invocation list.

### Variance

Delegates support covariance and contravariance:

- **Covariance** (returns): method may return a more derived type.
- **Contravariance** (parameters): method may accept a less derived type.

```csharp
class Animal { }
class Dog : Animal { }

Func<Dog> dogFactory = () => new Dog();
Func<Animal> animalFactory = dogFactory; // covariance

Action<Animal> inspectAnimal = a => Console.WriteLine(a.GetType().Name);
Action<Dog> inspectDog = inspectAnimal;   // contravariance
```

### Anonymous Methods and Lambdas

Anonymous methods (`delegate(...) { ... }`) and lambdas (`(...) => ...`) compile to delegate instances. Both can capture local variables (closures).

```csharp
int threshold = 10;
Func<int, bool> greaterThanThreshold = x => x > threshold;
```

Captured variables are references to closure state, not a one-time value copy.

### Closures

A closure is the runtime state created when a lambda or anonymous method captures variables from an outer scope. The captured variable is shared, so updates to that variable are observed by all delegates that close over it.

```csharp
var handlers = new List<Action>();

for (int i = 0; i < 3; i++)
{
    handlers.Add(() => Console.WriteLine(i));
}

handlers.ForEach(h => h()); // 3, 3, 3
```

Why this happens: the lambda captures the variable `i`, not its value per iteration.

```csharp
var handlers = new List<Action>();

for (int i = 0; i < 3; i++)
{
    int copy = i; // capture per-iteration value
    handlers.Add(() => Console.WriteLine(copy));
}

handlers.ForEach(h => h()); // 0, 1, 2
```

Use this pattern when the captured variable would otherwise be shared and mutated after handler creation (most commonly `for` loop indices).

## Pitfalls

- **Multicast stops at first exception**: direct invocation of a multicast delegate exits when one handler throws, so later handlers are skipped. Mitigation: iterate `GetInvocationList()`, invoke each handler in its own `try/catch`, and log or aggregate failures.
- **Non-`void` multicast returns only one value**: only the last handler's return value is surfaced, so earlier results are lost. Mitigation: enumerate handlers explicitly and collect results into a list.
- **Loop variable capture can produce wrong values**: closures capture variables, not snapshots, so all handlers can see a final mutated value (for example `for` loop index). Mitigation: create a per-iteration local copy before capturing.
- **Legacy async delegate pattern is unsupported on modern .NET**: calling delegate `BeginInvoke`/`EndInvoke` throws `PlatformNotSupportedException` on modern runtimes. Mitigation: use `Task`-based async APIs.

## Questions

> [!QUESTION]- What does a delegate compile to in IL/runtime terms?
> A delegate declaration becomes a sealed type derived from `System.MulticastDelegate` with `Invoke`, `BeginInvoke`, and `EndInvoke` metadata. Delegate instances carry a target object (or null for static methods), a method pointer, and optionally an invocation list. In modern .NET (6+), calling delegate `BeginInvoke`/`EndInvoke` is not supported and throws `PlatformNotSupportedException`.

> [!QUESTION]- How do you isolate failures in a multicast delegate so one bad subscriber does not break the rest?
> Iterate `GetInvocationList()`, cast each entry to the concrete delegate type, invoke in a per-handler `try/catch`, and optionally aggregate errors. Direct multicast invocation stops at first exception.

> [!QUESTION]- Why is using `Func<Task>` in multicast pipelines often wrong for async fan-out?
> Direct multicast invocation returns only the last task, so earlier handlers can run unobserved. For async fan-out, iterate `GetInvocationList()` and await each task explicitly (sequentially or with `Task.WhenAll`), depending on ordering requirements.

## Links

- [Delegates - C# Programming Guide](https://learn.microsoft.com/dotnet/csharp/programming-guide/delegates/)
- [Using delegates - C# Programming Guide](https://learn.microsoft.com/dotnet/csharp/programming-guide/delegates/using-delegates)
- [Variance in delegates](https://learn.microsoft.com/dotnet/csharp/programming-guide/concepts/covariance-contravariance/variance-in-delegates)
- [C# language spec - delegates](https://learn.microsoft.com/dotnet/csharp/language-reference/language-specification/delegates)
- [C# language spec - anonymous function expressions and captured outer variables](https://learn.microsoft.com/dotnet/csharp/language-reference/language-specification/expressions#1221-anonymous-function-expressions)
- [Remoting APIs unavailable on .NET and delegate BeginInvoke/EndInvoke behavior](https://learn.microsoft.com/dotnet/core/porting/net-framework-tech-unavailable#remoting)
- [Migrating delegate BeginInvoke calls for .NET Core](https://devblogs.microsoft.com/dotnet/migrating-delegate-begininvoke-calls-for-net-core/)
- [Closing over the loop variable considered harmful](https://ericlippert.com/2009/11/12/closing-over-the-loop-variable-considered-harmful-part-one/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Fundamentals|Fundamentals]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Classes|Classes]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Events|Events]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Records|Records]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Strings|Strings]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Structs|Structs]]
<!-- whats-next:end -->
