---
topic:
  - DevOps
subtopic:
  - Observability
level:
  - "2"
priority: High
status: Creation
publish: false
summary: "OpenTelemetry and structured logging patterns for observable .NET services."
---

# Intro

.NET observability starts with stable telemetry contracts, not a dashboard vendor. Instrument inbound requests, outbound dependencies, runtime pressure, and business boundaries with OpenTelemetry; propagate W3C trace context; emit structured logs that carry the trace ID; and export through OTLP or a deliberately chosen backend integration.

Reach for this setup when a service must explain latency across dependencies, expose bounded service-level metrics, or change backends without rewriting instrumentation. The application owns signal names and dimensions. A collector or backend owns batching, routing, retention, sampling, and presentation.

## Register OpenTelemetry

The API and SDK provide one model for metrics and traces. Instrumentation packages cover common .NET libraries such as ASP.NET Core, `HttpClient`, gRPC, Entity Framework Core, and runtime metrics. Runtime auto-instrumentation is a separate deployment model; do not silently mix it with code instrumentation without checking for duplicate spans.

```csharp
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("checkout-api"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddGrpcClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddSource("Checkout.Api")
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddHttpClientInstrumentation()
        .AddMeter("Checkout.Api")
        .AddPrometheusExporter());
```

Prometheus export also needs a scrape endpoint:

```csharp
var app = builder.Build();
app.MapPrometheusScrapingEndpoint();
```

Prometheus ASP.NET Core exporter support is version-sensitive and may use prerelease packages. For production, OTLP to an OpenTelemetry Collector often gives a more stable boundary: the service exports one protocol, while the collector handles authentication, retries, batching, and backend-specific routing.

## Custom Metrics with Meter

Use counters for cumulative events and histograms for distributions. Keep dimensions bounded: `outcome=accepted|rejected` is safe; order ID, customer ID, or raw URL is not.

```csharp
using System.Diagnostics;
using System.Diagnostics.Metrics;

var meter = new Meter("Checkout.Api", "1.0.0");
Counter<long> ordersCreated = meter.CreateCounter<long>("orders_created_total");
Histogram<double> checkoutLatencyMs =
    meter.CreateHistogram<double>("checkout_latency_ms");

IResult CreateOrder(OrderRequest request)
{
    var startedAt = Stopwatch.GetTimestamp();

    var result = orderService.Create(request);

    ordersCreated.Add(
        1,
        new KeyValuePair<string, object?>("outcome", result.Outcome));
    checkoutLatencyMs.Record(
        Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds);

    return Results.Ok(result);
}
```

A backend can derive rate from the counter and latency percentiles from the histogram. Do not publish application-computed p95 gauges: aggregation across replicas produces the wrong percentile.

## Custom Tracing with ActivitySource

`ActivitySource` creates spans only when a registered listener samples them. Put spans around meaningful boundaries such as a reservation attempt, not every private method.

```csharp
using System.Diagnostics;

public static class Telemetry
{
    public static readonly ActivitySource ActivitySource = new("Checkout.Api");
}

public async Task ReserveInventoryAsync(string sku, int quantity)
{
    using var activity =
        Telemetry.ActivitySource.StartActivity("inventory.reserve");
    activity?.SetTag("inventory.sku", sku);
    activity?.SetTag("inventory.quantity", quantity);

    await inventoryClient.ReserveAsync(sku, quantity);
}
```

Propagate `traceparent` and `tracestate` across HTTP and messaging boundaries. Attach errors to the span that owns the failed operation. Avoid secrets, authentication tokens, request bodies, and unbounded identifiers in tags.

## Structured Logging

Structured logs preserve named fields so operators can filter by service, outcome, and trace ID. A trace ID joins an exact event back to its distributed request without turning that identifier into a metric label.

```csharp
using Serilog;
using Serilog.Formatting.Compact;

builder.Host.UseSerilog((_, config) => config
    .Enrich.FromLogContext()
    .Enrich.WithProperty("service", "checkout-api")
    .WriteTo.Console(new RenderedCompactJsonFormatter()));

app.UseSerilogRequestLogging();

app.MapPost(
    "/checkout",
    (CheckoutRequest request, ILogger<Program> logger) =>
    {
        logger.LogInformation(
            "Checkout started with {ItemCount} items",
            request.Items.Count);

        return Results.Accepted();
    });
```

An emitted event remains machine-queryable:

```json
{
  "@t": "2026-02-28T12:30:45.1234567Z",
  "@i": "f2a8a4c1",
  "@m": "Checkout started with 3 items",
  "ItemCount": 3,
  "service": "checkout-api"
}
```

Redact secrets and regulated fields before export. Retention and access controls belong to the logging pipeline, but the application must avoid emitting data that should never leave the process.

## Decision Rules

- Prefer OTLP when services need one authenticated export path and the platform operates a collector.
- Expose Prometheus directly only when the scraper can reach the service and the exporter lifecycle fits the deployed package versions.
- Add manual spans around domain or dependency boundaries missing from automatic instrumentation.
- Use metrics for bounded aggregates, logs for discrete high-detail events, and traces for causal request paths.
- Define sampling and failure behavior explicitly; telemetry backpressure must not take down the request path.

## References

- [OpenTelemetry for .NET](https://opentelemetry.io/docs/languages/dotnet/) — official language guidance for SDK registration, instrumentation packages, exporters, and deployment models.
- [ASP.NET Core observability with OpenTelemetry](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-prgrja-example) — Microsoft example connecting ASP.NET Core instrumentation, metrics, tracing, and Prometheus.
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) — normative `traceparent` and `tracestate` propagation contract.
- [Prometheus ASP.NET Core exporter](https://github.com/open-telemetry/opentelemetry-dotnet/tree/main/src/OpenTelemetry.Exporter.Prometheus.AspNetCore) — upstream exporter registration, endpoint, package-status, and production guidance.
- [.NET metrics instrumentation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation) — Microsoft guidance for `Meter`, counters, histograms, dimensions, and custom instrumentation.
