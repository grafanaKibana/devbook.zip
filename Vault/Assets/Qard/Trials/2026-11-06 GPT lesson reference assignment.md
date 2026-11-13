---
qard-trial: true
---

# Reference assignment, mutation and reassignment

Temporary lesson test. Responses submitted in this trial are test inputs, not the learner's own performance. This note is not linked to a mastery objective.

A C# class variable holds a reference to an object. Assigning one class variable to another copies the reference, not the object. The variables are separate locations that can initially hold references to the same object.

Mutating a shared object's property changes that object; every reference to it observes the change. Reassigning one variable changes the reference held by that variable. It does not reassign another variable.

For a Box class with an integer Value property, trace this sequence:

```csharp
var a = new Box { Value = 1 };
var b = a;
a.Value = 2;
a = new Box { Value = 9 };
Console.WriteLine(a.Value);
Console.WriteLine(b.Value);
```

The output is 9 then 2. The property mutation affects the original shared box. The reassignment gives a a different box while b still refers to the original one.

ReferenceEquals tests whether two references identify the same object. Equal property values alone do not imply shared identity. No value-type copying, strings, inheritance or concurrency is needed for this lesson.
