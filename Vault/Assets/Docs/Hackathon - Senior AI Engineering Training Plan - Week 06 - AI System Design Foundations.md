# Week 06 — AI System Design Foundations
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 05 - Retrieval Quality, Caching, and Monitoring]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 07 - Product-Oriented Backend Architecture]]

## Goal

Introduce the first real distributed-systems backbone into the Support Copilot Platform: async job boundaries, idempotent workers, and rate limits that control both reliability and cost.

## Weekly Outcome

By the end of the week, the platform should have one explicit async workflow with a submission contract, status tracking, idempotent execution rules, and rate limits that protect both upstream dependencies and cloud spend. You should also have a lifecycle diagram, a worker runbook, and a written explanation of which operations stay synchronous and why.

## Suggested Weekly Flow

1. Decide which work must remain synchronous and which must move async.
2. Add one queue-backed job path.
3. Make idempotency explicit for both API and worker behavior.
4. Add rate limiting for expensive operations.
5. Save one lifecycle diagram and one runbook.

## Suggested Steps

### Step 1 — Separate sync from async work

- User-facing ask path stays short.
- Reindexing and expensive ingestion become async.
- Job submission and status lookup get explicit contracts.

### Step 2 — Add reliability controls together

- enqueue boundary
- retry policy
- idempotency keys
- dead-letter thinking
- per-tenant limits for costly endpoints

## Task Checklist

- [ ] List all Support Copilot Platform operations and classify them as synchronous, async, or borderline.
- [ ] Pick one expensive workflow, such as reindexing or large ingestion, and move it behind a queue-backed job boundary.
- [ ] Define request and response contracts for job submission, status lookup, cancellation, and duplicate submission behavior.
- [ ] Add idempotency rules for both the public HTTP endpoint and the worker message handler.
- [ ] Define retry categories: transient, permanent, and operator-investigation required.
- [ ] Add dead-letter handling criteria and what metadata must be captured for replay.
- [ ] Add per-tenant rate limits for the most expensive operations, including the reason for each threshold.
- [ ] Capture worker telemetry: queue depth, dequeue latency, success rate, retry count, and dead-letter count.
- [ ] Write a short runbook for job stuck, job duplicated, and dependency throttled scenarios.
- [ ] Produce one lifecycle diagram that shows request, queue, worker, storage, and status transitions.

## Suggested Session Plan

### Session 1 — Draw the real boundaries

- Inventory user-facing actions in the platform and decide which ones need immediate response versus durable background completion.
- Use concrete rules: if the operation touches large document batches, external indexing, or expensive embedding generation, it probably belongs behind an async boundary.
- Write down the synchronous path budget so you don't hide long work behind fragile HTTP timeouts.

### Session 2 — Design the job contract

- Define a job submission endpoint that returns a job ID, accepted timestamp, deduplication behavior, and current state.
- Define a status endpoint with clear states such as queued, running, succeeded, failed, and dead-lettered.
- Decide how the client supplies idempotency keys and how the platform responds to repeated submissions.

### Session 3 — Implement the worker path

- Add one worker flow with a narrow responsibility, for example ingest documents, generate embeddings, then publish index-ready chunks.
- Make each step idempotent so safe retries are possible without duplicate writes or duplicate billing.
- Record exactly what state is persisted before and after each step.

### Session 4 — Add control planes

- Add retry rules based on failure class, not one blind retry count for everything.
- Add per-tenant rate limits for expensive submission paths and decide whether the limit is concurrency-based, token-bucket based, or both.
- Add dead-letter handling and operator visibility so broken jobs don't disappear into logs.

### Session 5 — Document and defend the design

- Produce the lifecycle diagram and worker runbook.
- Write a short reliability note that explains queue, idempotency, and rate limiting as one system, not three unrelated patterns.
- Review whether the chosen async boundary reduced timeout risk and cost spikes in a measurable way.

## Resource Pack

### Internal notes

- [[Software Engineering/05 Architecture/Distributed Systems/Distributed Systems|Distributed Systems]], the baseline for thinking in queues, retries, and consistency.
- [[Software Engineering/05 Architecture/Distributed Systems/Idempotency|Idempotency]], the key discipline that keeps retries safe.
- [[Software Engineering/05 Architecture/Patterns/Resilience Patterns/Rate Limiting|Rate Limiting]], rate limit design beyond simple abuse prevention.

### External docs

- [Background tasks with hosted services in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services), the .NET baseline for worker execution models.
- [Cloud design patterns: Queue-based load leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling), why queue boundaries reduce user-facing pressure.
- [Azure Architecture Center, Competing Consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers), useful when you scale worker throughput.
- [Rate limiting middleware in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit), practical controls for product endpoints.

## Implementation Tasks

Concrete Support Copilot Platform tasks for this week:

1. Choose one workflow to move async, preferably knowledge ingestion or reindexing, and define the public contract first.
2. Add a `POST /jobs/reindex` or similar endpoint with:
   - idempotency key support
   - accepted response payload
   - tenant-aware authorization
   - validation rules for duplicate or conflicting submissions
3. Add a `GET /jobs/{jobId}` status endpoint with explicit state transitions and operator-friendly failure details.
4. Implement one worker with narrow steps, for example:
   - load batch
   - normalize and chunk content
   - generate embeddings
   - update index state
   - mark completion
5. Add a worker state table or document that records:

| Stage | Persisted marker | Safe to retry | Duplicate risk if broken |
|---|---|---|---|
| Job accepted | job row created | yes | low |
| Batch loaded | source version recorded | yes | medium if source mutates |
| Embeddings generated | embedding batch checksum stored | yes | cost spike if duplicated |
| Index updated | index version marker written | conditionally | stale or duplicate writes |
| Job completed | completion timestamp and output summary | yes | low |

6. Write an ADR or technical note covering:
   - why this path is async
   - why it stays in-process worker versus external workflow engine for now
   - what scale or failure pressure would justify a more complex queue topology
7. Add a rate-limit table for the most expensive endpoints with per-tenant thresholds, expected retry-after behavior, and alert conditions.

## Deep Study

- Read [[Software Engineering/05 Architecture/Distributed Systems/Distributed Systems|Distributed Systems]].
- Read [[Software Engineering/05 Architecture/Distributed Systems/Idempotency|Idempotency]].
- Read [[Software Engineering/05 Architecture/Patterns/Resilience Patterns/Rate Limiting|Rate Limiting]].

## Build Plan

- Add job submission API.
- Add status lookup endpoint.
- Implement one idempotent worker flow.
- Document retry and rate-limit behavior.

Concrete outputs for the week:

- job submission/status contract
- worker runbook
- request lifecycle diagram
- reliability note explaining queue + idempotency + rate limiting together

## System Design Drill

Explain:

- API boundary
- queue boundary
- worker responsibilities
- retry versus dead-letter policy
- idempotency for HTTP and messages

Guideline: explain the lifecycle as one continuous path. Start with the API request, show when work becomes durable, show how retries stay safe, and show how operators detect a poisoned job instead of waiting for a user complaint.

## DSA Plan

- Solve 1 queue/deque problem.
- Solve 1 dependency-order or graph problem.
- Tie them back to worker scheduling and ingestion sequencing.

## Best Practices

- Use queues to control expensive work, not to add platform theater.
- Keep worker responsibilities narrow.
- Make idempotency observable and testable.
- Rate-limit for reliability and spend, not only abuse protection.

## Common Mistakes

- Hiding long-running work behind synchronous endpoints.
- Retrying without idempotency.
- Spreading one simple worker problem across too many services.
- Treating queue introduction as architecture progress by itself.

## Review and Checkpoint

Use these prompts at the end of the week:

- Which operations clearly belong behind async boundaries, and which ones still need synchronous responses?
- If the client retries the submission request three times, what exact behavior prevents duplicate work?
- What state proves a worker step completed, and what state is only inferred from logs?
- Which failures are safe to retry automatically, and which ones should go straight to dead-letter or operator review?
- How do your rate limits protect both dependency reliability and budget?
- If queue depth doubles tomorrow, what is your first scaling move and what metric would justify it?

## Useful Links

- [[Software Engineering/05 Architecture/Distributed Systems/Distributed Systems|Distributed Systems]]
- [[Software Engineering/05 Architecture/Distributed Systems/Idempotency|Idempotency]]
- [[Software Engineering/05 Architecture/Patterns/Resilience Patterns/Rate Limiting|Rate Limiting]]
- [Background tasks with hosted services in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services)
- [Cloud design patterns: Queue-based load leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling)
- [Azure Architecture Center, Competing Consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers)
- [Rate limiting middleware in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)

## Definition of Done

- The Support Copilot Platform has one explicit async job path.
- Idempotency and retry rules are documented.
- Expensive work is no longer hidden behind fragile synchronous timeouts.
- You can explain why these controls reduce both reliability risk and cost risk.
