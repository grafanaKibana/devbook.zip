---
topic:
  - DevOps
subtopic: []
summary: "Understanding a system's internal state from metrics, logs, and traces."
level:
  - "2"
priority: High
status: Done
publish: true
---

Observability is the ability to infer a system's internal state from the signals it emits. Metrics reveal changes in scale and health, logs preserve discrete events, and traces reconstruct causal work across service boundaries. An alert may expose a symptom; correlation turns that symptom into a defensible explanation.

Instrumentation is part of the application contract. Telemetry that was never emitted or correlated cannot be recovered after a failure.

# Metrics, Logs, and Traces

| Signal | Shape | Best question | Main design limit |
| --- | --- | --- | --- |
| Metric | Numeric series aggregated over time | Is the system healthy, and how large is the problem? | Labels must stay bounded |
| Log | Discrete structured event | What exact state or error occurred? | Volume, sensitive data, and schema consistency |
| Trace | Tree of timed spans for one operation | Where did this request wait or fail? | Context propagation and sampling |

## Metrics

A **counter** records a cumulative total such as requests or failures. A **gauge** records a current value such as queue depth. A **histogram** records a distribution such as request duration so a backend can calculate percentiles.

For a service, rate, errors, and duration provide a useful minimum. Tail latency such as p95 or p99 matters because an average can hide a slow minority. Resource metrics such as CPU, queue depth, connection-pool use, and memory pressure explain constraints, but they do not replace service-level evidence.

Metric labels create one series for every value combination. Bounded dimensions such as service, route template, status class, and outcome are usually safe. Request IDs, user IDs, raw URLs, and container IDs are unbounded and can make storage and queries explode; put those identifiers in controlled logs or traces instead.

## Logs

Logs record events. Structured logs keep stable property names so the backend can filter and aggregate without parsing prose. They should describe important state transitions and failures without serializing request bodies, credentials, tokens, or regulated data.

```json
{
  "timestamp": "2026-08-15T10:24:31Z",
  "service": "checkout-api",
  "severity": "Error",
  "message": "Payment authorization failed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "route": "/checkout",
  "duration_ms": 842
}
```

`service` identifies the emitting component, `severity` supports routing, and `trace_id` joins the event to distributed work. `route` uses a stable template instead of a customer-specific URL. The timestamp must use a consistent clock and format across services.

## Traces

A trace represents one end-to-end operation. Each **span** records one timed unit of work and its parent relationship. W3C `traceparent` propagation carries trace identity across HTTP or messaging boundaries so an API span, database span, and downstream-service span can form one causal tree.

Sampling controls trace cost. Uniform sampling can discard rare failures before their outcome is known; tail sampling can retain errors and slow traces after observing the result. The system still needs an explicit policy for what may be dropped.

# Correlation

Consistent service identity, timestamps, and trace context connect the signals:

```text
metric alert -> exemplar or time window -> trace -> correlated structured logs
```

Metrics find the affected interval and scale. Traces identify the slow or failing dependency. Logs supply discrete application state that a span does not contain. A business correlation ID may supplement trace context when work crosses asynchronous boundaries or outlives one trace, but it should not replace trace propagation.

# Collection Boundary

Telemetry passes through a pipeline:

```text
application -> SDK or agent -> collector -> storage/query backend -> dashboard or alert
```

The application owns stable signal names, useful attributes, context propagation, and redaction. A collector can batch, retry, sample, and route signals. The backend owns indexing, retention, queries, dashboards, and alert evaluation. OpenTelemetry standardizes instrumentation and transport across these boundaries; it is not a storage engine.

Best-effort diagnostics should not exhaust memory or block production requests when the telemetry backend is unavailable. Audit, security, financial, or regulatory records are different: when policy requires durable acknowledgement, send them through a separately designed durable record or transaction path rather than treating them as disposable telemetry.

# Alert Quality

An alert should represent a user-visible symptom, exhausted reliability budget, or urgent security condition. It needs an owner and an action. A threshold with no decision behind it creates noise; a dashboard with no question behind it is decoration.

Good alerts use enough time or traffic to avoid reacting to meaningless variation, but not so much that a serious failure is hidden. The exact threshold is service-specific. The design boundary is whether the signal maps to impact and whether the recipient can change the outcome.

# Application Instrumentation Contract

In .NET, `ILogger` emits structured logs, `Meter` defines metrics, and `ActivitySource` creates spans. OpenTelemetry can add framework instrumentation and export those signals through OTLP. Application code still decides which business operations matter, which outcomes are bounded metric dimensions, and which data is unsafe to emit.

Instrumentation should preserve:

- a stable service identity and signal naming scheme;
- W3C trace context across outgoing calls and messages;
- bounded metric attributes;
- structured errors and important state transitions;
- no secrets or raw sensitive payloads;
- explicit sampling, retention, and failure behavior outside the request path.

# Questions

> [!QUESTION]- Why should request or user IDs not be metric labels?
> Each unique label combination creates another time series. Unbounded identifiers can multiply storage and query work with traffic volume. Keep metric dimensions bounded and use the trace ID to reach access-controlled logs or traces when an individual request must be inspected.

# References

- [OpenTelemetry for .NET](https://opentelemetry.io/docs/languages/dotnet/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
