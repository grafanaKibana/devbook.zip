# Real GPT lesson in Obsidian

Writer: **gpt-6.1-sol**. Tutor: **gpt-6.1-terra**. These are actual generations and grades from the loaded Qard plugin.

This is a labelled trial using a temporary source note. Test answers are authored controls, not the learner’s own performance. The lesson has no mastery link. Existing learning files were left unchanged.

Saved lesson: `Assets/Qard/Lessons/2026-11-06 GPT trial predict class-reference assignment, mutation and r.json`.

## The generated lesson

### 1. Explain shared mutation — 3 marks

**Actual question**

Here, `Box` is a C# class with an ordinary integer auto-property named `Value`. The statements run in order:

```csharp
var a = new Box { Value = 1 };
var b = a;
b.Value = 5;
Console.WriteLine(a.Value);
Console.WriteLine(b.Value);
```

Write one short paragraph stating the two printed values in order and explaining how reference copying and the property change produce them.

**Actual expected answer**

The output is `5` then `5`. Assigning `a` to `b` copies the reference, so both refer to the same box. `b.Value = 5` changes that shared box's property, so reading through either variable returns `5`.

**Rubric and awarded points**

| Requirement | Marks | Awarded |
| --- | ---: | --- |
| States that the output is 5 followed by 5. | 1 | Yes |
| Explains that assignment copies the reference, so a and b refer to the same object. | 1 | Yes |
| Explains that changing Value through b updates the shared object's property, which is also read through a. | 1 | Yes |

**Test answer submitted**

5 then 5. Assigning a to b copies its reference, so both reach the same Box; writing through b changes that shared object.

**Actual grade: 3/3.** You correctly traced the shared reference and mutation.

**Tutor reply**

Correct: both variables refer to the same box, so a mutation through either reference is visible through the other.

**Annotations**

- correct: “5 then 5” — You identified both outputs.
- correct: “copies its reference, so both reach the same Box” — You explained why both variables refer to the same object.
- correct: “writing through b changes that shared object” — You explained why the change is visible through both references.

### 2. Distinguish reassignment from mutation — 3 marks

**Actual question**

In this C# code, `Box` is a class with an ordinary integer `Value` property. Explain the final output in two or three sentences: state the printed value, identify which box `b` refers to, and explain what the reassignment changes.

```csharp
var a = new Box { Value = 2 };
var b = a;
a = new Box { Value = 9 };
Console.WriteLine(b.Value);

class Box
{
    public int Value { get; set; }
}
```

**Actual expected answer**

It prints `2`; `b` still refers to the original box. Reassignment stores the new box's reference in `a`, while `b` keeps its reference in a separate variable location.

**Rubric and awarded points**

| Requirement | Marks | Awarded |
| --- | ---: | --- |
| States that the printed value is 2. | 1 | Yes |
| Identifies that b still refers to the original box. | 1 | No |
| Explains that reassignment replaces the reference stored in a with a reference to the new box; it does not change b's separate variable location. | 1 | No |

**Test answer submitted**

It prints 2.

**Actual grade: 1/3.** You predicted the output correctly, but did not explain the references.

**Tutor reply**

`2` is correct. Which box does `b` still refer to after `a` is reassigned, and which variable’s reference changes?

**Annotations**

- correct: “It prints 2.” — You correctly predicted the output.
- missing: “It prints 2.” — You did not explain which box `b` refers to or what reassignment changes.

### 3. Trace the complete sequence — 4 marks

**Actual question**

Trace this complete C# program. `Box` is a class with an ordinary integer property; execution is sequential. Write the two output lines in order, then explain how the property mutation and reassignment produce those values.

```csharp
using System;

var a = new Box { Value = 1 };
var b = a;
a.Value = 2;
a = new Box { Value = 9 };
Console.WriteLine(a.Value);
Console.WriteLine(b.Value);

class Box
{
    public int Value { get; set; }
}
```

**Actual expected answer**

Output:
```text
9
2
```
`a.Value = 2` changes the original box shared by `a` and `b`. Reassigning `a` makes it refer to a new box containing 9; `b` still refers to the original box containing 2.

**Rubric and awarded points**

| Requirement | Marks | Awarded |
| --- | ---: | --- |
| Predicts 9 as the first output. | 1 | Yes |
| Predicts 2 as the second output. | 1 | No |
| Explains that the property assignment changes the original box shared by a and b to Value 2. | 1 | Yes |
| Explains that reassignment makes a refer to a new box with Value 9 while b retains its reference to the original box. | 1 | No |

**Test answer submitted**

9 then 9. The property assignment changes the original shared box to 2, but a and b are aliases for the same variable, so reassigning a redirects b too.

**Actual grade: 2/4.** You correctly traced the shared mutation, but treated the two variables as aliases when tracing reassignment.

**Tutor reply**

You correctly tracked the original box changing to 2. The gap is treating `a` and `b` as the same variable: each stores its own reference. After `a` is reassigned, which box does `b` still reference?

**Annotations**

- correct: “9 then 9” — You predicted the first output correctly.
- correct: “property assignment changes the original shared box to 2” — You identified the mutation of the shared box.
- wrong: “a and b are aliases for the same variable” — You treated two variables holding references as one variable.
- wrong: “reassigning a redirects b too” — You assumed reassignment changes both variables' references.

## What changed in the actual comparison

The map comparison used the same topic, note and probe answers with the original and revised prompts. The step comparisons used the same revised plan for both writers, so scope differences are visible without changing the assigned step. The revised prompt also supplies the whole plan; that added context is part of the change.

**Map before**

1. Copy a reference — This builds on what you know and establishes that two separate variables can refer to one box.
2. Predict mutation — A typed-answer check tests how both references observe a change to the shared box.
3. Predict reassignment — A typed-answer check distinguishes changing one variable's reference from changing the shared box.
4. Trace the complete example — A typed-answer check combines assignment, mutation and reassignment to predict both output values.

**Map after**

1. Explain shared mutation — Recall that assignment copies a reference, then use a worked example to explain why both variables observe a property change; reassignment comes next.
2. Distinguish reassignment from mutation — Use separate variable locations and the shared-object example to explain why reassignment changes one reference while mutation changes the object; combine both operations in the final trace.
3. Trace the complete sequence — Apply reference copying, shared mutation, and reassignment to predict and explain each output in one complete code trace.

The new map fits the requested two or three steps and starts at the unknown mutation idea. The old first step starts from reference copying, already demonstrated, but also explains separate variables, which is relevant to the reassignment misconception. It is not entirely redundant.

**When the question is asked**

All three original steps set `checkFirst: true`; all three revised steps set it to `false`. The probe had an unknown mutation response and an incorrect reassignment mechanism, so teaching before checking is appropriate here.

**Scope of step 2**

Original generated question:

Assume `Box` is a class with an integer `Value` property. Trace this complete sequence. Write the two output lines, then explain what each variable refers to after the mutation and after the reassignment. Why does changing `a` sometimes affect what `b.Value` reads?

```csharp
var a = new Box { Value = 1 };
var b = a;
a.Value = 2;
a = new Box { Value = 9 };
Console.WriteLine(a.Value);
Console.WriteLine(b.Value);
```

Revised generated question:

In this C# code, `Box` is a class with an ordinary integer `Value` property. Explain the final output in two or three sentences: state the printed value, identify which box `b` refers to, and explain what the reassignment changes.

```csharp
var a = new Box { Value = 2 };
var b = a;
a = new Box { Value = 9 };
Console.WriteLine(b.Value);

class Box
{
    public int Value { get; set; }
}
```

The original step 2 already asks for the complete trace, overlapping the final step. The revised step 2 isolates reassignment and leaves the combined trace to step 3.

## Expected-answer comparison with the question held fixed

The final question, four rubric points, source note and writer model were identical. The saved expected answer was removed from both inputs. Only the expected-answer instruction changed.

**Before — 70 words**

The output is:
```text
9
2
```
`var b = a` copies the reference, so both variables initially refer to the same box. `a.Value = 2` mutates that shared box, making its Value 2.

`a = new Box { Value = 9 }` creates a new box and changes only the reference held by `a`. `b` still refers to the original box. Therefore, `a.Value` prints 9 and `b.Value` prints 2.

**After — 38 words**

9
2

`a` and `b` initially reference the same box, so `a.Value = 2` changes that shared box. Reassigning `a` makes it reference a new box with Value 9; `b` still references the original box with Value 2.

This pair went from 70 to 38 words, about 46% shorter. Both retain the two outputs, shared mutation and separate reassignment. This is one generated pair, not a guarantee for every question.

## Matched grading comparison

These controls use the same final question, rubric, expected answer, student answer, confidence, tutor model and effort in both versions. The revised misconception result is the actual saved lesson grade.

| Test answer | Original prompt | Revised prompt | Expected |
| --- | ---: | ---: | ---: |
| concise-correct | 4/4 | 4/4 | 4/4 |
| output-only-partial | 2/4 | 2/4 | 2/4 |
| explicit-misconception | 2/4 | 2/4 | 2/4 |

The scores were already correct in both versions. The difference was feedback: the old misconception result has six annotations, including wrong and missing comments about the same incorrect output. The revised result has four annotations and drops both extra missing comments. For the output-only answer, the old response has two separate missing comments; the revised response combines the omitted explanation into one comment.

**Exact misconception annotations before**

```json
[
  {
    "quote": "9 then 9",
    "kind": "correct",
    "note": "You correctly identified the first output as 9."
  },
  {
    "quote": "9 then 9",
    "kind": "wrong",
    "note": "You predicted the second output incorrectly."
  },
  {
    "quote": "9 then 9",
    "kind": "missing",
    "note": "You needed to identify the second output as 2."
  },
  {
    "quote": "the original shared box to 2",
    "kind": "correct",
    "note": "You correctly identified the mutation of the shared box."
  },
  {
    "quote": "a and b are aliases for the same variable",
    "kind": "wrong",
    "note": "You treated two variables holding the same reference as one variable."
  },
  {
    "quote": "",
    "kind": "missing",
    "note": "You needed to explain that reassignment makes a refer to a new box while b still refers to the original box."
  }
]
```

**Exact misconception annotations after**

```json
[
  {
    "quote": "9 then 9",
    "kind": "correct",
    "note": "You predicted the first output correctly."
  },
  {
    "quote": "property assignment changes the original shared box to 2",
    "kind": "correct",
    "note": "You identified the mutation of the shared box."
  },
  {
    "quote": "a and b are aliases for the same variable",
    "kind": "wrong",
    "note": "You treated two variables holding references as one variable."
  },
  {
    "quote": "reassigning a redirects b too",
    "kind": "wrong",
    "note": "You assumed reassignment changes both variables' references."
  }
]
```

## Remaining problems

- The first question still bundles two output values into one rubric point.
- The final question repeats the exact worked example and values from the note. It tests an explanation of that case, not transfer to a fresh case.
- On the fixed-question controls, numerical grading did not improve; both prompts were correct.

The experiment generated one trial lesson and one original map, plus three original step versions, three real lesson grades, five extra matched grades and two fixed-question expected answers. The initial probe was also generated by Qard. These are model-output checks, not a measurement of later learning.
