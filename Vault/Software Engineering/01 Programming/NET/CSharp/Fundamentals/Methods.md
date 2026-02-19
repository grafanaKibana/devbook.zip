---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Ready To Repeat
dg-publish: true
---
# Intro

Methods are the core unit of behavior in C#: they define contracts, shape API boundaries, and express how data flows through a system. Parameter modifiers like `ref`, `in`, and `params` are not just syntax details - they directly affect mutability, copying/allocation behavior, and performance characteristics at call sites. Dispatch keywords like `virtual`, `override`, and `new` determine whether behavior is polymorphic at runtime or resolved by compile-time type. Use these features intentionally to design method APIs that stay clear, safe, and predictable as codebases grow.

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

## Pitfalls

- Optional parameter defaults are substituted at the call site during compilation, so changing a default value in a shared library does not update already compiled consumers; this can create silent behavior drift across services. Prefer explicit overloads for public APIs and treat default-value changes as breaking behavior.
- `in` parameters are readonly by reference, but the compiler can introduce temporaries for some argument forms or conversions, which means expected copy-avoidance may not happen. Benchmark hot paths, and if you must minimize temporaries, design APIs around stricter by-ref calling patterns (for example, `ref readonly` parameters) and avoid argument expressions that require conversions.
- Member hiding with `new` is resolved by compile-time type, so callers can observe different results for the same runtime object depending on reference type. Prefer `virtual`/`override` when polymorphism is intended, and avoid `new` on public APIs unless the behavior split is deliberate and documented.

## Tradeoffs

- By-value vs `in` vs `ref`: by-value keeps APIs simplest and safest for small structs, `in` communicates read-only intent and can reduce copies for large structs, and `ref` enables mutation/rebinding but increases coupling and side-effect risk.
- `override` vs `new`: `override` gives predictable runtime polymorphism and is usually the right choice for extensible designs, while `new` preserves separate behavior per compile-time type but can surprise callers and complicate versioning.

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

- [Method parameters and modifiers (ref/in/out)](https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/method-parameters#reference-parameters)
- [C# 13: params collections](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-13#params-collections)
- [C# 13: calling methods is easier and faster](https://devblogs.microsoft.com/dotnet/csharp13-calling-methods-is-easier-and-faster/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Types|Types]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Generics|Generics]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection|Reflection]]
<!-- whats-next:end -->
