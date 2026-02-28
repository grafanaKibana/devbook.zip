# Senior AI Engineer — Technical Deep Dive Prep (DraftKings AIP DevEx)

## Preparation Checklist

### Day 1 (Thursday) — RAG Technical Deep Dive

- [x] Read [[#Quick Reference Card]] out loud (10 min)
- [x] Understand the [[RAG]] pipeline end-to-end — walk through all 8 stages from [[#RAG Pipeline End-to-End]]
- [x] Study [[Chunking]] strategies, [[#Embedding Models]], and [[#Vector Databases]] tables — know trade-offs for each
- [x] Understand [[Retrieval]] approaches — explain when hybrid beats dense, and how [[Re-ranking]] improves precision
- [x] Study [[#RAG Pain Points]] — practice detection + mitigation per stage
- [x] Understand [[Evaluation]] metrics ([[#RAG Evaluation (RAGAS)]]) — explain faithfulness, relevancy, precision, recall
- [x] Practice [[#Day 1 Practice Q&A]] — all 3 questions out loud
- [x] Read: [Anthropic RAG Cookbook](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/retrieval_augmented_generation) · [Twelve RAG Pain Points](https://arxiv.org/abs/2401.05856)

### Day 2 (Friday) — Agents & MCP

- [x] Read [[#Quick Reference Card]] out loud (10 min)
- [x] Understand [[Agents|agent patterns]] — complexity ladder, ReAct vs Plan-and-Execute vs Reflexion ([[#Agent Patterns and Complexity Ladder]])
- [x] Study [[Tools|tool use]] and function calling — 5-step flow + error handling patterns ([[#Tool Use & Function Calling]])
- [x] Deep dive [[Model Context Protocol]] — 3 primitives, transport, DraftKings N×M narrative ([[#MCP Deep Dive (Critical — Core to DraftKings Stack)]])
- [x] Understand [[Multi-Agentic Systems|multi-agent orchestration]] — Supervisor vs Hierarchical vs Peer-to-peer ([[#Multi-Agent Orchestration]])
- [x] Study n8n workflow pattern and agentic coding tools status at DK ([[#n8n Workflows]], [[#Agentic Coding Tools]])
- [x] Practice [[#Day 2 Practice Q&A]] — all 3 questions out loud
- [x] Read: [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) (MUST READ) · [MCP docs](https://modelcontextprotocol.io/)

### Day 3 (Saturday) — System Design + Class Design

- [x] Read [[#Quick Reference Card]] out loud (10 min)
- [x] Internalize the [[#System Design Framework]] — 5/10/15/5 time-box
- [x] Study [[#Building Blocks Quick Reference]] and [[#.NET-Specific Patterns]] — know each component's purpose
- [x] Understand all 4 [[#AI System Design Patterns]] — Webhook→Queue→Worker, Rate Limiting, Vector DB, Async Validation
- [x] Study [[#Project Deep Dive Framework (How to Present ANY Past Project)|5-Layer Presentation Framework]] with cheat sheets: [[#Communication Patterns Cheat Sheet|communication]], [[#Database Selection Cheat Sheet|databases]], [[#Scalability Patterns Quick Reference|scalability]], [[#Consistency Models|consistency]]
- [ ] Walk through [[#Class Design Round — Robot-Managed Restaurant (HackerRank Style)|Robot Restaurant class design]] end-to-end — diagram, patterns ([[Design Patterns]]), A* pathfinding, extension question
- [ ] Practice [[#Day 3 Practice Q&A]] + [[#Class Design Questions (HackerRank Round)|additional class design questions]]

### Day 4 (Sunday) — Projects & AI Ownership

- [ ] Read [[#Quick Reference Card]] out loud (10 min)
- [ ] Practice 2-minute pitches for each project (timed): [[#Dexter (Jira → PR Automation)|Dexter]], [[#Doculus (Auto-Documentation)|Doculus]], [[#SlackJack (Support Bot)|SlackJack]], [[#AmendA (PR Comment Updater)|AmendA]]
- [ ] Study [[#AI Ownership Framework]] — scoping, [[#Metrics Framework|metrics]], [[#Adoption Challenges + Responses|adoption]], iteration loops, risk
- [ ] Memorize [[#DraftKings Numbers to Anchor|DK numbers]]: 20% tickets via AI · 15% throughput · 100% 101 completion
- [ ] Review [[#DraftKings Intelligence Brief]] — vision, 2026 goals, priority timeline
- [ ] Study [[#Interview Traps & Ownership Signals]] — internalize traps + practice [[#Ownership Phrases to Practice Verbatim|ownership phrases]] out loud
- [ ] Practice [[#Day 4 Practice Q&A]] — all 3 questions out loud

### Day 5 (Monday) — Final Review

- [ ] [[#Morning Cheat Sheet (30 minutes)|Morning Cheat Sheet]] review (30 min)
- [ ] [[#Timed Practice Drill (3 rounds)|Timed practice]]: 3 rounds × 30 min (RAG assistant, MCP platform, Dexter roadmap)
- [ ] Review [[#Additional Practice Questions]] — past projects + [[#API Design Quick Reference|API design]]
- [ ] Practice [[#2-Minute Closing Script]] out loud — 3 times minimum
- [ ] Final pass: re-read [[#Interview Traps & Ownership Signals]] + [[#Top 3 Ownership Signals]]


## Quick Reference Card

> [!tip] How to use this card
> Spend 10 minutes on this before each practice session. Speak each line out loud as if answering in the interview.

### RAG Pipeline (8 stages)

1. **Ingestion** — Collect source documents, normalize metadata for filtering by team, service, freshness
2. **Chunking** — Split into retrieval-sized units preserving semantic meaning with overlap
3. **Embedding** — Convert chunks to vectors using model chosen for quality/latency/cost fit
4. **Indexing** — Store vectors + metadata in vector store optimized for ANN search and filtering
5. **Query** — Rewrite/expand user queries to improve retrievability (synonyms, acronyms, decomposition)
6. **Retrieval** — Fetch candidate chunks via dense, sparse, or hybrid search with metadata filters
7. **Re-ranking** — Reorder candidates with a stronger model to improve precision before context assembly
8. **Generation** — Prompt LLM with curated context + instructions for grounded output with citations

### Agent Loop (ReAct in 4 steps)

1. **Think** — model reasons about goal and next best action
2. **Act** — model emits tool call with structured arguments
3. **Observe** — system executes tool and returns result/errors
4. **Decide** — model either answers or repeats loop

### MCP Quick View

- **Resources**: read-only contextual data exposed in a standard format
- **Tools**: executable capabilities with typed inputs/outputs
- **Prompts**: reusable prompt templates for common workflows
- **Architecture**: MCP Client (LLM app) ↔ MCP Server via JSON-RPC 2.0 (stdio or SSE); server advertises capabilities once, any compliant client can consume them

### System Design Framework (30 minutes)

1. **Requirements (5 min)**: functional + non-functional, traffic, SLOs
2. **High-level design (10 min)**: core components, data flow, API boundaries
3. **Deep dive (15 min)**: pick 2-3 risky components, discuss trade-offs
4. **Wrap-up (5 min)**: summarize decisions, failure modes, scale path

### DraftKings Numbers to Anchor

- **20%** tickets via AI — use-case signal
- **15%** throughput increase — org-level outcome target
- **100%** 101-level completion — enablement target

### Top 3 Ownership Signals

1. I define success metrics before implementation
2. I scope MVP by risk and adoption, not feature volume
3. I run feedback loops (telemetry + user input) and ship measurable iterations

---

## Day 1 (Thursday) — RAG Technical Deep Dive

### RAG Pipeline End-to-End

I would explain [[RAG]] as an **information supply chain**: if upstream quality is weak, generation quality collapses.

| Stage | What it does | Why it matters | What goes wrong |
|---|---|---|---|
| **Ingestion** | Collect docs, parse structure, keep source IDs + timestamps | Without provenance and freshness, can't debug wrong answers | Missing docs, permission leakage, stale snapshots |
| **Chunking** | Split content preserving local meaning ([[Chunking]]) | Retrieval works on chunks, not full documents | Too small = lost context; too large = noise dilution |
| **Embedding** | Map chunks/query to vector space | Semantic similarity search depends on embedding quality | Domain mismatch, multilingual drift, high cost at scale |
| **Indexing** | Build ANN indexes with metadata filters ([[Retrieval]]) | Latency + precision under production load | Slow reindexing, weak filtering, inconsistent metadata |
| **Query** | Rewrite, route, or expand query ([[Query Translation]]) | Users ask vague questions; system must sharpen intent | Over-rewrite shifts intent, hurts precision |
| **Retrieval** | Dense/sparse/hybrid candidate fetch | Recall ceiling is set here | Lexical misses acronyms; semantic misses exact IDs |
| **Re-ranking** | Refine top-k order ([[Re-ranking]]) | Improves grounding by elevating most relevant evidence | Latency spikes, model cost |
| **Generation** | Constrained answer synthesis ([[Generation]], [[LLM]]) | Converts evidence into user-facing value | [[Hallucinations]], wrong format, unsupported claims |

> [!warning] Interview trap
> If you describe only prompting, you look shallow. Always walk through ingestion-to-observability and mention what breaks in production.

### Chunking Strategies

| Strategy | How it works | Typical size | Overlap | Best for | Common failure |
|---|---|---|---|---|---|
| Fixed-size | Split every N tokens | 256-1024 | 10-20% | Fast baseline, homogeneous docs | Breaks semantic units |
| Recursive (LangChain default) | Try paragraph/sentence boundaries first, fallback split | 300-800 | 10-20% | General docs with mixed structure | Inconsistent chunk granularity |
| Semantic | Split by meaning shifts (embedding similarity boundaries) | 200-700 | 5-15% | Long narrative text | Costly preprocessing |
| Document-aware | Use headings, sections, tables, code blocks | 300-1200 | 10-15% | Confluence/spec/API docs | Parser complexity |
| Sentence-window | Retrieve local sentence with neighbor window | sentence + window | N/A | QA over precise facts | Loses broader context |

**What I would say:** "I start with recursive chunking and metadata-rich document-aware boundaries because it gives good quality quickly. Then I use evals to tune chunk size/overlap by content type, not one global value."

### Embedding Models

| Model family | Dimensions | Cost | Multilingual | MTEB quality | Notes |
|---|---|---|---|---|---|
| OpenAI `text-embedding-3-small` | 1536 | Low | Good | Strong | Great default for cost-sensitive production |
| OpenAI `text-embedding-3-large` | 3072 | Higher | Good | Very strong | Better recall/nuance, higher storage cost |
| Cohere `embed-v3` | ~1024 | Medium | Strong | Strong | Good enterprise tooling, rerank synergy |
| BGE / E5 (open source) | 768-1024 | Infra only | Varies | Strong if tuned | Great for self-hosting/compliance |
| Voyage AI | 1024-1536 | Medium | Strong | Strong | Good quality/latency trade-off |

> [!tip] Interview line
> "I pick embeddings with an eval harness first, then optimize cost. Premature model choice without retrieval metrics is usually wasted effort."

### Vector Databases

| DB | Strength | Trade-off | Best fit |
|---|---|---|---|
| Pinecone | Fully managed, easy scaling | Managed cost, vendor dependency | Speed of delivery priority |
| Weaviate | Native hybrid capabilities, rich schema | Operational complexity if self-hosted | Hybrid search heavy use cases |
| Qdrant | Fast (Rust core), good filtering | Self-hosting ops unless cloud | Performance-focused teams |
| pgvector | Lives in Postgres, SQL-native | Not specialized for extreme ANN scale | **.NET/Postgres stacks** |
| Chroma | Quick local prototyping | Limited production controls | Rapid experimentation |

> [!note] .NET recommendation
> `pgvector` is the natural choice for .NET teams already on Postgres. It integrates with Npgsql and EF Core workflows and keeps operational surface area small.

### Retrieval Strategies

- **Naive (dense only)**: semantic retrieval only; quick to implement
- **Hybrid (dense + BM25 with RRF)**: combines lexical precision with semantic recall
- **Advanced**: HyDE, multi-query expansion, query decomposition

**When hybrid beats naive:** Internal docs with jargon/acronyms (`MCP`, service codes, ticket IDs). Queries requiring exact term match + semantic context.

**What I would say:** "Hybrid retrieval is my default in production because dense misses exact tokens and sparse misses semantics; RRF gives robust gains with minimal complexity."

### Re-ranking

- **Why**: retrieval top-k includes noise; re-ranker improves context quality before generation
- **Models**: Cohere Rerank, open-source cross-encoders
- **Trade-off**: +50-200ms latency for significantly better answer precision
- **Decision rule**: Use for complex questions and low-confidence retrieval. Skip for trivial queries with high retrieval confidence.

### RAG Pain Points

From "Twelve RAG Pain Points" (Barnett et al.) + production experience:

| Pain point | Detection | Mitigation |
|---|---|---|
| Missing content | High "no answer" rate on known-covered queries | Ingestion coverage dashboard; connector audits |
| Missed top-ranked docs | Relevant docs exist but not in top-k | Hybrid retrieval; tune filters; rerank |
| Not in context window | Right docs retrieved but truncated | Context packing strategy; chunk priority scoring |
| Not extracted correctly | Answer omits key fact from context | Better prompting with extraction constraints + citation checks |
| Wrong output format | JSON/template violations | Structured output validation + repair pass |
| Stale data | Answers cite old versions | Freshness metadata, TTLs, reindex schedule |
| Hallucinations | Claims unsupported by citations | Grounded generation prompts; abstain policy; citation verifier |

> [!warning] Ownership signal
> Don't say "hallucinations are unavoidable." Say: "I measure unsupported-claim rate and reduce it with retrieval quality, prompt constraints, and output validation."

### RAG Evaluation (RAGAS)

| Metric | What it measures | Why it matters |
|---|---|---|
| Faithfulness | Is answer supported by retrieved context? | Core hallucination control |
| Answer Relevancy | Does answer address user intent? | User value alignment |
| Context Precision | How much retrieved context is relevant? | Reduces noise and token waste |
| Context Recall | Did retrieval capture necessary evidence? | Upper bound on answer quality |

**Eval pipeline I would describe:**

1. Build **golden set** of representative queries + expected evidence
2. Run offline eval nightly with RAGAS metrics ([[Evaluation]], [[LLM-as-a-Judge]])
3. Add scenario tags: acronym-heavy, stale-doc risk, multi-hop questions
4. Track regressions per pipeline stage after each change
5. Run online A/B for high-impact changes
6. Gate deployments with minimum quality thresholds

> [!tip] Interview line
> "I treat eval as CI for AI systems: if faithfulness or context precision drops beyond threshold, rollout is blocked."

### Day 1 Practice Q&A

> [!question] "Design a RAG system for internal documentation"
> **Model answer framework:**
> 1. **Scope**: "Start with Confluence + runbooks + ADRs, exclude low-trust docs initially"
> 2. **Pipeline**: "Ingestion with source metadata → recursive/document-aware chunking → embedding → hybrid retrieval → rerank → grounded generation with citations"
> 3. **Data model**: "Each chunk stores source ID, owner team, last updated, permission tags"
> 4. **Quality**: "RAGAS offline + golden set + citation verifier online"
> 5. **Ops**: "Latency budget split across retrieval/rerank/generation; caching for repeated queries ([[Caching]])"
> 6. **Rollout**: "Pilot one org → measure resolution rate and unsupported claim rate → expand"

> [!question] "What are the biggest challenges with RAG in production?"
> **Organize by pipeline stage:**
> - Ingestion: connector drift, access control, stale content
> - Chunking/Embedding: domain mismatch, poor chunk boundaries
> - Retrieval: lexical misses, over-filtering, poor metadata hygiene
> - Re-ranking: latency/cost pressure
> - Generation: hallucinations, format failures
> - Operations: weak [[Monitoring]], no eval gating
> **Closing line:** "Most failures are data and retrieval failures, not model intelligence failures."

> [!question] "How would you evaluate RAG quality?"
> **Model answer:**
> - "I use three layers: offline, pre-prod, and production telemetry"
> - Offline: RAGAS (faithfulness/relevancy/context metrics) on stratified golden set
> - Pre-prod: adversarial tests (ambiguous queries, stale docs, acronym collisions)
> - Production: acceptance metrics, user feedback, escalation rates, citation compliance
> - "I require metric deltas, not anecdotes, to ship retrieval changes"

**Resources**: [Anthropic RAG Cookbook](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/retrieval_augmented_generation) · [Twelve RAG Pain Points](https://arxiv.org/abs/2401.05856) · [LangChain RAG docs](https://python.langchain.com/docs/tutorials/rag/) · [Pinecone RAG guide](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

## Day 2 (Friday) — Agents & MCP

### Agent Patterns and Complexity Ladder

```mermaid
flowchart LR
    A[Prompted LLM] --> B[Chain] --> C[Router] --> D[Orchestrator] --> E[Autonomous Agent]
```

*← simpler and predictable · · · capable and less predictable →*

- **ReAct** (Think → Act → Observe): strong baseline for tool-using assistants
- **Plan-and-Execute**: better for multi-step tasks where explicit decomposition helps
- **Reflexion**: adds self-critique/repair loop; useful when high correctness needed

> [!tip] Core principle from Anthropic
> Start simple and add agent complexity only when metrics prove necessity. Most "agent" use cases are better served by workflows.

**What I would say:** "I avoid jumping to fully autonomous agents. I start with deterministic workflows and introduce agency only where uncertainty and branching justify it."

### Tool Use & Function Calling

For detailed coverage of tool design principles — naming, parameters, versatility, fault tolerance, and caching — see [[Tools]].


How it works:

1. Model emits structured tool call (name + JSON args)
2. Runtime validates schema and authorization
3. System executes tool
4. Tool result (or typed error) returned to model
5. Model decides next step or final answer

**Error handling patterns:**
- **Validation errors**: return machine-readable field errors, ask model to repair args
- **Transient errors**: retry with exponential backoff
- **Permission errors**: explicit denial reason, no silent fallback
- **Timeouts**: partial result handling + user-visible degraded mode

### MCP Deep Dive (Critical — Core to DraftKings Stack)

[[Model Context Protocol]] is a standard that decouples LLM clients from tool/data integrations.

- **What**: Open protocol for model-to-tool/data interoperability
- **Transport**: JSON-RPC 2.0 over stdio or SSE
- **Architecture**: MCP Client ↔ MCP Server
- **Three primitives**:
  - **Resources** — read context/data
  - **Tools** — execute actions
  - **Prompts** — reusable prompt templates/workflows
- **Why it matters**: One server can serve multiple clients (Claude, Cursor, Kiro). Standard discovery and invocation reduce integration duplication. Better governance and auditability.

**DraftKings-relevant narrative:** "If engineering teams need Jira, Bitbucket, Slack, Confluence, and Snowflake access in AI workflows, MCP reduces N×M custom integrations to a standard interface and accelerates safe scaling."

> [!warning] Interview trap
> Don't define MCP as "just plugin plumbing." Emphasize interoperability, governance, and velocity gains across tools and clients.

### Multi-Agent Orchestration

| Pattern | How it works | When to use |
|---|---|---|
| **Supervisor** | One coordinator delegates to specialized agents | Operational clarity and observability |
| **Hierarchical** | Tree of planners/executors | Complex long workflows |
| **Peer-to-peer** | Agents negotiate responsibilities | Rarely — higher coordination risk |

### Agentic Coding Tools

| Tool | Strength | Status at DK | Interview angle |
|---|---|---|---|
| Claude Code | Strong reasoning + tool use | N/A | Implementation acceleration |
| Cursor | Mature IDE integration | Used | Day-to-day assisted coding |
| Kiro (Amazon) | Org alignment, enterprise readiness | **Approved by InfoSec** | Mention adoption fit |
| Junie (JetBrains) | Alternative in workbench | **Under InfoSec review** | Show objective evaluation mindset |

### n8n Workflows

n8n is the backbone of DraftKings' AI automation.

**Core pattern**: `Webhook → Normalize → Route → AI Step → Action → Audit Log`

- Fits support bots (SlackJack) and doc update loops (Doculus)
- Easy human-in-the-loop insertion
- Good boundary between deterministic orchestration and LLM uncertainty
- Workflows can be duplicated per team channel with custom MCP integrations

### Day 2 Practice Q&A

> [!question] "Walk me through an agent architecture for a Slack bot"
> **Model answer (map to SlackJack):**
> - Trigger: Slack event webhook
> - Orchestration: n8n routes by intent
> - Agent core: ReAct with constrained toolset ([[Agents]], [[Tools]])
> - Context: channel memory in Postgres + Confluence retrieval
> - Safety: sensitive-topic classifier, permission filters
> - Reliability: retries, idempotency keys, fallback response
> - Metrics: first response time, resolution rate, escalation rate

> [!question] "What is MCP and why does it matter?"
> **Model answer:**
> - "MCP is a standard protocol for connecting LLM apps to external resources and tools"
> - "It defines capability discovery and invocation semantics via JSON-RPC"
> - "Business value: interoperability — build once, use across clients"
> - "Operational value: governance — typed interfaces, clearer audit points"
> - "For DevEx orgs, faster rollout of AI capabilities to all engineers"

> [!question] "Workflow vs autonomous agent — how do you decide?"
> **Model answer:**
> - "If path is known and deterministic → workflow"
> - "If task requires uncertain exploration and iterative tool use → agent"
> - "I start with workflow baseline, add agent loop only where metrics justify complexity"
> - "Decision factors: failure tolerance, latency budget, observability, blast radius"

**Resources**: [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) (MUST READ) · [MCP docs](https://modelcontextprotocol.io/) · [Anthropic Tool Use docs](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview)

---

## Day 3 (Saturday) — System Design

### System Design Framework

Use this for EVERY design question:

| Step | Time | What to do |
|---|---|---|
| **Requirements** | 5 min | Functional + non-functional, clarifying questions, scale estimates |
| **High-Level Design** | 10 min | Boxes and arrows, API design, data model |
| **Deep Dive** | 15 min | Pick 2-3 risky components, show trade-offs |
| **Wrap-up** | 5 min | Trade-offs summary, 10x scale considerations |

### Building Blocks Quick Reference

| Component | Purpose | .NET Implementation | DK Relevance |
|---|---|---|---|
| Load Balancer | Distribute traffic, HA | Cloud LB + Kestrel | Stable ingress for AI services |
| API Gateway | Routing/auth/policy | YARP | Service boundary control |
| Message Queue | Async decoupling | [[RabbitMQ]] / [[Kafka]] / Azure Service Bus | Core for webhook pipelines |
| Cache | Reduce latency + API cost | Redis + `IDistributedCache` | Fast repeat answers, metadata cache |
| Database | State, config, audit | Postgres/SQL Server | Durable workflow state |
| Circuit Breaker | Prevent cascading failures | Polly ([[Circut Breaker]]) | Protect LLM/API dependencies |
| Rate Limiter | Quota protection | ASP.NET Core middleware | Cost and reliability control |

### .NET-Specific Patterns

- [[Microservices]] with ASP.NET Core Minimal APIs for service boundaries
- [[gRPC]] for internal low-latency service-to-service communication
- [[Message Queues]] with [[RabbitMQ]] or [[Kafka]] for resilient async workflows
- [[CQRS]] + [[Event Sourcing]] for auditable intent and replayability
- Redis caching via `IDistributedCache` for request dedupe and hot retrieval results
- Background workers (Worker Service / Hangfire) for long-running AI tasks
- YARP gateway for policy centralization and service discovery

### AI System Design Patterns

#### Pattern 1: Webhook → Queue → AI Worker → Result

This is the architecture of **ALL DraftKings AI tools**.

```mermaid
flowchart LR
    A["External Event<br>Jira - PR - Slack"] --> B["Webhook<br>HTTP"] --> C["Queue<br>RabbitMQ"] --> D["AI Worker<br>LLM + tools"] --> E["Result Action<br>PR - Doc - Reply"]
```

Why this is strong: isolates bursty traffic from model latency, supports retries/idempotency, enables horizontal worker scaling.

#### Pattern 2: Rate Limiting & Retry for LLM APIs

- Token-bucket limiter per tenant/team
- Exponential backoff with jitter for transient failures
- Circuit breaker (Polly) to stop storming unhealthy providers
- Fallback model/path for degraded operation

#### Pattern 3: Vector DB in .NET Stack

- Semantic Kernel orchestration + Npgsql + pgvector
- Keep retrieval metadata relational for governance/reporting
- Start simple; move to specialized vector DB only when scale demands it

#### Pattern 4: Async Validation Pipeline

```mermaid
flowchart LR
    A[Webhook] --> B[Validate Input] --> C[Enqueue] --> D[Worker] --> E[LLM] --> F[Validate Output] --> G[Action]
```

- Input: schema + auth + idempotency key
- Output: format check, policy checks, confidence threshold
- Action: commit, post PR comment, send Slack reply

> [!tip] Interview line
> "For AI systems, reliability patterns from distributed systems are still the backbone; the model is just one dependency in the chain."

### Day 3 Practice Q&A

> [!question] "How would you automate Jira-to-PR?"
> **Model answer (draw Dexter):**
> - Requirements: latency target, quality threshold, auditability
> - Flow: Jira webhook → queue → worker → repo mapping → codegen → pre-commit checks → PR → Jira update
> - Data: ticket-to-repo mapping store + run history
> - Reliability: retries, dead-letter queue, confidence threshold for auto-open PR
> - Metrics: PR acceptance rate, build pass rate, cycle time reduction
> - Security: scoped credentials, secret rotation, policy checks

> [!question] "Design AI-powered documentation updates"
> **Model answer (draw Doculus):**
> - Trigger on merged PR
> - Diff-aware doc impact analysis
> - Regenerate targeted sections with AIDOC markers
> - Open review PR with traceable source mapping
> - Prevent loops with event dedupe and source tags
> - Measure freshness SLA and human acceptance rate

**Resources**: [System Design Primer](https://github.com/donnemartin/system-design-primer) · [ByteByteGo](https://www.youtube.com/@ByteByteGo) · [Semantic Kernel docs](https://learn.microsoft.com/en-us/semantic-kernel/)

---

## Day 4 (Sunday) — Projects & AI Ownership

### Project Deep Dives

For each project, present: Architecture → MVP scope → Edge cases → Metrics → What I'd improve → 2-minute pitch.

---

### Dexter (Jira → PR Automation)

**Architecture:**

```mermaid
flowchart TD
    A["Jira Webhook - CRON"] --> B[Ticket Parser]
    B --> C["Repo + Component Mapper"]
    C --> D["Clone + Context Builder"]
    D --> E[AI Codegen Worker]
    B --> E
    E --> F["Pre-commit + Build Validation"]
    F --> G[Open PR]
    G --> H[Update Jira Status]
```

**MVP scope:** Single-repo, low-risk services. Generate branch + PR draft first, then expand to code changes. Strict confidence threshold before auto-PR.

**Edge cases:**
- Multi-repo tickets with ambiguous ownership
- Ticket lacks acceptance criteria → codegen quality drops
- Code compiles but fails tests → need pre-commit gate
- Security-sensitive area → require manual gate

**Metrics:** `% tickets with AI-assisted PR` (20% target), PR acceptance rate, build/test pass rate, median cycle time from ticket to first PR.

**What I'd improve:** Better component mapping via historical ownership signals. Retrieval of similar historical tickets/PRs for pattern grounding. Structured reviewer feedback loop.

**Milestones from doc:** Auto branch creator → Real code changes → Config support → Pre-commit validations → Feedback loop

> [!tip] 2-minute pitch
> "Dexter automates the boring first 60% of Jira-to-PR flow. It listens to ticket events, maps to the right repo context, generates constrained code changes, validates with pre-commit checks, and opens a traceable PR. The ownership lens is measurable throughput with quality guardrails: acceptance rate, build pass rate, and cycle time."

---

### Doculus (Auto-Documentation)

**Architecture:**

```mermaid
flowchart TD
    A[PR Merge Event] --> B[Diff Analyzer]
    B --> C[Doc Scope Resolver]
    C --> D[AI Doc Regeneration Engine]
    D --> E[AIDOC Marker-Safe Merge Layer]
    E --> F[Open Docs PR]
```

**MVP scope:** One doc type first (runbooks or API docs). Only update sections with explicit markers. Human review required initially. ~22 story points.

**Edge cases:** Manual edits overwritten without marker discipline. Circular trigger loops. Huge PR diffs causing noisy doc updates.

**Metrics:** Doc freshness (time from code merge to doc update), coverage (% repos with auto-docs), developer trust/satisfaction.

> [!tip] 2-minute pitch
> "Doculus closes the code-doc drift gap. It uses merge events, diff-aware impact detection, and marker-safe regeneration to create auditable doc PRs. We optimize for freshness and trust, not blind automation."

---

### SlackJack (Support Bot)

**Architecture:**

```mermaid
flowchart TD
    A[Slack Event] --> B[n8n Workflow]
    B --> C[Intent Router]
    C --> D[AI Agent]
    D <--> E[Postgres Memory]
    D <--> F[Confluence Retrieval]
    D --> G[Threaded Reply]
```

**MVP scope:** One team channel, FAQ + runbook questions, escalation path for low-confidence. ~12 story points.

**Edge cases:** Ambiguous/multi-part questions. Sensitive data in shared channels. Rate limiting. Context window overflow on long threads.

**Metrics:** First response time, resolution without escalation, satisfaction rating.

**Key pattern:** n8n workflow duplicable for each team channel — customize with team-specific MCPs (Snowflake, ContentStack, LaunchDarkly).

> [!tip] 2-minute pitch
> "SlackJack is an async support accelerator: event-driven, context-grounded, and safe-by-default. It cuts repetitive support load while preserving human escalation for ambiguity or policy-sensitive topics."

---

### AmendA (PR Comment Updater)

**Architecture:**

```mermaid
flowchart TD
    A[PR Comment Webhook] --> B["@amenda Parser"]
    B --> C[Change Planner]
    C --> D[AI Code Update Worker]
    D --> E["Pre-commit + Tests + Static Checks"]
    E --> F[Commit + PR Reply Summary]
```

**Modes:** Single comment (immediate localized change) · Batch (`@amenda Apply All` for grouped updates)

**Edge cases:** Conflicting reviewer comments. Ambiguous natural language intent. Merge conflicts after branch drift.

**Key control:** Confidence threshold — high confidence auto-applies, low confidence proposes as draft.

**Metrics:** Turnaround time per review round, accepted suggestion rate, revert rate after auto-updates.

> [!tip] 2-minute pitch
> "AmendA compresses review iteration loops by converting reviewer intent into validated code updates. The differentiator is confidence-based execution: high confidence auto-applies; low confidence proposes."

---

### AI Ownership Framework

#### Scoping
- Define MVP by high-value, low-risk path
- Separate must-have from nice-to-have
- Time-box iteration windows, freeze scope per sprint

#### Metrics Framework

| Category | What to measure | Example |
|---|---|---|
| **Adoption** | Active engineer usage rate | Weekly active users, repeat usage |
| **Throughput** | Delivery speed uplift | 20% tickets via AI, cycle time reduction |
| **Quality** | Output reliability | PR acceptance rate, hallucination rate, build pass rate |
| **Satisfaction** | Developer trust | CSAT, NPS, qualitative feedback |

#### Adoption Challenges + Responses

**Problem:** Setup friction > benefit for small tasks (engineers skip AI for routine work).

**Solutions from DK strategy:**
- **AI Fridays** — hands-on experimentation days
- **Learning Loops** — office hours with AI Coach
- **Shared Prompts Hub** — curated prompts for top 5 languages (.NET, JS, Python, iOS, Android)
- **AI Engineering Guild 2.0** — cross-team collaboration
- **Enablement ladder**: 101 (prompt engineering) → 201 (MCPs, sub-agents) → 301 (RAG, architecture)

#### Iteration Loops
- PR feedback → refine prompts/tooling
- Telemetry anomalies → tune retrieval and thresholds
- User complaints → improve UX and guardrails first, not just model swap

#### Risk Management
- InfoSec review for external tool/data access (Kiro approved, Junie under review)
- Guardrails for hallucination and policy violations
- Confidence threshold + human-in-the-loop for high-blast-radius actions

> [!warning] Interview trap
> "We'll use a better model" is not an ownership plan. You need scope, metrics, rollout strategy, and risk controls.

### Day 4 Practice Q&A

> [!question] "You own Dexter — what would you build in Q1 vs Q2?"
> **Model answer:**
> - **Q1**: Foundation — reliable pipeline, constrained scope (single-repo, low-risk tickets), measurement infrastructure (acceptance rate, build pass)
> - **Q2**: Expansion — multi-repo support, smarter retrieval (historical PRs via Glean), feedback learning from review outcomes
> - "I gate expansion on build pass and acceptance metrics, not roadmap optimism"

> [!question] "What metrics would you track for AI developer tools?"
> **Model answer:**
> - Adoption: weekly active users, repeat usage
> - Throughput: cycle-time reduction, PR velocity, % tickets via AI
> - Quality: acceptance rate, rollback/rework rate, hallucination rate
> - Satisfaction: CSAT/NPS and friction themes
> - "I treat metric slices by team and workflow to avoid false averages"

> [!question] "How would you improve adoption of AI tools?"
> **Model answer:**
> - Reduce friction (single command, templates, defaults)
> - Build trust (quality metrics + transparent failures)
> - Teach by doing (office hours, AI Fridays, prompt library)
> - Reward champions and publish internal wins
> - "Adoption is behavior change, not tool deployment"

---

## Day 5 (Monday) — Final Review

### Morning Cheat Sheet (30 minutes)

- **RAG**: 8-stage pipeline from ingestion to grounded generation ([[RAG]], [[Retrieval]], [[Re-ranking]])
- **Agent**: Think → Act → Observe → Decide ([[Agents]], [[Tools]])
- **MCP**: Resources, Tools, Prompts ([[Model Context Protocol]])
- **System Design**: 5/10/15/5 time-box
- **DK Numbers**: 20% tickets via AI · 15% throughput · 100% 101 completion
- **Ownership**: metrics + trade-offs + failure modes + iteration plan

### Timed Practice Drill (3 rounds)

**Round 1** — "Design internal RAG assistant" (30 min)
- Requirements: 5m → Design: 10m → Deep dive: 10m → Wrap-up: 5m

**Round 2** — "Design MCP-based tool platform for engineering" (30 min)
- Requirements: 5m → Design: 10m → Deep dive: 10m → Wrap-up: 5m

**Round 3** — "Own Dexter roadmap under throughput target" (30 min)
- Requirements: 5m → Design: 10m → Deep dive: 10m → Wrap-up: 5m

> [!tip] Final-day strategy
> Prioritize clarity and decision quality over breadth. In the interview, a well-defended architecture beats a flashy one.

---

## DraftKings Intelligence Brief

### Vision

> **"Empower every DraftKings engineer to build faster, smarter, and safer through AI-augmented development."**

### 2026 Goals
- **15%** throughput increase
- **100%** 101-level completion (all code-writing engineers)
- **DevEx CSAT** improvement (baseline being established)

### Priority Timeline

| Quarter | Focus |
|---|---|
| **Q1** | Enablement (Prompt Engineering, Learning Loops, AI Fridays), AI Workbench (Kiro/Junie pilots), Impact Insights (CSAT baseline, metrics solution eval) |
| **Q2** | Hands-On Lab 101 rollout, Shared Prompts Hub (top 5 languages + sub-agents), Doculus evaluation |
| **Q3+** | 201/301 enablement, Dev-to-PR rollout, Doculus pilot, Curio integrations |

### Metrics Tools Under Evaluation
Jellyfish · DX (Atlassian) · LiteLLM (in-house)

### Full Use-Case Portfolio
Dexter · Doculus · SlackJack · AmendA · Ops Support Bot · Curio · Tech Planner Bot · Ops Review Chatbot

**How to leverage in interview:** Connect every technical answer to business outcomes: "This design improves throughput safely," "This increases adoption," "This reduces DevEx friction while preserving governance."

---

## Interview Traps & Ownership Signals

### Common Mistakes to Avoid

> [!warning] Trap 1: "I know RAG" but no production scars
> Fix: Talk about failure modes by stage and how you detected/mitigated each.

> [!warning] Trap 2: Handwavy "agent" language
> Fix: Name exact pattern (ReAct vs workflow), tool boundaries, and failure handling.

> [!warning] Trap 3: No failure-mode analysis in system design
> Fix: Always include retries, idempotency, dead-letter queue, fallback, and monitoring.

> [!warning] Trap 4: Project talk without metrics
> Fix: Tie every project to adoption, throughput, quality, and satisfaction metrics.

### Ownership Phrases to Practice Verbatim

- "When I owned X, I measured success by…"
- "The trade-off I considered was latency vs precision, and I chose… because…"
- "I scoped the MVP to… to reduce risk and shorten feedback loops"
- "The failure mode we hit was…; detection was…; mitigation was…"
- "I would not scale this yet because the current bottleneck is…"
- "I use eval gates before rollout, so quality regressions fail fast"

### 2-Minute Closing Script

> [!note] Practice this out loud
> "I'm strongest where distributed systems discipline meets applied AI execution. I design AI systems end-to-end: ingestion, retrieval quality, tool orchestration, observability, and rollout metrics. For agentic systems, I start simple and add autonomy only when it's justified by measurable outcomes. For MCP, I value the interoperability and governance benefits because they scale DevEx impact across teams and tools. When I own a project, I define success metrics early, scope MVP tightly, and iterate based on telemetry and user feedback. That's how I'd contribute to DraftKings' throughput, enablement, and developer trust goals."


---

## Class Design Round — Robot-Managed Restaurant (HackerRank Style)

> [!warning] This section prepares you for the OOP class design round
> The interviewer expects clean OOP with clear interfaces, extensibility, and attention to real-world movement mechanics. Think diagrams plus patterns plus key method signatures — not full implementations.

### Problem Statement

Design a robot-managed restaurant system where:
1. A robot takes orders from customer tables
2. Robot sends orders to the kitchen
3. Robot picks up completed dishes and delivers to customers
4. **Extension**: add a Cleaner Robot without breaking existing design
5. **Special focus**: how does a robot physically move from point A to point B?

### Step 1: Identify Core Entities

```text
┌─────────────────────────────────────────────────────────┐
│                    Restaurant System                     │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│  Robot   │  Table   │ Kitchen  │  Order   │ Restaurant  │
│ (types)  │ (seats)  │ (queues) │ (items)  │   Floor     │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
```

### Step 2: Class Hierarchy

> [!tip] Key Design Principle
> **Program to interfaces, not implementations.** This is what enables the Cleaner Robot extension later without modifying existing code (Open/Closed Principle).

#### Robot Hierarchy and Movement Strategy

```mermaid
classDiagram
    direction TB

    class Position {
        +int X
        +int Y
        +ManhattanDistanceTo(other) int
    }

    class ILocation {
        <<interface>>
        +Name string
        +Position Position
    }
    class Table
    class KitchenStation
    class ChargingDock

    class RestaurantFloor {
        -Cell grid
        +IsWalkable(pos) bool
        +GetNeighbors(pos) List~Position~
    }

    class IMovementStrategy {
        <<interface>>
        +FindPath(from, to, floor) List~Position~
    }
    class AStarMovement
    class WaypointMovement
    class DirectMovement

    class RobotState {
        <<enumeration>>
        Idle
        Moving
        TakingOrder
        Delivering
        Cleaning
        Charging
    }

    class IMovable {
        <<interface>>
        +CurrentPosition Position
        +MoveTo(destination)
    }

    class Robot {
        <<abstract>>
        +Id string
        +CurrentPosition Position
        +State RobotState
        #MovementStrategy IMovementStrategy
        +MoveTo(destination)
        +PerformTask(task)*
    }

    class IOrderTaker {
        <<interface>>
        +TakeOrder(table) Order
    }
    class IDeliverer {
        <<interface>>
        +PickUp(order, station)
        +Deliver(order, table)
    }
    class ICleaner {
        <<interface>>
        +Clean(location)
    }

    class WaiterRobot
    class CleanerRobot

    ILocation <|.. Table
    ILocation <|.. KitchenStation
    ILocation <|.. ChargingDock
    IMovementStrategy <|.. AStarMovement
    IMovementStrategy <|.. WaypointMovement
    IMovementStrategy <|.. DirectMovement
    Robot ..|> IMovable
    Robot --> IMovementStrategy : strategy injection
    Robot --> RestaurantFloor : navigates
    Robot <|-- WaiterRobot
    Robot <|-- CleanerRobot
    WaiterRobot ..|> IOrderTaker
    WaiterRobot ..|> IDeliverer
    CleanerRobot ..|> ICleaner
```

**Why this hierarchy wins in interviews:**

- **Open/Closed**: Adding `CleanerRobot` required **zero changes** to `WaiterRobot`, `Robot`, or `Kitchen`
- **Interface Segregation**: `ICleaner` is separate from `IOrderTaker` — no robot implements methods it doesn't need
- **Strategy**: Movement algorithm is injectable per robot instance — A* for waiters, waypoint-based for cleaners
- **Liskov Substitution**: Any `Robot` subclass can be used wherever `Robot` is expected

**Key pattern — Strategy injection in Robot constructor:**

```csharp
protected Robot(string id, Position startPos, IMovementStrategy movement)
{
    Id = id;
    CurrentPosition = startPos;
    MovementStrategy = movement;  // Injected — swap A* for waypoint without changing Robot
    State = RobotState.Idle;
}
```

> [!question] "How would the robot physically move from A to B?"
> **Model answer:**
> "I model the restaurant floor as a 2D grid where each cell is walkable or blocked. The robot uses a **pathfinding strategy** — I'd inject `IMovementStrategy` via constructor. For a fixed restaurant layout, I'd use A* on a pre-computed waypoint graph: optimal paths without re-running full grid search on every move. Real service robots like BellaBot and Bear Robotics' Servi do exactly this: SLAM builds the map once, then navigation runs on it. A collision avoidance layer checks if the next position is occupied by another robot — if so, wait or re-route."

#### Kitchen and Orchestration — Observer Pattern

```mermaid
classDiagram
    direction LR

    class Order {
        +OrderId string
        +SourceTable Table
        +Items List~MenuItem~
        +Status OrderStatus
        +CreatedAt DateTime
    }

    class OrderStatus {
        <<enumeration>>
        Pending
        Preparing
        Ready
        Delivered
    }

    class IKitchenObserver {
        <<interface>>
        +OnOrderReady(order)
    }

    class Kitchen {
        -orderQueue Queue~Order~
        -observers List~IKitchenObserver~
        +ReceiveOrder(order)
        +CompleteOrder(order)
        +Subscribe(observer)
    }

    class RobotDispatcher {
        -robots List~Robot~
        -taskQueue PriorityQueue~RobotTask~
        +RegisterRobot(robot)
        +OnOrderReady(order)
        +RequestCleaning(location)
        +AssignNextTask()
    }

    class RobotFactory {
        +Create(type, id, position) Robot
    }

    Kitchen --> IKitchenObserver : notifies
    RobotDispatcher ..|> IKitchenObserver
    RobotDispatcher --> Robot : manages
    RobotDispatcher --> RobotFactory : uses
    Order --> OrderStatus
```

**Key pattern — Observer decouples Kitchen from Dispatcher:**

```csharp
// Kitchen does NOT know about robots — it just notifies observers
public void CompleteOrder(Order order)
{
    order.Status = OrderStatus.Ready;
    foreach (var obs in observers)
        obs.OnOrderReady(order);  // Dispatcher reacts by assigning delivery
}
```

### Step 3: Async Concurrency — Multiple Customers Simultaneously

This is the critical part interviewers probe: how does the system handle **concurrent operations** when multiple customers are at different stages?

#### Robot State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Moving : Task assigned
    Moving --> TakingOrder : Arrived at table
    Moving --> PickingUp : Arrived at kitchen
    Moving --> Cleaning : Arrived at dirty table
    TakingOrder --> Moving : Order taken heading to kitchen
    PickingUp --> Moving : Food picked up heading to table
    Moving --> Idle : Delivered or task complete
    Cleaning --> Idle : Cleaning done
    Idle --> Charging : Battery low
    Charging --> Idle : Charged
```

#### Concurrent Scenario — Three Customers at Different Stages

```mermaid
sequenceDiagram
    participant D as Dispatcher
    participant W1 as WaiterBot 1
    participant W2 as WaiterBot 2
    participant K as Kitchen

    Note over D,K: Customer B at Table 3 already ordered - food preparing

    rect rgb(230, 245, 255)
        Note right of D: Customer A arrives at Table 5
        D->>D: Find idle waiter nearest Table 5
        D->>W1: Assign take-order at Table 5
        W1->>W1: MoveTo Table 5 via A*
        W1->>K: TakeOrder and send to Kitchen
    end

    rect rgb(255, 245, 230)
        Note right of K: Kitchen finishes Customer B food
        K-->>D: OnOrderReady for Table 3
        D->>D: W1 busy - W2 idle - assign W2
        D->>W2: Assign delivery for Table 3
        W2->>K: PickUp order
        W2->>W2: Deliver to Table 3
    end

    rect rgb(255, 230, 230)
        Note right of D: Customer C arrives at Table 7
        D->>D: All waiters busy - queue task
        Note over D: Priority queue - delivery over new orders
    end

    W1-->>D: State changed to Idle
    D->>D: Dequeue next task for Customer C
    D->>W1: Assign take-order at Table 7
```

#### How the Dispatcher Handles Concurrency

**Task Priority Queue** — When all robots are busy, tasks are queued by priority:

| Priority | Task Type | Rationale |
|----------|-----------|-----------|
| 1 Highest | Food delivery | Food gets cold — direct customer impact |
| 2 | Order taking | Customer is waiting but not losing quality |
| 3 | Table cleaning | No active customer affected |
| 4 Lowest | Restocking or charging | Background maintenance |

**Dispatcher assignment logic:**

```csharp
public void AssignNextTask()
{
    if (!taskQueue.TryDequeue(out var task)) return;

    var candidate = robots
        .Where(r => r.State == RobotState.Idle && r.CanHandle(task))
        .OrderBy(r => r.CurrentPosition.ManhattanDistanceTo(task.Location))
        .FirstOrDefault();

    if (candidate != null)
        candidate.PerformTask(task);
    else
        taskQueue.Enqueue(task);  // Re-queue if no idle robot available
}
```

**Key concurrency behaviors:**

1. **Observer notifications are non-blocking** — Kitchen fires `OnOrderReady`, Dispatcher evaluates immediately but only assigns if a robot is idle. Otherwise the delivery task enters the priority queue.

2. **State-checked dispatch** — The Dispatcher only assigns work to `Idle` robots. A robot moving to Table 5 for an order cannot be reassigned mid-path. The new task goes to another idle robot or the queue.

3. **Proximity-based selection** — Among idle robots that can handle the task, the nearest one is chosen via Manhattan distance. This minimizes wait time and avoids two robots crossing paths.

4. **Completion callback** — When a robot finishes any task, it sets `State = Idle` and calls `Dispatcher.AssignNextTask()`, which checks the queue and immediately assigns the next highest-priority task.

> [!tip] Interview line
> "The Dispatcher is event-driven: Kitchen events and robot-idle events both trigger task assignment. The system self-balances without polling — as soon as capacity frees up, queued work starts immediately."

### Full System Flow

```mermaid
sequenceDiagram
    actor CA as Customer
    participant D as Dispatcher
    participant W as WaiterBot
    participant K as Kitchen
    participant Cl as CleanerBot

    CA->>D: Sits at Table 5
    D->>W: Assign nearest idle waiter
    W->>CA: MoveTo Table 5 via A*
    W->>CA: TakeOrder
    W->>K: ReceiveOrder

    Note over K: Preparing food...

    K-->>D: OnOrderReady via Observer
    D->>W: Assign delivery to idle waiter
    W->>K: PickUp order
    W->>CA: Deliver to Table 5

    CA->>D: Leaves table
    D->>Cl: RequestCleaning Table 5
    Cl->>Cl: MoveTo Table 5 via same pathfinding
    Cl->>Cl: Clean Table 5
```

### Patterns Summary Table

| Pattern | Where Used | Why |
|---|---|---|
| **Strategy** | `IMovementStrategy` | Swap pathfinding per robot or context without changing robot code |
| **Observer** | `Kitchen` to `IKitchenObserver` | Decouple kitchen from robot assignment logic |
| **Command-like** | `Order` object | Order flows through system as data — can be queued or logged |
| **Factory** | `RobotFactory` | Encapsulate robot creation — easy to add new types |
| **Template Method** | `Robot` base class | Shared movement logic with specialized task behavior in subclasses |
| **ISP** | `IOrderTaker` and `ICleaner` and `IDeliverer` | Robots only implement capabilities they actually have |
| **Priority Queue** | `RobotDispatcher.taskQueue` | Handle concurrent demand when robots are busy |

### Follow-Up: "Add another robot type?"

> [!question] "Add a Host Robot that greets customers and seats them"
> **Model answer:**
> 1. Create `IGreeter` interface with `GreetAndSeat(Customer, Table)` method
> 2. Create `HostRobot : Robot, IGreeter` — inherits movement, implements greeting
> 3. Add `"host"` case to `RobotFactory`
> 4. Add seating logic to `RobotDispatcher` (on customer arrival event)
> 5. **Zero changes** to `WaiterRobot`, `CleanerRobot`, `Kitchen`, or `Order`
>
> "This is OCP in practice — open for extension, closed for modification."

### Pathfinding Deep Dive (If Interviewer Probes)

**A* in 4 sentences:**
> "A* maintains open set (candidates) and closed set (explored). Each node has cost `f = g + h` where `g` is actual cost from start and `h` is heuristic estimate to goal (Manhattan distance for grid). We always expand the lowest-f node first. When we reach the goal, backtrack parent pointers for the path."

**Grid representation for whiteboard:**
```text
Restaurant Floor (10x8 grid):
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│  │  │  │T1│  │  │T2│  │  │  │  T = Table
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤  K = Kitchen
│  │  │  │  │  │  │  │  │  │  │  W = Wall
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤  C = Charging
│  │WW│WW│WW│  │WW│WW│WW│  │  │  R = Robot
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │  │T3│R→│→ │→ │→T4│  │  │  ← A* path shown
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│K │K │  │  │  │  │  │  │T5│  │
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │  │  │  │  │C │
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
```

**Collision avoidance:**
- Each robot reserves its next N positions in a shared occupancy map
- Before stepping, check if target cell is reserved by another robot
- If blocked: wait briefly, then re-route via A* with dynamic obstacles

**Real-world reference:** BellaBot (Pudu Robotics) uses dual SLAM (LiDAR + Visual) which maps to swappable `IMovementStrategy`. The Nav2 navigation stack (used by 100+ companies) explicitly uses a plugin architecture for path planners — the Strategy pattern at framework scale.

---

## Project Deep Dive Framework (How to Present ANY Past Project)

> [!tip] Use this framework for Day 3 (System Design) AND Day 4 (Ownership)
> When asked "Walk me through your project" or "Explain the architecture."

### The 5-Layer Presentation Framework

**Present in this order — mirrors how senior engineers think:**

#### Layer 1: Problem & Context (30 seconds)
- What business problem does this solve?
- Who are the users? What's the scale?
- What were the constraints? (team size, timeline, existing infra)

#### Layer 2: High-Level Architecture (2 minutes)
```mermaid
flowchart LR
    A["Client + Trigger"] --> B[API Layer]
    B <--> C["Auth + Gateway"]
    B --> D[Business Logic]
    D <--> E[External Services]
    D --> F[Data Store]
    E <--> G[Async Workers]
    G <--> H[Message Queue]
```
For each box: **technology choice** + **WHY** + **communication pattern** (sync vs async)

#### Layer 3: Key Technical Decisions (3 minutes)

Present 2-3 decisions as trade-offs:
> "We chose X over Y because [concrete reason tied to our constraints]."

| Decision Area | Options to Compare | What Interviewers Want |
|---|---|---|
| **Communication** | REST vs gRPC vs Queue | When sync vs async, latency vs reliability |
| **Database** | SQL vs NoSQL vs Both | Data model fit, consistency needs, query patterns |
| **Caching** | Redis vs In-memory vs None | Invalidation strategy, TTL reasoning |
| **Auth** | JWT vs Session vs OAuth | Token lifecycle, service-to-service auth |
| **Deployment** | Monolith vs Microservices | Team size, deployment independence |
| **Async** | Workers vs Queues vs Events | Failure handling, retry, ordering |
| **Error handling** | Retry vs Breaker vs DLQ | Idempotency, poison message handling |

#### Layer 4: Failure Modes & Observability (2 minutes)

> [!warning] This is where senior engineers differentiate themselves
> Junior: "It works." Senior: "Here's what breaks and how we detect it."

- **What can fail?** (external service, DB timeout, queue backup, data inconsistency)
- **How detected?** (health checks, metrics, alerts, structured logs)
- **How recovered?** (retry, fallback, circuit breaker, manual intervention)
- **How prevented?** (rate limiting, validation, idempotency, chaos testing)

#### Layer 5: Metrics & Evolution (1 minute)
- KPIs that prove the system works
- What you'd change with hindsight
- Scaling bottleneck at 10x

### Communication Patterns Cheat Sheet

| Pattern | When | .NET Implementation | Trade-off |
|---|---|---|---|
| **REST (sync)** | Client-facing APIs, CRUD | ASP.NET Core Minimal APIs | Simple but tight coupling |
| **gRPC (sync)** | Internal service calls | ASP.NET Core gRPC | Fast + typed, harder to debug |
| **Queue (async)** | Decouple producer/consumer | [[RabbitMQ]], Azure Service Bus | Reliable, eventual consistency |
| **Event stream** | Event sourcing, real-time | [[Kafka]] | Ordered + replayable, complex ops |
| **Webhooks** | External triggers | ASP.NET endpoint | Decoupled, needs idempotency |
| **SignalR** | Real-time UI updates | ASP.NET Core SignalR | Great UX, connection management |

### Database Selection Cheat Sheet

| Need | Choose | Why | .NET Integration |
|---|---|---|---|
| Structured + joins + ACID | **PostgreSQL / SQL Server** | Relational integrity | EF Core |
| Flexible schema / documents | **MongoDB / CosmosDB** | Evolving schema, nested data | MongoDB.Driver |
| Key-value + caching | **Redis** | Sub-ms reads, TTL | StackExchange.Redis |
| Vector search + embeddings | **pgvector / Qdrant** | Semantic search for AI | Npgsql + pgvector |
| Time-series | **TimescaleDB / InfluxDB** | Range queries on timestamps | Native clients |
| Full-text search | **Elasticsearch** | Complex search queries | NEST / Elastic.Clients |

### Scalability Patterns Quick Reference

| Pattern | Solves | Key Concept |
|---|---|---|
| Horizontal scaling | More load | Add instances behind load balancer |
| Vertical scaling | More per-node capacity | Bigger machine (limited ceiling) |
| DB sharding | Write bottleneck | Partition by key (user_id, region) |
| Read replicas | Read bottleneck | Replicate to read-only DBs |
| [[CQRS]] | Mixed read/write | Separate read/write models |
| [[Event-Driven Architecture]] | Tight coupling | Async events decouple services |
| CDN | Static asset latency | Cache at edge |
| Connection pooling | DB connection limits | Reuse connections (PgBouncer) |

### Consistency Models

| Model | Guarantee | When to use |
|---|---|---|
| **Strong** | Read always sees latest write | Financial transactions, inventory |
| **Eventual** | Reads may be stale temporarily | Social feeds, analytics, caching |
| **Causal** | Related writes are ordered | Chat, collaborative editing |

> [!tip] [[CAP theorem]] interview line
> "During a partition, you choose between consistency and availability. We chose [AP/CP] because [reason]. Most systems make different choices per operation."

### Monitoring — The Three Pillars

| Pillar | What | Tools | .NET |
|---|---|---|---|
| **Metrics** | Numbers over time | Prometheus, Datadog | OpenTelemetry, App Insights |
| **Logs** | Structured events | ELK, Seq, Loki | Serilog, NLog |
| **Traces** | Request flow across services | Jaeger, Zipkin | OpenTelemetry |

> [!tip] Senior signal
> "I instrument with OpenTelemetry from day one. The cost of adding observability later is 10x."

### "Walk Me Through Your Architecture" — Template

> [!question] Use this for presenting ANY DraftKings project
> **Opening**: "[Project] solves [problem] by [approach]. It serves [users] at [scale]."
>
> **Architecture**: "It's a webhook-driven async pipeline. [Trigger] → validate → enqueue → [worker] processes with [AI/logic] → [action]. We chose async because [latency tolerance, retry needs, burst handling]."
>
> **Database**: "We use [DB] because [data model fit]. [Caching strategy] for [hot data]."
>
> **Communication**: "External triggers via webhooks. Internal via [REST/gRPC/queue] because [trade-off]."
>
> **Failures**: "If [service] is down → [breaker/retry/DLQ]. If [worker] crashes → [idempotency/checkpoint]. Monitored via [metrics/alerts]."
>
> **Metrics**: "Success = [KPI]. Current: [numbers]. Next improvement: [specific step]."

---

## Additional Practice Questions

### Class Design Questions (HackerRank Round)

> [!question] "Design a parking lot system"
> **Framework**: Vehicle hierarchy (Car/Truck/Motorcycle) → ParkingSpot types → ParkingLot with floors → Strategy for spot assignment → Observer for availability. Key: different vehicle sizes need different spots.

> [!question] "Design an elevator system"
> **Framework**: Elevator (state: idle/moving, direction, floor) → ElevatorController → Strategy for scheduling (SCAN, LOOK, nearest-first) → Observer for floor arrival. Key: scheduling algorithm.

> [!question] "Design a chess game"
> **Framework**: Board (8x8 grid) → Piece hierarchy → Each piece has movement strategy → Game manages turns → Move validation. Key: extensibility for new pieces.

### Past Project Deep Dive Questions

> [!question] "How did services communicate in your system?"
> Name the pattern → Why you chose it → Trade-offs → Failure handling → What changes at 10x.

> [!question] "What database did you use and why?"
> State DB → Data model fit → Query patterns → Indexing → Caching layer → Consistency requirements.

> [!question] "How did you handle failures?"
> Categorize (transient vs permanent) → Retry with backoff → Circuit breaker → DLQ → Alerting → Recovery.

> [!question] "How would you scale to 100x?"
> Identify bottleneck → Horizontal scaling → DB read replicas/sharding/CQRS → Caching → Async paths → CDN.

> [!question] "What would you do differently?"
> Pick 1-2 concrete things → What you learned → Why original made sense → What changed → Better approach.

### API Design Quick Reference

**REST conventions:**
- Nouns for resources (`/orders/{id}`), HTTP verbs for actions
- Cursor-based pagination for large datasets
- Idempotency keys for POST operations
- Versioning: URL path (`/v1/`) or header-based

**Rate limiting strategies:**
- Token bucket (smooth, allows bursts)
- Sliding window (precise, more memory)
- Fixed window (simple, boundary edge cases)

---

## Vault Cross-Reference Map

> [!note] Quick links to existing vault notes for deeper study
> [[RAG]] · [[Chunking]] · [[Retrieval]] · [[Re-ranking]] · [[Evaluation]] · [[Query Translation]] · [[Caching]] · [[Monitoring]] · [[Agents]] · [[Tools]] · [[Multi-Agentic Systems]] · [[Mental Framework]] · [[Model Context Protocol]] · [[Hallucinations]] · [[Generation]] · [[LLM]] · [[LLM-as-a-Judge]] · [[CQRS]] · [[Event Sourcing]] · [[Event-Driven Architecture]] · [[Microservices]] · [[Message Queues]] · [[Kafka]] · [[RabbitMQ]] · [[CAP theorem]] · [[Circut Breaker]] · [[REST]] · [[gRPC]]
