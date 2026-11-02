# C# quiz recommendations for DevBook

This is the preimplementation selection report. The subsequent [implementation and full card audit](card-focus-audit-2026-11-02.md) records the changes delivered in this PR. Evidence links below remain pinned to the original vault baseline.

Reviewed on 2 November 2026 against the current local vault. **Select 35 README entries as material for 21 consolidated changes to existing notes; skip 41 README entries and all 10 duplicate mid-level entries; defer 2 entries pending a language-topic placement decision.** These are editorial recommendations, not 35 new cards. Some changes add a focused card, others enrich an existing card or clarify its supporting prose.

The highest-value additions concern task-result nullability, task composition, closure capture, LINQ source binding, extension and overload selection, signature identity, ref returns, atomic updates, and shallow readonly references. Much of the source repeats mechanisms that the vault already explains and recalls. Several quiz answers also need correction before any adaptation.

No vault note, lifecycle state, card identity, or generated Quartz content was changed. This report is the requested deliverable.

## Scope and selection method

The complete source snapshot contains exactly two files: [README.md](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md) and [csharp_mid_level_quiz.md](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md), at [commit b457a6cdf66b](https://github.com/peppial/csharp-questions/commit/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1), committed 29 April 2026. Both files were read in full, including snippets, options, and explanations. The README has 78 entries numbered 1–77 because 39 occurs twice; the mid-level file has 10 entries, all repeated from the README. **R39a** means the ref/exception example and **R39b** the span/list-pattern example. R and M otherwise identify README and mid-level entries.

Vault comparison used the current files under Vault/Home, rather than the generated site or a title-only inventory. All C# Fundamentals and concurrency notes, the .NET Runtime notes, relevant design notes, the existing Span note, and cross-vault topic searches were included. The baseline repository commit was 079349096995ab0db336686eb8de56eab364248a; pre-existing local changes were outside these audited authorable notes.

The coverage distinction matters:

- **Knowledge gap:** a useful rule or boundary is missing or only mentioned in passing.
- **Recall gap:** explanatory prose already covers the mechanism, but there is no focused question that restores it.
- **Covered:** an existing card already tests the same mechanism; another output puzzle would mostly add repetition.
- **Defer:** the concept can fit, but its ownership or surrounding scope should be settled before authoring.

Recommendations prioritize recoverable mechanisms and practical judgment over answer-letter memorization. Exact-output examples remain useful when their result follows from a stable contract. Concurrent scheduling, host lifetime, pool reuse, or runtime escape hatches must not be presented as universal output guarantees. Accuracy checks used the official sources linked beside the corrections below; the snippets were not compiled or executed, so this is an editorial and documentation-backed comparison, not a runtime test suite.

## What to add and where

**P1** is the first authoring batch: 10 focused changes. **P2** is a second batch: 11 useful but narrower changes, often recall-only. The question wording below is newly written around each mechanism. It is a proposed recall target, not a ready-to-import card body.

### A00 Task reference and result nullability

**P1 · R77 · New application card · [Async Await][async]**

**Proposed question:** Why does null-coalescing a `Task<string?>` fail to reject a null result?

**Answer boundary:** The task reference and its eventual result are different values. Await first, then apply the null guard to the result. Describe the returned result rather than asking for console output.

**Why this belongs:** Task/result semantics exist, but this concrete nullable-result validation failure is absent. It is a compact, realistic correctness bug.

### A01 Task completion and result ordering

**P1 · R25 · New application card · [Tasks][tasks]**

**Proposed question:** What does awaiting WhenAny return, and how does WhenAll order its results?

**Answer boundary:** WhenAny returns a completed input task; await that task to observe its result or failure. Other tasks continue unless separately canceled. `WhenAll<T>` returns results in supplied-task order, independent of completion order. Do not predict a winner from requested delays.

**Why this belongs:** Tasks has composition prose at 85–107 and failure cards at 198 onward; input-order prose also exists in the concurrency hub. The observation/order boundary lacks direct recall.

### A02 Closure storage

**P1 · R4, R24 · Recall addition · [Delegates][delegates]**

**Proposed question:** Why do for-loop callbacks share a final index while Select callbacks can retain distinct parameter values?

**Answer boundary:** Closures capture variable storage. A for index is one shared variable; a local declared in the loop body or a value parameter for each Select invocation provides distinct storage. The C#5 foreach change is not the reason Select works.

**Why this belongs:** The exact for-loop failure and fix already occupy Delegates 88–117. Add recall rather than repeating the prose.

### A03 Deferred query source binding

**P1 · R22 · Small prose clarification and card · [Foreach][foreach]**

**Proposed question:** Does deferred execution mean a LINQ query follows later reassignment of the source variable?

**Answer boundary:** Operators keep the source object supplied during construction. Reassigning the caller variable does not replace it. Mutation of that same source can affect a later enumeration, and separately captured predicate variables remain live. A materialized result is a different boundary.

**Why this belongs:** Foreach covers deferred/repeated work at 43–83 and 136; Functional Programming covers LINQ at 111–125. Neither explains source binding versus external-variable capture explicitly.

### A04 Extension lookup

**P1 · R18, R19 · Application card · [Methods][methods]**

**Proposed question:** Which type controls extension lookup, and can a runtime-derived method replace the selected extension?

**Answer boundary:** Use the compile-time receiver type, applicable instance-member lookup, and extension candidate eligibility. A method visible only on the runtime-derived type is not discovered through a base-typed reference. Generic constraints control applicability, not dynamic dispatch.

**Why this belongs:** Other Method Forms mentions static extension resolution at 202, but no existing question exercises the concrete boundary.

### A05 Overload selection

**P1 · R30, R51, R69 · One core card with an advanced follow-up · [Methods][methods]**

**Proposed question:** Why can changing an argument's declared type or adding a derived overload change which method runs?

**Answer boundary:** Compare applicable candidates and conversions; an identity conversion to inferred B beats B-to-A in R30. Generic methods have no blanket priority. R51 tests compile-time argument type. R69 is a separate advanced member-lookup follow-up: an applicable derived declaration can prevent considering the better-looking base overload.

**Why this belongs:** Methods 205 has only a short resolution overview. These examples restore a useful debugging and API-evolution rule; avoid combining all three into an oversized answer.

### A06 Method signature identity

**P1 · R1, R52 · Signature-rule card · [Methods][methods]**

**Proposed question:** Can overloads differ only by object versus dynamic, or by generic constraints?

**Answer boundary:** Neither distinction creates a different signature. These declarations are rejected before a call is resolved. Dynamic affects binding behavior but is represented as object in this signature context; do not call dynamic merely interchangeable with object in all contexts.

**Why this belongs:** No current card explains these signature exclusions. This also prevents importing R52's misleading call-site ambiguity explanation.

### A07 Ref return aliasing

**P1 · R20, R21 · Recall addition · [Methods][methods]**

**Proposed question:** When does a ref return make the caller an alias rather than produce an independent value?

**Answer boundary:** A ref local bound with ref aliases eligible existing storage; writes update that storage. A normal value assignment copies the value. Ref-safety prevents returning an alias to storage with an insufficient lifetime. Use R21 only as a contrast with the separate copied out value.

**Why this belongs:** Ref returns are prose-only at 200. Existing ref-parameter cards do not directly recall the return/caller binding boundary.

### A08 Async failure observation

**P2 · R5, R6, R12 · One focused application card · [Async Await][async]**

**Proposed question:** Why does a try/catch around an unawaited async call miss its later failure, and how does async void differ?

**Answer boundary:** Task-returning async failures are stored on the task and observed through await or another observation path. Async void has no returned task and delivers failure through its host/context path. Modern unobserved-task policy does not normally terminate the process by default. Remove console lifetime as the quiz trick.

**Why this belongs:** Async Await 132–150 and Tasks 111 already explain most of this; Exception Handling's existing card at 135 also mentions fault observation. This is a targeted application/contrast card, not missing foundational prose; lower priority to avoid duplicate recall.

### A09 Atomic updates

**P1 · R63 · Decision card · [Locking][locking]**

**Proposed question:** When is Interlocked sufficient instead of lock?

**Answer boundary:** It provides atomic operations on the supported single location. That can implement a counter; several related fields or a check-then-update invariant need a suitable broader synchronization design. Waiting for both workers establishes completion before reading the final example result.

**Why this belongs:** The race and monitor cards already exist. Interlocked is only incidental in Parallelism's accumulation example; there is no direct choice-boundary card.

### A10 Readonly reference boundary

**P1 · R44 · Extend existing in card · [Methods][methods]**

**Proposed question:** Does an in parameter make a referenced object immutable?

**Answer boundary:** It prevents assigning through the readonly parameter alias. For a reference type, methods may still mutate the object reached through the reference. Distinguish this from defensive copies of mutable structs through readonly receivers.

**Why this belongs:** The current in card at 244 explains readonly passing and copy costs but omits this object-state boundary. Enrich it rather than add another modifier-definition card.

### A11 Initialization order

**P2 · R10, R16 · Small initialization section with recall · [Classes][classes]**

**Proposed question:** How do default values, field initializers, and constructor bodies interact during initialization?

**Answer boundary:** Explain zero/default initialization and textual order within a type. Use R16 only to trace that program's explicit static constructors, derived field initializer, base construction, and derived body. Avoid claiming that all hierarchies or types without explicit static constructors have one fixed global order.

**Why this belongs:** Classes 130 and 186 provide partial construction prose. Runtime 29–39 already owns static-initialization trigger timing. Add the language-level ordering gap, not another general CLR-startup card.

### A12 Generic static state

**P2 · R46 · Recall addition · [Generics][generics]**

**Proposed question:** Do `Cache<int>` and `Cache<string>` share a static field declared on `Cache<T>`?

**Answer boundary:** Each closed constructed type has separate static state. This is distinct from the CLR sharing executable code among compatible instantiations. Connect to per-type caches and unintended state assumptions.

**Why this belongs:** Generics 104 already states the exact rule in prose. A short recall card is enough.

### A13 Struct copy boundaries

**P2 · R48, R49 · Extend existing copy-boundary card · [Types][types]**

**Proposed question:** Why can a mutating method on a struct-valued property silently lose its update?

**Answer boundary:** The ordinary getter returns a value copy. Mutating it does not update the stored value; a field assignment through that ordinary property may instead be rejected. Show local mutation plus write-back or an intentional ref-return API. The copied enumerator can be an optional follow-up.

**Why this belongs:** Types 48–73 already contains essentially R48 verbatim in mechanism, and 78–93 recalls foreach copies. Broaden that existing recall boundary rather than author another example or infinite-loop card.

### A14 Span aliasing

**P2 · R13 · Recall addition · [Span][span]**

**Proposed question:** Does modifying an array-backed span slice change the array, and who owns the memory?

**Answer boundary:** A slice is a non-owning view over the same storage. Writes reach the array; ToArray creates independent storage. The view's ref-safety/lifetime restrictions remain relevant.

**Why this belongs:** The canonical Span note already explains this at 13–39 and demonstrates mutation at 180–192, but has no Qard cards. Its user-owned status is Done and must remain Done.

### A15 Struct disposal copies

**P2 · R72, R41 · New copy/disposal boundary card · [Structs][structs]**

**Proposed question:** Why can using(existingStruct) dispose a copy while the original struct's flag stays unchanged?

**Answer boundary:** A using expression is captured into a resource value; copying a struct separates its own fields. Disposal targets the captured value. This does not require boxing. Do not generalize the result to every using declaration or reference-type resource.

**Why this belongs:** Memory Leaks already recalls why using is needed, but not this value-copy boundary. Structs is the semantic owner; link to resource-ownership prose only when useful.

### A16 Reflective overload lookup

**P2 · R56 · Lookup-failure card · [Reflection][reflection]**

**Proposed question:** Why can name-only GetMethod fail before Invoke is reached?

**Answer boundary:** Several matching overloads can cause AmbiguousMatchException during lookup. Select the intended parameter types/signature and flags, and handle no-match separately. Invoke arguments do not retroactively choose the MethodInfo.

**Why this belongs:** Reflection explains discovery before invocation and flags at 20–29 and 100, but no card exercises overloaded-member disambiguation.

### A17 Anonymous equality

**P2 · R57, R76 · Equality contrast card · [Types][types]**

**Proposed question:** Why can anonymous objects fail == but match Equals and Intersect?

**Answer boundary:** Anonymous types synthesize value-based Equals/GetHashCode while == retains reference comparison. Compatible anonymous shapes in the same assembly can be the same generated type. LINQ's default set equality uses the value equality/hash contract; it does not call the == operator.

**Why this belongs:** Existing type/class/record cards omit anonymous-type synthesis. Keep a compact equality contrast in Types, rather than add a new folder or an anonymous-type note solely for two puzzles.

### A18 Default interface members

**P2 · R61, R60, R68 · Extend interface comparison with focused recall · [Classes][classes]**

**Proposed question:** Why is a default interface member callable through the interface but absent on the concrete class?

**Answer boundary:** Default interface implementations do not become ordinary inherited class members. A public class implementation changes class lookup; an explicit interface implementation still requires interface access. A most-specific interface implementation is an advanced separate dispatch follow-up.

**Why this belongs:** Classes 68 and 215–227 already compare interface capabilities with abstract classes. Extend that current comparison; a new Interfaces note would need a separate broader scope decision.

### A19 Pooled buffer contracts

**P2 · R55 · Pooled-buffer contract card · [Memory Leaks][leaks]**

**Proposed question:** What may a rented ArrayPool buffer contain, and what obligations follow from renting it?

**Answer boundary:** The rental may contain previous data and be larger than requested. Initialize the logical region before reading it; track actual data length. Return according to the pool contract, stop using it after return, and apply an explicit clearing policy for retained references or sensitive data. A later Rent need not return the same array.

**Why this belongs:** Modern Lifetime Traps 350 already names ownership and use-after-return. Extend that existing mechanism with dirty/oversized buffer boundaries, not the source's guessed output.

### A20 User-defined conversions

**P2 · R65 · Small conversion explanation and decision card · [Structs][structs]**

**Proposed question:** When should a custom conversion be implicit rather than explicit?

**Answer boundary:** An implicit conversion should be unsurprising and avoid information loss or exceptional behavior; use an explicit conversion when callers should acknowledge a risk. Explain how a conversion can make a built-in operator applicable without defining that operator. Do not endorse accidental loss of a unit type's semantics.

**Why this belongs:** User-defined conversions are absent from the audited language notes. The existing Structs note is the owner of the source's value-type example; keep the addition small and use a value-object example.

## Topics to defer

| Source | Possible destination | What is useful | Why defer now |
| --- | --- | --- | --- |
| R38 and R39b | Proposed `Vault/Home/Programming/NET/CSharp/Fundamentals/Pattern Matching.md`; compare with [Functional Programming][functional] first | Ordered type/property/relational patterns and list-pattern shape matching; include exhaustiveness and null boundaries | Pattern matching is already introduced in Functional Programming 84–101, but property/list detail and recall are absent. A dedicated language note is a plausible separate scope, not an automatic new page for two puzzles. Confirm that placement and division before creation; keep the design-oriented explanation in its current owner. |

R66 rounding is a reasonable future numeric-correctness topic, but the isolated midpoint example does not justify appending unrelated arithmetic facts to the Types hub. R23 streaming versus buffering could earn a coherent LINQ treatment later. R73 evaluation order is real, but the self-mutating compound-assignment puzzle is lower priority than the concrete missing boundaries above. These are skips from this import, not claims that the topics never matter.

## Complete README decisions

**Add** selects a representative entry for one of the consolidated changes above. **Merge** uses an entry only as a contrast or follow-up in that same change. **Skip** means no new import is needed; the destination column identifies either existing coverage or the nearest topic owner. **Defer** means resolve the placement proposal first. The table accounts for every one of the 78 entries.

| Source | Mechanism | Decision | Where | Why |
| --- | --- | --- | --- | --- |
| [R1](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L28) | Signature identity | Add | A06 · [Methods][methods] | Methods lacks the dynamic/object signature boundary; combine with R52. |
| [R2](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L59) | Reference parameter reassignment | Skip | [Methods][methods] | The reference-rebinding card already explains this; R7 is the same family. |
| [R3](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L99) | await inside lock | Skip | [Locking][locking] | A direct existing card explains thread ownership and alternatives. |
| [R4](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L141) | Shared for-loop capture | Add | A02 · [Delegates][delegates] | Exact prose exists; add focused recall and contrast with R24. |
| [R5](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L197) | async void and process exit | Merge | A08 · [Async Await][async] | Use only as the async-void contrast; discard the process-exits-first puzzle. |
| [R6](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L234) | Dropped async Task | Merge | A08 · [Async Await][async] | Consolidate with R12; existing exception recall already partly covers observation. |
| [R7](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L278) | Mutation versus rebinding | Skip | [Methods][methods] | Existing reference-type ref card covers both outcomes. |
| [R8](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L329) | Literal and runtime string identity | Skip | [Strings][strings] | Existing interning prose and cards are more complete. |
| [R9](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L376) | String content versus reference equality | Skip | [Strings][strings] | Existing cards directly test this. |
| [R10](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L420) | Static field initializer order | Add | A11 · [Classes][classes] | Add textual-order and default-value boundary, not a number to memorize. |
| [R11](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L457) | Racing increment | Skip | [Locking][locking] | Lost-update card already exists; the source incorrectly guarantees a lost update. |
| [R12](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L510) | Faulted Task observation | Add | A08 · [Async Await][async] | Adapt into one Task-versus-async-void application card; correct modern runtime policy. |
| [R13](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L558) | Span aliases array storage | Add | A14 · [Span][span] | Recall-only addition in the existing Span note outside the C# folder. |
| [R14](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L595) | Hidden virtual method | Skip | [Methods][methods] | Existing virtual/override/new cards directly cover it. |
| [R15](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L639) | Static hiding and virtual dispatch | Skip | [Methods][methods] | Same dispatch rules already recalled; no separate output card. |
| [R16](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L688) | Derived/base initialization sequencing | Add | A11 · [Classes][classes] | Use as a worked explanation under the same initialization recommendation as R10. |
| [R17](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L772) | Two independent boxes | Skip | [Types][types] | Existing boxing card states each box is a separate allocation and copy. |
| [R18](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L809) | Extension receiver binding | Add | A04 · [Methods][methods] | Partial prose only; add declared-type and instance-member lookup boundary. |
| [R19](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L853) | Constrained extension eligibility | Merge | A04 · [Methods][methods] | Use as one follow-up to R18, rather than a second quiz card. |
| [R20](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L900) | Writable ref return | Add | A07 · [Methods][methods] | Prose-only mechanism merits aliasing and escape-safety recall. |
| [R21](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L939) | Ref alias versus out copy | Merge | A07 · [Methods][methods] | Optional follow-up to R20; avoid another near-identical card. |
| [R22](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L978) | LINQ source binding | Add | A03 · [Foreach][foreach] | Add source-object retention versus variable reassignment; correct the immutability explanation. |
| [R23](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1015) | Deferred reversal with side effects | Skip | [Foreach][foreach] | Buffering is useful, but this puzzle rewards side-effect tracing; defer a broader LINQ treatment. |
| [R24](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1050) | Select parameter capture | Merge | A02 · [Delegates][delegates] | Useful contrast to R4 after removing the false pre-C#5 claim. |
| [R25](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1087) | Task completion and result order | Add | A01 · [Tasks][tasks] | Add winner-task observation and input-order guarantees; remove delay-based certainty. |
| [R26](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1133) | Repeated iterator enumeration | Skip | [Foreach][foreach] | Existing iterator card and multiple-enumeration prose cover it. |
| [R27](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1182) | Filter/map/reduce arithmetic | Skip | [Functional Programming][functional] | Equivalent pipeline already exists; arithmetic adds little judgment. |
| [R28](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1215) | Who can invoke an event | Skip | [Events][events] | Existing event-versus-delegate card covers publication; source derived-class claim is wrong. |
| [R29](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1268) | Multicast return value | Skip | [Delegates][delegates] | Existing card explicitly covers order, last result, and exceptions. |
| [R30](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1300) | Better overload conversions | Add | A05 · [Methods][methods] | Correct the generic-preference myth; use conversion quality. |
| [R31](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1339) | Invariant producer interface | Skip | [Generics][generics] | Existing covariance/invariance cards already cover explicit out. |
| [R32](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1389) | Iterator stopped by break | Skip | [Foreach][foreach] | Early exit, resumption, and disposal already explained and recalled. |
| [R33](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1431) | Rebinding one aliased reference | Skip | [Methods][methods] | Existing ref card plus value-copy model cover it; no new mechanism. |
| [R34](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1476) | Method groups and printed array type | Skip | [Delegates][delegates] | Delegate compatibility is useful; memorizing the runtime type-name string is not a good recall target. |
| [R35](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1511) | Static constructor trigger | Skip | [Runtime][runtime] | Runtime startup card already distinguishes explicit static constructors and beforefieldinit. |
| [R36](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1556) | Mutable record properties | Skip | [Records][records] | Generated-property shapes are already recalled; an explicit-setter follow-up can enrich that card if desired. |
| [R37](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1594) | Record runtime-type equality | Skip | [Records][records] | Existing overview card explicitly requires matching runtime types and field equality. |
| [R38](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1630) | Property and relational patterns | Defer | [Pattern ownership proposal][patterns] | Useful language coverage, but first resolve ownership against the existing Functional Programming section. |
| [R39a](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1676) | ref plus catch/finally assignments | Skip | [Exception Handling][exceptions] | Contrived combination of already-covered ref and exception control flow. |
| [R39b](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1730) | List pattern over span | Defer | [Pattern ownership proposal][patterns] | Combine with R38 in one language-focused proposal; do not create a one-puzzle span page. |
| [R40](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1773) | Resumption after yield | Skip | [Foreach][foreach] | Existing iterator mechanism covers it; source newline explanation is also inaccurate. |
| [R41](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1807) | Disposable struct expression copy | Merge | A15 · [Structs][structs] | Same mechanism as R72; reject the claim that disposal necessarily boxes. |
| [R42](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1849) | Reentrant monitor | Skip | [Locking][locking] | Existing card directly compares monitor and semaphore reentrancy. |
| [R43](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1894) | out definite assignment | Skip | [Methods][methods] | Existing out prose and modifier card require assignment on every normal return. |
| [R44](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1929) | in is shallow readonly | Add | A10 · [Methods][methods] | Extend the current in card to distinguish readonly storage from mutable referenced state. |
| [R45](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L1974) | Catch hierarchy | Skip | [Exception Handling][exceptions] | Existing wrapping card explains matching derived exception types; this is mainly hierarchy trivia. |
| [R46](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2014) | Per-closed-type static fields | Add | A12 · [Generics][generics] | Already explicit prose; add recall about cache/state isolation. |
| [R47](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2044) | Short-circuit before later exception | Skip | [Foreach][foreach] | Existing early-consumption and deferred-failure model covers it. |
| [R48](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2076) | Mutable struct property receiver | Add | A13 · [Types][types] | Exact example already exists; extend the existing copy-boundary card. |
| [R49](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2115) | Copied struct enumerator | Merge | A13 · [Types][types] | Optional applied example under R48; no separate infinite-output card. |
| [R50](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2145) | String equality and explicit interning | Skip | [Strings][strings] | Existing two string cards cover content, identity, and interning. |
| [R51](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2187) | Static argument type selects overload | Merge | A05 · [Methods][methods] | Use as contrast in the R30 card, not an independent fact. |
| [R52](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2221) | Constraints do not distinguish signatures | Merge | A06 · [Methods][methods] | Combine with R1; describe duplicate declarations, not call-site ambiguity. |
| [R53](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2263) | Parallel invocation of captured variable | Skip | [Delegates][delegates] | Same shared-storage mechanism as R4; parallel execution adds no new boundary. |
| [R54](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2294) | Partial method implementation requirement | Skip | [Classes][classes] | Existing detailed partial-method card is stronger and version-aware. |
| [R55](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2338) | Pooled buffer contents and ownership | Add | A19 · [Memory Leaks][leaks] | Useful after a complete rewrite; no guarantee of same array or 42. |
| [R56](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2373) | Reflective overload lookup | Add | A16 · [Reflection][reflection] | Add lookup-time ambiguity and parameter-type selection. |
| [R57](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2417) | Anonymous equality contracts | Add | A17 · [Types][types] | Missing anonymous-type distinction; combine with R76 collection consequence. |
| [R58](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2456) | char selects int indexer | Skip | [Methods][methods] | Narrow numeric-conversion puzzle; low additional value for current interview coverage. |
| [R59](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2497) | Nested expression compilation arithmetic | Skip | [Reflection][reflection] | The arithmetic obscures the useful expression-tree/delegate boundary and repeats compilation. |
| [R60](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2534) | Independent default interface methods | Merge | A18 · [Classes][classes] | Use as supporting example for interface-member availability. |
| [R61](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2583) | Default member absent from class lookup | Add | A18 · [Classes][classes] | Concrete lookup boundary is missing from the existing design comparison. |
| [R62](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2623) | Unsafe stackalloc pointer mutation | Skip | [Span][span] | Existing span mutation suffices; source falsely describes a pinned managed array. |
| [R63](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2667) | Atomic increments | Add | A09 · [Locking][locking] | Add Interlocked versus compound invariants; thread arithmetic is only the example. |
| [R64](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2711) | Covariant producer and override | Skip | [Generics][generics] | Existing variance and virtual-dispatch recall already covers both. |
| [R65](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2767) | User-defined conversion | Add | A20 · [Structs][structs] | Add implicit-versus-explicit conversion judgment, not just unit-erasing arithmetic. |
| [R66](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2812) | Default midpoint rounding | Skip | [Types][types] | Useful numeric topic, but isolated here; defer to a coherent numeric-correctness note rather than a type-hub fact. |
| [R67](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2845) | char arithmetic promotion | Skip | [Types][types] | Low-value permutation of numeric conversion, overlapping R58. |
| [R68](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2880) | Most-specific interface implementation | Merge | A18 · [Classes][classes] | Advanced follow-up to R61; keep interface dispatch separate from class member lookup. |
| [R69](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2934) | Derived applicable overload | Merge | A05 · [Methods][methods] | Useful API-evolution follow-up; qualify when derived lookup excludes base candidates. |
| [R70](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L2980) | Task.Yield write order | Skip | [Async Await][async] | No guaranteed relative order of caller and continuation writes; existing async model is more useful. |
| [R71](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L3028) | Reflective readonly mutation | Skip | [Reflection][reflection] | Runtime-sensitive escape hatch with low practical recall value; do not generalize to static readonly. |
| [R72](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L3066) | using captures struct copy | Add | A15 · [Structs][structs] | Prefer this representative over R41; explain value capture without mandatory boxing. |
| [R73](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L3113) | Compound assignment side effects | Skip | [Methods][methods] | Real evaluation rule, but contrived self-mutating arithmetic has lower value than the selected gaps. |
| [R74](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L3146) | Duplicate local function names | Skip | [Methods][methods] | Original explanation is wrong; the program does not demonstrate null-overload ambiguity. |
| [R75](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L3183) | Resuming after yield without continue | Skip | [Foreach][foreach] | Existing model already covers resumption; the claimed null dereference at WriteLine is false. |
| [R76](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L3225) | Set operations use anonymous equality | Merge | A17 · [Types][types] | Applied follow-up to R57, including equality/hash consistency. |
| [R77](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/README.md#L3256) | Task reference versus nullable result | Add | A00 · [Async Await][async] | Small real bug; add await-before-result-validation recall. |

## Complete mid-level decisions

All ten entries are duplicates. Skip importing this file as a separate set; where the matching README entry is selected, its mechanism is already represented once in the addition plan.

| Source | README equivalent | Decision and reason |
| --- | --- | --- |
| [M1](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L10) | R2 | Skip duplicate. The reference-rebinding card already explains this; R7 is the same family. |
| [M2](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L50) | R3 | Skip duplicate. A direct existing card explains thread ownership and alternatives. |
| [M3](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L92) | R4 | Skip duplicate. Exact prose exists; add focused recall and contrast with R24. |
| [M4](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L148) | R5 | Skip duplicate. Use only as the async-void contrast; discard the process-exits-first puzzle. |
| [M5](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L185) | R7 | Skip duplicate. Existing reference-type ref card covers both outcomes. |
| [M6](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L238) | R11 | Skip duplicate. Lost-update card already exists; the source incorrectly guarantees a lost update. |
| [M7](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L291) | R12 | Skip duplicate. The answer also disagrees with R12 (B or D versus B); use the modern exception-observation explanation in A08. |
| [M8](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L339) | R14 | Skip duplicate. Existing virtual/override/new cards directly cover it. |
| [M9](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L382) | R22 | Skip duplicate. Add source-object retention versus variable reassignment; correct the immutability explanation. |
| [M10](https://github.com/peppial/csharp-questions/blob/b457a6cdf66bdd4103bfd0b6f7b1cd4fe4afc9f1/csharp_mid_level_quiz.md#L420) | R42 | Skip duplicate. Existing card directly compares monitor and semaphore reentrancy. |

## Corrections required before reuse

These corrections explain why an attractive topic can be selected while its source answer is rejected. Question numbers refer to the pinned snapshot above.

| Source | Problem | Correct treatment and authority |
| --- | --- | --- |
| R1 | Calling dynamic simply an alias for object is too broad. | They cannot distinguish these signatures, while their binding behavior differs. [C# dynamic](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/interop/using-type-dynamic) and [signatures](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/basic-concepts#76-signatures-and-overloading). |
| R5, R6, R12; M4, M7 | The explanations mix process exit, background threads, faulted Task observation, and async void. M7 also changes the answer to B or D. | An async method does not inherently run on another thread. Separate task observation from async-void exception delivery and host lifetime. Modern .NET does not terminate by default merely because a task fault is unobserved. [Async return types](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types), [UnobservedTaskException](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.taskscheduler.unobservedtaskexception?view=net-10.0). |
| R11; M6 | A race does not guarantee a result below two million on every run. | A lost update is possible; the full expected count is also possible without overlap. Ask for the synchronization guarantee, not one observed output. [Interlocked.Increment](https://learn.microsoft.com/en-us/dotnet/api/system.threading.interlocked.increment?view=net-10.0). |
| R22; M9 | Source retention is attributed to Range being immutable. | The operator received the original source object. Reassigning another variable cannot replace that argument. [Enumerable.Where](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.where?view=net-10.0). |
| R23 | Calling Reverse is described as forcing evaluation. | Reverse remains deferred; its work occurs when enumerated. Avoid equating deferred execution with streaming. [Enumerable.Reverse](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.reverse?view=net-10.0). |
| R24 | Pre-C#5 Select is incorrectly said to capture one shared invocation parameter. | Each lambda invocation supplies its own parameter variable. The nested actions retain different parameter instances; the foreach version change does not apply. [Value parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/variables#925-value-parameters). |
| R25 | The shortest requested delay is treated as a guaranteed winner. | Scheduling does not establish that guarantee. WhenAll result order is the supplied-task order; observe the task returned by WhenAny separately. [WhenAll](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.whenall?view=net-10.0), [WhenAny](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.whenany?view=net-10.0). |
| R28 | The explanation allows derived classes to directly invoke an inherited event. | The declaring type raises its field-like event. A base can expose a protected raising method for derived types. [Raise base-class events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/how-to-raise-base-class-events-in-derived-classes). |
| R30 | Generic overloads are said to win when constraints are satisfied. | Here the identity conversion after inferring B beats conversion from B to A. There is no blanket generic-first rule. [Overload resolution](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/expressions#1264-overload-resolution). |
| R37 | Generated equality is summarized as comparing every property. | Runtime type and instance fields participate, using each field type's equality. Do not imply deep equality or that computed properties independently become equality components. [Records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record). |
| R40 | WriteLine is described as starting its argument on a new line. | It writes the value and then the line terminator; here the text is contiguous before the final newline. [Console.WriteLine](https://learn.microsoft.com/en-us/dotnet/api/system.console.writeline?view=net-10.0). |
| R41 | The copied struct is said to be necessarily boxed by using. | Value capture explains the result; this value-type disposal path does not require boxing. Prefer R72's copy explanation. [Using statement specification](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/statements#1314-the-using-statement). |
| R45 | The explanation can suggest runtime selection of the most-specific catch. | The first matching catch in source order handles the exception. [Exception-handling statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements). |
| R52 | The error is called ambiguity during overload resolution. | Constraints do not distinguish signatures, so these are duplicate declarations. [Signatures and overloading](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/basic-concepts#76-signatures-and-overloading). |
| R55 | Re-renting is claimed to return the old buffer containing 42. | Neither buffer identity nor initialized contents are promised. Rent returns at least the requested capacity; enforce initialization and ownership explicitly. [ArrayPool.Rent](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.rent?view=net-10.0), [ArrayPool.Return](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.return?view=net-10.0). |
| R60, R61 | The discussion confuses interface dispatch, class inheritance, and explicit implementation. | Default members are not inherited as ordinary class members. An explicit implementation still needs an interface-typed call. [Interfaces specification](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/interfaces). |
| R62 | stackalloc storage is described as an underlying managed array pinned for GC safety. | This is stack storage, not a managed array; it does not need GC pinning. The program also requires unsafe compilation. [stackalloc](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc). |
| R64 | Reading/writing shorthand can conceal the actual variance restrictions. | Teach legal signature positions and reference-type substitutions. Existing vault recall already does this. [Covariance and contravariance](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance). |
| R66 | The explanation ends unfinished. | The shown midpoint results are consistent with the default ties-to-even rule, but the answer text needs completion if ever reused. [Math.Round](https://learn.microsoft.com/en-us/dotnet/api/system.math.round?view=net-10.0). |
| R69 | Same-name derived methods are described as hiding all base overloads unconditionally. | Explain applicability and derived-member lookup for this call; avoid generalizing beyond the candidate-selection rule. [Method invocations](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/expressions#128103-method-invocations). |
| R70 | Task.Yield is treated as guaranteeing the caller prints before the continuation. | The first synchronous write precedes both later writes; the two later writes can race in the console host. [Task.Yield](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.yield?view=net-10.0). |
| R71 | An instance readonly reflection example can be generalized to all readonly fields. | Modern .NET explicitly restricts setting static init-only fields; keep runtime and field-kind limits attached to any claim. [FieldInfo.SetValue](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.fieldinfo.setvalue?view=net-10.0). |
| R74 | The compile error is attributed to equally specific null overloads. | These are same-named local function declarations, which cannot be overloaded. As class methods, object[] is the better null-conversion target and the params overload applies in normal form. [Local functions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/statements#1364-local-function-declarations), [better conversion target](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/expressions#12647-better-conversion-target). |
| R75 | Console.WriteLine of a null object is claimed to dereference null; TryGetValue failure is also confused with uninitialized out state. | WriteLine(Object) handles null. TryGetValue assigns its out argument even when false. Yield does resume later, but demonstrate an actual dereference if that is the failure being tested. [Console.WriteLine(Object)](https://learn.microsoft.com/en-us/dotnet/api/system.console.writeline?view=net-10.0#system-console-writeline(system-object)), [TryGetValue](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2.trygetvalue?view=net-10.0). |
| R77 | A returning method is framed as producing output. | Ask about the returned task and its awaited result. The non-null task reference does not imply a non-null result. [Async return types](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types). |

## Authoring boundaries for a later implementation

Use existing owning notes for the 21 consolidated changes. New examples should have a short mechanism-focused explanation and useful answer boundary, with verified official references where they materially help. Questions belong in collapsed `[!qard]-` callouts; do not reproduce the source's multiple-choice scaffolding or HTML disclosure blocks.

A recall gap does not justify repeating an existing prose section. Extend existing cards for A10 and A13, and keep closely related examples together for A02, A05, A07, A17, and A18. Preserve adjacent hidden Qard IDs, note-level and per-card location metadata, and all user-owned lifecycle states, including Span's Done status. A later edit must go through the required note-reviewer CLEAN gate and parity checks. None of those authoring or publishing actions is part of this report.

## Evidence index

The destination links below point to the current local source and a useful entry line. Line numbers are a snapshot aid; headings and quoted card prompts in the recommendations identify the durable context.

- [Methods][methods] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md`.
- [Delegates][delegates] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Delegates.md`.
- [Types][types] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Types.md`.
- [Classes][classes] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Classes.md`.
- [Structs][structs] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Structs.md`.
- [Strings][strings] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Strings.md`.
- [Records][records] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Records.md`.
- [Generics][generics] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Generics.md`.
- [Foreach][foreach] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Foreach.md`.
- [Reflection][reflection] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Reflection.md`.
- [Exception Handling][exceptions] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Exception Handling.md`.
- [Events][events] — `Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Events.md`.
- [Runtime][runtime] — `Vault/Home/Programming/NET/Runtime/Runtime.md`.
- [Memory Leaks][leaks] — `Vault/Home/Programming/NET/Runtime/Memory Leaks.md`.
- [Locking][locking] — `Vault/Home/Programming/NET/CSharp/Concurrency and Parallelism/Locking.md`.
- [Tasks][tasks] — `Vault/Home/Programming/NET/CSharp/Concurrency and Parallelism/Tasks.md`.
- [Async Await][async] — `Vault/Home/Programming/NET/CSharp/Concurrency and Parallelism/Async Await.md`.
- [Span][span] — `Vault/Home/Computer Science/Data Structures/Linear Structures/Span.md`.
- [Functional Programming][functional] — `Vault/Home/Software Design/Paradigms/Functional Programming.md`.

[methods]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md#L198
[delegates]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Delegates.md#L88
[types]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Types.md#L75
[classes]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Classes.md#L113
[structs]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Structs.md#L17
[strings]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Strings.md#L110
[records]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Records.md#L245
[generics]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Generics.md#L104
[foreach]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Foreach.md#L43
[reflection]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Reflection.md#L20
[exceptions]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Exception%20Handling.md#L126
[events]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Events.md#L117
[runtime]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/Runtime/Runtime.md#L29
[leaks]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/Runtime/Memory%20Leaks.md#L344
[locking]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Locking.md#L94
[tasks]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Tasks.md#L85
[async]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Async%20Await.md#L120
[span]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Computer%20Science/Data%20Structures/Linear%20Structures/Span.md#L13
[functional]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Software%20Design/Paradigms/Functional%20Programming.md#L84
[patterns]: https://github.com/grafanaKibana/devbook.zip/blob/079349096995ab0db336686eb8de56eab364248a/Vault/Home/Software%20Design/Paradigms/Functional%20Programming.md#L84

