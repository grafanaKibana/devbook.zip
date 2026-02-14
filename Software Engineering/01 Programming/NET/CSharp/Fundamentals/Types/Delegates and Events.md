---
topic:
  - Programming
subtopic:
  - NET
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
# Intro

## Deeper Explanation

## Delegates

Делегат — тип который предоставляет объектно-ориентированный способ работы с методом как с переменной. Его более привычный аналог — указатель на функцию, функтор, или даже просто вектор прерывания.

Делегат представляет собой тип, соответствующий определённой сигнатуре функции. Объявив переменную делегатного типа, вы можете записать в неё статический или нестатический метод, передать его как аргумент куда-либо, и вызвать.

Классический пример использования делегатов — сортировка списка объектов по значению какого-либо поля. Вы передаёте в сортирующий метод *делегат*, который по объекту вычисляет *ключ сортировки*, то есть, вытаскивает значение поля.

### Вариантность

Каждый из параметров-типов обобщенного делегата или интерфейса должен быть помечен как ковариантный или контравариантный. Это не приводит ни к каким нежелательным последствиям, но позволит применять ваших делегатов в большем количестве сценариев и позволит вам осуществлять приведение типа переменной обобщенного делегата к тому же типу делегата с другим параметром-типом.

Параметры-типы могут быть:

- **Инвариантными**. Параметр-тип не может изменяться.
- **Контравариантными**. Параметр-тип может быть преобразован от класса к классу, производному от него. В языке C# контравариантный тип обозначается ключевым словом **`in`**. Контравариантный параметр-тип может появляться только во входной позиции, например, в качестве аргументов метода. Например `in T` и `T` - `ICollection`, для этого типа мы можем использовать как `ICollection` так и `IList` (наследник `ICollection`) или `List` (наследник `IList`)
- **Ковариантными**. Аргумент-тип может быть преобразован от класса к одному из его базовых классов. В языке С# ковариантный тип обозначается ключевым словом **`out`**. Ковариантный параметр обобщенного типа может появляться только в выходной позиции, например, в качестве возвращаемого значения метода. Например `in T` и `T` - `ICollection`, для этого типа мы можем использовать как `ICollection` так и `IEnumerable`(производный интерфейс `ICollection`)

> [!TIP]
> Вариантность действует только в том случае, если компилятор сможет установить возможность преобразования ссылок между типами. Другими словами, вариантность неприменима для значимых типов из-за необходимости упаковки (boxing).

### Detailed Example

Для начала, давайте глянем, что такое эта самая вариантность. Пусть у нас есть два класса, `Car` и `BMW`. Очевидно, что `BMW` есть подкласс `Car`: каждая бэха является машиной. Обычно при этом говорят так: «везде, где вы используете `Car`, можно использовать и `BMW`». Это на самом деле почти правда, но не совсем.

**Пример:** если у вас есть список машин, вы не можете вместо него использовать список BMW. Почему? А вот почему. Пускай вас есть `List<BMW>`, и вы используете его как список машин. Тогда, раз это список *машин*, в него можно добавить и ~~Запорожец~~ Lanos, правильно? Вот тут-то и начинаются проблемы. Если у вас в коде написано:

```csharp
List<BMW> bmws = new List<BMW>();
List<Car> cars = bmws;   // поскольку список БМВ - это список машин
cars.Add(new Lanos());
BMW bmw = bmvs[0];       // ой.

```

Внимательно посмотрите на этот код и подумайте над ним: он иллюстрирует проблему. (И он не откомпилируется: язык C# спроектирован так, чтобы не приводить к проблемам.) Проблема с *записью* в список. Если мы в список добавим произвольную машину, будет очень плохо: мы сможем нарушить гарантии, которые даёт нам система типов!

Если бы у нас был список, доступный *только на чтение*, то проблем бы как раз не было:

```csharp
IEnumerable<BMW> bmws = new List<BMW>() { new BMW() };
IEnumerable<Car> cars = bmws;   // а так можно
//cars.Add(new Lanos());    // <-- не скомпилируется
```

Итак, что у нас получается? Несмотря на то, что BMW — машина, *список* BMW уже не обязательно является списком машин. А вот список BMW, доступный лишь на чтение, таки является списком машин.

Есть?

Теперь назад к вариантности. Мы говорим о ковариантности в общем смысле, если что-то меняется *аналогичным* образом. В случае наследования классов: мы можем вместо `Car` использовать `BMW`, и *точно так же* мы можем вместо `IEnumerable<Car>`использовать `IEnumerable<BMW>`.

---
Окей, это было длинное вступление, теперь вернёмся к теме: ковариантность делегатов. Пусть у нас есть делегат, зависящий от типа `Car`. Поменяем в его определении `Car` на `BMW`, можно ли новый делегат использовать вместо старого?

Давайте рассуждать логически. Если у нас есть такой делегат:

```csharp
public delegate Car Replace(Car original);
```

(он принимает на вход `Car`, и выдаёт другой экземпляр `Car`), то можно ли вместо него подставить функцию, описывающуюся делегатом такого вида:

```csharp
public BMW MyReplace(BMW original) { ... }
```

? Разумеется, нет, потому что делегат может принимать на вход любую машину, а наша функция хочет только BMW. Так что здесь ковариантности нету: такую функцию нельзя использовать там, где требуется данный делегат.

А вот если наш вариантный тип данных (то есть, `Car`) находится лишь в позиции возвращаемого типа:

```csharp
public delegate Car Create();

```

то на его месте можно использовать функцию такого вида:

```csharp
public BMW CreateBmw() { ... }

```

(если подходила любая машина, то BMW тоже подойдёт).

Это и есть ковариантность делегатов: там, где от вас в коде требуется делегат, вы можете вместо него предоставить ковариантный делегат.

Пример кода, использующий это:

```csharp
// это функция, принимающая делегат:
Car PrepareCar(Create carCreator)
{
    Car car = carCreator();
    car.ManufacturingDate = DateTime.Now;
    car.Mileage = 0;
    return car;
}

// это функция, которая ковариантна Create: она возвращает не Car, а BMW
BMW BmwFactory()
{
    var bmw = new BMW();
    bmw.EnginePower = 400;
    return bmw;
}

// вы можете использовать эту функцию как аргумент PrepareCar
// хотя её сигнатура другая:
return PrepareCar(BmwFactory);
```

---
Контравариантность работает в другую сторону: там вы можете использовать делегат, работающий с *базовым* типом там, где ожидается делегат с производным типом. Такое работает для аргументов функций:

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

// вы можете использовать UniversalTester, хотя у него и не совсем подходящая сигнатура
TestAndPublish(UniversalTester);
```

Это работает по тем же причинам, что и ковариантность: если тестеру подходит любой тип машины, то он сможет работать и с BMW тоже.

## Events

*Событие* — это именованный делегат, при вызове которого, будут запущены все подписавшиеся на момент вызова события методы заданной сигнатуры.

Простыми словами, это не что иное, как ситуация, при возникновении которой, произойдут некоторые действия. 

Преимущество Событий очевидно: *классу-издателю, генерирующему событие* не нужно знать, сколько *классов-подписчиков подпишется* или отпишется. Он создал событие для определенных методов, ограничив их делегатом по определенной сигнатуре.

События широко используются для составления собственных компонентов управления (кнопок, панелей, и т.д.).

## Links

- https://habr.com/ru/articles/329886/

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

> [!QUESTION]- What are covariance, contravariance, and invariance?
> - Covariance: a type parameter can be substituted with a more derived type (commonly for output positions).
> - Contravariance: a type parameter can be substituted with a less derived type (commonly for input positions).
> - Invariance: the type parameter must match exactly.

> [!QUESTION]- What are examples of using events?
> Answer is not provided in the source interview list; see Links.

## Links
