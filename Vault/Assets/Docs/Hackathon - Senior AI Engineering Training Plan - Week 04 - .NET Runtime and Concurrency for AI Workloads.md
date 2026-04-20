# Week 04 — .NET Runtime and Concurrency for AI Workloads
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 03 - Agents, Tool Use, and MCP]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 05 - Retrieval Quality, Caching, and Monitoring]]

## Goal

Harden the request path of the Support Copilot Platform so it behaves like a service, not a lab script. This week is about cancellation, bounded concurrency, timeout decisions, and runtime awareness under realistic load.

## Weekly Outcome

By the end of the week, you should have a request path in the `Support Copilot Platform` that propagates cancellation, uses bounded concurrency, has explicit timeout budgets, and produces enough metrics or traces to explain latency under light load. The result should feel like a service path you could defend in a production review, not a happy-path demo.

## Task Checklist

- [ ] Map the full hot path from API entry to answer delivery.
- [ ] Mark where `CancellationToken` should be accepted, propagated, and honored.
- [ ] Identify any unbounded fan-out or parallel calls on the request path.
- [ ] Define timeout budgets for retrieval, model call, tool call, and total request handling.
- [ ] Add bounded concurrency for expensive parallel work.
- [ ] Remove or isolate blocking calls that can starve the request path.
- [ ] Add structured timing around retrieval, tool use, and answer generation.
- [ ] Run a light benchmark or load probe at modest concurrency.
- [ ] Record how the system behaves under cancellation, timeout, and partial failure.
- [ ] Write a short runtime note explaining the tradeoffs you made.

## Suggested Session Plan

### Session 1, map the hot path

- Trace the request path from controller or endpoint to retrieval, optional tool use, and final answer assembly.
- Mark sync boundaries, await points, and where work could pile up.
- Decide which operations are allowed to run in parallel and which should stay sequential.

### Session 2, cancellation and timeout policy

- Propagate `CancellationToken` through the full stack.
- Add explicit time budgets for external calls.
- Decide what should happen when one stage times out, fail the whole request, return partial context, or degrade safely.

### Session 3, bounded concurrency

- Review current fan-out behavior.
- Add concurrency limits for parallel retrieval or tool-related work.
- Avoid fire-and-forget behavior inside request handlers.
- Check whether any logging or serialization steps are adding unnecessary contention.

### Session 4, benchmark and inspect

- Run a light concurrency test.
- Capture latency, timeout, and cancellation observations.
- Look for allocation-heavy paths, blocked threads, or queueing behavior.
- Record one concrete runtime bottleneck, not a generic worry list.

### Session 5, design review and hardening summary

- Write down the timeout budget story from edge to downstream call.
- Explain which retries belong on the hot path and which do not.
- Summarize what changed, what improved, and what still needs load-testing later.

## Suggested Steps

### Step 1 — Map the current hot path

- request enters API
- retrieval runs
- optional tool call executes
- answer is assembled

Mark where cancellation should propagate and where work could pile up.

### Step 2 — Apply service-hardening changes

- propagate `CancellationToken`
- bound parallel work
- define timeout budgets
- avoid hidden blocking calls
- record latency and cancellation behavior

## Implementation Tasks

Keep the work tied to the `Support Copilot Platform` request path.

- Add `CancellationToken` propagation from the API boundary through retrieval, tool calls, and answer generation code.
- Audit async calls and remove any blocking `.Result`, `.Wait()`, or sync-over-async behavior on the hot path.
- Add bounded concurrency for retrieval fan-out or multi-step enrichment work.
- Define a clear timeout policy for the overall request and each downstream dependency.
- Add structured timings or tracing spans for retrieval, external model calls, tool calls, and answer formatting.
- Implement cancellation-aware cleanup so abandoned work does not continue burning tokens or compute.
- Run a modest load probe and compare p50 and p95 latency before and after the changes.
- Document one tradeoff where you favored predictable throughput over raw peak parallelism.

## Deep Study

- Read [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await|Async Await]].
- Read [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks|Tasks]].
- Read [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]].
- Read [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken|CancellationToken]].
- Read [[Software Engineering/01 Programming/NET/Runtime/Garbage Collector|Garbage Collector]].

## Resource Pack

### Internal notes

- [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await|Async Await]]
- [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks|Tasks]]
- [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]
- [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken|CancellationToken]]
- [[Software Engineering/01 Programming/NET/Runtime/Garbage Collector|Garbage Collector]]

### External docs

- [ASP.NET Core performance best practices](https://learn.microsoft.com/en-us/aspnet/core/performance/performance-best-practices), core guidance on hot-path behavior, blocking avoidance, and server-side throughput.
- [Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads), primary reference for cooperative cancellation patterns in .NET.
- [Debug ThreadPool starvation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation), practical guidance for diagnosing starvation and queueing under load.

## Build Plan

- Add cancellation propagation.
- Bound concurrency for expensive steps.
- Document timeout policy.
- Run a light benchmark at modest concurrency.

Concrete outputs for the week:

- service-hardening checklist
- benchmark summary
- operations note covering cancellation and backpressure

## System Design Drill

Describe:

- request timeout budget
- where retries belong and do not belong
- what gets queued versus handled inline
- what metrics tell you the runtime is becoming the bottleneck

## DSA Plan

- Solve 1 heap or priority-queue problem.
- Solve 1 producer-consumer or queue-coordination style problem.
- Map them back to work scheduling and top-k retrieval handling.

## Best Practices

- Favor predictable throughput over aggressive concurrency.
- Propagate cancellation instead of ignoring aborts.
- Treat allocation pressure as a latency problem.
- Keep concurrency decisions observable.
- Set timeout budgets deliberately, a hidden default is not a runtime strategy.
- Benchmark the real request path, not an isolated helper method that hides service behavior.

## Common Mistakes

- Unbounded fan-out.
- Fire-and-forget work in request handlers.
- Ignoring cancellation.
- Benchmarking without realistic service constraints.

## Useful Links

- [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await|Async Await]]
- [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]
- [[Software Engineering/01 Programming/NET/Runtime/Garbage Collector|Garbage Collector]]
- [ASP.NET Core performance best practices](https://learn.microsoft.com/en-us/aspnet/core/performance/performance-best-practices)
- [Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)

## Review and Checkpoint

Use these prompts at the end of the week:

- Does cancellation actually stop downstream work, or does it only cancel the HTTP request wrapper?
- Where is concurrency bounded today, and what still risks fan-out under load?
- Which timeout is protecting the overall user experience, and which timeouts only protect dependencies?
- If latency spikes, do I have enough telemetry to tell whether the problem is retrieval, model calls, tool calls, allocation pressure, or queueing?
- What evidence do I have that the service is more stable now than it was at the start of the week?
- Which optimization did I intentionally skip because it would add complexity without enough operational value yet?

## Definition of Done

- The request path respects cancellation.
- Concurrency is bounded on the hot path.
- You have one benchmark result and one runtime tradeoff story.
- The Support Copilot Platform is more stable under light concurrency than it was at week start.
