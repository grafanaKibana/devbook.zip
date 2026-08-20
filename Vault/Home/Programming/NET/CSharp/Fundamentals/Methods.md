---
topic:
  - Programming
subtopic:
  - NET
summary: "C#'s unit of behavior, covering parameter modifiers and dispatch keywords."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

Methods define where behavior begins and what data may cross the boundary. The parameter list is part of that contract. By-value parameters isolate the caller's variable, `ref` and `out` expose it for reassignment, and `in` exposes storage as readonly. `params` changes how an expanded argument list is collected at the call site.

Inheritance adds a separate question: which implementation runs? `virtual` and `override` use runtime dispatch. `new` hides a member and leaves selection to the compile-time type of the reference. Similar syntax, very different behavior.

# Input Parameters

## Ref

`ref` aliases the caller's storage rather than copying its current value into a new parameter variable.

- The caller must initialize the variable.
- The method can read and write the variable.

For reference types, `ref` allows the callee to replace the caller's reference rather than only mutate the referenced object:

```csharp
class MyClass {}

static void ModifyReference(ref MyClass obj)
{
    obj = new MyClass();
}

var myObj = new MyClass();
ModifyReference(ref myObj);
```

For value types, `ref` allows the callee to update the caller's variable:

```csharp
static void InitializeAndModify(ref int value)
{
    value = 10;
}

int num = 0;
InitializeAndModify(ref num);
```

## In

`in` is a readonly by-reference parameter. It can avoid copying a large struct, though the compiler may still create a temporary for argument expressions that are not variables.

- The caller must initialize the argument.
- The method can read, but cannot assign to the parameter.
- It is most useful when measurements show that copying a large readonly struct matters.

```csharp
static void ProcessData(in int value)
{
    // value = 10; // Compile-time error
    Console.WriteLine(value);
}
```

## Out

`out` also aliases caller storage, but the value flows outward. The caller need not initialize it, and every normal return path must assign it. This supports `Try*` APIs that separate success from the produced value.

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

`Dictionary.TryGetValue` shows the boundary well: a missing key is expected input, so a Boolean result is clearer than an exception.

## Params

`params` lets callers provide zero or more arguments without constructing the parameter collection explicitly. C# 13 extended the feature beyond arrays to recognized collection types.

- Must be the last parameter in the method signature.
- Individual arguments or no arguments use expanded form, which constructs the declared `params` collection at the call site.
- Normal form accepts one expression implicitly convertible to the declared parameter type. An array works only when that array-to-parameter conversion exists, including the applicable array-to-span conversion.

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

C# 13 permits collection types such as `Span<T>`, `ReadOnlySpan<T>`, and types with a suitable collection-builder shape. Allocation behavior still depends on the declared parameter type and whether the call uses expanded or normal form.

```csharp
static int Sum(params ReadOnlySpan<int> numbers)
{
    int total = 0;
    foreach (var n in numbers)
        total += n;
    return total;
}
```

# Inheritance Method Keywords

## Virtual

`virtual` marks a base implementation as an extension point. Calls through a base reference still select the most-derived override at runtime.

- Enables runtime polymorphism.
- Calls are resolved by the runtime type, not just the variable type.

```csharp
class Animal
{
    public virtual string Speak() => "...";
}
```

## Override

`override` supplies the derived implementation of a virtual or abstract member while keeping the same dispatch slot.

- Signature must match the base member.
- The derived method can still call the base implementation with `base.MethodName()`.

```csharp
class Dog : Animal
{
    public override string Speak() => "Woof";
}
```

## New

`new` declares a separate member that hides one inherited with the same name. It does not join the base member's dispatch slot.

- Behavior depends on the compile-time type of the variable.
- Use intentionally only when member hiding, rather than polymorphism, is the required behavior.

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

## Virtual Vs Override Vs New in One Example

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

The object is the same in both calls. Only the lookup rule changes: runtime type for `Speak`, compile-time reference type for `Category`.

# Other Method Forms

- **`ref return` and `ref readonly return`** return an alias to existing storage. The writable form lets a caller update that storage. The readonly form avoids a copy without granting mutation. Ref-safety rules prevent the alias from outliving its source.
- **Local functions** name behavior inside another method. A `static` local function cannot capture outer state, and a direct call needs no delegate. A lambda is the natural form when the method must produce a `Func` or `Action` value.
- **Extension methods** are static methods whose first parameter has the `this` modifier. They participate in normal static overload resolution and do not modify the extended type.
- **Expression-bodied members** use shorter syntax for a single expression. Their call and dispatch semantics do not change.

**Overload resolution** compares the applicable candidates and their required conversions. Optional and named arguments affect applicability, while an unresolved tie is a compile error. Modern compilers can cache some static method-group conversions, but capturing lambdas and instance targets still need their own lifetime analysis.

# Pitfalls

- Optional defaults are copied into the caller at compile time. Changing a library's default does not affect an already compiled consumer, so a default-value change can create version-dependent behavior.
- An `in` parameter does not guarantee zero copies. Conversions and non-variable arguments can require temporaries, and readonly access to a mutable struct may trigger defensive copies.
- Member hiding with `new` makes the result depend on the reference's compile-time type. That split is hard to reason about in public APIs unless compatibility requires it.

# Tradeoffs

| Decision | Option A | Option B | When A | When B |
| --- | --- | --- | --- | --- |
| **By-value vs `in`** | By-value copies the value | `in` passes a readonly alias | Small values and ordinary APIs | Large readonly structs on a measured hot path |
| **`in` vs `ref`** | `in` forbids reassignment through the parameter | `ref` permits it | The callee only reads | Mutation or rebinding is part of the contract |
| **`override` vs `new`** | `override` uses runtime polymorphism | `new` uses compile-time hiding | Derived behavior must work through base references | A deliberate compatibility split requires a separate member |
| **`params T[]` vs `params ReadOnlySpan<T>`** | Array form is broadly compatible and can be retained by the callee | Span form is stack-only and cannot escape | The method or caller needs array semantics | Synchronous processing benefits from span-based calls |

Default to by-value parameters and ordinary virtual dispatch. Add by-reference semantics when aliasing is part of the API or profiling shows that struct copies matter. Use `new` only when compile-time hiding is the intended contract.

# Questions

> [!QUESTION]- Why would a method need `ref` when the argument is already a reference type?
> A reference-type argument still passes the reference itself by value. The method can use that copied reference to mutate the same object, but assigning a different object changes only the method's local copy. With `ref`, the method receives an alias to the caller's variable and can replace the reference stored there.

> [!QUESTION]- What does an `in` parameter do, and when is it useful?
> An `in` parameter passes an argument by readonly reference. The method can read the value but cannot assign through that parameter. This can avoid copying a large struct on a measured hot path, although conversions and non-variable arguments may still create a temporary copy. It rarely helps for small values.

> [!QUESTION]- How do optional parameters work in C#?
> An optional parameter has a default value, so the caller may leave that argument out. The compiler inserts the default into the calling code at compile time. If a library later changes the default, already compiled callers keep using the old value until they are recompiled.

> [!QUESTION]- With `Animal a = new Dog();`, how can `a.Category()` call the derived implementation, and what does that mean for the base API?
> Mark `Animal.Category()` as `virtual` and implement it with `override` in `Dog`. The runtime then chooses the method from the actual object type, even though the variable is typed as `Animal`. Declaring the base method virtual also makes derived replacement part of the API's intended extension model.

> [!QUESTION]- When is hiding a method with `new` appropriate instead of overriding it?
> Use `new` only when the base member cannot or should not participate in runtime polymorphism and the result is intentionally allowed to depend on the variable's compile-time type. This sometimes preserves compatibility with an existing API. If derived behavior should still appear through a base reference, the member needs `virtual` and `override` instead.

> [!QUESTION]- What can be done when a base method is not virtual but derived behavior is needed?
> If the base type is under control and derived substitution is intended, make the method `virtual` and override it. If the base API cannot change, `new` can hide the member, but calls through the base type will still use the base implementation. Composition is usually clearer when the varying behavior does not naturally belong to the inheritance hierarchy.

# References

- [Method parameters](https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/method-parameters#reference-parameters)
- [C# 13: Calling methods is easier and faster](https://devblogs.microsoft.com/dotnet/csharp13-calling-methods-is-easier-and-faster/)
