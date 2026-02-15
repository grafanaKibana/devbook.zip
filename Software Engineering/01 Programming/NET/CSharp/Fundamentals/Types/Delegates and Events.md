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

## Deeper Explanation

## Delegates

A delegate is a type that provides an object-oriented way to work with a method as a value (like a variable). A more familiar analogue is a function pointer, a functor, or even an interrupt vector.

A delegate is a type that matches a specific function signature. By declaring a variable of a delegate type, you can store a reference to a static or instance method in it, pass it as an argument, and invoke it.

A classic example of using delegates is sorting a list of objects by some field value. You pass a *delegate* to the sorting method that computes a *sort key* for an object (that is, extracts the field value).

### Variance

Each type parameter of a generic delegate or interface can be marked as covariant or contravariant. This does not introduce undesirable consequences, but it allows your delegates to be used in more scenarios and lets you convert a generic delegate variable to the same delegate type with a different type parameter.

Type parameters can be:

- **Invariant**. The type parameter cannot vary.
- **Contravariant**. The type parameter can be substituted with a less derived (more general) type. In C#, a contravariant type parameter is marked with **`in`**. It can appear only in input positions (for example, method arguments). Example: `Action<object>` can be used where `Action<string>` is expected.
- **Covariant**. The type parameter can be substituted with a more derived (more specific) type. In C#, a covariant type parameter is marked with **`out`**. It can appear only in output positions (for example, return values). Example: `IEnumerable<string>` can be used where `IEnumerable<object>` is expected.

> [!TIP]
> Variance only works when the compiler can establish that reference conversions between types are valid. In other words, variance does not apply to value types because it would require boxing.

### Detailed Example

First, let's look at what variance is. Suppose we have two classes, `Car` and `BMW`. Obviously, `BMW` is a subclass of `Car`: every BMW is a car. People often say: "everywhere you use `Car`, you can also use `BMW`." That is almost true, but not quite.

**Example:** if you have a list of cars, you cannot use a list of BMWs in its place. Why? Suppose you have `List<BMW>` and you try to use it as a list of cars. Then, since it is a list of *cars*, you could add a ~~Zaporozhets~~ Lanos to it, right? This is where the problems begin. If your code says:

```csharp
List<BMW> bmws = new List<BMW>();
List<Car> cars = bmws;   // because a list of BMWs is a list of cars
cars.Add(new Lanos());
BMW bmw = bmvs[0];       // oops.

```

Look closely at this code and think about it: it illustrates the problem. (And it will not compile: C# is designed to prevent this kind of issue.) The problem is *writing* into the list. If we can add an arbitrary car to the list, we can break the guarantees provided by the type system.

If we had a list that was *read-only*, there would be no problem:

```csharp
IEnumerable<BMW> bmws = new List<BMW>() { new BMW() };
IEnumerable<Car> cars = bmws;   // this is allowed
//cars.Add(new Lanos());    // <-- will not compile
```

So what do we get? Even though a BMW is a car, a *list* of BMWs is not necessarily a list of cars. But a read-only sequence of BMWs can be treated as a sequence of cars.

OK?

Now back to variance. We talk about covariance in the general sense when something changes in an *analogous* way. With class inheritance, we can use `BMW` instead of `Car`, and *in the same way* we can use `IEnumerable<BMW>` instead of `IEnumerable<Car>`.

Okay, that was a long introduction. Now back to the topic: covariance of delegates. Suppose we have a delegate that depends on the `Car` type. If we replace `Car` with `BMW` in its definition, can we use the new delegate instead of the old one?

Let's reason logically. If we have this delegate:

```csharp
public delegate Car Replace(Car original);
```

(it takes a `Car` and returns another `Car` instance), can we substitute a function that matches a delegate of this form instead?

```csharp
public BMW MyReplace(BMW original) { ... }
```

? Of course not, because the delegate can accept any car, while our function wants only a BMW. So there is no covariance here: you cannot use such a function where this delegate is required.

But if the variant type (that is, `Car`) appears only in the return position:

```csharp
public delegate Car Create();

```

then we can use a function like this instead:

```csharp
public BMW CreateBmw() { ... }

```

(if any car is acceptable, then a BMW is acceptable too).

This is delegate covariance: where your code requires a delegate, you can provide a covariant delegate instead.

Example code that uses this:

```csharp
// a function that takes a delegate:
Car PrepareCar(Create carCreator)
{
    Car car = carCreator();
    car.ManufacturingDate = DateTime.Now;
    car.Mileage = 0;
    return car;
}

// a function that is covariant with Create: it returns BMW instead of Car
BMW BmwFactory()
{
    var bmw = new BMW();
    bmw.EnginePower = 400;
    return bmw;
}

// you can use this function as an argument to PrepareCar
// even though its signature is different:
return PrepareCar(BmwFactory);
```

Contravariance works in the other direction: you can use a delegate that works with a *base* type where a delegate with a derived type is expected. This works for function arguments:

```csharp
delegate double BmwTester(BMW bmw);

void TestAndPublish(BmwTester tester)
{
    var bmw = new BMW();
    double testResult = tester(bmw);
    PublishResult(testResult);
}

double UniversalTester(Car car)
{
    return 5.0;
}

// you can use UniversalTester even though its signature is not an exact match
TestAndPublish(UniversalTester);
```

This works for the same reasons as covariance: if the tester can handle any car type, it can also handle a BMW.

## Events

An *event* is a named delegate that, when invoked, runs all methods with the given signature that are subscribed at the time the event is raised.

In simple terms, it is just a situation: when it happens, certain actions occur.

The advantage of events is clear: the *publisher class that raises the event* does not need to know how many *subscriber classes* will subscribe or unsubscribe. It creates an event for a specific signature by constraining it with a delegate type.

Events are widely used when building custom UI components (buttons, panels, and so on).

## Questions

> [!QUESTION]- What is the difference between Action, Func, and Predicate?
> `Action` returns `void`, `Func` returns a value, and `Predicate<T>` returns `bool` (it is essentially `Func<T, bool>`).
> `Action<...>` returns `void`, `Func<...>` returns a value (last type parameter is the return type), and `Predicate<T>` is a specialized `Func<T, bool>` used to test a condition.
> 
> - `Func<T, ...>` is used when you need to return a value. Many examples can be found in LINQ, for example:
>     - `list.Select(x => x.SomeProperty)`
>     - `list.Where(x => x.SomeValue == someOtherValue)`
>     - `list.Join(otherList, x => x.FirstKey, y => y.SecondKey, ...)`
> - `Action<T>` is used when you do not need to return a value and you just need to perform an action. An example is `List<T>.ForEach`.
> - `Predicate<T>` is a special case of `Func<T, bool>` used when you need to return a boolean value. Examples:
>     - `list.All(x => x >= 0)`
>     - `list.Exists(str => string.IsNullOrEmpty(str))`

> [!QUESTION]- What is an anonymous method?
> An inline implementation of a delegate without a named method.
> It can be written as `delegate (...) { ... }` or, more commonly, as a lambda `(...) => ...`.
> It can capture variables from the outer scope (closure).

> [!QUESTION]- Which built-in delegates do you know in .NET?
> Common ones are `Action`, `Func`, `Predicate`, `EventHandler`, `EventHandler<TEventArgs>`, `Comparison<T>`, `Converter<TInput, TOutput>`.

> [!QUESTION]- What is a delegate? Give examples of usage.
> A delegate is a type-safe way to treat methods as values: you can store a method reference in a variable, pass it around, and invoke it.
> Delegates can also be multicast (invocation lists).
> Common uses: callbacks, LINQ selectors/predicates, and events.

> [!QUESTION]- What does a delegate compile to?
> A delegate type becomes a class derived from `System.MulticastDelegate`, with an `Invoke` method and runtime support for invocation lists.
> The compiler generates a sealed class derived from `System.MulticastDelegate` (and ultimately `System.Delegate`) with an `Invoke` method matching the signature.
> Delegate instances store a target object (or `null` for static methods), a method pointer, and (for multicast delegates) an invocation list.

> [!QUESTION]- What is an event? How is it different from a delegate?
> An event is a delegate with restricted invocation: only the declaring type can raise it, while external code can only subscribe/unsubscribe.
> An event is a member (usually backed by a delegate) that restricts operations from outside the declaring type: external code can only subscribe/unsubscribe (`+=`/`-=`), but cannot invoke the event or overwrite the invocation list.
> A delegate is a normal value that can be invoked and reassigned.

> [!QUESTION]- What are examples of using events?
> Answer is not provided in the source interview list; see Links.

## Links

- https://habr.com/ru/articles/329886/

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
