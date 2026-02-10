---
topic: ["Programming"]
subtopic: ["NET", "C#", "Fundamentals"]
level: ["1"]
priority: medium
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

![image.png](Assets/01%20Programming/All%20Images/image.png)

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

- **Common**
    - What are generics in C#, and why are they useful?
        
        > [!TIP]
        >
        > Generics allow the creation of type-safe classes, interfaces, and methods that operate on a type parameter. They enable code reuse with type safety, eliminate the need for boxing/unboxing when using collections, and improve performance. Generics also provide compile-time type checking and reduce casting errors.

        
    - How would you implement immutable value semantics for a complex domain object in C#?
        
        > [!TIP]
        >
        > For C# 9 and newer, I'd use records which provide built-in immutability and value-based equality. For earlier versions, I'd create an immutable class with readonly fields, implement IEquatable<T>, override Equals(), GetHashCode(), and equality operators. I'd provide a "WithX" method pattern or a builder for creating modified instances. Finally, I'd implement proper structural equality by comparing all relevant fields and handling nulls correctly.

        
- **Class vs Structure**
    - Whats the difference between `class` and `structure`?
        
        > [!TIP]
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
        > [C# NET: Class vs Struct или в чём различия между Классом и Структурой - О сложном просто](https://www.calabonga.net/blog/post/c-net-4-0-class-vs-struct-ili-v-chem-razlichiya-mezhdu-klassom-i-strukturoi)

        
    - Explain how HashCode method works for object?
        
        > [!TIP]
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
        > However, this algorithm can be overridden in derived classes to better manage object hash codes based on their contents. Two objects that are equal should return identical hash codes. However, the reverse is not true: identical hash codes do not imply object equality, since different (unequal) objects can have identical hash codes.

        
- **Value vs Reference Types**
    - What is the difference between value types and reference types in C#?
        
        > [!TIP]
        >
        > Value types contain the actual data and are typically stored on the stack, while reference types store a reference to data on the heap. Value types are copied when assigned, whereas reference types share the same object instance. Value types include primitives and structs, while reference types include classes, interfaces, and delegates.

        
    - What are the key differences between value types and reference types in C#?
        
        > [!TIP]
        > Value types contain data directly, are typically allocated on the stack when local variables, cannot be null unless nullable, and assignment creates a copy. Reference types store a reference to data, are allocated on the heap, can be null, and assignment copies the reference but not the actual data.

        
    - Explain the difference between passing by value and passing by reference, and how it affects value and reference types.
        
        > [!TIP]
        > When passing a value type by value, a copy of the data is created. When passing a reference type by value, a copy of the reference is created, but both point to the same object. Using the ref keyword creates a reference to the original variable, allowing the method to modify the original value, whether it's a value or reference type.

        
    - What is boxing and unboxing in C#? When might it occur, and what are its performance implications?
        
        > [!TIP]
        > Boxing is converting a value type to a reference type by wrapping it in an object, while unboxing is the reverse process. Boxing occurs when passing value types to methods expecting object parameters or when adding value types to collections of objects. It's expensive as it involves memory allocation, copying, and later garbage collection.

        
    - Why might you use ref with reference types even though they're already references? Provide a real-world example.
        
        > [!TIP]
        > Using ref with reference types allows you to reassign the original reference, not just modify its properties. This is useful when you want to initialize or replace an object reference based on some logic. For example, in a factory method that might return different implementations, or when implementing the TryPattern where you want to output a new object only on success.

        
    - Explain the performance implications of passing large structs by value versus by reference.
        
        > [!TIP]
        >
        > Passing large structs by value results in copying the entire struct, which can be expensive for large structs (>16 bytes). This increases stack usage and CPU time for copying. Using `in`, `ref`, or `readonly ref` parameters avoids copying by passing a reference to the struct. For method returns, consider using `ref` returns or changing to a class if the struct is large and frequently returned.

        
- **Stack vs Heap**
    - Is it possible to store an object in a stack?
        
        > [!TIP]
        > Yes, but you should not use it in real life, because the main advantage of stack is its speed, and the method described below will be 40-50 times slower.
        >
        > [Ломаем фундаментальные основы C#: выделение памяти под ссылочный тип на стеке](https://habr.com/ru/articles/428676/)

        
    - Is it possible to make a structure stored in a heap?
        
        > [!TIP]
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
        >
        >         ```
        >
        > 3. **Boxing:**
        >     - Boxing is the process by which a meaningful type (struct) is converted into an object (reference type). When the structure is boxed, it is placed in the heap. Example:
        >
        >         ```csharp
        >         MyStruct myStruct = new MyStruct();
        >         object boxedObject = myStruct; // Упаковка, myStruct теперь в куче
        >
        >         ```
        >
        > It is important to note that storing structures in the heap can have a negative impact on performance, as it can cause additional packing/unpacking overhead and increased memory usage. Structures are usually preferred on the stack where they can be more efficient.

        
- **Boxing & Unboxing**
    - Explain what boxing and unboxing are in C#.
        
        > [!TIP]
        >
        > Boxing is the process of converting a value type to a reference type by wrapping it in an object, which involves allocating memory on the heap. Unboxing is the reverse process of extracting the value type from the boxed object. Boxing occurs when assigning a value type to an object variable, and unboxing requires explicit casting.

        
    - How would you design a custom collection that efficiently stores value types without boxing?
        
        > [!TIP]
        >
        > I would use generics to create a strongly-typed collection like `List<T>` where T is the value type. For maximum performance, I'd consider using arrays or Span<T> internally, avoid LINQ in critical paths, and implement custom enumerators to prevent boxing. For large collections, I might also consider memory pooling or custom memory management to reduce GC pressure.

        

## References and Further Reading

- https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/types/
- https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types
- https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/reference-types
- https://docs.microsoft.com/en-us/dotnet/framework/performance/performance-tips
- https://csharpindepth.com/

## Further Reading
