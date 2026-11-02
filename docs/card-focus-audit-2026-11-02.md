# Card focus audit and C# additions

All 383 original interview cards across 159 notes were read in full. The audit retained 319 original retrieval targets, refocused 10 prompts, and split 54 cards whose questions could be answered independently. The split cards produce 57 additional cards. The C# selection report contributes another 26 cards, including the two Pattern Matching cards and the Span aliasing card. The resulting vault contains **466 cards across 162 notes**.

Each card asks one independently gradeable recall question. An explanation of why a stated behavior occurs remains with that behavior. A coherent comparison, diagnostic procedure, or design decision also remains one task. Independent definition, application, diagnosis, remedy, and cost questions were separated where their answers can stand alone. This assessment was semantic; punctuation or a conjunction alone did not determine the decision.

All 318 existing card IDs remain in their original notes and stay attached to their original primary retrieval targets. No IDs were invented for new or split-off cards. Existing lifecycle states, deck/topic overrides, and per-card location metadata were preserved. Missing deck/topic values were seeded only for formerly cardless Span and Structs and the new Pattern Matching note. Qard and the learning-record sync plugin were disabled in the isolated export profile; no review event or history update was performed.

## Delivered recommendations

The [baseline C# selection report](csharp-questions-vault-report-2026-11-02.md) accounts for every source question and explains the original priorities and skips. All 21 consolidated recommendations A00–A20 are implemented in their existing owners. The user also authorized the proposed Pattern Matching placement, so its two deferred examples are now a focused language note, rather than additions to the Functional Programming overview. Previously skipped quiz material remains skipped.

| Recommendation | Owning note | Result |
| --- | --- | --- |
| A00 | [Async Await](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Async%20Await.md) | Task/result nullability. |
| A01 | [Tasks](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Tasks.md) | WhenAny observation and WhenAll input order. |
| A02 | [Delegates](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Delegates.md) | Closure variable storage. |
| A03 | [Foreach](../Vault/Home/Programming/NET/CSharp/Fundamentals/Foreach.md) | Deferred query source binding. |
| A04 | [Methods](../Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md) | Extension lookup. |
| A05 | [Methods](../Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md) | Conversion-based overload selection and derived lookup. |
| A06 | [Methods](../Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md) | Signature identity. |
| A07 | [Methods](../Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md) | Ref-return aliasing. |
| A08 | [Async Await](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Async%20Await.md) | Task and async-void failure observation. |
| A09 | [Locking](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Locking.md) | Interlocked suitability. |
| A10 | [Methods](../Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md) | Shallow readonly references. |
| A11 | [Classes](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Classes.md) | Initialization order. |
| A12 | [Generics](../Vault/Home/Programming/NET/CSharp/Fundamentals/Generics.md) | Per-closed-type static state. |
| A13 | [Types](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Types.md) | Struct-property and enumerator copies. |
| A14 | [Span](../Vault/Home/Computer%20Science/Data%20Structures/Linear%20Structures/Span.md) | Span aliasing. |
| A15 | [Structs](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Structs.md) | Disposing a captured struct copy. |
| A16 | [Reflection](../Vault/Home/Programming/NET/CSharp/Fundamentals/Reflection.md) | Reflective overload lookup. |
| A17 | [Types](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Types.md) | Anonymous equality. |
| A18 | [Classes](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Classes.md) | Default interface member lookup and dispatch. |
| A19 | [Memory Leaks](../Vault/Home/Programming/NET/Runtime/Memory%20Leaks.md) | Pooled-buffer contracts. |
| A20 | [Structs](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Structs.md) | User-defined conversion judgment. |
| R38/R39b | [Pattern Matching](../Vault/Home/Programming/NET/CSharp/Fundamentals/Pattern%20Matching.md) | Property, relational, and list patterns. |

## Complete baseline coverage

The [machine-readable per-card ledger](card-focus-audit-2026-11-02.json) contains all 383 original path/ordinal pairs, original questions, identity where present, decisions, reasons, and resulting questions. Ordinals always refer to the baseline; new cards do not renumber the original evidence. The table below reconciles every audited note. Current counts also include report-driven cards added to those notes.

| Note | Baseline | Retained | Refocused | Split | Current |
| --- | ---: | ---: | ---: | ---: | ---: |
| [AI & ML/AI & ML.md](../Vault/Home/AI%20%26%20ML/AI%20%26%20ML.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Agents/Agents.md](../Vault/Home/AI%20%26%20ML/LLM/Agents/Agents.md) | 3 | 2 | 0 | 1 | 4 |
| [AI & ML/LLM/Agents/Evaluation/Agent Benchmarks.md](../Vault/Home/AI%20%26%20ML/LLM/Agents/Evaluation/Agent%20Benchmarks.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Agents/Evaluation/Tool-Call Evaluation.md](../Vault/Home/AI%20%26%20ML/LLM/Agents/Evaluation/Tool-Call%20Evaluation.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Agents/Evaluation/Trajectory Evaluation.md](../Vault/Home/AI%20%26%20ML/LLM/Agents/Evaluation/Trajectory%20Evaluation.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Agents/Workflow Patterns.md](../Vault/Home/AI%20%26%20ML/LLM/Agents/Workflow%20Patterns.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Context Engineering/Context Engineering.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/Context%20Engineering.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Context Engineering/RAG/Chunking.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Chunking.md) | 4 | 4 | 0 | 0 | 4 |
| [AI & ML/LLM/Context Engineering/RAG/Evaluation/Evaluation Metrics.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Evaluation/Evaluation%20Metrics.md) | 3 | 1 | 1 | 1 | 4 |
| [AI & ML/LLM/Context Engineering/RAG/Evaluation/Evaluation.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Evaluation/Evaluation.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Context Engineering/RAG/Evaluation/Retrieval Evaluation Sets.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Evaluation/Retrieval%20Evaluation%20Sets.md) | 2 | 1 | 0 | 1 | 3 |
| [AI & ML/LLM/Context Engineering/RAG/Monitoring.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Monitoring.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Context Engineering/RAG/Query Translation.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Query%20Translation.md) | 3 | 1 | 1 | 1 | 4 |
| [AI & ML/LLM/Context Engineering/RAG/RAG Caching.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/RAG%20Caching.md) | 2 | 1 | 0 | 1 | 3 |
| [AI & ML/LLM/Context Engineering/RAG/RAG Patterns.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/RAG%20Patterns.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Context Engineering/RAG/RAG.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/RAG.md) | 3 | 2 | 1 | 0 | 3 |
| [AI & ML/LLM/Context Engineering/RAG/Re-ranking.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Re-ranking.md) | 3 | 2 | 1 | 0 | 3 |
| [AI & ML/LLM/Context Engineering/RAG/Retrieval.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Retrieval.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Context Engineering/RAG/Vector Databases.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Vector%20Databases.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Embeddings.md](../Vault/Home/AI%20%26%20ML/LLM/Embeddings.md) | 3 | 1 | 1 | 1 | 4 |
| [AI & ML/LLM/Evaluation/Building an Evaluation Set.md](../Vault/Home/AI%20%26%20ML/LLM/Evaluation/Building%20an%20Evaluation%20Set.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Evaluation/Deterministic Checks.md](../Vault/Home/AI%20%26%20ML/LLM/Evaluation/Deterministic%20Checks.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Evaluation/LLM-as-a-Judge.md](../Vault/Home/AI%20%26%20ML/LLM/Evaluation/LLM-as-a-Judge.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Fine-tuning.md](../Vault/Home/AI%20%26%20ML/LLM/Fine-tuning.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Generation.md](../Vault/Home/AI%20%26%20ML/LLM/Generation.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Graph Engineering.md](../Vault/Home/AI%20%26%20ML/LLM/Graph%20Engineering.md) | 3 | 3 | 0 | 0 | 3 |
| [AI & ML/LLM/Harness Engineering/Harness Engineering.md](../Vault/Home/AI%20%26%20ML/LLM/Harness%20Engineering/Harness%20Engineering.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Harness Engineering/Model Context Protocol.md](../Vault/Home/AI%20%26%20ML/LLM/Harness%20Engineering/Model%20Context%20Protocol.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Harness Engineering/Tooling/Agent Instructions.md](../Vault/Home/AI%20%26%20ML/LLM/Harness%20Engineering/Tooling/Agent%20Instructions.md) | 1 | 0 | 0 | 1 | 2 |
| [AI & ML/LLM/Harness Engineering/Tooling/Coding Agents.md](../Vault/Home/AI%20%26%20ML/LLM/Harness%20Engineering/Tooling/Coding%20Agents.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Harness Engineering/Tooling/Tool Design.md](../Vault/Home/AI%20%26%20ML/LLM/Harness%20Engineering/Tooling/Tool%20Design.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/LLM.md](../Vault/Home/AI%20%26%20ML/LLM/LLM.md) | 3 | 3 | 0 | 0 | 3 |
| [AI & ML/LLM/Loop Engineering/Agent Loop.md](../Vault/Home/AI%20%26%20ML/LLM/Loop%20Engineering/Agent%20Loop.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Loop Engineering/Loop Engineering.md](../Vault/Home/AI%20%26%20ML/LLM/Loop%20Engineering/Loop%20Engineering.md) | 3 | 3 | 0 | 0 | 3 |
| [AI & ML/LLM/Loop Engineering/Multi-Agentic Systems.md](../Vault/Home/AI%20%26%20ML/LLM/Loop%20Engineering/Multi-Agentic%20Systems.md) | 3 | 3 | 0 | 0 | 3 |
| [AI & ML/LLM/Model Selection and Routing.md](../Vault/Home/AI%20%26%20ML/LLM/Model%20Selection%20and%20Routing.md) | 2 | 1 | 0 | 1 | 3 |
| [AI & ML/LLM/Prompt Engineering/In-Context Learning.md](../Vault/Home/AI%20%26%20ML/LLM/Prompt%20Engineering/In-Context%20Learning.md) | 3 | 2 | 1 | 0 | 3 |
| [AI & ML/LLM/Prompt Engineering/Prompt Composition.md](../Vault/Home/AI%20%26%20ML/LLM/Prompt%20Engineering/Prompt%20Composition.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Prompt Engineering/Prompt Engineering.md](../Vault/Home/AI%20%26%20ML/LLM/Prompt%20Engineering/Prompt%20Engineering.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/LLM/Prompt Engineering/Reasoning Techniques.md](../Vault/Home/AI%20%26%20ML/LLM/Prompt%20Engineering/Reasoning%20Techniques.md) | 3 | 3 | 0 | 0 | 3 |
| [AI & ML/LLM/Safety/Guardrails.md](../Vault/Home/AI%20%26%20ML/LLM/Safety/Guardrails.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/LLM/Safety/Hallucinations.md](../Vault/Home/AI%20%26%20ML/LLM/Safety/Hallucinations.md) | 3 | 3 | 0 | 0 | 3 |
| [AI & ML/LLM/Safety/OWASP vulnerabilities on AI LLM.md](../Vault/Home/AI%20%26%20ML/LLM/Safety/OWASP%20vulnerabilities%20on%20AI%20LLM.md) | 3 | 1 | 1 | 1 | 4 |
| [AI & ML/LLM/Safety/Safety.md](../Vault/Home/AI%20%26%20ML/LLM/Safety/Safety.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/Machine Learning/Data Drift.md](../Vault/Home/AI%20%26%20ML/Machine%20Learning/Data%20Drift.md) | 1 | 1 | 0 | 0 | 1 |
| [AI & ML/Machine Learning/Evaluation/ROC-AUC and PR-AUC.md](../Vault/Home/AI%20%26%20ML/Machine%20Learning/Evaluation/ROC-AUC%20and%20PR-AUC.md) | 2 | 2 | 0 | 0 | 2 |
| [AI & ML/Machine Learning/Types/Types.md](../Vault/Home/AI%20%26%20ML/Machine%20Learning/Types/Types.md) | 2 | 2 | 0 | 0 | 2 |
| [Computer Science/Algorithms/Paradigms/Backtracking.md](../Vault/Home/Computer%20Science/Algorithms/Paradigms/Backtracking.md) | 2 | 1 | 1 | 0 | 2 |
| [Computer Science/Algorithms/Paradigms/Dynamic Programming.md](../Vault/Home/Computer%20Science/Algorithms/Paradigms/Dynamic%20Programming.md) | 1 | 1 | 0 | 0 | 1 |
| [Computer Science/Algorithms/Paradigms/Memoization.md](../Vault/Home/Computer%20Science/Algorithms/Paradigms/Memoization.md) | 4 | 2 | 0 | 2 | 6 |
| [Computer Science/Big O Notation.md](../Vault/Home/Computer%20Science/Big%20O%20Notation.md) | 3 | 3 | 0 | 0 | 3 |
| [Computer Science/Computer Science.md](../Vault/Home/Computer%20Science/Computer%20Science.md) | 2 | 2 | 0 | 0 | 2 |
| [Data Persistence/ACID.md](../Vault/Home/Data%20Persistence/ACID.md) | 3 | 2 | 0 | 1 | 4 |
| [Data Persistence/Connection Pooling.md](../Vault/Home/Data%20Persistence/Connection%20Pooling.md) | 2 | 2 | 0 | 0 | 2 |
| [Data Persistence/Data Persistence.md](../Vault/Home/Data%20Persistence/Data%20Persistence.md) | 2 | 2 | 0 | 0 | 2 |
| [Data Persistence/NoSQL/Elasticsearch.md](../Vault/Home/Data%20Persistence/NoSQL/Elasticsearch.md) | 2 | 2 | 0 | 0 | 2 |
| [Data Persistence/NoSQL/NoSQL.md](../Vault/Home/Data%20Persistence/NoSQL/NoSQL.md) | 1 | 1 | 0 | 0 | 1 |
| [Data Persistence/ORMs/Entity Framework.md](../Vault/Home/Data%20Persistence/ORMs/Entity%20Framework.md) | 4 | 2 | 0 | 2 | 7 |
| [Data Persistence/ORMs/ORMs.md](../Vault/Home/Data%20Persistence/ORMs/ORMs.md) | 2 | 2 | 0 | 0 | 2 |
| [Data Persistence/SQL/Normalization Denormalization.md](../Vault/Home/Data%20Persistence/SQL/Normalization%20Denormalization.md) | 4 | 3 | 0 | 1 | 5 |
| [Data Persistence/SQL/SQL.md](../Vault/Home/Data%20Persistence/SQL/SQL.md) | 8 | 8 | 0 | 0 | 8 |
| [Data Persistence/SQL/Sharding.md](../Vault/Home/Data%20Persistence/SQL/Sharding.md) | 3 | 3 | 0 | 0 | 3 |
| [DevOps/CI CD tools.md](../Vault/Home/DevOps/CI%20CD%20tools.md) | 1 | 1 | 0 | 0 | 1 |
| [DevOps/Deployment Strategies/Deployment Strategies.md](../Vault/Home/DevOps/Deployment%20Strategies/Deployment%20Strategies.md) | 2 | 0 | 1 | 1 | 3 |
| [DevOps/Kubernetes.md](../Vault/Home/DevOps/Kubernetes.md) | 1 | 1 | 0 | 0 | 1 |
| [DevOps/Observability.md](../Vault/Home/DevOps/Observability.md) | 2 | 2 | 0 | 0 | 2 |
| [Networks/OSI Model.md](../Vault/Home/Networks/OSI%20Model.md) | 4 | 4 | 0 | 0 | 4 |
| [Networks/Protocols/HTTP 2.md](../Vault/Home/Networks/Protocols/HTTP%202.md) | 3 | 3 | 0 | 0 | 3 |
| [Networks/Protocols/HTTP.md](../Vault/Home/Networks/Protocols/HTTP.md) | 1 | 1 | 0 | 0 | 1 |
| [Networks/Protocols/WebSockets.md](../Vault/Home/Networks/Protocols/WebSockets.md) | 2 | 1 | 0 | 1 | 3 |
| [Programming/NET/ASP NET Web API/Authentication.md](../Vault/Home/Programming/NET/ASP%20NET%20Web%20API/Authentication.md) | 1 | 1 | 0 | 0 | 1 |
| [Programming/NET/ASP NET Web API/Dependency Injection.md](../Vault/Home/Programming/NET/ASP%20NET%20Web%20API/Dependency%20Injection.md) | 1 | 1 | 0 | 0 | 1 |
| [Programming/NET/ASP NET Web API/Filters.md](../Vault/Home/Programming/NET/ASP%20NET%20Web%20API/Filters.md) | 3 | 2 | 0 | 1 | 4 |
| [Programming/NET/ASP NET Web API/Middlewares.md](../Vault/Home/Programming/NET/ASP%20NET%20Web%20API/Middlewares.md) | 3 | 3 | 0 | 0 | 3 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Async Await.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Async%20Await.md) | 5 | 3 | 0 | 2 | 10 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Channels.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Channels.md) | 4 | 3 | 0 | 1 | 5 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Concurrency and Parallelism.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Concurrency%20and%20Parallelism.md) | 2 | 2 | 0 | 0 | 2 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Deadlocks.md) | 4 | 4 | 0 | 0 | 4 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Locking.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Locking.md) | 5 | 4 | 0 | 1 | 7 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Mutex.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Mutex.md) | 2 | 2 | 0 | 0 | 2 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Parallelism.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Parallelism.md) | 4 | 4 | 0 | 0 | 4 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Semaphore.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Semaphore.md) | 1 | 1 | 0 | 0 | 1 |
| [Programming/NET/CSharp/Concurrency and Parallelism/Tasks.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Tasks.md) | 5 | 5 | 0 | 0 | 7 |
| [Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/ThreadPool.md) | 3 | 1 | 0 | 2 | 5 |
| [Programming/NET/CSharp/Fundamentals/Exception Handling.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Exception%20Handling.md) | 5 | 5 | 0 | 0 | 5 |
| [Programming/NET/CSharp/Fundamentals/Foreach.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Foreach.md) | 3 | 3 | 0 | 0 | 4 |
| [Programming/NET/CSharp/Fundamentals/Generics.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Generics.md) | 4 | 4 | 0 | 0 | 5 |
| [Programming/NET/CSharp/Fundamentals/Methods.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md) | 6 | 4 | 0 | 2 | 13 |
| [Programming/NET/CSharp/Fundamentals/Namespaces.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Namespaces.md) | 1 | 1 | 0 | 0 | 1 |
| [Programming/NET/CSharp/Fundamentals/Reflection.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Reflection.md) | 4 | 3 | 0 | 1 | 6 |
| [Programming/NET/CSharp/Fundamentals/Types/Classes.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Classes.md) | 6 | 4 | 0 | 2 | 12 |
| [Programming/NET/CSharp/Fundamentals/Types/Delegates.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Delegates.md) | 2 | 0 | 0 | 2 | 6 |
| [Programming/NET/CSharp/Fundamentals/Types/Events.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Events.md) | 2 | 2 | 0 | 0 | 2 |
| [Programming/NET/CSharp/Fundamentals/Types/Records.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Records.md) | 7 | 6 | 0 | 1 | 8 |
| [Programming/NET/CSharp/Fundamentals/Types/Strings.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Strings.md) | 2 | 2 | 0 | 0 | 2 |
| [Programming/NET/CSharp/Fundamentals/Types/Types.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Types.md) | 3 | 1 | 0 | 2 | 6 |
| [Programming/NET/NET Standart.md](../Vault/Home/Programming/NET/NET%20Standart.md) | 1 | 1 | 0 | 0 | 1 |
| [Programming/NET/NET.md](../Vault/Home/Programming/NET/NET.md) | 1 | 0 | 0 | 1 | 2 |
| [Programming/NET/Runtime/Common Language Runtime.md](../Vault/Home/Programming/NET/Runtime/Common%20Language%20Runtime.md) | 2 | 0 | 0 | 2 | 4 |
| [Programming/NET/Runtime/Garbage Collector.md](../Vault/Home/Programming/NET/Runtime/Garbage%20Collector.md) | 4 | 4 | 0 | 0 | 4 |
| [Programming/NET/Runtime/Memory Leaks.md](../Vault/Home/Programming/NET/Runtime/Memory%20Leaks.md) | 5 | 5 | 0 | 0 | 6 |
| [Programming/NET/Runtime/Runtime.md](../Vault/Home/Programming/NET/Runtime/Runtime.md) | 1 | 0 | 0 | 1 | 2 |
| [Security/Authentication/Basic Auth.md](../Vault/Home/Security/Authentication/Basic%20Auth.md) | 2 | 2 | 0 | 0 | 2 |
| [Security/Authentication/Resource-based Auth.md](../Vault/Home/Security/Authentication/Resource-based%20Auth.md) | 1 | 1 | 0 | 0 | 1 |
| [Security/Encryption.md](../Vault/Home/Security/Encryption.md) | 1 | 1 | 0 | 0 | 1 |
| [Security/Hashing.md](../Vault/Home/Security/Hashing.md) | 5 | 4 | 0 | 1 | 6 |
| [Security/OWASP.md](../Vault/Home/Security/OWASP.md) | 1 | 1 | 0 | 0 | 1 |
| [Security/Password Storage.md](../Vault/Home/Security/Password%20Storage.md) | 2 | 0 | 0 | 2 | 4 |
| [Security/Secrets Management.md](../Vault/Home/Security/Secrets%20Management.md) | 1 | 1 | 0 | 0 | 1 |
| [Security/Security.md](../Vault/Home/Security/Security.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Application Architecture/Application Architecture.md](../Vault/Home/Software%20Architecture/Application%20Architecture/Application%20Architecture.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Application Architecture/Clean Architecture.md](../Vault/Home/Software%20Architecture/Application%20Architecture/Clean%20Architecture.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Application Architecture/Layered Architecture.md](../Vault/Home/Software%20Architecture/Application%20Architecture/Layered%20Architecture.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Application Architecture/Plug-in Architecture (MicroKernel).md](../Vault/Home/Software%20Architecture/Application%20Architecture/Plug-in%20Architecture%20%28MicroKernel%29.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Application Architecture/Presentation Architecture Variants.md](../Vault/Home/Software%20Architecture/Application%20Architecture/Presentation%20Architecture%20Variants.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Distributed Systems/Distributed Transactions.md](../Vault/Home/Software%20Architecture/Distributed%20Systems/Distributed%20Transactions.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Distributed Systems/Message Queues/Message Queues.md](../Vault/Home/Software%20Architecture/Distributed%20Systems/Message%20Queues/Message%20Queues.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Distributed Systems/Scalability Patterns/Horizontal Scaling.md](../Vault/Home/Software%20Architecture/Distributed%20Systems/Scalability%20Patterns/Horizontal%20Scaling.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Patterns/Architectural Patterns/CQRS.md](../Vault/Home/Software%20Architecture/Patterns/Architectural%20Patterns/CQRS.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Architectural Patterns/Domain-Driven Design.md](../Vault/Home/Software%20Architecture/Patterns/Architectural%20Patterns/Domain-Driven%20Design.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Patterns/CQS.md](../Vault/Home/Software%20Architecture/Patterns/CQS.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Patterns/Dependency Injection.md](../Vault/Home/Software%20Architecture/Patterns/Dependency%20Injection.md) | 4 | 1 | 0 | 3 | 7 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Chain of Responsibility.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Chain%20of%20Responsibility.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Command.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Command.md) | 2 | 1 | 0 | 1 | 3 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Interpreter.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Interpreter.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Iterator.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Iterator.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Mediator.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Mediator.md) | 3 | 2 | 0 | 1 | 4 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Memento.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Memento.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Observer.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Observer.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/State.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/State.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Strategy.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Strategy.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Template Method.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Template%20Method.md) | 2 | 1 | 0 | 1 | 3 |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Visitor.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Visitor.md) | 3 | 1 | 1 | 1 | 4 |
| [Software Architecture/Patterns/Design Patterns/Creational/Abstract Factory.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Creational/Abstract%20Factory.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Patterns/Design Patterns/Creational/Builder.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Creational/Builder.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Design Patterns/Creational/Creational.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Creational/Creational.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Patterns/Design Patterns/Creational/Factory Method.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Creational/Factory%20Method.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Design Patterns/Creational/Prototype.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Creational/Prototype.md) | 2 | 1 | 0 | 1 | 3 |
| [Software Architecture/Patterns/Design Patterns/Creational/Singleton.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Creational/Singleton.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Design Patterns/Design Patterns.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Design%20Patterns.md) | 4 | 4 | 0 | 0 | 4 |
| [Software Architecture/Patterns/Design Patterns/GRASP.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/GRASP.md) | 2 | 1 | 0 | 1 | 3 |
| [Software Architecture/Patterns/Design Patterns/Structural/Adapter.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Structural/Adapter.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Patterns/Design Patterns/Structural/Bridge.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Structural/Bridge.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Patterns/Design Patterns/Structural/Composite.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Structural/Composite.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/Patterns/Design Patterns/Structural/Decorator.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Structural/Decorator.md) | 4 | 4 | 0 | 0 | 4 |
| [Software Architecture/Patterns/Design Patterns/Structural/Facade.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Structural/Facade.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Patterns/Design Patterns/Structural/Flyweight.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Structural/Flyweight.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Architecture/Patterns/Design Patterns/Structural/Proxy.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Structural/Proxy.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Patterns/Patterns.md](../Vault/Home/Software%20Architecture/Patterns/Patterns.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/Patterns/Repository & UoW.md](../Vault/Home/Software%20Architecture/Patterns/Repository%20%26%20UoW.md) | 4 | 4 | 0 | 0 | 4 |
| [Software Architecture/Software Architecture.md](../Vault/Home/Software%20Architecture/Software%20Architecture.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/System Architecture/Event-Driven Architecture.md](../Vault/Home/Software%20Architecture/System%20Architecture/Event-Driven%20Architecture.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Architecture/System Architecture/Microservices.md](../Vault/Home/Software%20Architecture/System%20Architecture/Microservices.md) | 4 | 2 | 0 | 2 | 6 |
| [Software Architecture/System Architecture/Modular Monolith.md](../Vault/Home/Software%20Architecture/System%20Architecture/Modular%20Monolith.md) | 3 | 2 | 0 | 1 | 4 |
| [Software Architecture/System Architecture/Monolith Architecture.md](../Vault/Home/Software%20Architecture/System%20Architecture/Monolith%20Architecture.md) | 1 | 1 | 0 | 0 | 1 |
| [Software Architecture/System Architecture/Service-Oriented Architecture.md](../Vault/Home/Software%20Architecture/System%20Architecture/Service-Oriented%20Architecture.md) | 2 | 2 | 0 | 0 | 2 |
| [Software Design/Paradigms/Functional Programming.md](../Vault/Home/Software%20Design/Paradigms/Functional%20Programming.md) | 1 | 0 | 0 | 1 | 3 |
| [Software Design/Testing/Test-Driven Development.md](../Vault/Home/Software%20Design/Testing/Test-Driven%20Development.md) | 3 | 3 | 0 | 0 | 3 |
| [Software Design/Testing/Unit Testing.md](../Vault/Home/Software%20Design/Testing/Unit%20Testing.md) | 3 | 3 | 0 | 0 | 3 |

Notes receiving their first cards:

- [Computer Science/Data Structures/Linear Structures/Span.md](../Vault/Home/Computer%20Science/Data%20Structures/Linear%20Structures/Span.md): 1 cards.
- [Programming/NET/CSharp/Fundamentals/Pattern Matching.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Pattern%20Matching.md): 2 cards.
- [Programming/NET/CSharp/Fundamentals/Types/Structs.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Structs.md): 2 cards.

## Validation

The changes were prepared in an isolated notes branch and worktree. The original checkout's unrelated plugin changes and learning records were excluded.

- Existing identity sequence, primary-target binding, lifecycle, deck/topic overrides, and location metadata: passed. The normal hook maintained source modification timestamps.
- Full-vault deterministic validation: passed, 400 notes checked.
- Repository Python tests: 78 passed.
- Note-review hook tests: 2 passed.
- Qard Learn Sync tests: 24 passed.
- Independent full-text review: all 52 changed notes CLEAN; current target evidence follows.
- Actual Quartz Syncer export through the normal commit hook: passed, no skipped or failed notes. Native media cleanup made no changes or was withheld by its safeguard; no media-removal claim is made.
- Quartz build under Node 22, after export: passed, 400 inputs and 585 emitted files.
- Web tests under Node 22 after plugin installation: 183 passed.
- Built Questions dashboard: exactly 466 items and 466 interview callouts, matching the source inventory.

The full export regenerated 400 pages: 343 differ only in their generated publication timestamp, 56 have content or other metadata changes, and one is the new Pattern Matching page. Generated pages were produced by Syncer rather than edited by hand. The build-time plugin lockfile refresh was excluded according to repository policy.

C# snippets were reviewed as documentation and were not executed. No production merge or deployment is part of this PR.

## Independent note review
All 52 changed notes were read in full against their baseline and diff; Pattern Matching was reviewed as a new note. Review followed the installed note-reviewer contract through existing read-only subagents after additional reviewer spawning reached the session thread limit. Each authoring lane was reviewed by a different lane. The reviews assessed prose, technical accuracy, card focus, sources, metadata, fences, links, applicable page purpose, and conceptual scope.
Every note received CLEAN with its explicit target resolved. Two findings were corrected and re-reviewed: the purity/totality comparison now defines both properties, and the record-member card distinguishes equality from hashing. The standalone virtual-method answer also replaced an undefined example type with “the base class.” The following current-text excerpts identify the reviewed question targets; full per-card decisions are in the ledger.
| Note | Type | Current target evidence | Prose and target verdict | Note split |
| --- | --- | --- | --- | --- |
| [AI & ML/LLM/Agents/Agents.md](../Vault/Home/AI%20%26%20ML/LLM/Agents/Agents.md) | FolderNote | How can errors compound during an autonomous agent run? / Which controls contain error propagation during an autonomous agent run? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Context Engineering/RAG/Evaluation/Evaluation Metrics.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Evaluation/Evaluation%20Metrics.md) | Concept | Why can aggregate retrieval metrics hide a segment regression? / When is a drop in a segment's retrieval metric actionable? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Context Engineering/RAG/Evaluation/Retrieval Evaluation Sets.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Evaluation/Retrieval%20Evaluation%20Sets.md) | Concept | Which retrieval metric fits a query with several relevant chunks? / Which cutoff should a retrieval evaluation measure? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Context Engineering/RAG/Query Translation.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Query%20Translation.md) | Concept | What is the scope of query translation in a RAG retrieval pipeline? / How can query translation improve or worsen retrieval quality? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Context Engineering/RAG/RAG Caching.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/RAG%20Caching.md) | Concept | Which pipeline work does each RAG cache layer avoid? / When is a RAG cache hit safe to reuse? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Context Engineering/RAG/RAG.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/RAG.md) | FolderNote | What experiment justifies adding an advanced stage to a RAG pipeline? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Context Engineering/RAG/Re-ranking.md](../Vault/Home/AI%20%26%20ML/LLM/Context%20Engineering/RAG/Re-ranking.md) | Concept | How can reranker failures be distinguished from first-stage retrieval limits? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Embeddings.md](../Vault/Home/AI%20%26%20ML/LLM/Embeddings.md) | Concept | How do embeddings support semantic retrieval? / How do Matryoshka embeddings reduce vector storage? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Harness Engineering/Tooling/Agent Instructions.md](../Vault/Home/AI%20%26%20ML/LLM/Harness%20Engineering/Tooling/Agent%20Instructions.md) | Concept | Why use path-specific instruction files for coding agents? / What must be checked before relying on path-specific agent instructions? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Model Selection and Routing.md](../Vault/Home/AI%20%26%20ML/LLM/Model%20Selection%20and%20Routing.md) | Concept | How do classifier routing and cascading differ when selecting an LLM? / How can classifier routing and cascading be combined? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Prompt Engineering/In-Context Learning.md](../Vault/Home/AI%20%26%20ML/LLM/Prompt%20Engineering/In-Context%20Learning.md) | Concept | How does in-context learning differ from fine-tuning and retrieval? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [AI & ML/LLM/Safety/OWASP vulnerabilities on AI LLM.md](../Vault/Home/AI%20%26%20ML/LLM/Safety/OWASP%20vulnerabilities%20on%20AI%20LLM.md) | Concept | How do direct and indirect prompt injection enter an LLM's context? / Why must secrets stay out of system prompts? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Computer Science/Algorithms/Paradigms/Backtracking.md](../Vault/Home/Computer%20Science/Algorithms/Paradigms/Backtracking.md) | Concept | How does backtracking prune a brute-force search? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Computer Science/Algorithms/Paradigms/Memoization.md](../Vault/Home/Computer%20Science/Algorithms/Paradigms/Memoization.md) | Concept | What is memoization? / When does memoization improve performance? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Computer Science/Data Structures/Linear Structures/Span.md](../Vault/Home/Computer%20Science/Data%20Structures/Linear%20Structures/Span.md) | Concept | Why does writing through an array-backed span slice change the array? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Data Persistence/ACID.md](../Vault/Home/Data%20Persistence/ACID.md) | Concept | What does ACID mean for a database transaction? / Where do the guarantees of a local ACID transaction stop? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Data Persistence/ORMs/Entity Framework.md](../Vault/Home/Data%20Persistence/ORMs/Entity%20Framework.md) | Concept | How does EF Core change tracking work? / When is an EF Core no-tracking query appropriate? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Data Persistence/SQL/Normalization Denormalization.md](../Vault/Home/Data%20Persistence/SQL/Normalization%20Denormalization.md) | Concept | What conditions justify denormalizing a table? / What consistency risks does denormalization introduce? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [DevOps/Deployment Strategies/Deployment Strategies.md](../Vault/Home/DevOps/Deployment%20Strategies/Deployment%20Strategies.md) | FolderNote | How do the main deployment strategies differ? / When does canary fit better than blue-green deployment? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Networks/Protocols/WebSockets.md](../Vault/Home/Networks/Protocols/WebSockets.md) | Concept | What communication model does WebSocket provide? / How does the HTTP/1.1 WebSocket opening handshake work? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/ASP NET Web API/Filters.md](../Vault/Home/Programming/NET/ASP%20NET%20Web%20API/Filters.md) | Concept | Which exceptions can controller exception filters handle in an ASP.NET Core Web API? / What happens after an ASP.NET Core controller exception filter handles an exception? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Concurrency and Parallelism/Async Await.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Async%20Await.md) | Concept | What does `ConfigureAwait(false)` change? / When is `ConfigureAwait(false)` useful? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Concurrency and Parallelism/Channels.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Channels.md) | Concept | What is a `Channel&lt;T&gt;`? / What delivery guarantees does an in-memory `Channel&lt;T&gt;` lack? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Concurrency and Parallelism/Locking.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Locking.md) | Concept | What is a race condition? / How does `lock` prevent a lost-update race? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Concurrency and Parallelism/Tasks.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/Tasks.md) | Concept | Why must the task returned by `await Task.WhenAny(...)` usually be awaited again? / In what order does `Task.WhenAll&lt;T&gt;` return successful results? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool.md](../Vault/Home/Programming/NET/CSharp/Concurrency%20and%20Parallelism/ThreadPool.md) | Concept | What is the .NET ThreadPool for? / Which work is a poor fit for .NET ThreadPool workers? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Foreach.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Foreach.md) | Concept | Does a deferred LINQ query follow later reassignment of its source variable? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Generics.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Generics.md) | Concept | Do different closed forms of a generic type share its static fields? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Methods.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Methods.md) | Concept | What does an `in` parameter prevent the callee from changing? / When can an `in` parameter improve performance? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Pattern Matching.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Pattern%20Matching.md) | Concept | Why does a circle with radius 5 select `Circle` after skipping `Circle { Radius: &gt; 10 }`? / What sequence shape does the list pattern `[var first, var second]` require? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Reflection.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Reflection.md) | Concept | What is reflection in .NET? / When is runtime reflection useful? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Types/Classes.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Classes.md) | Concept | How does an abstract class differ from an interface with default members? / When is an abstract class a better fit than an interface with default members? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Types/Delegates.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Delegates.md) | Concept | What is a delegate? / What state does a delegate value carry? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Types/Records.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Records.md) | Concept | What is a C# record? / Which members does the compiler synthesize for a positional record? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Types/Structs.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Structs.md) | Concept | Why can `using(existingStruct)` dispose a copy without changing the original struct's disposal flag? / When should a user-defined conversion be explicit instead of implicit? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/CSharp/Fundamentals/Types/Types.md](../Vault/Home/Programming/NET/CSharp/Fundamentals/Types/Types.md) | FolderNote | Why might mutating a struct inside `foreach` fail to update the collection? / How can stored struct elements be updated rather than discarded copies? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/NET.md](../Vault/Home/Programming/NET/NET.md) | FolderNote | What are the main layers of .NET? / Why does identifying the owning .NET layer help diagnose a symptom? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/Runtime/Common Language Runtime.md](../Vault/Home/Programming/NET/Runtime/Common%20Language%20Runtime.md) | Concept | How do managed and unmanaged code differ? / Why does interop require explicit resource lifetime management? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/Runtime/Memory Leaks.md](../Vault/Home/Programming/NET/Runtime/Memory%20Leaks.md) | Concept | What must code assume about an array returned by `ArrayPool&lt;T&gt;.Rent`? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Programming/NET/Runtime/Runtime.md](../Vault/Home/Programming/NET/Runtime/Runtime.md) | FolderNote | What does the CLR do when an application starts? / Why can early .NET calls have more latency than steady-state calls? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Security/Hashing.md](../Vault/Home/Security/Hashing.md) | Concept | What is a cryptographic hash function? / What security properties should a cryptographic hash function provide? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Security/Password Storage.md](../Vault/Home/Security/Password%20Storage.md) | Concept | How should a service store user passwords? / How should a service verify a submitted password? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/Patterns/Dependency Injection.md](../Vault/Home/Software%20Architecture/Patterns/Dependency%20Injection.md) | Concept | What is dependency injection? / What coupling does dependency injection remove from a class? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Command.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Command.md) | Concept | How does MediatR represent the roles of the Command pattern? / When does MediatR dispatch justify its indirection? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Mediator.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Mediator.md) | Concept | What is the Mediator pattern? / How does MediatR request dispatch differ from classic Mediator? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Template Method.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Template%20Method.md) | Concept | What is the Hollywood Principle? / How does Template Method apply the Hollywood Principle? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/Patterns/Design Patterns/Behavioral/Visitor.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Behavioral/Visitor.md) | Concept | What is double dispatch? / Why does Visitor need an `Accept` call before `Visit`? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/Patterns/Design Patterns/Creational/Prototype.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/Creational/Prototype.md) | Concept | What separates a shallow copy from a deep copy? / Which nested objects should a practical deep copy duplicate? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/Patterns/Design Patterns/GRASP.md](../Vault/Home/Software%20Architecture/Patterns/Design%20Patterns/GRASP.md) | Concept | How does Information Expert reduce coupling? / When should another responsibility-assignment principle override Information Expert? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/System Architecture/Microservices.md](../Vault/Home/Software%20Architecture/System%20Architecture/Microservices.md) | Concept | Why do microservices create distributed data consistency problems? / Which failure modes must a reliable cross-service workflow handle? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Architecture/System Architecture/Modular Monolith.md](../Vault/Home/Software%20Architecture/System%20Architecture/Modular%20Monolith.md) | Concept | When is a modular monolith a better fit than microservices? / What signals justify extracting a modular-monolith module? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
| [Software Design/Paradigms/Functional Programming.md](../Vault/Home/Software%20Design/Paradigms/Functional%20Programming.md) | Concept | What makes a function pure? / Why are pure functions straightforward to unit-test? | CLEAN; prose PASS; target RESOLVED | No; mechanisms remain coherent within this owner. |
