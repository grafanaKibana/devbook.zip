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

## Questions

> [!QUESTION]- Why might you need `ref` for reference types if reference types are already passed by reference?
> Reference type *values* (the reference) are passed by value. `ref` is needed when you want the callee to replace the caller's reference (rebind it to a different object).

> [!QUESTION]- What is an `in` parameter used for?
> To pass an argument by readonly reference: avoid copies for large structs and communicate that the method should not modify the argument.

> [!QUESTION]- What are optional parameters in methods?
> Parameters with default values that callers can omit; the default is substituted at compile time at the call site.

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
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Async Await|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection|Reflection]]
<!-- whats-next:end -->
