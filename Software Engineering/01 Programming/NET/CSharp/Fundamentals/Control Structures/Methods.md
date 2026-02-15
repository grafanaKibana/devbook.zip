---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Creation
---
# Intro

C# parameters are passed by value by default. Parameter modifiers like `ref` and `in` change how arguments are passed and what the callee is allowed to do.

## Deeper Explanation

## ref

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

## in

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

## Questions

> [!QUESTION]- Why might you need `ref` for reference types if reference types are already passed by reference?
> Reference type *values* (the reference) are passed by value. `ref` is needed when you want the callee to replace the caller's reference (rebind it to a different object).

> [!QUESTION]- What is an `in` parameter used for?
> To pass an argument by readonly reference: avoid copies for large structs and communicate that the method should not modify the argument.

## Links

- [Method parameters and modifiers (ref/in/out)](https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/method-parameters#reference-parameters)
