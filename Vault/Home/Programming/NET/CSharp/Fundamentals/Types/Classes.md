---
topic:
  - Programming
subtopic:
  - NET
summary: "A C# reference type combining shared object identity with state, inheritance, and virtual dispatch."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A class defines a reference type with object identity. Assignment copies a reference, so two variables can point at the same instance and observe the same mutations. Shared identity fits services and mutable domain entities. But it also creates aliasing bugs when ownership is unclear.

Classes support inheritance and virtual dispatch, but neither feature should be automatic. A small value that behaves like data may fit a `readonly struct` or `readonly record struct`. A reference-typed data carrier that needs value equality often fits a `record class`. Value types are stored inline in their containing location, which may itself be on the managed heap.

# Reference Identity

Class variables hold references rather than object contents. A reference may live in a local, a field, an array slot, or another runtime-managed location. Assignment copies that reference, not the object:

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

# Class Modifiers

## Abstract

An `abstract` class defines a base that cannot be instantiated directly. Abstract members leave behavior to derived classes. Concrete members provide shared implementation.

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

The boundary is inheritance. An abstract class may hold instance state, declare constructors, and expose protected members, but a derived class can have only one direct base class.

Use an interface when the contract matters more than shared instance state. Default interface members can provide reusable behavior, while a class can implement several interfaces. An abstract class is the stronger coupling and earns its place when constructors, protected state, or a controlled template method belong to the hierarchy.

## Sealed

A `sealed` class closes the inheritance boundary. This communicates that the type has no supported extension points and may also give the runtime more opportunities to devirtualize calls. Any performance benefit depends on the call site and JIT decisions.

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

An individual override can be sealed while the containing class remains inheritable:

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

## Static

A `static` class groups members that belong to the type rather than an instance. It cannot be instantiated, inherited, or given instance members.

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

In metadata, a static class is marked `abstract` and `sealed`. C# also requires extension methods to live in a top-level, non-generic static class. A static constructor runs at most once for a closed type, with initialization synchronized by the runtime.

A static class is not a singleton: no instance exists. Mutable static fields still create process-wide shared state for the relevant load context. That state needs synchronization and usually makes tests interfere with one another.

## Partial

The `partial` keyword lets one type declaration span multiple source files. The compiler combines the parts before normal type checking, which keeps generated members separate from handwritten code without creating a runtime boundary.

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

Every declaration must use `partial` and resolve to the same type. Modifiers from the parts describe the combined type, so `abstract`, `sealed`, or `static` on one part applies to all of it.

The feature also applies to structs, interfaces, and records. Partial methods form an optional hook between parts: when a declaration meets the erasable restrictions and has no implementation, the compiler removes both the method and its calls. Modern partial methods with accessibility or non-void signatures require an implementation.

## Modifier Compatibility

| Modifier combination | Allowed? |
|---|---|
| `abstract` + `sealed` | No in C# source (`static` is the IL equivalent) |
| `abstract` + `static` | No |
| `sealed` + `static` | No in C# source (`static` types are sealed in metadata) |
| `partial` + another class modifier | Yes, when the other modifier is otherwise legal |
| `abstract` + `partial` | Yes |
| `sealed` + `partial` | Yes |

# Modern Construction Features

- **Primary constructors (C# 12)** put constructor parameters on the class declaration. The parameters are in scope throughout the body, but unlike record positional parameters they do not generate public properties. The compiler stores a parameter only when an instance member needs it after construction.

  ```csharp
  public sealed class OrderService(IOrderRepository repo, ILogger<OrderService> log)
  {
      public Task SaveAsync(Order o) { log.LogInformation("saving"); return repo.SaveAsync(o); }
  }
  ```

- **`required` members (C# 11)** make object creation invalid unless the caller initializes the marked field or property, subject to constructors annotated with `SetsRequiredMembers`.

  ```csharp
  public sealed class Customer { public required string Name { get; init; } }
  var c = new Customer { Name = "Acme" }; // omitting Name is a compile error
  ```

- **Constructor chaining** uses `: this(...)` to delegate to another constructor and `: base(...)` to select the base constructor. Instance field initializers run before the constructor body. A failed static constructor usually causes later initialization attempts for that type to throw `TypeInitializationException` again.
- **File-local types (C# 11)** use `file class X` to limit a top-level type to one source file. This is useful when generated helper types must not collide across files.

# Pitfalls

1. **Accidental reference equality.** For a class that does not overload `==`, the operator compares references. Separate instances with equal field values still compare unequal. A record supplies value equality. A conventional class can implement `IEquatable<T>`, override `Equals` and `GetHashCode`, and overload the operators when operator syntax is part of the contract.

2. **Finalizers used as cleanup.** Finalization is nondeterministic and adds collection work. Deterministic resource ownership belongs in `IDisposable` or `IAsyncDisposable`. A finalizer is a last-resort safety net for a type that directly owns unmanaged resources.

3. **Mutable static state.** Static fields are shared by every caller in the relevant runtime scope. Mutation needs synchronization, and state can leak between tests. Prefer immutable static data. When mutation is unavoidable, define the ownership and guard it with the appropriate concurrency primitive.

4. **A fragile base class.** Derived types depend on constructor shape, protected surface, and the order in which virtual members are called. An interface is easier to evolve when shared state is unnecessary.

5. **Generated members hidden from the handwritten file.** A source generator can add members or interface implementations to a partial type. Collisions are compile-time errors, often reported against generated output. The generated files are part of the type and need the same review and test coverage as handwritten members.

# Tradeoffs

| Decision | Option A | Option B | When A | When B |
| --- | --- | --- | --- | --- |
| **`class` vs `record class`** | Regular class (identity equality unless changed) | Record class (generated value equality and `with` expressions) | Entities, stateful services, and types whose identity outlives their current data | Data carriers where equal contents should compare equal |
| **`abstract class` vs `interface`** | Abstract class (shared state and implementation, single inheritance) | Interface (multiple contracts, no instance fields) | The hierarchy needs constructors, protected state, or a template method | Consumers need a capability contract without inheriting implementation state |
| **`sealed` vs open** | Sealed (no derived classes) | Open (supported inheritance) | The type exposes no deliberate extension points | Derived behavior is part of the documented design |
| **`static class` vs singleton** | Static class (no instance, no DI, no interface) | Singleton via DI (`services.AddSingleton<T>()`) | Pure utility functions with no state and no need for testing isolation | Needs DI injection, interface-based testing, or configuration-dependent behavior |

Default to `sealed` when inheritance is not part of the design. Use a `record class` when value equality matches the domain. Reach for an abstract class only when the hierarchy genuinely shares state or construction rules.

# Questions

> [!QUESTION]- What is the difference between an abstract class and an interface with default members, and when is an abstract class a better fit?
> Both can contain implemented members. An abstract class can also store instance state, define constructors, and expose protected members, but a class can inherit from only one base class. An interface has no instance fields, and a class can implement several interfaces. An abstract class fits when derived types must share state or initialization rules. An interface fits when callers only need a common capability and the implementations do not belong in one inheritance hierarchy.

> [!QUESTION]- Why can't a static class implement an interface?
> An interface normally describes behavior on an object. A static class has no instances, so no object can be assigned to an interface variable. When an implementation needs to be injected or replaced, use a regular class and choose its lifetime through dependency injection. A generic algorithm that needs operations on the type itself can use static abstract interface members with a constrained type parameter.

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
> The hidden method is selected only when the compile-time receiver exposes `Bottom.Do`. Calls through `Middle` or `Base` stay on the sealed virtual slot and invoke `Middle.Do`. Hiding therefore does not replace polymorphic behavior. It creates a second member with type-dependent call semantics.

> [!QUESTION]- Can a C# type be both abstract and sealed, and how are static classes represented in metadata?
> C# rejects that modifier pair on an ordinary class. A C# static class is represented in metadata with both flags, which prevents construction and inheritance. Reflection therefore reports `typeof(Math).IsAbstract && typeof(Math).IsSealed` as `true`.

> [!QUESTION]- Why can `partial` be dangerous with source generators? Give a concrete scenario.
> The generated part is the same type, so it can add interface implementations or members that are absent from the handwritten file. A generator and handwritten code that both declare `Validate()` cause a compile-time collision. An optional partial-method hook may disappear entirely when no implementing declaration is generated. Generated output should be inspectable, and tests should cover the behavior that depends on it.

> [!QUESTION]- Why do two separately created class instances with equal fields compare unequal with `==`, and how should value equality be added?
> A class uses reference equality for `==` unless it overloads the operator, so two separately created instances are different references. A value-like conventional class should implement `IEquatable<T>`, override `Equals` and `GetHashCode`, and overload `==`/`!=` if operator equality belongs to its API. A `record class` is the shorter choice when generated value equality matches the domain.

# References

- [Classes](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/classes)
