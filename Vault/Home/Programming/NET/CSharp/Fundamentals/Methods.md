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
qard-deck: "Programming"
qard-topic: "NET/CSharp/Fundamentals/Methods"
flashcard_uid: "a3e803d0"
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
- `new` is appropriate only as a deliberate choice when member hiding, rather than polymorphism, is the required behavior.

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

Both objects have the same runtime type. Only the lookup rule changes: runtime type for `Speak`, compile-time reference type for `Category`.

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

By-value parameters and ordinary virtual dispatch are the default. By-reference semantics fit when aliasing is part of the API or profiling shows that struct copies matter. `new` fits only when compile-time hiding is the intended contract.

# Questions

> [!qard]- How do `ref`, `out`, and `in` parameters differ?
> All three pass the argument by reference instead of copying its value. For `ref` and `out`, the parameter always aliases the caller's variable. For `in`, it aliases the caller's variable when the argument is a variable of the parameter's type. An `in` argument that is not a variable, or that needs a conversion, can instead be copied into a temporary, and the parameter then refers to that temporary. The three modifiers differ in which direction data may flow through the reference.
> 
> | Modifier | How data flows through the reference | Typical use |
> |---|---|---|
> | `ref` | Both ways. The caller must initialize the variable, and the method can read it and assign it. The caller sees any assignment | Updating or replacing the caller's variable |
> | `out` | Outward. The caller can pass an unassigned variable. The method cannot read it before assigning it and must assign it before every normal return | Returning an extra result, as in `Try` methods such as `Dictionary.TryGetValue` |
> | `in` | Inward and readonly. The caller must initialize the argument, and the method can read the parameter but cannot assign it | Avoiding copies of a large struct on a measured hot path |
> 
> Without a modifier, the parameter is a copy, so assigning it never changes the caller's variable.
> 
> [Microsoft: method parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters)

<!-- qard-id: a16bf465-c1ae-4bca-909c-6f7462f37ca6 -->
> [!qard]- Why would a method need `ref` when the argument is already a reference type?
> A reference-type argument passes a copy of the reference. The method can mutate the shared object through that copy, but assigning a different object changes only its local copy. `ref` aliases the caller’s variable, allowing the method to replace the reference stored there. [Microsoft: method parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters)

<!-- qard-id: 1fe4393b-4d8c-4e2c-9ae5-769106b13e65 -->
> [!qard]- What does an `in` parameter do, and when is it useful?
> An `in` parameter passes a value by readonly reference, so the method cannot assign through that parameter. It may avoid copying a large struct in a measured hot path, but conversions and non-variable arguments can still require a temporary. [Microsoft: method parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters)

<!-- qard-id: 19ea3788-056c-4ed6-8bc6-2087ae866f65 -->
> [!qard]- How does C# apply an optional parameter's default value, and why can already-compiled callers keep an old default?
> The default is applied at the call site. When an ordinary compiled call omits an optional argument, the compiler inserts the declared default value into the caller's code, and the method receives it like any other argument.
> 
> The declaration rules fit that mechanism:
> 
> - **The default must be a compile-time value:** a constant expression, `default(S)`, or `new S()` where `S` is a value type. The compiler has to be able to write the value into each call.
> - **Optional parameters come after all required parameters.** Named arguments let a call supply a later optional argument while omitting earlier ones.
> 
> **Versioning consequence:** the default lives in each caller's compiled code. If a library changes a default, callers compiled against the old version keep passing the old value until they are recompiled. A public default value is therefore part of the library's compatibility contract.
> 
> [Microsoft: named and optional arguments](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/named-and-optional-arguments) · [C#: 12.6.2.3 Run-time evaluation of argument lists](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/expressions#12623-run-time-evaluation-of-argument-lists)

<!-- qard-id: ffd19d60-4643-4ede-92ff-83ba55b3f613 -->
> [!qard]- When `Animal a = new Dog();` calls `a.Category()`, what makes the call run `Dog`'s implementation, and what does that commit the `Animal` API to?
> `Animal.Category()` must be declared `virtual`, and `Dog` must implement `Category()` with `override`. The call is then resolved by the runtime type of the object, `Dog`, rather than by the declared type of the variable, `Animal`.
> 
> Methods are non-virtual by default. A non-virtual `a.Category()` binds to `Animal.Category()` because `a` is declared as `Animal`, even when `Dog` declares its own `Category()` with `new`.
> 
> **Commitment for the base API:** a virtual member is an extension point. Derived classes can replace its behavior, unless an override along the hierarchy is marked `sealed`, which stops classes below it from overriding the member again. Ordinary calls to the member on such an object run the most-derived override, including calls made from code inside `Animal`. An explicit `base.Category()` call in a derived class is the exception: it runs the base class's implementation rather than the most-derived override. `Animal` can therefore no longer assume that its own implementation of that member is the one that runs.
> 
> [Microsoft: virtual keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/virtual) · [Microsoft: new modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/new-modifier) · [Microsoft: base keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/base) · [Microsoft: sealed modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/sealed)



<!-- qard-id: 13e7573c-4ba4-4f2b-a316-4f2dcb52ccd6 -->
> [!qard]- A base method is not virtual, but a derived class needs different behavior. What are the options, and which ones work through a base-class reference?
> Only virtual dispatch makes a call through a base-class reference run derived code. Making the base member `virtual` and overriding it is therefore the only option that works through such a reference. Hiding with `new` affects only derived-typed references, and composition moves the variation out of inheritance.
> 
> | Option | Call through a base reference | Fits when |
> |---|---|---|
> | Base member made `virtual`, derived member marked `override` | Runs the derived implementation, chosen by the object's runtime type | The base type can be changed and derived objects are meant to substitute for base objects |
> | Derived member declared with `new` (hiding) | Still runs the base implementation. Only references typed as the derived class reach the new member | Hiding itself is the intended behavior, such as a deliberate compatibility split, not polymorphism |
> | Composition | No inheritance dispatch is involved. The class delegates the varying step to an object it holds | The base cannot be changed, or the variation is not a natural subtype relationship |
> 
> Hiding is the common trap. The same object behaves differently depending on whether it is referenced as the derived type or as the base type.
> 
> [Microsoft: virtual keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/virtual) · [Microsoft: new modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/new-modifier)

# References

- [Method parameters](https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/method-parameters#reference-parameters)
- [C# 13: Calling methods is easier and faster](https://devblogs.microsoft.com/dotnet/csharp13-calling-methods-is-easier-and-faster/)
