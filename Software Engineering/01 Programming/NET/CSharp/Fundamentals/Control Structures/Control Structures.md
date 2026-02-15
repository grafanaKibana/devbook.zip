---
topic:
  - Programming
subtopic:
  - NET
level:
  - "1"
priority: Medium
status: Not-Started
tags:
  - FolderNote
---
# Foreach
### Usage

In `foreach`, you can use only types that implement `System.Collections.IEnumerable` or `System.Collections.Generic.IEnumerable<T>`.
Or any types that satisfy the following conditions:

1. Include a public parameterless `GetEnumerator` method that returns a class, struct, or interface type;
2. The return type of `GetEnumerator` must have a public `Current` property and a public parameterless `MoveNext` method that returns `bool`.

### Internals

`foreach` has a few interesting nuances:

1. If we iterate over a collection whose size is known at compile time (for example, an array), then `foreach` will compile into a regular `for` loop where the counter is bounded by the collection size.
2. For dynamic collections, `foreach` compiles into code where we obtain an `Enumerator` with a `MoveNext()` method that defines how we move through the collection (for one-dimensional collections this is trivial, but if we want to iterate over a graph or a tree, we need to define how we traverse it).
    
    ```csharp
    var enumerator = collection.GetEnumerator(); // Get the enumerator
    while (enumerator.MoveNext()) // Move to the next element
    {
        var currentElement = enumerator.Current; // Get the current element
        // Perform operations on the current element
    }
    ```
    

[How is foreach implemented in C#?](https://stackoverflow.com/questions/11179156/how-is-foreach-implemented-in-c)

## Questions

> [!QUESTION]- How do you handle potential errors in code?
> By using `try`/`catch`/`finally` (and sometimes `using`/`await using`) to handle exceptions and guarantee cleanup.
> Use `try`/`catch`/`finally` to handle exceptions and to guarantee cleanup.

> [!QUESTION]- What is recursion?
> It is a technique where a function calls itself, typically with a smaller input, until reaching a base case that terminates the process.
> A technique where a function calls itself (usually with a smaller input) until it reaches a base case that stops further calls.

> [!QUESTION]- When might `finally` not execute?
> When execution is interrupted in a way that prevents normal unwinding: process termination/crash, indefinite blocking or non-terminating code paths, `Environment.FailFast()`, and in practice `StackOverflowException`.
> Early process termination due to an OS failure or critical application error.
> When execution does not unwind normally: abrupt process termination/crash/kill, `Environment.FailFast()`, a `StackOverflowException`, or code paths that never complete (infinite loop, non-terminating recursion, deadlock/permanent blocking).

> [!QUESTION]- What types can you use in `foreach`?
> Answer is not provided in the source interview list; see the `foreach` section above.

> [!QUESTION]- How is `foreach` implemented under the hood?
> Answer is not provided in the source interview list; see the `foreach` section above.

# Methods()
## Input

- `ref`
    
    Yes, reference types are passed to methods by value (the reference), which means that when you change an object's state inside a method, those changes will be visible in the calling code after the method returns. However, the **`ref`** keyword is important in the following cases:
    
    1. **Changing the reference itself:**
        - **`ref`** allows you to change the reference in the calling code, for example to assign a new object. Without **`ref`**, this is not possible.
        
        ```csharp
        void ModifyReference(ref MyClass obj)
        {
            obj = new MyClass();  // Change the reference to a new object
        }
        
        MyClass myObj = new MyClass();
        ModifyReference(ref myObj); // Change the reference itself
        ```
        
    2. **Passing a variable to be modified:**
        - If a variable should be modified inside a method (and the changes should be visible to the caller), you can use **`ref`** to indicate that the method may change the variable.
        
        ```csharp
        void InitializeAndModify(ref int value)
        {
            value = 10;  // Initialize the variable and change its value
        }
        
        int num = 0;
        InitializeAndModify(ref num); // Pass a variable by ref
        ```
        
- `in`
    
    **`in`** is a C# keyword that indicates a method parameter is passed by value, but cannot be modified inside the method. This means the parameter is read-only within the method.
    
    Using an **`in`** parameter has several uses:
    
    1. **Communicating immutability intent:**
        - Using **`in`** explicitly communicates the intent not to modify the argument inside the method, which can improve readability and prevent accidental changes.
    2. **Avoiding expensive copies for large structs:**
        - When passing value types (for example, large structs) via **`in`**, you avoid copying the data, which can improve performance.
    
    Example of using an **`in`** parameter:
    
```csharp
public void ProcessData(in int value)
    {
        // value = 10; // Compile-time error: cannot modify an in parameter
        Console.WriteLine(value);
    }
    
    ```
    
    In this example, the **`value`** parameter is passed by value, but with a restriction that it cannot be modified inside **`ProcessData`**.
    
    Thus, an **`in`** parameter is useful both for explicitly indicating the intent not to modify the argument and for reducing overhead when working with large structs.
    

### Questions

> [!QUESTION]- Why might you need `ref` for reference types if reference types are already passed by reference?
> See the `ref` section above.

> [!QUESTION]- What is an `in` parameter used for?
> See the `in` section above.

## Output

### yield

**`yield`** is a C# keyword used to create iterators. An iterator lets you enumerate a sequence one element at a time without loading all elements into memory up front. This is especially useful when working with data that would otherwise require large amounts of memory.

How **`yield`** works:

1. **Iterator method**: **`yield`** is used inside a method that returns **`IEnumerable`** or **`IEnumerable<T>`**, marking it as an iterator method.
2. **Creating an iterator object**: When you call an iterator method, it does not execute immediately. Instead, an iterator object is created and returned to the caller.
3. **Enumerating elements**: When the caller starts iterating, the iterator method begins executing. It returns each element one by one using **`yield return`**.
4. **Pause and resume**: After each **`yield return`**, the iterator method is suspended, and it resumes when the next element is requested.
5. **End of iteration**: When the iterator reaches its end state, it returns control to the caller.

Example of using **`yield`** to create an iterator:

```csharp
public IEnumerable<int> CountNumbers(int start, int end)
{
    for (int i = start; i <= end; i++)
    {
        yield return i; // Returns elements one by one during enumeration
    }
}

// Usage
foreach (var number in CountNumbers(1, 5))
{
    Console.WriteLine(number);
}

```

In this example, **`CountNumbers`** returns a sequence of numbers from **`start`** to **`end`** using **`yield return`**, which allows enumerating the elements without creating the full array ahead of time.

[Yield: what, where, and why](https://habr.com/ru/post/311094/)

### Questions

> [!QUESTION]- What is `yield` and how does it work?
> See the `yield` section above.

# Namespace
A namespace in C# is a mechanism for organizing and structuring code. Namespaces are used to group types, classes, methods, and other code elements into logical blocks. They help reduce the likelihood of naming conflicts between different parts of a program and make code more organized and readable.

The main purposes of namespaces:

1. **Naming uniqueness**: Namespaces provide isolated scopes for code elements. This allows using the same names in different namespaces without conflicts.
2. **Code organization**: Namespaces help organize code into logical blocks, which makes navigation and maintenance easier, especially in large projects.
3. **Readability and understanding**: Well-organized code using namespaces is easier for developers to understand and maintain.
4. **Reusability**: Namespaces can group libraries and components, making them easier to reuse across projects.

Example of defining and using a namespace:

```csharp
namespace MyProject.Utilities
{
    public class MathUtility
    {
        public static int Add(int a, int b)
        {
            return a + b;
        }
    }
}

namespace MyProject
{
    class Program
    {
        static void Main()
        {
            int result = Utilities.MathUtility.Add(5, 3);
            Console.WriteLine(result);
        }
    }
}

```

In this example, the **`MyProject.Utilities`** namespace is used to organize the **`MathUtility`** class. Namespaces help developers easily find and use this class in other parts of the program.

### Questions

> [!QUESTION]- What is a namespace? Why do we need it?
> See the Namespace section above.

# try/catch/finally

# Assembly
## Refrection

Reflection in C# is the ability to inspect and interact with a program's code at runtime. This includes retrieving information about types, methods, and properties; creating objects and invoking methods dynamically; and working with attributes. For example:

1. **Dynamic object creation and method invocation:**
    - Creating class instances and calling their methods dynamically based on user input or other conditions.
2. **Viewing and modifying object properties at runtime:**
    - Reading and changing property values depending on the runtime context.
3. **Working with attributes:**
    - Using attributes to annotate classes, methods, and properties, and then retrieving that metadata at runtime.
4. **Managing exception handling:**
    - Inspecting and handling exceptions that occur when invoking methods, based on information about the methods and their attributes.
5. **Object serialization and deserialization:**
    - Automating serialization to JSON/XML and converting back by using reflection to access fields and properties.
6. **Testing and debugging tools:**
    - Building tools for testing, performance analysis, and debugging using information about program types and methods.

### Questions

> [!QUESTION]- What is reflection?
> See the Reflection section above.

## Links


# Whats next

:LiArrowUpLeft: `dv: link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

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

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");
  
  if (children.length) {
	  dv.header(2, "Topics");
	  dv.list(children.map(p => p.file.link));
  }
  if (pages.length) {
	  dv.header(2, "Pages");
	  dv.list(pages.map(p => p.file.link));
  }
  
```
