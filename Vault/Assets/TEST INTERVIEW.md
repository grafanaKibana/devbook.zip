TEST INTERVIEW

1. Что такое переменная?  
2. Что такое value type vs reference type? В чем разница?  
   1. [Популярные заблуждения о C\#](https://habr.com/ru/post/541786/)  
3. Что такое boxing/unboxing?  
   1. Упаковка представляет преобразование объекта значимого типа (например, типа int) к типу object или к типу реализуемого интерфейса и сохранение преобразованного объекта в управляемой куче (хипе). Распаковка (unboxing) представляет преобразование объекта типа object к значимому типу.  
   2. [Упаковка-преобразование и распаковка-преобразование (Руководство по программированию на C\#)](https://learn.microsoft.com/ru-ru/dotnet/csharp/programming-guide/types/boxing-and-unboxing)  
4. Что такое checked/unchecked?  
   1. [Операторы checked и unchecked (справочник по C\#)](https://learn.microsoft.com/ru-ru/dotnet/csharp/language-reference/statements/checked-and-unchecked)  
5. Tuple ссылочный или значимый тип?  
   1. Типы System.ValueTuple являются типами значений. Типы System.Tuple являются ссылочными типами.  
6. Что такое неявная типизация?  
   1. var  
7. Что такое nullable тип?  
   1. Тип который поддерживает значение null  
8. Что такое Immutable тип?  
   1. Это тип state которого не может быть изменен после создания  
   2. [Иммутабельность в C\#](https://habr.com/ru/company/otus/blog/676680/)  
9. Отличия string & StringBuilder? Когда использовать StringBuilder?  
10. Что такое интернирование строк?  
11. Чем отличается const & readonly?  
    1. [C\#: в чем разница между readonly и const?](https://ru.stackoverflow.com/questions/651231/c-%D0%B2-%D1%87%D0%B5%D0%BC-%D1%80%D0%B0%D0%B7%D0%BD%D0%B8%D1%86%D0%B0-%D0%BC%D0%B5%D0%B6%D0%B4%D1%83-readonly-%D0%B8-const)  
12. Что такое структура данных? Какие знаешь? Какие из них есть в .NET?   
    1. Структура данных это способ обьединения связных данных в один небольшой объект/”коллекцию”  
    2. Какие есть:  
       1. Array  
       2. List  
       3. Queue  
       4. Stack  
       5. [LinkedList](https://www.simplilearn.com/tutorials/data-structure-tutorial/types-of-linked-list)  
          1. Singly Linked List  
          2. Doubly Linked List  
          3. Circular Linked List  
          4. Circular Linked List  
       6. Dictionary/HashTable  
       7. HashSet  
       8. [Graph](https://www.simplilearn.com/tutorials/data-structure-tutorial/graphs-in-data-structure)  
       9. [Tree](https://www.knowledgehut.com/blog/programming/types-of-trees-in-data-structure)  
          1. General Tree  
          2. Binary Tree  
          3. Binary Search Tree  
          4. AVL tree (Adelson-Velsky and Landis Tree)  
          5. Red-Black Tree  
          6. N-ary Tree  
13. Как устроен List под капотом?  
14. Count vs Capacity?   
15. Как работает Clear or Remove с Capacity?  
    1. Capacity не изменяется при очищении или удалении элементов, для того чтобы сбросить Capacity можно вызвать TrimExcess который установит Capacity значения текущей длины массива или установить Capacity напрямую. Изменение Capacity повлечет за собой перераспределение памяти и копирование всех элементов в новый массив  
16. [Какая структура данных стоит за Dictionary?](https://habr.com/ru/post/198104/)  
17. Как устроены Хэш-таблицы?  
18. Как работает метод HashCode у Object?  
19. [Разница между IEnumerable & IQueryable](https://metanit.com/sharp/entityframework/1.4.php)  
20. Какие типы можно использовать в foreach?  
    1. Можно использовать типы, которые реализуют интерфейс System.Collections.IEnumerable или System.Collections.Generic.IEnumerable\<T\>. Либо же к любым типам которые удовлетворяют следующим условиям:  
       1. включают открытый метод GetEnumerator без параметров с классом, структурой или тип интерфейсом в качестве возвращаемого значения;  
       2. тип возвращаемого значения метода GetEnumerator должен содержать открытое свойство Current и открытый метод MoveNext без параметров с типом возвращаемого значения Boolean.  
21. [Как выглядит foreach “Под капотом?”](https://stackoverflow.com/questions/11179156/how-is-foreach-implemented-in-c)  
    1. В случае если мы пробуем итерироваться по коллекции константной величины (например Array) тогда foreach скомпилируется в обычный for с счётчиком  
    2. В случае динамических колеций, Foreach компилируется в код где мы получаем Enumerator в котором реализован метод MoveNext() который определяет как мы двигаемся в колекции (для одномерных коллекций он будет тривиальный, но если мы хотим итерироваться по какому-то графу или дереву, то для него нужно определить как мы двигаемся по ним)  
22. [Что такое yield и как он работает?](https://habr.com/ru/post/311094/)  
    1. Применяя yield return мы декларируем, что данный метод возвращает последовательность IEnumerable, элементами которой являются результаты выражений каждого из yield return. Причем с возвращением значения, yield return передает управление вызывающей стороне и продолжает исполнение метода после запроса следующего элемента. Значения переменных внутри метода с yield сохраняются между запросами. yield break в свою очередь играет роль хорошо известного break используемого внутри циклов.  
23. [Какая разница между оператором \== и Equals, для Value & Reference типов.](https://stackoverflow.com/a/12834761/12424442)  
24. Что такое алгоритм? Как измеряется его эффективность?  
25. Как мы можем вернуть несколько значений из метода без использования коллекций?  
    1. Tuple, out param  
26. Что такое кортеж?  
27. Что такое ref, out, in, params\[\]?  
28. Зачем может быть нужно использовать ref для ссылочных типов?  
29. Что такое необязательные параметры в методах?  
30. Передача входных данных по значению и по ссылке, разница?  
31. Чnо такое рекурсия?  
32. Что такое пространство имен? Зачем они нужны?  
33. [Что такое рефлексия?](https://professorweb.ru/my/csharp/assembly/level2/2_3.php)  
34. Как работают с возможными ошибками в коде?  
    1. try/catch/finnaly  
35. В каком случае мы не попадём в finally?  
    1. Происходит преждевременное завершение процесса работы программы, например, из\-за сбоя в работе операционной системы или критической ошибки в приложении.  
    2. Выполняется операция, которая блокирует поток выполнения и не может завершиться, например, ожидание завершения другого потока или получение сетевых данных, которые не приходят.  
    3. Вызывается метод Environment.FailFast(), который предназначен для немедленного завершения приложения без выполнения блока finally.  
    4. Выполняется бесконечный цикл или рекурсивная функция, которые не могут завершиться.  
    5. Происходит исключение \`StackOverflowException  
36. Что такое класс? Чем он отличается от объекта?  
37. От чего наследуются все классы в C\#?  
38. [Различия класса и структуры?](https://www.calabonga.net/blog/post/c-net-4-0-class-vs-struct-ili-v-chem-razlichiya-mezhdu-klassom-i-strukturoi) Назови примеры существующих в .NET структур.  
39. [Можно ли сделать чтобы структура хранилась в куче? Как?](https://stackoverflow.com/questions/3542083/reference-types-live-on-the-heap-value-types-live-on-the-stack)  
    1. Each local variable (ie one declared in a method) is stored on the stack. That includes reference type variables \- the variable itself is on the stack, but remember that the value of a reference type variable is only a reference (or null), not the object itself. Method parameters count as local variables too, but if they are declared with the ref modifier, they don't get their own slot, but share a slot with the variable used in the calling code. See my article on parameter passing for more details.  
    2. Instance variables for a reference type are always on the heap. That's where the object itself "lives".  
    3. Instance variables for a value type are stored in the same context as the variable that declares the value type. The memory slot for the instance effectively contains the slots for each field within the instance. That means (given the previous two points) that a struct variable declared within a method will always be on the stack, whereas a struct variable which is an instance field of a class will be on the heap.  
    4. Every static variable is stored on the heap, regardless of whether it's declared within a reference type or a value type. There is only one slot in total no matter how many instances are created. (There don't need to be any instances created for that one slot to exist though.) The details of exactly which heap the variables live on are complicated but explained in detail in an MSDN article on the subject.

       

40. Что такое статичный класс?  
41. Что такое статический конструктор?  
42. Какие ты знаешь модификаторы доступа?  
    1. public  
    2. protected internal  
    3. internal  
    4. protected  
    5. private protected  
    6. private  
43. Какие модификаторы по-умолчанию если их явно не указывать у полей и методов? Какие у структур и классов?  
    1. У полей и методов \- private  
    2. У классов и структур \- internal  
44. Что такое свойства и зачем они нужны?   
45. Что такое авто-свойства? Можно ли ими заменить простые поля? Почему?  
46. [Что такое delegate?](https://ru.stackoverflow.com/questions/648480/%D0%A7%D1%82%D0%BE-%D1%82%D0%B0%D0%BA%D0%BE%D0%B5-%D0%B4%D0%B5%D0%BB%D0%B5%D0%B3%D0%B0%D1%82-%D0%B2-%D1%8F%D0%B7%D1%8B%D0%BA%D0%B5-%D0%A1#:~:text=%D0%98%D0%B7%20%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BA%D0%B8%20%D0%BD%D0%B0%20MSDN%20%D0%94%D0%B5%D0%BB%D0%B5%D0%B3%D0%B0%D1%82%D1%8B,%D1%81%D0%BE%D0%B2%D0%BC%D0%B5%D1%81%D1%82%D0%B8%D0%BC%D0%BE%D0%B9%20%D1%81%D0%B8%D0%B3%D0%BD%D0%B0%D1%82%D1%83%D1%80%D0%BE%D0%B9%20%D0%B8%20%D0%B2%D0%BE%D0%B7%D0%B2%D1%80%D0%B0%D1%89%D0%B0%D0%B5%D0%BC%D1%8B%D0%BC%20%D1%82%D0%B8%D0%BF%D0%BE%D0%BC.)  
47. Во что превращается делегат  
48. Какие уже готовые делегаты ты знаешь в .NET?  
49. [Action vs Func vs Predicate?](https://stackoverflow.com/questions/4317479/func-vs-action-vs-predicate)  
50. Что такое анонимный метод?  
51. [Что такое event?](https://habr.com/ru/post/213809/)  Чем он отличается от delegate?  
52. [Ковариативность\\Контрвариативность\\Инвариативность?](https://ru.stackoverflow.com/questions/516687/%D0%92-%D1%87%D0%B5%D0%BC-%D1%81%D1%83%D1%82%D1%8C-%D0%BA%D0%BE%D0%B2%D0%B0%D1%80%D0%B8%D0%B0%D0%BD%D1%82%D0%BD%D0%BE%D1%81%D1%82%D0%B8-%D0%B8-%D0%BA%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%B2%D0%B0%D1%80%D0%B8%D0%B0%D0%BD%D1%82%D0%BD%D0%BE%D1%81%D1%82%D0%B8-%D0%B4%D0%B5%D0%BB%D0%B5%D0%B3%D0%B0%D1%82%D0%BE%D0%B2)  
53. Что такое атрибут и зачем они нужны?  
54. Виды использования new()? (  
* Создание экземпляра типа экземпляра анонимного типа  
* Модификатор метода для сокрытия метода наследника от базового класса  
* Ограничение дженерика, что аргумент типа должен иметь общий конструктор без параметров)  
55. Что значит “Объектно-ориентированное программирование”?  
56. Назовите принципы ООП? Расскажи про каждый.  
57. Можно ли запретить наследование от класса?  
58. Что такое абстрактный класс?  
59. Что такое интерфейс?  
60. Чем интерфейс отличается от абстрактного класса?  
61. Какие ты знаешь существующие интерфейсы в .NET?  
62. Может ли класс реализовать два интерфейса у которых объявлены два метода с одинаковым названием?  
63. Как мы можем реализовать полиморфизм?  
64. Какие виды полиформизма ты знаешь?(  
* Статический (Перегрузка методов, операторов)  
* Динамический(Переопределение методов))+  
65. Какой тип связи реализует наследование, а какой интерфейс? (is a)  
66. Что такое Pattern Matching? Что делают операторы is & as?  
67. [Что такое Ad hoc полиморфизм?](https://ru.stackoverflow.com/questions/464752/%D0%A7%D0%B5%D0%BC-ad-hoc-%D0%BF%D0%BE%D0%BB%D0%B8%D0%BC%D0%BE%D1%80%D1%84%D0%B8%D0%B7%D0%BC-%D0%BE%D1%82%D0%BB%D0%B8%D1%87%D0%B0%D0%B5%D1%82%D1%81%D1%8F-%D0%BE%D1%82-%D0%BE%D0%B1%D1%8B%D1%87%D0%BD%D0%BE%D0%B3%D0%BE-%D0%BF%D0%BE%D0%BB%D0%B8%D0%BC%D0%BE%D1%80%D1%84%D0%B8%D0%B7%D0%BC%D0%B0)  
68. Что такое перегрузка методов?  
69. Что такое переопределение методов?  
70. Отличия abstract и virtual метода?  
71. Почему виртуальные методы не могут быть статичными?  
72. В чем разница между new() & override?  
73. Можем ли мы запретить переопределение? (sealed)  
74. Что такое record?  
75. Что такое индексатор?  
76. Что такое SOLID? Поговорим про каждую букву\!  
77. Какие принципы SOLID нарушает Singleton?  
78. Что такое GRASP?  
79. Допустим, мы запечатали класс, так же следуем букве О в SOLID, но потом поняли что нам нужно добавить еще один метод, как нам это сделать и возможно не изменяя класс?  
80. Что такое managed/unmanaged code?  
81. Что такое CLR? Чем она занимается? IL(MSIL)?  
    1. Исполнение кода \- CLR выполняет машинный код, сгенерированный компилятором .NET, на конкретной аппаратной платформе.  
    2. Управление памятью \- CLR управляет памятью, выделяя и освобождая блоки памяти в процессе выполнения программы, а также с помощью механизмов сборки мусора.  
    3. Управление потоками \- CLR обеспечивает выполнение потоков, предоставляя средства для управления и координации их работы.  
    4. Проверка безопасности \- CLR обеспечивает безопасность кода, выполняемого в .NET Framework, с помощью механизмов проверки безопасности.  
    5. Поддержка многопоточности \- CLR позволяет создавать многопоточные приложения, которые могут выполнять несколько задач параллельно.  
    6. Доступ к библиотекам классов .NET Framework \- CLR обеспечивает доступ к библиотекам классов .NET Framework, которые предоставляют широкий спектр функциональных возможностей.  
    7. Обеспечение совместимости с .NET Framework \- CLR обеспечивает совместимость с различными версиями .NET Framework и языками, совместимыми с .NET.  
    8. Поддержка динамической компиляции \- CLR поддерживает динамическую компиляцию кода, что позволяет генерировать и выполнять код во время выполнения программы.  
82. Что такое утечка памяти? Возможно ли сделать ее в .NET? Как?  
83. Что такое стек вызовов? Может ли он переполнится? Что будет в таком случае?  
84. Что такое Garbage Collector? Зачем он нужен? Как он работает?  
85. Что такое Small Object Heap и Large Object Heap?  
86. Зачем нам нужна конструкция using {}? Зачем он если есть GC?  
87. Что такое IDisposable & Finalize  
88. Что такое Disposable pattern  
89. Чем асинхронность отличается от многопоточности?  
90. [Разница между Thread & Task?](https://ru.stackoverflow.com/questions/548876/%D0%92-%D1%87%D0%B5%D0%BC-%D1%80%D0%B0%D0%B7%D0%BD%D0%B8%D1%86%D0%B0-%D0%BC%D0%B5%D0%B6%D0%B4%D1%83-task-%D0%B8-thread-%D0%B8-%D0%BA%D0%BE%D0%B3%D0%B4%D0%B0-%D1%87%D1%82%D0%BE-%D0%BB%D1%83%D1%87%D1%88%D0%B5-%D0%B8%D1%81%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D1%8C)  
91. Разница между await & Task.Result  
92. [Что такое Middleware?](https://habr.com/ru/company/otus/blog/528692/) ([Second Link](https://www.c-sharpcorner.com/article/overview-of-middleware-in-asp-net-core/))  
93. Action Filter vs Middleware  
94. Как можно реализовать логгирование времени выполнения всех запросов?  
95. Как централизировано ловить ошибки от всех запросов?  
96. ASP.NET Request processing pipeline  
97. Что такое Action Filter?  
98. В чем разница между services.AddTransient, service.AddScoped и service.AddSingleton в встроеном DI ASP.NET Core?  
99. [Что такое паттерны проектирования? Зачем они нужны?](https://refactoring.guru/ru/design-patterns/what-is-pattern) (GoF Patterns)  
100. [Какие есть типы паттернов?](https://refactoring.guru/ru/design-patterns/csharp)  
101. Что такое антипаттерн?  
102. Назовите пару паттернов проектирования из каждой категории и принцип их работы?  
103. [Что такое MVC? Зачем он нужен?](https://ru.hexlet.io/blog/posts/chto-takoe-mvc-rasskazyvaem-prostymi-slovami)  
104. [Что такое Multi Layered Architecture?](https://www.ibm.com/ru-ru/cloud/learn/three-tier-architecture)  
105. Что такое Onion Architecture?  
106. Что такое DDD?  
107. Microservice vs Monolith  
108. Что такое CQRS?  
109. Что такое Unit of Work & Repository pattern? В каком случае он необходим?  
110. Что такое система контроля версий?  
111. Что такое Git Flow?  
112. [Какие виды тестирования ты знаешь?(Модульное, интеграционное, функциональное)](https://habr.com/ru/post/81226/)  
113. Что такое UNIT-tests? Зачем они нужны? Какие есть фреймворки для юнит-тестов?  
114. Что TDD?  
115. Из каких логических блоков состоит тест(Arrange/Act/Assert)?  
116. Что такое Moq? Зачем он нужен?  
117. [Разница между моками и стабами? (Stub \- только имитирует состояние, Mock имитирет состояние и имеет ожидание)](https://medium.com/@andr.ivas12/%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5-%D0%B4%D0%BB%D1%8F-%D1%87%D0%B0%D0%B9%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2-c007d43da791)  
118. Чем отличаются unit-тесты от интеграционных?  
119. [Что такое IoC?](https://habr.com/ru/post/131993/)  
120. [Что такое Dependency Inversion?](https://habr.com/ru/post/131993/)  
121. Что такое маппинг? Зачем он нужен? С помощью чего его можно реализовать?  
122. Что такое сериализация и десериализация?  
123. Что такое JSON? Зачем он нужен?  
124. [Что такое аутентификация?](http://security.mosmetod.ru/paroli/192-identifikatsiya-autentifikatsiya-i-avtorizatsiya-v-chem-raznitsa)  
125. [Что такое авторизация?](http://security.mosmetod.ru/paroli/192-identifikatsiya-autentifikatsiya-i-avtorizatsiya-v-chem-raznitsa)  
126. Что такое JWT Token?  
127. Cookie vs JWT  
128. Basic Authentification vs Two-Factor Authentification vs Resource-based authentification  
129. URI/URL  
130. UDP/TCP  
131. Чем отличается http vs https  
132. Какие есть HTTP методы?  
133. Чем отличаются GET & POST запросы?  
134. [Что такое идемпотентность и безопасность HTTP методов?](https://restapitutorial.ru/lessons/idempotency.html)  
135. [Что значит REST?](https://www.ibm.com/ru-ru/cloud/learn/rest-apis)   
136. Как из OWASP 10 vulnerabilities знаешь?  
137. Какая разница между авторизацией и аутентификацией и идентификацией?  
138. Что такое CI/CD?  
139. Какую проблему решает [Docker](https://www.ibm.com/ru-ru/cloud/learn/docker)? [Что такое контейнер?](https://www.ibm.com/ru-ru/cloud/learn/containers)  
140. [Что такое БД?](https://info-comp.ru/what-is-a-dbms)  
141. Какие основные типы БД?  
142. [Кто такие ваши Нереляционные БД?](https://docs.microsoft.com/ru-ru/azure/architecture/data-guide/big-data/non-relational-data)  
143. В виде какой структуры хранятся данные в SQL?  
144. Как понять, что выбрать CodeFirst/DBFirst?  
145. Что такое PRIMARY KEY?  
146. Что такое FOREIGN KEY?  
147. Что такое UNIQUE KEY?  
148. [Какие есть ограничения таблиц?](https://info-comp.ru/obucheniest/628-restrictions-in-ms-sql-server.html)  
149. Назовите типы JOINов?  
150. [Что такое нормализация?](https://info-comp.ru/database-normalization) В чем заключаются первые три ее формы?  
151. Что такое денормализация?  
152. Что делает DISTINCT?  
153. Какая разница между WHERE & HAVING?  
154. [А чем разница между CHAR и VARCHAR?](https://overcoder.net/q/426/%D0%B2-%D1%87%D0%B5%D0%BC-%D1%80%D0%B0%D0%B7%D0%BD%D0%B8%D1%86%D0%B0-%D0%BC%D0%B5%D0%B6%D0%B4%D1%83-varchar-%D0%B8-char)  
155. [Какой порядок исполнения запросов SQL](https://ru.stackoverflow.com/a/487352/360819)(  
     1. FROM  
     2. ON  
     3. JOIN  
     4. WHERE  
     5. GROUP BY  
     6. WITH CUBE or WITH ROLLUP  
     7. HAVING  
     8. SELECT  
     9. DISTINCT  
     10. ORDER BY  
     11. TOP  
156. [Что такое индекс?](https://otus.ru/journal/vse-chto-neobhodimo-znat-pro-indeksy-ms-sql/) Какие есть его типы?  
157. Как происходит сортировка данных по кластерным и не кластерным индексам?  
158. Что такое хранимая процедура? Чем она отличается от функции?  
159. Что такое триггер?  
160. Что такое подзапрос?  
161. Что такое транзакция?  
162. Что такое Common Table Expression?  
163. Расскажи про ACID  
164. Что такое ORM?  
165. Типы наследования Entity Frammework  
166. Расскажи про Agile, Scrum, Kanban, Waterfall

