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

Термин **утечка памяти** в средах со сборщиком мусора может вызывать некоторое недоумение. В конце концов, как может утекать память, если есть сборщик мусора, который следит за её своевременным освобождением?

На это есть 2 основные причины. Первая — это объекты, которые не используются в программе, но на которые еще сохранились ссылки. Из-за того, что в других участках кода на объекты есть ссылки, сборщик мусора не освобождает занятую ими память, так что они сохраняются навсегда, удерживая выделенную под них память. Так происходит, например, когда вы регистрируете обработчик события, но не удаляете его. Назовем такие утечки **утечками управляемой памяти**.

Вторая причина — неаккуратная работа с неуправляемой памятью, когда вы каким-либо способом выделяете неуправляемую память, но не освобождаете ее. На самом деле, это не так уж и сложно сделать в управляемом, даже работая с управляемым кодом. Сам .NET имеет множество классов, которые выделяют неуправляемую память. Почти всё, что использует потоки, графику, файловую систему или сетевые вызовы, под капотом работает с неуправляемой памятью. Вы можете легко выделить неуправляемую память и самостоятельно, например при помощи специальных классов (таких как `Marshal`) или при помощи [P/Invoke](https://docs.microsoft.com/en-us/dotnet/standard/native-interop/pinvoke).

*Многие разделяют мнение, что **утечки управляемой памяти*** — *это вовсе не утечки, ведь на них все еще есть ссылки и в теории, память все еще можно освободить. Это дискуссионный вопрос, но на мой взгляд, это все же утечки памяти. Они удерживают память, которая не может быть выделена другому экземпляру и в конечном итоге вызывают исключение Out of Memory. В этой статье я буду называть утечки и управляемой, и неуправляемой памяти просто утечками памяти.*

Ниже приведено 8 наиболее часто встречающихся причин возникновения утечек. Первые 6 касаются утечек управляемой памяти, оставшиеся 2 — неуправляемой.

### Обработчики событий

События в .NET печально известны утечками памяти. Причина проста: после подписки на событие какого-либо объекта, он будет удерживать ссылку на ваш класс, в котором вы определили обработчик (если, конечно, вы не использовали в качестве обработчика анонимный метод, не захватывающий членов класса). 

Посмотрите на этот пример:

```csharp
public class MyClass
{
	public MyClass(WiFiManager wiFiManager)
	{
		wiFiManager.WiFiSignalChanged += OnWiFiChanged;
	}

	private void OnWiFiChanged(object sender, WifiEventArgs e)
	{
    // делаем что-нибудь полезное
  }
}
```

Так, если `wifiManager` определен за пределами `MyClass`, то мы получили утечку памяти. `wifiManager` ссылается на экземпляр `MyClass`, который теперь никогда не будет удален сборщиком мусора.

События действительно очень опасны, и про это есть отдельная статья: [5 Техник избежать утечек памяти при использовании событий в C# .NET, о которых вам нужно знать](https://michaelscodingspot.com/5-techniques-to-avoid-memory-leaks-by-events-in-c-net-you-should-know/).

Что можно сделать в этой ситуации? В вышеуказанной [статье](https://michaelscodingspot.com/5-techniques-to-avoid-memory-leaks-by-events-in-c-net-you-should-know/) описано несколько хороших практик, позволяющих избежать утечек памяти. Не вдаваясь в подробности, вот некоторые из них:

1. Всегда отписывайтесь от событий.
2. Используйте паттерны слабых событий ([Weak Event Pattern](https://docs.microsoft.com/en-us/dotnet/desktop/wpf/advanced/weak-event-patterns?view=netframeworkdesktop-4.8)).
3. Если это возможно, подписывайтесь на события при помощи анонимных методов, не захватывающих других членов класса.

### Захват членов класса в анонимных методах

Довольно очевидно, что использование метода в качестве обработчика события приведет к созданию в обработчике ссылки на объект, содержащий этот метод. Но куда менее очевидно, что то же самое происходит, когда член класса захвачен в анонимном методе.

Вот пример:

```csharp
public class MyClass
{
	private JobQueue _jobQueue;
	private int _id;

	public My Class(JobQueue jobQueue)
	{
		_jobQueue = jobQueue;
	}

	public void Foo()
	{
		_jobQueue.EnqueueJob(() =>
		{
			Logger.Log($"Executing job with ID {_id}");
			// Выполняем полезную работу
		});
	}
}
```

В этом примере член класса `_id` **захвачен** в анонимном методе и, как результат, экземпляр класса хранит ссылку на себя. Это означает, что пока `_jobQueue` существует и ссылается на анонимный делегат, он [`_jobQueue`] ссылается также и на экземпляр `MyClass`.

Решение проблемы здесь простое — использовать локальную переменную:

```csharp
public class MyClass
{
	public My Class(JobQueue jobQueue)
	{
		_jobQueue = jobQueue;
	}

	private JobQueue _jobQueue;
	private int _id;

	public void Foo()
	{
		var localId = _id;
		_jobQueue.EnqueueJob(() =>
		{
			Logger.Log($"Executing job with ID {localId}");
			// что-нибудь делаем
		});
	}
}
```

Если присвоить значение локальной переменной, член класса не будет захвачен и вы предотвратите утечку памяти.

***Примечание:** если не совсем понятна природа возникновения утечки в данном случае, обратите внимание на [этот комментарий](https://habr.com/ru/post/589005/#comment_23709379).*

### Статические переменные

Некоторые разработчики считают, что использование статических переменных являются плохой практикой. Тем не менее, говоря об утечках памяти, о них нельзя не упомянуть.

Прежде, чем подойти к сути этого раздела, давайте немного поговорим о работе сборщика мусора в .NET. Основная идея состоит в том, что сборщик мусора проходит по всем **корневым объектам** (**GC Roots**, **корни**) и помечает их, как объекты, которые **не** будут для очищены при сборке. Затем сборщик мусора проходит по всем объектам, на которые ссылаются корни, и точно также помечает их. И так далее. В конце концов, сборщик мусора собирает всё оставшееся ([отличная статья о сборщике мусора](https://habr.com/ru/post/590475/)).

Что считается **корневыми** **объектами**?

1. Cтек исполняющихся потоков.
2. Статические переменные.
3. Управляемые объекты, переданные COM-объектам через [Interop](https://docs.microsoft.com/en-us/dotnet/standard/native-interop/cominterop).

Это означает, что статические переменные и всё, на что они ссылаются, никогда не будет освобождено сборщиком мусора. Вот пример:

```csharp
public class MyClass
{
	static List<MyClass> _instances = new List<MyClass>();
	public MyClass()
	{
		_instances.Add(this);
	}
}
```

Если вы зачем-то напишете вышеприведенный код, любой экземпляр `MyClass` навсегда останется в памяти, тем самым вызвав утечку.

### Кэширование

Разработчики любят кэширование. Действительно, зачем выполнять операцию дважды, если можно выполнить ее один раз и сохранить результат, не так ли?

Это правда, но если кэшировать бесконечно, то в конце концов вы исчерпаете всю доступную память. Посмотрите на этот пример:

```csharp
public class ProfilePicExtractor
{
	private Dictionary<int, byte[]> PictureCache { get;set; } = new Dictionary<int, byte[]>();

	public byte[] GetProfilePicByID(int id)
	{
		// По-хорошему, здесь нужно использовать механизм синхронизации,
		// но для упрощения примера мы это опустим
		if (!PictureCache.ContainsKey(id))
		{
			var picture = GetPictureFromDatabase(id);
			PictureCache[id] = picture;
		}
		return PictureCache[id];
	}

	private byte[] GetPictureFromDatabase(int id)
  {
		// ...
	}
}
```

Кэширование в этом примере помогает сократить дорогостоящие операции обращения к базе данных, но ценой является захламление памяти.

Для решения проблемы можно использовать следующие практики:

1. Удалять из кэша данные, которые не используются какое-то время.
2. Ограничить размер кэша.
3. Использовать `WeakReference` для хранения кэшируемых объектов. `WeakReference` сборщику мусора самостоятельно очищать кэш, что в ряде случаев может оказаться не такой уж и плохой идеей. Сборщик мусора будет перемещать объекты, которые еще используются, в старшие поколения, чтобы держать их в памяти дольше. Это означает, что часто используемые объекты останутся в кэше дольше, тогда как неиспользуемые будут удалены сборщиком мусора без вашего явного участия.

### Некорректная привязка данных в WPF

Привязка данных (Data Binding) в WPF тоже может стать причиной утечек памяти. Главное правило для предотвращения утечек — всегда использовать `DependencyObject` или `INotifyPropertyChanged`. Если вы этого не делаете, WPF создает т.н. сильную ссылку (strong reference) на объект, вызывая утечку памяти ([более подробное объяснение](https://stackoverflow.com/a/18543350/1229063)).

Пример:

```xml
<UserControl x:Class="WpfApp.MyControl"
		xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
		xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
	<TextBlock Text="{Binding SomeText}"></TextBlock>
</UserControl>
```

Представленный ниже класс останется в памяти навсегда:

```csharp
public class MyViewModel
{
	public string _someText = "memory leak";

	public string SomeText
	{
		get { return _someText; }
		set { _someText = value; }
	}
}
```

А вот этот класс уже не вызовет утечки:

```csharp
public class MyViewModel : INotifyPropertyChanged
{
public string _someText = "not a memory leak";

public string SomeText
	{
		get { return _someText; }
		set
		{
			_someText =value;
			PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof (SomeText)));
		}
	}
}
```

На самом деле даже не важно, вызываете вы `PropertyChanged` или нет, главное, что класс реализует интерфейс `INotifyPropertyChanged`. Это говорит инфраструктуре WPF не создавать сильную ссылку.

*Утечки памяти возникают только если используется режим привязки* `OneWay` *или* `TwoWay`*. Если привязка осуществляется в режиме* `OneTime` *или* `OneWayToSource`*, то проблемы не будет.*

Утечки памяти в WPF также могут возникать, когда происходит привязка коллекций. Если коллекция не реализует `INotifyCollectionChanged`, вы получите утечку памяти. Вы можете избежать проблемы используя класс `ObservableCollection`, который этот интерфейс реализует.

### Потоки, которые никогда не останавливаются

Мы уже говорили о том, как работает сборщик мусора и о корневых объектах. Я упоминал, что стек потока считается корневым объектом. Стек потока включает все локальные переменные, а также члены стеков вызовов.

Если вы зачем-то создали бесконечный поток, который ничего не делает и ссылается на объекты, то возникнет утечка памяти. Один из примеров того, как это может легко случиться — неправильное использование класса `Timer`. Посмотрите на этот код:

```csharp
public class MyClass
{
	public MyClass()
	{
		Timer timer = new Timer(HandleTick);
		timer.Change(TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(5));
	}

	private void HandleTick(object state) => // Что-нибудь делаем
}
```

Если вы не остановите таймер, он будет бесконечно выполняться в отдельном потоке, удерживая ссылку на `MyClass` и предотвращая его удаление сборщиком мусора.

### Не освобожденная неуправляемая память

До сих пор мы говорили только об управляемой памяти, которая освобождается сборщиком мусора. Совсем другое дело — неуправляемая память. Вместо того, чтобы просто избегать ссылок на ненужные объекты, в этом случае вам необходимо явно освобождать память.

Вот простой пример:

```csharp
public class SomeClass
{
	private IntPtr _buffer;

	publicSomeClass()
	{
		_buffer = Marshal.AllocHGlobal(1000);
	}

	// Делаем что-нибудь, но не освобождаем память
}
```

В этом примере мы использовали `Marshal.AllocHGlobal`, чтобы выделить участок неуправляемой памяти ([см. документацию в MSDN](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.marshal.allochglobal?view=net-5.0)). Если явно не освободить память при помощи `Marshal.FreeHGlobal`, она будет считаться выделенной в куче процесса, вызывая утечку памяти, даже после удаления `SomeClass` сборщиком мусора.

Для предотвращения подобных проблем вы можете добавить в свой класс метод `Dispose`, в котором очищать неуправляемые ресурсы. Например:

```csharp
public class SomeClass : IDisposable
{
	private IntPtr _buffer;

	publicSomeClass()
	{
		_buffer = Marshal.AllocHGlobal(1000);
		// Делаем что-нибудь, но не освобождаем память
	}

	public void Dispose() => Marshal.FreeHGlobal(_buffer);
}
```

*Утечки неуправляемой памяти даже хуже, чем утечки управляемой памяти в связи с [фрагментацией](https://stackoverflow.com/questions/3770457/what-is-memory-fragmentation). Сборщик мусора умеет дефрагментировать управляемую память, помещая неудаленные объекты рядом, чтобы освободить место для новых данных. В свою очередь, неуправляемая память навсегда привязывается к месту, в котором она выделена.*

### Не вызванный метод Dispose

В последнем примере мы добавили метод `Dispose` для освобождения неуправляемых ресурсов, когда они больше не нужны. Это прекрасно, но что случится, если кто-нибудь использует класс, но не вызовет метод `Dispose`?

Что вы можете сделать, так это использовать конструкцию `using` языка C#:

```csharp
using (var instance = new MyClass())
{
	// ...
}
```

Конструкция из примера работает на классах, реализующих интерфейс `IDisposable` и при компиляции автоматически преобразуется в следующий код:

```csharp
MyClass instance = new MyClass();
try
{
	// ...
}
finally
{
if (instance != null)
	{
		((IDisposable)instance).Dispose();
	}
}
```

Это довольно удобно, потому что если будет выброшено исключение, метод `Dispose` все равно будет вызван.

Для достижения наибольшей надежности MSDN предлагает [паттерн реализации Dispose](https://docs.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose). Вот пример его использования:

```csharp
public class MyClass : IDisposable
{
	private IntPtr _bufferPtr;
	public int BUFFER_SIZE = 1024 * 1024; // 1 MB
	private bool _disposed = false;
	
	publicMyClass()
	{
		_bufferPtr =  Marshal.AllocHGlobal(BUFFER_SIZE);
	}

	protected virtual void Dispose(bool disposing)
	{
		if (_disposed)
		return;
		
		if (disposing)
		{
			// Очищаем используемые управляемые объекты
		}

		// Очищаем неуправляемые объекты
		Marshal.FreeHGlobal(_bufferPtr);
		_disposed = true;
	}

	public void Dispose()
	{
		Dispose(true);
		GC.SuppressFinalize(this);
	}

	~MyClass()
	{
		Dispose(false);
	}
}
```

Использование этого паттерна позволяет гарантировать, что даже если метод `Dispose` не был вызван явно, то он все равно будет вызван финализатором, когда сборщик мусора решит удалить объект. Если же `Dispose` вызывался вручную, финализатор для объекта отключается и вызван не будет. Отмена финализатора очень важна, так как его вызов обходится [достаточно дорого](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers) и может вызывать проблемы с производительностью.

Но учтите, что серебряной пулей майкрософтовский паттерн `Dispose` не является. Если не вызвать `Dispose` вручную, и при этом объект не удален сборщиком мусора из-за утечки управляемой памяти, то и неуправляемые ресурсы освобождены не будут.

## Questions

> [!QUESTION]- What is a memory leak? Is it possible in .NET? How?
> A memory leak is memory that is no longer needed but cannot be reclaimed, so the process keeps growing over time.
> Yes, it is possible in .NET:
> - Managed leaks: objects stay reachable (for example via static caches, event subscriptions, long-lived collections), so GC cannot collect them.
> - Unmanaged leaks: native memory/handles are allocated (directly or indirectly) and not released (for example, missing `Dispose()` / `using`).

> [!QUESTION]- What is the call stack? Can it overflow? What happens then?
> The call stack is a per-thread LIFO memory region that stores stack frames for active method calls (return address, parameters, locals, etc.).
> It can overflow (for example, due to deep or infinite recursion or very large stack allocations). In .NET this typically results in `StackOverflowException`, and the process is terminated (it cannot be reliably handled).

> [!QUESTION]- Why do we need `using {}` if there is a GC?
> `using` provides deterministic cleanup for resources that are not just managed memory (file handles, sockets, OS handles, unmanaged buffers). GC runs non-deterministically and does not guarantee timely release of such resources.
> The `using` statement compiles to `try/finally` so `Dispose()` is called even when exceptions occur.

> [!QUESTION]- What are `IDisposable` and `Finalize`?
> `IDisposable` is an interface for explicit, deterministic cleanup via `Dispose()`.
> `Finalize` (a finalizer, written as `~TypeName()` in C#) is called by the GC for objects that have a finalizer, but it is non-deterministic and adds overhead. Finalizers should only be used to release unmanaged resources, and `Dispose()` typically calls `GC.SuppressFinalize(this)`.

> [!QUESTION]- What is the disposable (dispose) pattern?
> A standard way to implement `IDisposable` so both explicit cleanup (`Dispose()`) and (optionally) finalization are supported.
> Typical shape: `Dispose()` calls `Dispose(true)` and then `GC.SuppressFinalize(this)`; a finalizer (if needed) calls `Dispose(false)`; `Dispose(bool disposing)` releases unmanaged resources and, when `disposing` is true, also disposes managed fields.

## References and Further Reading

## Further Reading
