---
publish: true
created: 2026-07-08T15:01:12.487Z
modified: 2026-07-08T15:01:12.487Z
published: 2026-07-08T15:01:12.487Z
tags:
  - FolderNote
topic:
  - Architecture
subtopic:
  - Patterns
priority: High
level:
  - "3"
status: Done
---

# Intro

Resilience patterns protect distributed systems from cascading failures by controlling how services behave when dependencies degrade. The core insight is that partial failure is the normal state — something is always slow, overloaded, or down — and uncontrolled failure propagation turns a single slow dependency into a system-wide outage. Without explicit resilience boundaries, threads, sockets, and retries pile up until healthy parts of the system also degrade.

The two foundational patterns here are [[Circuit Breaker]] (stop calling a failing dependency and fail fast instead of waiting) and [[Rate Limiting]] (cap request volume so one caller cannot exhaust shared resources). In production .NET systems, these compose into a resilience stack together with timeouts, retries with exponential backoff, and fallbacks — each layer handling a different failure mode. Polly and `Microsoft.Extensions.Resilience` wire these layers into a single `HttpClient` pipeline.

## References

- [Release It! Second Edition -- foundational patterns for production resilience covering circuit breakers, bulkheads, timeouts, and steady-state design (Michael Nygard, Pragmatic Bookshelf)](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Resiliency patterns -- cloud design patterns for retry, circuit breaker, bulkhead, and health endpoint monitoring (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/patterns/category/resiliency)
