---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/types/delegates/","noteIcon":"1"}
---

# Intro

A delegate is a type-safe function pointer in C#. It lets you treat methods as values: store them in variables, pass them to other methods, compose invocation lists, and invoke them later. Delegates are foundational for callbacks, LINQ, strategy-style APIs, and events.

## Deeper Explanation

A delegate type defines a method signature. Any method with a compatible signature (static or instance) can be assigned to that delegate variable.

```csharp
public delegate decimal PriceCalculator(int quantity, decimal unitPrice);

public static decimal StandardPrice(int q, decimal p) => q * p;

PriceCalculator calc = StandardPrice;
var total = calc(3, 19.99m); // 59.97
```

Built-in generic delegates:

- `Action<T...>`: returns `void`
- `Func<T..., TResult>`: returns a value
- `Predicate<T>`: shorthand for `Func<T, bool>`

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

## Pitfalls

1. **Multicast return value trap**: calling `Func<T>` multicast returns only the last subscriber result.
2. **Exception short-circuiting**: one failing subscriber stops invocation.
3. **Hidden allocations**: closures allocate heap objects in hot paths.
4. **Delegate type mismatch**: same signature does not mean same delegate type.
5. **Variance combine trap**: variant delegate conversions can compile, but combining differently typed delegates can throw at runtime.

If you need isolation or aggregate results, use `GetInvocationList()` and invoke handlers one-by-one.

```csharp
var handlers = calc.GetInvocationList();
foreach (var d in handlers)
{
    try
    {
        var result = ((PriceCalculator)d)(2, 5m);
        Console.WriteLine(result);
    }
    catch (Exception ex)
    {
        Console.WriteLine(ex.Message);
    }
}
```

## Tradeoffs

| Choice | Pros | Cons | Use when |
|---|---|---|---|
| Custom `delegate` type | Self-documenting domain intent | More types to maintain | Public API needs semantic meaning |
| `Func`/`Action` | Minimal boilerplate | Less expressive names | Internal logic and short callbacks |
| Multicast delegate | Simple fan-out | Exception/return-value semantics are subtle | Fire-and-forget notification chains |
| Delegate callback | Fast, lightweight | Tighter coupling than message bus | In-process synchronous extensibility |

## Questions

> [!QUESTION]- What does a delegate compile to in IL/runtime terms?
> A delegate declaration becomes a sealed type derived from `System.MulticastDelegate` with `Invoke`, `BeginInvoke`, and `EndInvoke` metadata. Delegate instances carry a target object (or null for static methods), a method pointer, and optionally an invocation list.

> [!QUESTION]- Why can two delegates with identical signatures still be incompatible?
> Delegate compatibility is name/type based, not purely structural. If `public delegate void A(int x);` and `public delegate void B(int x);` are declared separately, `A` and `B` are different types and require explicit conversion.

> [!QUESTION]- How do you isolate failures in a multicast delegate so one bad subscriber does not break the rest?
> Iterate `GetInvocationList()`, cast each entry to the concrete delegate type, invoke in a per-handler `try/catch`, and optionally aggregate errors. Direct multicast invocation stops at first exception.

> [!QUESTION]- Why is using `Func<Task>` in multicast pipelines often wrong for async fan-out?
> Direct multicast invocation returns only the last task, so earlier handlers can run unobserved. For async fan-out, iterate `GetInvocationList()` and await each task explicitly (sequentially or with `Task.WhenAll`), depending on ordering requirements.

> [!QUESTION]- What is the difference between delegate variance and generic interface variance?
> Delegate *binding* variance allows assigning compatible methods to delegates. Generic variance (`in`/`out`) controls assignment compatibility between closed generic types (e.g., `IEnumerable<Dog>` to `IEnumerable<Animal>`). Both are related but not identical mechanisms.

## Links

- [Delegates - C# Programming Guide](https://learn.microsoft.com/dotnet/csharp/programming-guide/delegates/)
- [Using delegates - C# Programming Guide](https://learn.microsoft.com/dotnet/csharp/programming-guide/delegates/using-delegates)
- [Variance in delegates](https://learn.microsoft.com/dotnet/csharp/programming-guide/concepts/covariance-contravariance/variance-in-delegates)
- [C# language spec - delegates](https://learn.microsoft.com/dotnet/csharp/language-reference/language-specification/delegates)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Fundamentals\|Fundamentals]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Classes\|Classes]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Events\|Events]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Records\|Records]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Strings\|Strings]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Structs\|Structs]]
<!-- whats-next:end -->
