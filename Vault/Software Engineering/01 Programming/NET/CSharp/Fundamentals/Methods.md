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

`params` lets a method accept a variable number of arguments as an array (or, since C# 13, any collection type).

- Must be the last parameter in the method signature.
- The caller can pass individual arguments, an array, or nothing at all.
- The compiler allocates an array on each call — avoid in hot paths.

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

C# 13 extends `params` beyond arrays to `Span<T>`, `ReadOnlySpan<T>`, `IEnumerable<T>`, and other collection types, which avoids the hidden heap allocation:

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
