---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

Methods are the core unit of behavior in C#: they define contracts, shape API boundaries, and express how data flows through a system. Parameter modifiers like `ref`, `in`, and `params` are not just syntax details — they directly affect mutability, copying/allocation behavior, and performance characteristics at call sites. A misplaced `in` on a 4-byte `int` adds overhead instead of saving it (the runtime passes a pointer plus a defensive copy), while a missing `ref` on a 128-byte `Matrix4x4` silently copies 128 bytes per call in a hot rendering loop. Dispatch keywords like `virtual`, `override`, and `new` determine whether behavior is polymorphic at runtime or resolved by compile-time type — getting this wrong creates bugs where the "right" method runs for the wrong variable type, invisible until you upcast.

## Input Parameters

### ref

`ref` passes a variable by reference.

- The caller must initialize the variable.
- The method can read and write the variable.

Even for reference types, `ref` is useful when you want to change the reference itself (not just mutate the object it points to):

```csharp
class MyClass {}

static void ModifyReference(ref MyClass obj)
{
    obj = new MyClass();
}

var myObj = new MyClass();
ModifyReference(ref myObj);
```

`ref` is also useful for value types when you need the callee to update the caller's variable:

```csharp
static void InitializeAndModify(ref int value)
{
    value = 10;
}

int num = 0;
InitializeAndModify(ref num);
```

### in

`in` is a readonly by-ref parameter.

- The caller must initialize the argument.
- The method can read, but cannot assign to the parameter.
- Often used to avoid copying large structs while making intent explicit.

```csharp
static void ProcessData(in int value)
{
    // value = 10; // Compile-time error
    Console.WriteLine(value);
}
```

### out

`out` passes by reference for **output**: the callee *must* assign it before returning, and the caller need not initialize it. It's the basis of the `TryParse` pattern (return a `bool` for success, hand back the value via `out`) and pairs with inline `out var`:

```csharp
static bool TryDivide(int a, int b, out int result)
{
    if (b == 0) { result = 0; return false; }
    result = a / b;
    return true;
}

if (TryDivide(10, 2, out var quotient))   // 'quotient' declared inline
    Console.WriteLine(quotient);           // 5
```

Use `out` (success-or-default) instead of throwing for *expected* failures on hot paths; `Dictionary.TryGetValue` is the canonical example.

### params

`params` lets a method accept a variable number of arguments as an array (or, since C# 13, recognized collection types).

- Must be the last parameter in the method signature.
- The caller can pass individual arguments, an array, or nothing at all.
- Expanded-form calls (for example, `Sum(1, 2, 3)`) construct the `params` collection at the call site; passing an existing collection can avoid extra construction.

```csharp
static int Sum(params int[] numbers)
{
    int total = 0;
    foreach (var n in numbers)
        total += n;
    return total;
}

Sum(1, 2, 3);   // 6
Sum();           // 0
Sum(new[] { 4, 5 }); // 9 — explicit array also works
```

C# 13 extends `params` beyond arrays to recognized collection types such as `Span<T>`, `ReadOnlySpan<T>`, and `IEnumerable<T>`. This can reduce allocations in some call patterns (especially span-based calls), but allocation behavior still depends on the target type and call form:

```csharp
static int Sum(params ReadOnlySpan<int> numbers)
{
    int total = 0;
    foreach (var n in numbers)
        total += n;
    return total;
}
```

## Inheritance Method Keywords

### virtual

`virtual` marks a base-class method as overridable.

- Enables runtime polymorphism.
- Calls are resolved by the runtime type, not just the variable type.

```csharp
class Animal
{
    public virtual string Speak() => "...";
}
```

### override

`override` replaces a `virtual`/`abstract` member implementation in a derived class.

- Signature must match the base member.
- You can still call the base implementation with `base.MethodName()`.

```csharp
class Dog : Animal
{
    public override string Speak() => "Woof";
}
```

### new

`new` hides a member from the base class (it does not override it).

- Behavior depends on the compile-time type of the variable.
- Use intentionally when you want member hiding, not polymorphism.

```csharp
class Animal
{
    public string Category() => "Animal";
}

class Dog : Animal
{
    public new string Category() => "Dog";
}
```

### virtual vs override vs new in one example

```csharp
class Animal
{
    public virtual string Speak() => "...";
    public string Category() => "Animal";
}

class Dog : Animal
{
    public override string Speak() => "Woof";
    public new string Category() => "Dog";
}

Animal asAnimal = new Dog();
Dog asDog = new Dog();

Console.WriteLine(asAnimal.Speak());    // Woof (runtime dispatch)
Console.WriteLine(asDog.Speak());       // Woof
Console.WriteLine(asAnimal.Category()); // Animal (member hiding)
Console.WriteLine(asDog.Category());    // Dog
```

`override` participates in polymorphism; `new` does not.

## Other Method Forms

- **`ref return` / `ref readonly return`** — return an *alias* to existing storage instead of a copy, letting callers read (and with `ref`, mutate) the original. Combined with `ref` locals (`ref var slot = ref array[i];`) this enables in-place updates of array/struct fields with no copying — used heavily in high-performance code (`Span<T>`, `Dictionary.GetValueRefOrAddDefault`).
- **Local functions vs lambdas** — a local function is a named method nested in another method. Prefer it over a lambda when you don't need a delegate: it can be `static` (forbids accidental captures), supports `ref`/`out` and iterators, and **doesn't allocate a delegate/closure** unless converted to one. Lambdas are for when you actually need a `Func`/`Action` value.
- **Extension methods** — `static` methods in a `static` class with a `this`-modified first parameter, letting you "add" methods to existing types (the whole of LINQ is extension methods on `IEnumerable<T>`).
- **Expression-bodied members** (`=> ...`) are just concise syntax for single-expression methods/properties.

**Overload resolution** picks the "best" match by a betterness algorithm (most specific parameter types, fewest conversions); named and optional arguments interact here, and an ambiguous tie is a compile error. Since **.NET 7**, a method-group conversion (`Func<int,int> f = Square;`) is **cached**, so repeatedly assigning the same method group no longer allocates a new delegate each time.

## Pitfalls

- Optional parameter defaults are substituted at the call site during compilation, so changing a default value in a shared library does not update already compiled consumers; this can create silent behavior drift across services. Prefer explicit overloads for public APIs and treat default-value changes as breaking behavior.
- `in` parameters are readonly by reference, but the compiler can introduce temporaries for some argument forms or conversions, which means expected copy-avoidance may not happen. Benchmark hot paths, and if you must minimize temporaries, design APIs around stricter by-ref calling patterns (for example, `ref readonly` parameters) and avoid argument expressions that require conversions.
- Member hiding with `new` is resolved by compile-time type, so callers can observe different results for the same runtime object depending on reference type. Prefer `virtual`/`override` when polymorphism is intended, and avoid `new` on public APIs unless the behavior split is deliberate and documented.

## Tradeoffs

| Decision | Option A | Option B | When A | When B |
| --- | --- | --- | --- | --- |
| **By-value vs `in`** | By-value (copies the argument) | `in` (readonly reference) | Small types (≤16 bytes: `int`, `Guid`, small structs) — copy is cheaper than indirection | Large structs (>16 bytes: `Matrix4x4`, `decimal`-heavy DTOs) — avoids 128+ byte copies on hot paths |
| **`in` vs `ref`** | `in` (readonly reference) | `ref` (mutable reference) | Callee only reads — communicates intent, compiler enforces immutability | Callee must mutate or rebind — e.g., `TryParse` patterns, swap utilities |
| **`override` vs `new`** | `override` (runtime polymorphism) | `new` (compile-time hiding) | Almost always — predictable dispatch, works through base-type references | Rare: deliberate compile-time-only behavior split, documented API hiding for compatibility |
| **`params T[]` vs `params ReadOnlySpan<T>`** | `params T[]` (heap array per call) | `params ReadOnlySpan<T>` (stack or inline buffer) | Pre-C# 13 code, or when caller needs to store the array | C# 13+, hot paths where allocation pressure matters — span-based avoids the heap allocation |

**Decision rule**: default to by-value for types ≤16 bytes and `override` for all polymorphic methods. Introduce `in` only when profiling shows copy cost matters (typically structs >16 bytes called >10K/sec). Use `new` only when you own both types and the behavior split is documented in XML comments.
## Questions

> [!QUESTION]- Why might you need `ref` for reference types if reference types are already passed by reference?
> Reference type *values* (the reference) are passed by value. `ref` is needed when you want the callee to replace the caller's reference (rebind it to a different object).

> [!QUESTION]- What is an `in` parameter used for?
> To pass an argument by readonly reference: avoid copies for large structs and communicate that the method should not modify the argument.

> [!QUESTION]- What are optional parameters in methods?
> Parameters with default values that callers can omit; the default is substituted at compile time at the call site.

> [!QUESTION]- In a hierarchy where `Animal a = new Dog();`, how can you make `a.Category()` return the derived value, and what does that imply for API design?
> Mark the base member as `virtual` and the derived member as `override`. That enables polymorphic dispatch by runtime type. It also means the base API explicitly supports extensibility and behavioral substitution.

> [!QUESTION]- When should you prefer `new` over `override`?
> Prefer `new` only when polymorphism is not desired and you intentionally want different behavior based on the compile-time reference type (for compatibility or specialized APIs). In most extensible designs, `override` is the safer default.

> [!QUESTION]- A base method is not marked `virtual`, but you need derived-specific behavior. What are your options?
> Option 1: Change the base API to `virtual` (best if you own the base type and want polymorphism). Option 2: Hide with `new` (works, but no polymorphism and can confuse callers). Option 3: Redesign with composition/strategy if inheritance is not a good fit.

## Links

- [Method parameters and modifiers (ref/in/out)](https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/method-parameters#reference-parameters) — official reference for all parameter modifiers with semantics and examples.
- [C# 13: params collections](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-13#params-collections) — explains the C# 13 extension of `params` to any collection type, not just arrays.
- [C# 13: calling methods is easier and faster](https://devblogs.microsoft.com/dotnet/csharp13-calling-methods-is-easier-and-faster/) — .NET team blog post on the performance and ergonomics improvements to method calls in C# 13.
