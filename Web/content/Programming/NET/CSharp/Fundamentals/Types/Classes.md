---
publish: true
created: 2026-02-18T19:18:52.000Z
modified: 2026-11-12T10:29:34.513Z
published: 2026-07-08T13:14:17.327Z
topic:
  - Programming
subtopic:
  - NET
summary: A C# reference type combining shared object identity with state, inheritance, and virtual dispatch.
level:
  - "4"
priority: Medium
status: In Progress
qard-deck: Programming
qard-topic: NET/CSharp/Fundamentals/Types/Classes
flashcard_uid: 0928b940
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

    // No body — a non-abstract derived class must override it or inherit an override
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

An interface fits when the contract matters more than shared instance state. Default interface members can provide reusable behavior, while a class can implement several interfaces. An abstract class is the stronger coupling and earns its place when constructors, protected state, or a controlled template method belong to the hierarchy.

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

# Initialization Order

Fields begin with their type's default values. Initializers then run in textual order within a type, so reading a later field can observe its default:

```csharp
class Defaults
{
    public static int First = Second;
    public static int Second = 10;
}
```

After this type initializes, `Defaults.First` is 0 and `Defaults.Second` is 10. This is not a definite-assignment error: fields already have default values before their initializers execute.

Instance construction has a separate order. A derived class's instance field initializers run before its base constructor is invoked, while the base constructor body still runs before the derived body. The following classes make the distinction visible:

```csharp
class Base
{
    static Base() => Console.WriteLine("Base static");
    public Base() => Console.WriteLine("Base body");
}

class Derived : Base
{
    private readonly int _value = InitializeField();

    static Derived() => Console.WriteLine("Derived static");
    public Derived() => Console.WriteLine("Derived body");

    private static int InitializeField()
    {
        Console.WriteLine("Derived field");
        return 1;
    }
}
```

With neither type initialized previously, a first `new Derived()` from unrelated code prints: Derived static → Derived field → Base static → Base body → Derived body. Both classes have explicit static constructors here. Removing them, adding earlier uses, or changing initializer dependencies can change when type initialization occurs; [[Programming/NET/Runtime/Runtime|Runtime]] explains that timing separately.

# Pitfalls

1. **Accidental reference equality.** For a class that does not overload `==`, the operator compares references. Separate instances with equal field values still compare unequal. A record supplies value equality. A conventional class can implement `IEquatable<T>`, override `Equals` and `GetHashCode`, and overload the operators when operator syntax is part of the contract.

2. **Finalizers used as cleanup.** Finalization is nondeterministic and adds collection work. Deterministic resource ownership belongs in `IDisposable` or `IAsyncDisposable`. A finalizer is a last-resort safety net for a type that directly owns unmanaged resources.

3. **Mutable static state.** Static fields are shared by every caller in the relevant runtime scope. Mutation needs synchronization, and state can leak between tests. Immutable static data avoids these risks. When mutation is unavoidable, the state needs defined ownership and an appropriate concurrency primitive to guard it.

4. **A fragile base class.** Derived types depend on constructor shape, protected surface, and the order in which virtual members are called. An interface is easier to evolve when shared state is unnecessary.

5. **Generated members hidden from the handwritten file.** A source generator can add members or interface implementations to a partial type. Collisions are compile-time errors, often reported against generated output. The generated files are part of the type and need the same review and test coverage as handwritten members.

# Tradeoffs

| Decision | Option A | Option B | When A | When B |
| --- | --- | --- | --- | --- |
| **`class` vs `record class`** | Regular class (identity equality unless changed) | Record class (generated value equality and `with` expressions) | Entities, stateful services, and types whose identity outlives their current data | Data carriers where equal contents should compare equal |
| **`abstract class` vs `interface`** | Abstract class (shared state and implementation, single inheritance) | Interface (multiple contracts, no instance fields) | The hierarchy needs constructors, protected state, or a template method | Consumers need a capability contract without inheriting implementation state |
| **`sealed` vs open** | Sealed (no derived classes) | Open (supported inheritance) | The type exposes no deliberate extension points | Derived behavior is part of the documented design |
| **`static class` vs singleton** | Static class (no instance, no DI, no interface) | Singleton via DI (`services.AddSingleton<T>()`) | Pure utility functions with no state and no need for testing isolation | Needs DI injection, interface-based testing, or configuration-dependent behavior |

`sealed` fits any class whose design does not include inheritance. A `record class` fits when value equality matches the domain. An abstract class is justified only when the hierarchy genuinely shares state or construction rules.

# Questions

<!-- qard-id: 4102b2b9-4b17-458b-b927-b8b6b4559709 -->

> [!qard]- How does an abstract class differ from an interface with default members?
> An abstract class is a partial implementation that derived classes extend through single inheritance, and it can hold per-object state. An interface is a contract that a type can implement alongside any number of other interfaces. Default members let it supply behavior, but not instance state.
>
> | Aspect | Abstract class | Interface with default members |
> |---|---|---|
> | Inheritance limit | A class can derive from only one base class, so an abstract base uses that single slot. | A class or struct can implement many interfaces, so independent capabilities combine freely. |
> | Instance state | Can declare fields and auto-implemented properties that every derived object carries. | Cannot declare instance fields or auto-implemented properties, so default members can build only on other members, not on stored per-object data. |
> | Construction and hooks | Can declare constructors and `protected` members, so the base controls how derived objects are initialized and which extension points they get. | Cannot declare instance constructors, so it cannot control how implementers are initialized. |
> | Coupling | Derived classes depend on the base's constructors, protected members and the order in which it calls them, so changes to the base can break them. | Implementers depend only on the contract, which is easier to evolve when no shared state is needed. |
>
> [Microsoft: abstract](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/abstract) · [Microsoft: interface](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/interface) · [C# specification: classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

> [!qard]- When is an abstract class a better fit than an interface with default members?
> An abstract class fits when derived types genuinely share instance state, construction rules, or protected extension points. The shared implementation then needs the same per-object data and initialization discipline.
>
> A capability contract that unrelated types can implement without inheriting shared state fits an interface better. For example, a Shape base can hold Color and a constructor, while IComparable<T> describes a capability across otherwise unrelated types. The abstract class consumes the one base-class slot and couples derived types to its construction and protected surface.
>
> [Microsoft: abstract](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/abstract) · [Microsoft: interface](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/interface) · [C# specification: classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

<!-- qard-id: dc25ff5d-eca3-41ea-9cc4-57d12dd45b00 -->

> [!qard]- Why can’t a static class implement an interface?
> A static class never has instances, but an interface's instance members are always reached through an object. A variable, parameter or field of the interface type must refer to something that implements it. A static class can supply no such object, so C# forbids a static class declaration from listing a base class or any implemented interfaces.
>
> As a result, behavior that callers must reach through an interface has to live on an instance type rather than in a static class. A test that substitutes a fake is one such caller.
>
> Static abstract interface members, available from C# 11 and .NET 7, do not change this. A non-static class or struct implements them. Generic code calls them on a type parameter constrained to the interface, as in `T.Create()` with `where T : IFactory<T>`, rather than through an instance.
>
> [Microsoft: static](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/static) · [C# specification: classes (static classes)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes) · [Microsoft: static abstract interface members](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/interface-implementation/static-virtual-interface-members)

<!-- qard-id: 2ce5d743-bc95-4281-b813-22ab81daa88b -->

> [!qard]- A `sealed override` stops further overriding. Can a derived class use `new` to hide it, and what happens at runtime?
> Yes. `new` can declare a separate hidden member, but it does not reopen the sealed virtual slot. A call through the derived type can select the hidden member by compile-time lookup; a call through the base type still dispatches to the sealed override. [Microsoft: class types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

> [!qard]- How does a `partial` type let a source generator add code to a handwritten class?
> All declarations of a type marked `partial` are parts of a single type, and at compile time the compiler combines every part into one type. A source generator adds a new source file to the compilation containing another `partial` declaration of the class. The members, interfaces and attributes in that generated part become part of the handwritten class, while the handwritten file stays unchanged.
>
> ```csharp
> // Order.cs (handwritten)
> public partial class Order
> {
>     public int Id { get; set; }
> }
>
> // Order.g.cs (generated)
> public partial class Order : IValidatable
> {
>     public bool Validate() => Id > 0;
> }
> ```
>
> Consequences of the parts forming one type:
>
> - **One member set:** members declared in any part are available to all parts. If the handwritten and generated parts both declare `Validate()` with the same signature, compilation fails with a duplicate-member error.
> - **Combined declaration:** the type implements the interfaces listed on every part, and `abstract` or `sealed` on any part applies to the whole type.
> - **Matching parts:** every part must use `partial`, have the same accessibility and be compiled into the same assembly and module.
> - **Additive generation:** the generator contributes new source instead of editing the handwritten file. Generated members are still part of the type's behavior, so they need the same review and tests as handwritten members.
>
> [Microsoft: partial classes and members](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-and-methods) · [Microsoft: partial types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/partial-type) · [Microsoft: source generators](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/source-generators-overview)

<!-- qard-id: b4aee68b-efc1-4bf7-8374-1ab7ba8b0fdd -->

> [!qard]- When does the C# compiler remove a partial method and the calls to it?
> The compiler removes a partial method, together with every call to it, when no part of the type supplies an implementing declaration and the method qualifies as optional. It qualifies only if its declaration has:
>
> - no access modifier, not even an explicit `private`;
> - a `void` return type;
> - no `out` parameters;
> - none of the modifiers `virtual`, `override`, `sealed`, `new` or `extern`.
>
> Partial methods gained access modifiers, non-`void` returns and `out` parameters in C# 9. Those extended forms, such as `public partial bool Validate();`, always require an implementation, so leaving it out is a compile error rather than a silent removal.
>
> Optional partial methods suit hooks in generated code. A generator can declare `partial void OnNameChanged();` and call it, and the handwritten part may implement it. When no part implements it, the calls are removed at compile time, including evaluation of their argument expressions, so behavior expected from the hook never runs.
>
> [Microsoft: partial members](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/partial-member) · [C# specification: classes (partial methods)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

<!-- qard-id: f4c9ae99-2c35-4108-8f4f-199349060aeb -->

> [!qard]- When a class does not overload `==`, why do separately created instances with equal fields compare unequal?
> For a class, `==` without an overload compares references: it is `true` only when both operands refer to the same object. Two separately created instances are two objects, so they compare unequal even when every field matches. `Equals(object)` compares references in the same way only when neither the class nor any of its base classes overrides it, so the implementation inherited from `Object` applies; the absence of an `==` overload alone does not guarantee this.
>
> [Microsoft: define value equality](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/how-to-define-value-equality-for-a-type) · [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)

> [!qard]- How can a conventional class implement value equality?
> Value equality is added by deciding which fields make two instances equal and applying that rule consistently:
>
> - implement `IEquatable<T>.Equals(T)` and override `Equals(object)` to compare those fields;
> - override `GetHashCode` from the same fields, so equal instances produce equal hash codes and hash-based collections such as `Dictionary<TKey,TValue>` and `HashSet<T>` treat them as the same key;
> - overload `==` and `!=` to call `Equals` when operator comparison belongs to the type's API. Overriding `Equals` alone leaves `==` comparing references.
>
> A `record class` generates all of these members, comparing the runtime type and every field, so it is the shorter choice when that generated equality matches the domain.
>
> [Microsoft: define value equality](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/how-to-define-value-equality-for-a-type) · [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)

> [!qard]- Why can a static field initializer read a later field's default value?
> Static fields receive their default values before the explicit initializers run. Those initializers then run in textual order within the type. With `static int first = second; static int second = 10;`, initializing `first` reads the current 0 in `second`; the later assignment to `second` does not recompute `first`. Cross-type initialization dependencies can expose similarly incomplete state, so initialization should not depend on a later assignment already having happened. [C# specification: field initialization](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes#1556-static-field-initialization)

> [!qard]- Why can a derived instance field initializer run before the base constructor body?
> For a constructor that invokes a base constructor, C# executes the derived instance field initializers before that base constructor invocation. The base constructor body still finishes before the derived body starts. Initializer execution and constructor-body execution are therefore different parts of the sequence. Constructor chaining and separate static initialization must also be considered when tracing a particular program; there is no single unconditional order for every hierarchy. [C# specification: instance constructors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes#1511-instance-constructors)

> [!qard]- Why is a default interface member unavailable through the implementing class's own member lookup?
> A default interface implementation supplies behavior for calls through that interface; it does not add an ordinary inherited member to the class. If `IWorker` defines `Run()` and `Worker : IWorker` defines none, `((IWorker)worker).Run()` can use the default while `worker.Run()` does not compile. A public `Worker.Run()` would become callable through the class; an explicit `IWorker.Run()` implementation would still require interface access. [Microsoft: interfaces](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces)

> [!qard]- Which default implementation runs when a derived interface reimplements a base interface member?
> The most-specific applicable implementation runs. If `IDerived : IBase` explicitly supplies `void IBase.Run()`, an object implementing `IDerived` uses that implementation even when called through an `IBase` reference. Two unrelated interfaces that each declare their own `Run` are separate interface members, not one inherited class method. Class member lookup and interface dispatch are different questions. [C# specification: interfaces](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/interfaces)

# References

- [Classes](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/classes)
