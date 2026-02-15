---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Ready To Repeat

---
# Intro

> **9.2.5 The string type**
> 
> 
> The string type is a sealed class type that inherits directly from object. Instances of the string class represent Unicode character strings.Values of the string type can be written as string literals (§7.4.5.6).The keyword string is simply an alias for the predefined class System.String
> 

## String

Key characteristics of strings in .NET:

1. They are reference types.
2. They are immutable. Once you create a string, you can no longer change it (in the normal/safe way). Each call to a method of this class returns a new string, and the previous string becomes garbage-collection eligible.
3. They override `object.Equals`, so it compares the characters in the strings rather than the reference values.

### Strings are reference types

Strings are real reference types: they are a sealed `System.String` class that inherits directly from `object`, so they always live on the heap. Many people confuse them with value types because they behave similarly (for example, they are immutable and are compared by value rather than by reference), but it is important to remember that `string` is a reference type.

### Strings are immutable

Strings are immutable. This is not accidental. String immutability has many advantages:

- The string type is thread-safe, because no thread can change a string's contents.
- Using immutable strings can reduce memory pressure because there is no need to store two identical instances. In such cases, less memory is used and comparisons can be faster because they may only need to compare references. The mechanism that enables this in .NET is string interning (the string pool), which we will discuss shortly.
- When passing an immutable argument to a method, we do not need to worry that it will be changed (unless it is passed as `ref` or `out`).

Data structures can be divided into two types: ephemeral and persistent. Ephemeral data structures store only their latest version. Persistent data structures preserve all previous versions when modified. The latter are effectively immutable because their operations do not modify the structure in place; instead, they return a new structure based on the previous one.

Given that strings are immutable, they could be persistent, but they are not. In .NET, strings are ephemeral. For more details on why this is the case, see Eric Lippert's explanation at this [link](http://blogs.msdn.com/b/ruericlippert/archive/2011/08/08/strings-immutability-and-persistence.aspx.)

### Strings override Object.Equals

The `String` class overrides `object.Equals`, so comparisons are performed by value rather than by reference. Many developers are grateful that `String` also overloads the `==` operator, because code that uses `==` to compare strings looks more elegant than calling a method.

```csharp
if (s1 == s2)
```

compared to

```csharp
if (s1.Equals(s2))
```

By the way, in Java the `==` operator compares references, and to compare strings character-by-character you need to use `string.equals()`.

### String interning

A simple example: code that reverses a string.

```csharp
var s = "Strings are immutuble";
int length = s.Length;
for (int i = 0; i < length / 2; i++)
{
var c = s[i];
   s[i] = s[length - i - 1];
   s[length - i - 1] = c;
}
```

Obviously, this code will not compile. The compiler will complain about these lines because we are trying to change the contents of a string. Indeed, any method of the `String` class returns a new string instance instead of modifying its contents.

In fact, you can modify a string, but you have to resort to unsafe code:

```csharp
var s = "Strings are immutable";
int length = s.Length;
unsafe
   {
fixed (char* c = s)
     {
for (int i = 0; i < length / 2; i++)
       {
var temp = c[i];
         c[i] = c[length - i - 1];
         c[length - i - 1] = temp;
       }
      }
   }
```

After executing this code, as expected, the string will contain

**elbatummi era sgnirtS**.

The fact that strings are still mutable leads to a very interesting edge case.

It is related to string interning.

> [!TIP]
> *String interning* is a mechanism where identical literals are represented by a single object in memory.

Without going too deep into details, the idea of string interning is as follows: within a process (specifically a process, not an application domain) there is an internal hash table where keys are strings and values are references to them. During JIT compilation, literal strings are added to this table (each string appears only once). At runtime, references to literal strings are assigned from this table. You can add a string to the internal table at runtime using `string.Intern`, and you can check whether a string is in the internal table using `string.IsInterned`.

```csharp
var s1 = "habrahabr";
var s2 = "habrahabr";
var s3 = "habra" + "habr";

Console.WriteLine(object.ReferenceEquals(s1, s2)); //true
Console.WriteLine(object.ReferenceEquals(s1, s3)); //true
```

It is important to note that by default only string literals are interned. Since interning is implemented with an internal hash table, JIT compilation performs lookups in it, which takes time, so if all strings were interned it would negate the optimization. When compiling to IL, the compiler concatenates literal strings because there is no need to keep them in parts, so the second equality returns `true`. So what is the edge case? Consider the following code:

```csharp
var s = "Strings are immutable";
int length = s.Length;
unsafe
 {
fixed (char* c = s)
   {
for (int i = 0; i < length / 2; i++)
     {
var temp = c[i];
      c[i] = c[length - i - 1];
      c[length - i - 1] = temp;
     }
   }
 }
Console.WriteLine("Strings are immutable");
```

It seems obvious that this code should print **Strings are immutable**. However, it does not. The code prints **elbatummi era sgnirtS**. The reason is string interning: by modifying the string `s`, we change its contents, and because it is a literal it is interned and represented by a single shared string instance.

### Performance considerations

Interning has a negative side effect: the reference to an interned `String` object held by the CLR can persist after the application (and even the application domain) has finished. Therefore, large literal strings should be avoided, or if necessary interning should be disabled by applying the `CompilationRelaxations` attribute to the assembly.

## StringBuilder

## Questions

> [!QUESTION]- What is string interning?
> It's a mechanism where identical strings share a single instance in an intern pool (especially string literals), reducing duplication. You can explicitly intern strings via `string.Intern`.

> [!QUESTION]- What are the differences between `string` and `StringBuilder`? When should you use `StringBuilder`?
> `string` is immutable, so repeated concatenation can allocate many intermediate strings. `StringBuilder` is mutable and is typically preferred when building strings in loops or when many appends are performed.
>
> **`string`** and **`StringBuilder`** are two types used for working with strings in C#, but they differ significantly in how they store and manipulate string data, which makes them suitable for different scenarios.
>
> 1. **Immutability vs mutability**:
>     - **`string`** is immutable. This means that after a string is created, its content cannot be changed. Any modification creates a new string instance in memory.
>     - **`StringBuilder`** is mutable and is designed for efficient string construction and modification. You can append, modify, and delete characters or substrings inside **`StringBuilder`** without creating new string instances.
> 2. **Performance**:
>     - Using **`string`** for many modifications can lead to creating many temporary objects in memory, which can hurt performance and memory usage. **`StringBuilder`** is designed to minimize these temporary allocations and provide better performance for repeated changes.
> 3. **When to use**:
>     - **`string`** is suitable for small strings or situations where the string does not change (or changes rarely).
>     - **`StringBuilder`** is better when you need to build strings with many appends/changes, for example when generating long SQL queries, XML documents, JSON strings, and so on.
>
> Use it when you need to repeatedly modify or build strings inside loops or in scenarios where performance and memory efficiency matter. This is especially useful when working with large amounts of data, such as generating long text output, SQL queries, or XML/JSON structures.
>
> When strings are effectively static and change rarely, **`StringBuilder`** may be unnecessary, and **`string`** is usually the better choice.

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
