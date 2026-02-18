---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Not-Started
dg-publish: true
---
# Intro

A class is a reference type that defines a blueprint for objects allocated on the managed heap. Multiple variables can reference the same object, so mutations through one reference are visible through all others. Classes support single-class inheritance, virtual dispatch, finalizers, and the full range of access modifiers — making them the default choice for most domain models, services, and infrastructure types in C#.

## Deeper Explanation

Instances are heap-allocated and accessed through a reference stored on the stack (or inside another heap object). Assignment copies the reference, not the object:

```csharp
public class Order
{
    public int Id { get; init; }
    public string Customer { get; set; } = string.Empty;
    public decimal Total { get; set; }
}

var a = new Order { Id = 1, Customer = "Acme", Total = 99.99m };
var b = a;          // b points to the SAME object
b.Total = 0m;
Console.WriteLine(a.Total); // 0 — both references share the object
```

Key properties:

- Support single-class inheritance and multiple interface implementation.
- Can have finalizers (`~ClassName()`), virtual/abstract members, and `protected` access.
- Default value of a class variable is `null`.
- Equality (`==`) compares references by default (unless overloaded, e.g. `string`).

## Class Modifiers

### abstract

An `abstract` class cannot be instantiated directly — it exists only to be inherited. It may contain abstract members (no body, must be overridden) and concrete members (shared implementation).

```csharp
public abstract class Shape
{
    public string Color { get; set; } = "Black";

    // No body — every derived class MUST implement
    public abstract double Area();

    // Shared implementation — derived classes inherit as-is or override
    public virtual string Describe() => $"{Color} shape with area {Area():F2}";
}

public class Circle : Shape
{
    public double Radius { get; init; }
    public override double Area() => Math.PI * Radius * Radius;
}

// Shape s = new Shape();   // Compile error — cannot instantiate abstract class
Shape s = new Circle { Radius = 5 };
```

Key rules:

- Can contain both abstract and non-abstract members.
- Can have constructors (called by derived constructors via `base(...)`), fields, and state.
- Cannot be `sealed` (the two modifiers are contradictory).
- Cannot be `static` (abstract implies inheritance, static forbids it).

**Abstract vs Interface**: abstract classes carry state and shared implementation but lock you into single inheritance. Interfaces (especially with default interface methods in C# 8+) provide multiple implementation but cannot hold instance state.

### sealed

A `sealed` class cannot be inherited. The compiler can devirtualize method calls on sealed types, enabling small performance gains.

```csharp
public sealed class JwtToken
{
    public string Value { get; }
    public DateTime Expiry { get; }

    public JwtToken(string value, DateTime expiry)
    {
        Value = value;
        Expiry = expiry;
    }

    public bool IsExpired => DateTime.UtcNow > Expiry;
}

// class ExtendedToken : JwtToken { }  // Compile error — cannot inherit from sealed
```

You can also seal individual overrides to stop further overriding down the chain:

```csharp
public class Base
{
    public virtual void Execute() { }
}

public class Middle : Base
{
    public sealed override void Execute() { /* final implementation */ }
}

// public class Bottom : Middle
// {
//     public override void Execute() { } // Compile error — Execute is sealed in Middle
// }
```

`string` is a sealed class in the BCL. All structs are implicitly sealed.

### static

A `static` class cannot be instantiated or inherited. It can only contain static members. The compiler enforces this — you cannot add instance fields, properties, or methods.

```csharp
public static class MathHelpers
{
    public static double Clamp(double value, double min, double max)
        => Math.Max(min, Math.Min(max, value));

    public static double Lerp(double a, double b, double t)
        => a + (b - a) * Clamp(t, 0, 1);
}

// var h = new MathHelpers();  // Compile error
```

Key rules:

- Implicitly `sealed` and `abstract` at IL level (the CLR has no concept of "static class").
- Cannot implement interfaces or extend base classes (other than `object`).
- Extension methods must be defined in a static, non-generic, non-nested class.
- Static constructors run once, before the first member access, and are thread-safe by the runtime guarantee.

**Gotcha**: static classes are singletons by nature. If they hold mutable state (`static` fields), you get global mutable state — hard to test and prone to race conditions.

### partial

The `partial` keyword splits a class definition across multiple files. The compiler merges them into a single type. Commonly used for separating generated code from hand-written code.

```csharp
// Order.cs
public partial class Order
{
    public int Id { get; set; }
    public string Customer { get; set; } = string.Empty;
}

// Order.Validation.cs
public partial class Order
{
    public bool IsValid() => Id > 0 && !string.IsNullOrWhiteSpace(Customer);
}
```

Key rules:

- All parts must use `partial` and have the same accessibility, type-parameter list, and enclosing namespace.
- If any part is `abstract`, the whole type is abstract. Same for `sealed` and `static`.
- Partial methods (C# 9+) can have implementations in another part; if no implementation is provided for a partial method without accessibility modifier, the compiler removes the call entirely.
- Heavily used by source generators, EF Core scaffolding, WinForms/WPF designers, and Razor pages.
- Also applies to structs, interfaces, and records.

### Modifier Compatibility

| Modifier combination | Allowed? |
|---|---|
| `abstract` + `sealed` | No in C# source (`static` is the IL equivalent) |
| `abstract` + `static` | No |
| `sealed` + `static` | Redundant — `static` is already sealed |
| `partial` + any modifier | Yes |
| `abstract` + `partial` | Yes |
| `sealed` + `partial` | Yes |

## Pitfalls

1. **Reference equality surprise** — `==` compares references, not content. Two `new Order(...)` with identical fields are not equal unless you override `==`/`Equals`. Use records or implement `IEquatable<T>` for value-like equality.

2. **Finalizer abuse** — Finalizers delay GC (objects with finalizers are promoted to Gen 1+), are non-deterministic, and run on a single finalizer thread. Prefer `IDisposable`/`IAsyncDisposable` with `using`. Only add a finalizer as a safety net for unmanaged resources.

3. **Static mutable state** — Static fields in any class (including non-static classes) are effectively global state. They survive GC, are shared across threads, and make unit testing painful. If you must use them, make them `readonly` or guard with `lock`/`Interlocked`.

4. **Abstract class tight coupling** — Deriving from an abstract class couples you to its implementation details (constructor signature, protected fields, method call order). Changes in the base class can break all derived classes (fragile base class problem). Prefer interface contracts when you do not need shared state.

5. **Partial class hidden members** — Source generators can add fields, methods, and interface implementations to your partial class that you do not see in your source file. Name collisions produce confusing compiler errors pointing at generated code.

## Questions

> [!QUESTION]- What is the difference between `abstract class` and `interface` with default interface methods (C# 8+)? When would you still choose an abstract class?
> Both can define contracts with shared implementation. Key differences:
> - **State**: abstract classes can have instance fields and constructors; interfaces cannot hold instance state (only static fields).
> - **Inheritance**: a class can implement many interfaces but inherit from only one class.
> - **Access modifiers**: abstract classes support `protected`/`internal` members; interface members are implicitly public (C# 8+ allows explicit modifiers but no `protected` instance state).
> - **Performance**: virtual dispatch on abstract class methods is a single vtable lookup; default interface methods may involve additional dispatch overhead.
> - Choose abstract class when you need shared mutable state, constructors, or `protected` implementation details. Choose interfaces for capability contracts and when multiple inheritance is needed.

> [!QUESTION]- Can a static class implement an interface? Why or why not?
> No. A static class compiles to an `abstract sealed` class at IL level — it cannot be instantiated, so there is no object to dispatch interface calls through. Interfaces require an instance for virtual dispatch. If you need a "static implementation" of a contract, the patterns are:
> - Use static abstract/virtual interface members (C# 11+) with generics: `where T : IMyInterface`.
> - Use a singleton instance of a regular class that implements the interface.
> - Use delegates/`Func<T>` instead of an interface.

> [!QUESTION]- A `sealed override` stops further overriding, but can a derived class use `new` to hide the sealed method? What happens at runtime?
> Yes, `new` compiles and hides the sealed method. But the behavior depends on the variable's compile-time type:
> ```csharp
> class Base { public virtual void Do() => Console.WriteLine("Base"); }
> class Middle : Base { public sealed override void Do() => Console.WriteLine("Middle"); }
> class Bottom : Middle { public new void Do() => Console.WriteLine("Bottom"); }
>
> Bottom b = new Bottom();
> b.Do();           // "Bottom" — resolved at compile time as Bottom.Do
> Middle m = b;
> m.Do();           // "Middle" — virtual dispatch resolves to Middle.Do (sealed)
> Base x = b;
> x.Do();           // "Middle" — same virtual dispatch
> ```
> The `new` method is completely invisible to polymorphic code. This is almost always a design smell — if you need to change behavior, the method should not have been sealed, or you should use composition instead.

> [!QUESTION]- Can you have an abstract sealed class? What about in IL?
> In C# source code, you cannot write `abstract sealed class` — the compiler rejects it as contradictory. However, at the IL level, **static classes** compile to exactly `abstract sealed`. The CLR treats `abstract sealed` as "cannot be instantiated and cannot be inherited." So every `static class` in C# is literally an `abstract sealed` class in metadata. You can verify this with `ildasm` or reflection: `typeof(Math).IsAbstract && typeof(Math).IsSealed` is `true`.

> [!QUESTION]- Why can `partial` be dangerous with source generators? Give a concrete scenario.
> Partial classes merge at compile time, and source generators can add members to your type that you do not see in your source file. Dangers:
> - **Name collisions**: a generator adds a method `Validate()` and you also write `Validate()` — compile error with a confusing message pointing at generated code.
> - **Implicit behavior changes**: a generator adds `INotifyPropertyChanged` implementation and overrides `Equals`. Your tests pass locally but break in CI where a different generator version runs.
> - **Debugging opacity**: stepping through code jumps into generated files that may not be in source control.
> - **Partial method removal**: if a partial method (without accessibility modifier) has no implementing declaration, the compiler silently removes all calls to it. If you forget to generate the body, the call vanishes with no warning.
> Best practice: always inspect generated output (visible in IDE under Dependencies and Analyzers), and write tests that verify generator-dependent behavior explicitly.

> [!QUESTION]- Two classes have identical fields and values. You compare them with `==`. Why is it `false`, and what are the three ways to fix it?
> `==` compares references by default for classes — two separate `new` calls produce different heap objects with different references.
> Fixes:
> 1. **Override `Equals`/`GetHashCode` and overload `==`/`!=`** — full manual control, but tedious and error-prone.
> 2. **Implement `IEquatable<T>`** — avoids boxing in generic code and gives a clean `Equals(T)` method. Still need to overload `==`.
> 3. **Use `record class` instead** — the compiler generates value-based `Equals`, `GetHashCode`, `==`, and `!=` automatically. This is the recommended approach for data-carrier types.

> [!QUESTION]- A static constructor throws an exception. What happens on subsequent accesses to that type?
> The runtime marks the type as permanently broken. Every subsequent attempt to access any member of the type throws a `TypeInitializationException` wrapping the original exception — even if the condition that caused the failure has been resolved. The type cannot be re-initialized for the lifetime of the AppDomain (or AssemblyLoadContext in .NET Core). This is why static constructors should be kept minimal and defensive — failures are unrecoverable.

## Links

- [Classes - C# Programming Guide](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/classes)
- [Abstract and sealed classes - C# reference](https://learn.microsoft.com/dotnet/csharp/programming-guide/classes-and-structs/abstract-and-sealed-classes-and-class-members)
- [Static classes - C# Programming Guide](https://learn.microsoft.com/dotnet/csharp/programming-guide/classes-and-structs/static-classes-and-static-class-members)
- [Partial classes and methods - C# reference](https://learn.microsoft.com/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-and-methods)

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
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Async Await|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Delegates|Delegates]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Events|Events]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Records|Records]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection|Reflection]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Strings|Strings]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Structs|Structs]]
<!-- whats-next:end -->
