---
topic: ["Programming"]
subtopic: ["NET", "C#", "Fundamentals"]
level: ["1"]
priority: Medium
status: Not-Started
tags:
  - FolderNote
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

```dataviewjs
const cur = dv.current();
const curFolder = cur.file.folder;
const curPath = cur.file.path;

const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const children = dv.pages()
  .where(p => p.file.folder.startsWith(curFolder + "/"))
  .where(p => p.file.folder.split("/").length === curFolder.split("/").length + 1)
  .where(p => p.file.name === p.file.folder.split("/").slice(-1)[0])
  .where(p => isFolderNote(p))
  .sort(p => p.file.folder, "asc");

if (children.length) {
  dv.header(2, "Children");
  dv.list(children.map(p => p.file.link));
}

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");

if (pages.length) {
  dv.header(2, "Pages");
  dv.list(pages.map(p => p.file.link));
}
```
---
## Intro

## Deeper Explanation

# Overview

In C#, types define the kind of data that variables can hold, how much memory they occupy, and what operations can be performed on them. The C# type system is unified, meaning that all types, including primitives, share a common base type`(object`). This unified type system enables powerful features like polymorphism, type safety, and LINQ, while still allowing for high-performance code.

![01 Programming-Types-20260211184602492.png](01%20Programming-Types-20260211184602492.png)

## Class vs Structure

1. **Value:**
    1. A class variable stores a reference to an object.
    2. A structure variable stores the data itself.
2. **Transfer semantics:**
    1. **Classes** are reference types. When an instance of a class is passed to a method, a reference to the object is passed to the method, and changes to the object will be visible wherever the reference is used.
    2. **Structures** are value types. When an instance of a structure is passed to a method, a copy of the value is passed to the method, and changes to the copy do not affect the original object.
3. **In-memory usage:**
    1. **Classes**, more specifically class object variables are stored in the managed stack, a variable in turn stores not the object itself but a reference to the object in the managed heap.
    2. **Structures** are stored in the stack by default, but can also be stored in the managed heap if necessary, for example, when the structure is a class field, or was explicitly packed into an object.
4. **Inheritance:**
    1. **Classes** support inheritance, which means that one class can be inherited from another, providing the ability to create a hierarchy of classes.
    2. **Structures** do not support inheritance. They cannot be inherited from other types and cannot be base classes. Therefore, all structures are `sealed` by default
5. **Default initialization:**
    1. **Classes** are initialized by default with the value **`null`**.
    2. **Structures** are initialized by default with a value corresponding to their data type (e.g. numbers are initialized with null).
6. **Differences in minor application details:**
    1. Structures cannot have a default constructor(no parameters) or destructor in them
    2. Structures can be initialized without using the `new` operator
    3. Structures cannot have abstract or sealed modifiers, as well as members of structures cannot be `protected` or `protected internal`, which is logical because structures do not support inheritance.
    4. Methods of structures cannot be abstract or virtual for the same reason of absence of inheritance in structures. Also, methods in structures cannot override any methods except those in `System.ValueType`.
    5. Structures cannot contain fields whose size is not yet known (including those of their own type).
7. Examples:
    1. `Struct`: **`System.String`, `System.IO.File`**
    2. `Class`: **`System.Int32` (and other numeric data types), `System.DateTime`, `System.Drawing.Point`**

## Value Types vs Reference Types

> [!TIP]
> ⚠️ Common misconception: It's often stated that value types are stored on the stack while reference types are stored on the heap. However, this is a simplification. The actual storage location depends on context, not just the type.


### Value Types

- Contain data directly
- Stored in the place they are declared (often stack, but not guaranteed)
- Include primitive types`(int`, `float`, `bool`), `struct`, `enum`, etc.
- Assignment creates a copy of the value
- Cannot be null (unless using nullable types with `?`)
- Equality compares the actual values
    
    [C#: Numeric Data Types In A Nutshell](https://medium.com/@shiranabbasi/c-numeric-data-types-explained-1560a96a5a68)
    

### Reference Types

- Contain a reference (address) to data stored elsewhere
- The object is stored on the heap, the reference can be on stack
- Include classes, interfaces, delegates, arrays, strings
- Assignment copies the reference, not the actual data
- Can be null
- Equality compares references by default (unless overridden)

### Memory Storage

The C# specification does not mandate where types must be stored. However, in the current implementation of .NET:

- Local value type variables typically reside on the stack
- Value types that are fields of reference types are stored in the heap along with their containing object
- Reference type instances are always allocated on the heap
- References themselves (the pointers) might be on the stack when used as local variables

> *However, unlike classes, structs are value types and do not require heap allocation.*
> 

This quote from the C# specification indicates only that structs don't require heap allocation, not that they must be on the stack.

### Parameter Passing

How parameters are passed is determined by the parameter declaration, not by whether the type is a value or reference type:

When passing by value, a copy of the data is created for value types, while for reference types, a copy of the reference is created but both point to the same object. When using the ref keyword, a reference to the original variable is passed, allowing the method to modify the original value.

### Equality Comparison

By default, equality comparison behaves differently for value and reference types:

- For value types, the == operator compares the actual values
- For reference types, the == operator compares references (addresses), not the content
- The Equals method behavior can be overridden to provide custom equality comparison
- String is an exception - the == operator is overloaded to compare content, not references

## Type Categories

### Built-in Types

- **Simple Types**: Numeric types`(int`, `long`, `float`, `double`), `bool`, `char`
- **String**: Immutable sequence of characters
- **Object**: Base type for all other types
- **Dynamic**: Bypasses compile-time type checking

### User-Defined Types

- **Class**: Reference type that supports inheritance, encapsulation
- **Struct**: Lightweight value type for small data structures
- **Interface**: Contract that classes/structs can implement
- **Enum**: Type with named constants
- **Delegate**: Type-safe function pointers
- **Record** (C# 9+): Immutable reference type with value-based equality

## Stack vs Heap Allocation

- Stack: Fast, limited size, automatic cleanup
- Heap: Larger, managed by garbage collector
- Value types as local variables typically go on stack
- Value types as class members go on heap with their containing object
- Reference types (the objects themselves) always go on heap
- References may be stored on stack

### Storing Variables

The division of memory into stack and heap is purely logical, physically there is no difference between memory areas for heap and stack. The difference in performance is provided by working with these areas.

A memory cell for a variable is stored either on the stack or in the heap. It depends on the context in which it is declared:

1. Every local variable (i.e., declared in a method) is stored on the stack. This includes reference type variables - the variable itself is on the stack, but the value of a reference type variable is only a reference (or `null`), not the object itself. Method parameters are also considered local variables, but if they are declared with the ref modifier, they do not get their own slot, but share a slot with the variable used in the calling code. 
2. Reference type instance variables are always in the heap. That's where the object itself "lives".
3. Instance variables for a value type are stored in the same context as the variable declaring the value type. The memory slot for an instance actually contains slots for each field within the instance. This means (subject to the previous two points) that a structure variable declared inside a method will always be on the stack, whereas a structure variable that is a field of an instance of a class will be on the heap.
4. Every static variable is stored in the heap, regardless of whether it is declared inside a reference type or a value type. There is only one slot in total, regardless of how many instances are created. (However, it is not necessary to create any instances for this one slot to exist.)
    
    [The Stack Is An Implementation Detail, Part One](https://learn.microsoft.com/ru-ru/archive/blogs/ericlippert/the-stack-is-an-implementation-detail-part-one)
    
    [Memory in .NET - what goes where](http://jonskeet.uk/csharp/memory.html)
    
    [Reference types live on the heap, value types live on the stack](https://stackoverflow.com/questions/3542083/reference-types-live-on-the-heap-value-types-live-on-the-stack)
    

### Speed

**Misconception (1)**: the stack is fast, but the heap is large.

**Why.** Because small local variables, such as numbers, are usually placed on the stack, while fat objects are placed on the heap. Obviously, small objects that are known where they lie are easier and faster to work with. But this is a consequence rather than a cause.

**Law**: we have already searched for the word *heap* in the standard and found nothing serious. The word *stack* is mostly found in the paragraphs about unsafe blocks and stackalloc, but we are not talking about it now.

It is a**fact**: placing data on the heap is indeed more complicated (you need to pass through the memory allocator), while on the stack it is faster (you don't need to do anything, you already know where and how much memory we use). But further access will be similar (if we touch both in the same way, e.g. by reference) and access speed will depend only on the effects of data locality in the cache, but this is not a question of language, but of the physical machine.

About the size:

Stack size can be changed for the whole binary with EDITBIN.EXE /STACK:<stacksize> file.exe

And for each individual thread - via the second argument of the [new Thread() constructor.](https://docs.microsoft.com/en-us/dotnet/api/system.threading.thread.-ctor?view=net-5.0#System_Threading_Thread__ctor_System_Threading_ParameterizedThreadStart_System_Int32_)

By default, the heap is indeed larger than the stack, but the stack can be increased, and the heap, although it grows as needed, is not infinite. There are a bunch of rules that determine its size, and it can be reduced [in the settings](https://docs.microsoft.com/en-us/dotnet/core/run-time-config/garbage-collector). Sometimes the available heap is less than the physically available memory Then we have to uncheck unsafe and make offheap allocations.

Conclusion: the size of both is determined by the machine and rantime, but it is not a defining feature.

## Boxing and Unboxing

Converting between value and reference types:

```csharp
int i = 123;          // Value type
object o = i;         // Boxing (implicit conversion to reference type)
int j = (int)o;       // Unboxing (explicit conversion back)
```

Boxing has performance implications as it:

- Allocates memory on the heap
- Copies the value
- Triggers garbage collection later

## Type Checking and Conversion

### Compile-Time Type Checking

- C# is statically typed - type checking occurs at compile time
- Enforces type safety rules to prevent type errors

### Runtime Type Checking

- `is` operator: Tests if an object is compatible with a type
- `as` operator: Attempts conversion, returns null on failure
- `typeof` operator: Gets type object for a type
- Pattern matching (C# 7+): Advanced type checking and deconstruction

```csharp

if (obj is string str)  // Type check and declaration in one step
{
    Console.WriteLine(str.Length);
}
```

## Common Pitfalls

- **Large Value Types**: Creating very large structs (>16 bytes) can lead to performance issues when passed by value
- **Mutable Value Types**: Can lead to unexpected behavior as changes to copies won't affect the original
- **Boxing/Unboxing**: Excessive use in performance-critical code can cause memory pressure
- **Reference Type Equality**: Forgetting that `==` compares references by default, not content
- **Mutating Structs in Properties**: Can fail silently as you're modifying a copy

> 💡 Tip: Use structs for small, simple data that has value semantics. Use classes for larger objects, when inheritance is needed, or when reference semantics are desired.
> 

## Questions

> [!QUESTION]- What is an abstract class?
> A class that cannot be instantiated and can define abstract members that derived classes must implement.

> [!QUESTION]- What is ad hoc polymorphism?
> It is polymorphism where the same operation name applies to different types via separate implementations, typically via overloading (methods/operators).

> [!QUESTION]- What are auto-properties? Can they replace simple fields? Why?
> Auto-properties are properties with compiler-generated backing fields. They can replace simple fields especially in public APIs because they keep encapsulation and allow adding logic later without changing call sites.

> [!QUESTION]- What is boxing and unboxing?
> Boxing is converting a value type to `object` (or to an implemented interface) and storing it on the managed heap.
> Unboxing is converting an `object` back to a value type.
> Boxing occurs when passing value types to methods expecting `object` parameters or when adding value types to collections of objects.
> Boxing is expensive as it involves memory allocation, copying, and later garbage collection.

> [!QUESTION]- What are checked and unchecked?
> They define an overflow-checking context for integral arithmetic and conversions: `checked` throws on overflow, while `unchecked` allows wraparound.
> Answer is not provided in the source interview list; see Further Reading.

> [!QUESTION]- What is a class? How does it differ from an object?
> A class is a type definition (blueprint) describing members and behavior.
> An object is a concrete runtime instance of that class with its own state in memory.

> [!QUESTION]- What is the difference between class and struct? Name examples of .NET structs.
> Classes are reference types; structs are value types.
> Structs are copied by value, cannot participate in class inheritance, and are often used for small value-like data (e.g., `int`, `DateTime`, `Guid`).
> 
> Differences:
> 
> 1. **Value:**
>     1. A class variable stores a reference to an object.
>     2. A structure variable stores the data itself.
> 2. **Transfer semantics:**
>     1. **Classes** are reference types. When an instance of a class is passed to a method, a reference to the object is passed to the method, and changes to the object will be visible wherever the reference is used.
>     2. **Structures** are meaningful types. When an instance of a structure is passed to a method, a copy of the value is passed to the method, and changes to the copy do not affect the original object.
> 3. **In-memory usage:**
>     1. **Classes**, more specifically class object variables are stored in the managed stack, a variable in turn stores not the object itself but a reference to the object in the managed heap.
>     2. **Structures** are stored in the stack by default, but can also be stored in the managed heap if necessary, for example, when the structure is a class field, or was explicitly packed into an object.
> 4. **Inheritance:**
>     1. **Classes** support inheritance, which means that one class can be inherited from another, providing the ability to create a hierarchy of classes.
>     2. **Structures** do not support inheritance. They cannot be inherited from other types and cannot be base classes. Therefore, all structures are `sealed` by default
> 5. **Default initialization:**
>     1. **Classes** are initialized by default with the value **`null`**.
>     2. **Structures** are initialized by default with a value corresponding to their data type (e.g. numbers are initialized with null).
> 6. **Differences in minor application details:**
>     1. Structures cannot have a default constructor(no parameters) or destructor in them
>     2. Structures can be initialized without using the `new` operator
>     3. Structures cannot have abstract or sealed modifiers, as well as members of structures cannot be `protected` or `protected internal`, which is logical because structures do not support inheritance.
>     4. Methods of structures cannot be abstract or virtual for the same reason of absence of inheritance in structures. Also, methods in structures cannot override any methods except those in `System.ValueType`.
>     5. Structures cannot contain fields whose size is not yet known (including those of their own type).
> 7. Examples:
>     1. `Struct`: **`System.String`, `System.IO.File`**
>     2. `Class`: **`System.Int32` (and other numeric data types), `System.DateTime`, `System.Drawing.Point`**
> 
> [Article](https://www.calabonga.net/blog/post/c-net-4-0-class-vs-struct-ili-v-chem-razlichiya-mezhdu-klassom-i-strukturoi)

> [!QUESTION]- Which existing interfaces do you know in .NET?
> Common ones include `IEnumerable<T>`, `IDisposable`, `IComparable<T>`, `IEquatable<T>`, `IAsyncEnumerable<T>`, and others depending on the domain.

> [!QUESTION]- What is the difference between const and readonly?
> `const` is evaluated at compile time and inlined into callers.
> `readonly` is set at runtime (in an initializer or constructor) and cannot be reassigned afterward.
> Answer is not provided in the source interview list; see Further Reading.

> [!QUESTION]- What is the difference between the equality operator and Equals for value and reference types?
> `Equals` is a (virtual) method that can represent value equality; for value types it often compares field values.
> The equality operator for most reference types defaults to reference equality unless overloaded; for some types like `string` it is overloaded to compare contents.
> For reference types, the equality operator defaults to reference equality but can be overloaded; `Equals` is a virtual method often overridden for value-like equality.
> For value types, `Equals` compares values (often field-by-field), while the equality operator exists only when the type provides it (built-in numeric types do; structs can overload it).

> [!QUESTION]- What is an indexer?
> A member (`this[...]`) that enables array-like access syntax on an object.

> [!QUESTION]- What relationship does inheritance represent, and what does an interface represent?
> Inheritance represents "is a" between derived and base class.
> An interface represents a contract/capability; implementing it means the type can be substituted where that interface is expected.

> [!QUESTION]- How does an interface differ from an abstract class?
> An interface is primarily a contract and supports multiple implementations.
> An abstract class can hold state and shared code but forces single inheritance.

> [!QUESTION]- What is an interface?
> A contract that describes required members. Types implement interfaces to provide behavior and enable polymorphism.

> [!QUESTION]- What is method overloading?
> It is having multiple methods with the same name but different parameter lists; the compiler resolves the correct one at compile time.

> [!QUESTION]- What is method overriding?
> It is redefining a base virtual/abstract member in a derived class using `override`, enabling runtime polymorphism.

> [!QUESTION]- What is a nullable type?
> It's a type that can also represent `null`, meaning "no value" (for example `int?`).

> [!QUESTION]- Name the OOP principles and explain each.
> Encapsulation (hide state behind behavior), inheritance (derive from a base type), polymorphism (common interface with multiple implementations), and abstraction (expose essentials, hide details).

> [!QUESTION]- What does object-oriented programming mean?
> It's a programming paradigm where you model behavior and state as objects, using encapsulation, inheritance/interfaces, and polymorphism to manage complexity.

> [!QUESTION]- What is the difference between passing input by value and by reference?
> By value passes a copy (value or reference).
> By reference (`ref`/`out`/`in`) passes an alias to the caller's variable so the callee can read it and (except `in`) modify it.
> When passing a value type by value, a copy of the data is created.
> When passing a reference type by value, a copy of the reference is created, but both point to the same object.
> Using the ref keyword creates a reference to the original variable, allowing the method to modify the original value, whether it's a value or reference type.

> [!QUESTION]- What is pattern matching? What do is and as do?
> Pattern matching checks a value against patterns and can extract data.
> `is` tests type/patterns (and can assign a typed variable).
> `as` performs a safe reference conversion and returns `null` if it fails.

> [!QUESTION]- How can we implement polymorphism?
> Through interfaces and base classes with virtual/override (runtime polymorphism), and through overloading and generics (compile-time polymorphism).

> [!QUESTION]- What kinds of polymorphism do you know?
> Static (compile-time, e.g. method/operator overloading) and dynamic (runtime, via overriding/virtual dispatch).

> [!QUESTION]- Can we forbid overriding?
> Yes. Mark the overriding member as `sealed override`.

> [!QUESTION]- What are properties and why do we need them?
> Properties expose data through accessors so you can encapsulate validation, invariants, and implementation details while keeping a stable public API.

> [!QUESTION]- What is a record?
> A C# type intended for value-like models, providing value-based equality and concise syntax, with features like `with` and deconstruction.

> [!QUESTION]- How can we return multiple values from a method without using collections?
> Use tuples (ValueTuple), `out` parameters (often in Try methods), or return a dedicated type (record/class/struct) that groups the values.
> Use a tuple return (`ValueTuple`) or `out` parameters.

> [!QUESTION]- Can we prohibit inheriting from a class?
> Yes. Mark the class as `sealed`.

> [!QUESTION]- If a class is sealed but we need to add a new method, how can we do it without changing the class?
> You cannot add a real instance method to an existing type without changing its source. Options:
> 
> - If you own the code: modify the class (sealing is about inheritance, not about editing the type).
> - Without changing the class: add an extension method (syntax sugar over a static method), or wrap the sealed type (Adapter/Decorator) and expose a new API.
> 
> ```csharp
> public static class TokenValidatorExtensions
> {
>     public static bool ValidateOrThrow(this TokenValidator v, string token)
>         => v.Validate(token) ? true : throw new InvalidOperationException("Invalid token");
> }
> ```

> [!QUESTION]- What is a static class?
> A class marked `static` that cannot be instantiated or inherited, and can contain only static members.

> [!QUESTION]- What is a static constructor?
> A parameterless constructor that initializes static state and runs automatically once, before the type is first used.

> [!QUESTION]- What do all classes inherit from in C#?
> From `System.Object` (alias: `object`).

> [!QUESTION]- Are tuples reference types or value types in .NET?
> `System.ValueTuple` is a value type.
> `System.Tuple` is a reference type.

> [!QUESTION]- What is a tuple?
> It is a fixed-size grouping of values. In C# the common form is `ValueTuple` with syntax like `(int Sum, int Count)`.
> A tuple is a fixed-size grouping of values (usually `ValueTuple` in modern C#) that is handy for passing or returning multiple values.

> [!QUESTION]- Can a class implement two interfaces with methods of the same name?
> Yes. If you need different behaviors, use explicit interface implementation.

> [!QUESTION]- What are the different uses of new and new()?
> It creates instances (including anonymous types), can explicitly hide inherited members (`new` modifier), and can be used as a generic constraint (`where T : new()`).

> [!QUESTION]- What are value types vs reference types in C#? What is the difference?
> Value types store their data directly and are copied by value on assignment.
> Reference types store a reference to an object; assignment copies the reference, so multiple variables can point to the same object.
> Value types contain the actual data and are typically stored on the stack, while reference types store a reference to data on the heap.
> Value types are copied when assigned, whereas reference types share the same object instance.
> Value types include primitives and structs, while reference types include classes, interfaces, and delegates.
> Value types contain data directly, are typically allocated on the stack when local variables, cannot be null unless nullable, and assignment creates a copy.
> Reference types store a reference to data, are allocated on the heap, can be null, and assignment copies the reference but not the actual data.

> [!QUESTION]- What are covariance, contravariance, and invariance?
> They describe assignment rules for generic types.
> Covariance (`out`) allows substituting a more derived type for outputs, contravariance (`in`) allows a less derived type for inputs, and invariance allows no substitution.

> [!QUESTION]- Can a struct be stored on the heap? How?
> Yes.
> A struct is stored wherever its containing variable is stored: inside a heap object as a field, or on the heap when boxed to `object`/an interface (and sometimes when captured by a closure).
> Locals are typically on the stack.
> 
> In the .NET Framework and .NET Core, structures are usually stored on the stack, but there are several cases where they can be placed on the heap:
> 
> 1. **Storing a structure as a class field:**
>     - If a structure is a field in a class, and that class is stored in the heap, then the structure will also be stored in the heap. For example: Here `myStructField` will be stored in the heap as `myObject` is stored in the heap.
> 
>         ```csharp
>         public class MyClass
>         {
>             public MyStruct MyStructField;
>         }
> 
>         MyClass myObject = new MyClass();
>         ```
> 
> 2. **Using a structure in an array that is stored in the heap:**
>     - If an array of structures is placed in the heap, then the structures themselves will also be in the heap. Example: Here every element of the `structArray` array will be stored in the heap.
> 
>         ```csharp
>         MyStruct[] structArray = new MyStruct[10];
>         ```
> 
> 3. **Boxing:**
>     - Boxing is the process by which a meaningful type (struct) is converted into an object (reference type). When the structure is boxed, it is placed in the heap. Example:
> 
>         ```csharp
>         MyStruct myStruct = new MyStruct();
>         object boxedObject = myStruct; // Boxing: myStruct is now on the heap
>         ```
> 
> It is important to note that storing structures in the heap can have a negative impact on performance, as it can cause additional packing/unpacking overhead and increased memory usage. Structures are usually preferred on the stack where they can be more efficient.

> [!QUESTION]- Why might you need ref for reference types?
> To allow the callee to reassign the caller's variable (change which object it references) rather than only mutating the referenced object's state.
> Using ref with reference types allows you to reassign the original reference, not just modify its properties.
> This is useful when you want to initialize or replace an object reference based on some logic.
> For example, in a factory method that might return different implementations, or when implementing the TryPattern where you want to output a new object only on success.

> [!QUESTION]- Why can't virtual methods be static?
> Because virtual dispatch depends on the runtime type of an instance, while static members have no instance and are resolved on the declaring type.

> [!QUESTION]- What is the difference between abstract and virtual?
> `abstract` has no implementation and must be overridden.
> `virtual` provides a default implementation and may be overridden.

> [!QUESTION]- What is the difference between new and override?
> `override` participates in runtime polymorphism and replaces a virtual base member.
> `new` hides a member and is resolved using the variable's compile-time type.

> [!QUESTION]- What are ref, out, in, and params?
> `ref` and `out` pass variables by reference (with different initialization rules).
> `in` passes by reference readonly.
> `params` enables variadic arguments collected into an array.
> `ref` passes a variable by reference for read/write (caller initializes it).
> `out` passes by reference for output (callee must assign).
> `in` passes by reference as readonly.
> `params` allows a variable number of arguments collected into an array.

> [!QUESTION]- What are generics in C#, and why are they useful?
> Generics allow the creation of type-safe classes, interfaces, and methods that operate on a type parameter.
> They enable code reuse with type safety, eliminate the need for boxing/unboxing when using collections, and improve performance.
> Generics also provide compile-time type checking and reduce casting errors.

> [!QUESTION]- How would you implement immutable value semantics for a complex domain object in C#?
> For C# 9 and newer, I'd use records which provide built-in immutability and value-based equality.
> For earlier versions, I'd create an immutable class with readonly fields, implement IEquatable<T>, override Equals(), GetHashCode(), and equality operators.
> I'd provide a "WithX" method pattern or a builder for creating modified instances.
> Finally, I'd implement proper structural equality by comparing all relevant fields and handling nulls correctly.

> [!QUESTION]- How does the HashCode method work for object?
> By default, the **`HashCode`** method uses an internal algorithm that is based on the address of the object in memory. This algorithm is based on hash code **combining**, which provides a more efficient and uniform distribution of hash codes.
> 
> Briefly, the algorithm can be described as follows:
> 
> 1. Hash**initialization**: The hash code is initialized with some initial value (usually a prime number, such as 17 or 23).
> 2. **Combining** hashes: The hash code of an object is computed by combining the hashes of its constituent parts. For example, if an object contains multiple fields, the hashes of these fields are combined into one common hash code.
> 3. **Multiplication by a prime number**: The resulting hash code is multiplied by some prime number (e.g., 31 or 59).
> 4. **Combining with new** data: When new data is added (e.g., when combining hashes of additional objects), their hashes are also combined with the existing hash code of the object.
> 5. **Return hash**: The resulting hash code is returned as the result of the **`HashCode`** method.
> 
> However, this algorithm can be overridden in derived classes to better manage object hash codes based on their contents.
> Two objects that are equal should return identical hash codes.
> However, the reverse is not true: identical hash codes do not imply object equality, since different (unequal) objects can have identical hash codes.

> [!QUESTION]- Explain the performance implications of passing large structs by value versus by reference.
> Passing large structs by value results in copying the entire struct, which can be expensive for large structs (>16 bytes).
> This increases stack usage and CPU time for copying.
> Using `in`, `ref`, or `readonly ref` parameters avoids copying by passing a reference to the struct.
> For method returns, consider using `ref` returns or changing to a class if the struct is large and frequently returned.

> [!QUESTION]- Is it possible to store an object on the stack?
> Yes, but you should not use it in real life, because the main advantage of stack is its speed, and the method described below will be 40-50 times slower.
> 
> [Article](https://habr.com/ru/articles/428676/)

> [!QUESTION]- How would you design a custom collection that efficiently stores value types without boxing?
> I would use generics to create a strongly-typed collection like `List<T>` where T is the value type.
> For maximum performance, I'd consider using arrays or Span<T> internally, avoid LINQ in critical paths, and implement custom enumerators to prevent boxing.
> For large collections, I might also consider memory pooling or custom memory management to reduce GC pressure.

        

## References and Further Reading

- https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/types/
- https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types
- https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/reference-types
- https://docs.microsoft.com/en-us/dotnet/framework/performance/performance-tips
- https://csharpindepth.com/

## Further Reading
