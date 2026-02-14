---
topic:
  - Data Persistance
subtopic:
  - SQL
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
# Intro

## Deeper Explanation

Индекс является структурой на диске, которая связана с таблицей или представлением и ускоряет получение строк из таблицы или представления. Индекс содержит ключи, построенные из одного или нескольких столбцов в таблице или представлении. Эти ключи хранятся в виде структуры сбалансированного дерева, которая поддерживает быстрый поиск строк по их ключевым значениям в SQL Server.

## Предназначение индексов

Простейший метод решения задачи поиска записей в базе данных, удовлетворяющих определенному критерию, — полный перебор. Но с ростом количества записей производительность такого подхода будет заметно падать. Для повышения производительности поиска создаются вспомогательные структуры — индексы. Используя индексы, можно существенно поднять скорость поиска, потому что данные в индексе хранятся в форме, позволяющей нам в процессе поиска не рассматривать области, которые заведомо не могут содержать искомые элементы.

Важно, что использование индексов не только сокращает время поиска в абсолютном выражении, но и уменьшает алгоритмическую сложность процесса поиска. Это значит, что время, необходимое на поиск с помощью индексов, при росте объема базы данных будет расти существенно медленнее, чем при использовании полного перебора.

Когда вы формируете запрос на индексированный столбец, подсистема запросов начинает идти сверху от корневого узла и постепенно двигается вниз через промежуточные узлы, при этом каждый слой промежуточного уровня содержит более детальную информацию о данных. Подсистема запросов продолжает двигаться по узлам индекса до тех пор, пока не достигнет нижнего уровня с листьями индекса. 

Бинарный поиск имеет алгоритмическую сложность `O(log(n))`. Используя формулы алгоритмической сложности `O(n)` и `O(log(n))`, мы можем оценить, как будет меняться приблизительное количество операций при поиске разными способами с ростом объема данных

![03 Data Persistance-Indexes-20260210205141994](03%20Data%20Persistance-Indexes-20260210205141994.png)

### Куча

**Кучи –** это данные, хранящиеся без какой-либо определенной сортировки, не имеющие индексов, доступ и поиск по таким данным происходит последовательно при сканировании страниц, и может занимать довольно долгое время влияя негативно на производительность.

### Структура индексов

Индекс - древовидная отсортированная структура даных на диске, которая связана с таблицей или представлением и ускоряет получение строк из таблицы или представления. Индекс содержит ключи, построенные из одного или нескольких столбцов в таблице или представлении. Эти ключи хранятся в виде структуры сбалансированного дерева, которая поддерживает быстрый поиск строк по их ключевым значениям в SQL Server. 

Само сбалансированное дерево состоит из трёх уровней:

1. Корневой узел
    1. Хранит ссылки на промежуточные узлы и диапазон их данных
2. Промежуточный уровень
    1. Хранит ссылки на листья и диапазон хранящихся в них данных
3. Уровень листьев
    1. Листок - страница с реальными данным в определенном диапазоне

### Кластерный индекс

В кластеризованном индексе конечные узлы (листья) содержат страницы рельных данных базовой таблицы. 

В корневых узлах находятся строки индекса, каждая строка содержит ключевое значения и указатель на страницу промежуточного уровня

В промежуточных узлах находятся строки индекса, каждая строка содержит ключевое значение и указатель на строку данных в конечном листке

Страницы на каждом уровне связаны в двунаправленный список.

Важной характеристикой кластеризованного индекса является то, что все значения отсортированы в определенном порядке либо возрастания, либо убывания. Таким образом, таблица или представление может иметь только один кластеризованный индекс. В дополнение следует отметить, что данные в таблице хранятся в отсортированном виде только в случае если создан кластеризованный индекс у этой таблицы. Таблица не имеющая кластеризованного индекса называется кучей.

![Untitled](03%20Data%20Persistance-Indexes-20260210205142011.png)

![Untitled](03%20Data%20Persistance-Indexes-20260210205142027.png)

### Упрощенный Пример

Наша база имеет таблицу с данными которая имеет кластерный индекс по ИД. Допустим ИД в таблице у нас в диапазоне от 1 до 5000, и мы хотим найти **1456** элемент. 

1. Запрос приходит на корневой уровень, и смотрит на возможные варианты промежуточных узлов
    1. Узел 1 имеет диапазон от 1 до 1250
    2. **Узел 2 имеет диапазон от 1251 до 2500** - диапазон который нам нужен
    3. Узел 3 имеет диапазон от 2501 до 3750
    4. Узел 4 имеет диапазон от 3751 до 5000
2. Сам промежуточный узел имеет ссылки на 5 страниц, 249 строк на каждой
    1. **Страница 1 имеет диапазон от 1251 до 1500** - диапазон который нам нужен
    2. Страница 2 имеет диапазон от 1501 до 1750
    3. Страница 3 имеет диапазон от 1751 до 2000
    4. Страница 4 имеет диапазон от 2001 до 2250
    5. Страница 5 имеет диапазон от 2251 до 2500
3. Далее мы проходим по этому диапазону линейным поиском и значительно ускоряем операцию получения значения уменьшая диапазон поиска с 5000 до 249 элементов. (Размеры узлов и страниц выбраны для примера)

### Некластерный индекс

В отличие от кластеризованного индекса, листья некластеризованного индекса содержат только те столбцы (*ключевые*), по которым определен данный индекс, а также содержит указатель на строки с реальными данными в таблице. Это означает, что системе подзапросов необходима дополнительная операция для обнаружения и получения требуемых данных. Содержание указателя на данные зависит от способа хранения данных: кластеризованная таблица или куча. Если указатель ссылается на кластеризованную таблицу, то он ведет к кластеризованному индексу, используя который можно найти реальные данные. Если указатель ссылается на кучу, то он ведет к конкретному идентификатору строки с данными.

- **При наличии кластерного индекса**
    - Если в таблице создан кластеризованный индекс, то некластеризованные индексы содержат в узле-листе значение ключа кластеризованного индекса для этих данных
        
        ![Untitled](03%20Data%20Persistance-Indexes-20260210205142050.png)
        
- **При отсутствии кластерного индекса**
    - Если в таблице не создан кластеризованный индекс, то некластеризованные индексы по этой таблице хранят в своих узлах-листьях идентификаторы строк. Идентификатор строки указывает на реальную строку данных в таблице, по сути это - значение, включающее в себя номер файла данных, номер страницы и местоположение строки на этой странице.
        
        ![Untitled](03%20Data%20Persistance-Indexes-20260210205142069.png)
        

### Pros/Cons

- Плюсы
    - Улучшение скорости поиска записей
    - При чтении данные приходят в отсортированном порядке что означает что не будет требоваться делать дополнительню сортировку
- Минусы
    - Индексы ухудшают производительность запросов связанных с добавлением, модификацией и удалением строк. Это связано с тем что при выполнении подобных операций СУБД должна ещё и динамически обновлять индекс.
    - Для хранения индекса требуется дополнительное место на диске. Чем длиннее ключ, тем большего размера индекс и место для его хранения
    - Не все данные подходят для индексации. Данные, которые не являются достаточно уникальными, (как например название штата в таблице с американскими городами) не дадут такого выигрыша от индексации, как данные, которые имеют больше возможных значений.

### Рекомендации к использованию

- Для таблиц которые часто обновляются используйте как можно меньше индексов.
- Если таблица содержит большое количество данных, но их изменения незначительны, тогда используйте столько индексов, сколько необходимо для улучшение производительности ваших запросов. Однако хорошо подумайте перед использованием индексов на небольших таблицах, т.к. возможно использование поиска по индексу может занять больше времени, нежели простое сканирование всех строк.
- Для кластеризованных индексов старайтесь использовать настолько короткие поля насколько это возможно. Наилучшим образом будет применение кластеризованного индекса на столбцах с уникальными значениями и не позволяющими использовать NULL. Вот почему первичный ключ часто используется как кластеризованный индекс.
- Уникальность значений в столбце влияет на производительность индекса. В общем случае, чем больше у вас дубликатов в столбце, тем хуже работает индекс. С другой стороны, чем больше уникальных значения, тем выше работоспособность индекса. Когда возможно используйте уникальный индекс.
- Для составного индекса возьмите во внимание порядок столбцов в индексе. Столбцы, которые используются в выражениях *WHERE* (к примеру, *WHERE FirstName = 'Charlie'*) должны быть в индексе первыми. Последующие столбцы должны быть перечислены с учетом уникальности их значений (столбцы с самым высоким количеством уникальных значений идут первыми).
- Также можно указать индекс на вычисляемых столбцах, если они соответствуют некоторым требованиям. К примеру, выражение которые используются для получения значения столбца, должны быть детерминистическими (всегда возвращать один и тот же результат для заданного набора входных параметров).

### Questions

> [!QUESTION]- Why can't a table have two clustered indexes?
> Reference: [Article](https://habr.com/ru/post/247373/#01)
> A clustered index is effectively the table. When you create a clustered index, the storage engine orders the table's rows according to the index key (ascending or descending). A clustered index is not a separate structure like other indexes; it is the way the table data itself is organized to enable efficient access to rows.
>
> Imagine you have a table that stores a sales history. The Sales table contains information such as order id, line id, product id, quantity, order number and date, and so on. You create a clustered index on the *OrderID* and *LineID* columns, sorted ascending, as shown in the following T-SQL:
>
> ```sql
> CREATE UNIQUE CLUSTERED INDEX ix_oriderid_lineid
> ON dbo.Sales(OrderID, LineID);
> ```
>
> When you run this script, all rows in the table are physically ordered first by OrderID and then by LineID, but the data still remains a single logical structure: the table. For this reason, you cannot create two clustered indexes. There is only one table with one set of data, and that data can only be ordered one way at a time.

> [!QUESTION]- If a clustered table has many benefits, why use a heap?
> Reference: [Article](https://habr.com/ru/post/247373/#02)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- How do you change the default index fill factor?
> Reference: [Article](https://habr.com/ru/post/247373/#03)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- Can you create a clustered index on a column with duplicates?
> Reference: [Article](https://habr.com/ru/post/247373/#04)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- How is a table stored if no clustered index exists?
> Reference: [Article](https://habr.com/ru/post/247373/#05)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- What is the relationship between unique constraints, primary keys, and table indexes?
> Reference: [Article](https://habr.com/ru/post/247373/#06)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- Why are clustered and nonclustered indexes called balanced trees in SQL Server?
> Reference: [Article](https://habr.com/ru/post/247373/#07)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- How can an index improve query performance if you have to traverse all those index nodes?
> Reference: [Article](https://habr.com/ru/post/247373/#08)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- If indexes are so great, why not create them on every column?
> Reference: [Article](https://habr.com/ru/post/247373/#09)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- Do you have to create a clustered index on the primary key column?
> Reference: [Article](https://habr.com/ru/post/247373/#10)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- If you index a view, is it still a view?
> Reference: [Article](https://habr.com/ru/post/247373/#11)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- Why use a covering index instead of a composite index?
> Reference: [Article](https://habr.com/ru/post/247373/#12)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- Does the number of duplicates in the key column matter?
> Reference: [Article](https://habr.com/ru/post/247373/#13)
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- Can you create a nonclustered index for only a subset of key column values?
> Reference: [Article](https://habr.com/ru/post/247373/#14)
> Answer is not provided in the source interview list; see Links.

## Questions

> [!QUESTION]- What is an index and what types exist?
> An index is an additional on-disk/in-memory data structure (often a B-tree) that speeds up data access by allowing efficient seeks and ordered scans. Common types include clustered and nonclustered indexes; also unique, composite, filtered/partial, and full-text indexes (availability depends on the DB engine).

> [!QUESTION]- How does ordering work for clustered vs nonclustered indexes?
> With a clustered index, the leaf level is the table data itself, stored in the index key order, so range scans return rows already ordered by that key. With a nonclustered index, the leaf level stores index keys plus row locators; rows are ordered by the nonclustered key, but fetching non-index columns may require lookups into the clustered index (or heap).

## Links
