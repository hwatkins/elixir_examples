---
title: "Telemetry and OpenTelemetry"
description: "Instrument Elixir applications with Telemetry and OpenTelemetry for metrics, traces, and production diagnostics. Covers event design, handlers, and trace propagation."
weight: 8
phase: 6
lesson: 35
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-03-01
prerequisites:
  - "/06-web-and-distributed/01-phoenix"
  - "/03-advanced-language/03-genserver"
  - "/06-web-and-distributed/06-deployment"
hexdocsLinks:
  - title: "Telemetry"
    url: "https://hexdocs.pm/telemetry/telemetry.html"
  - title: "OpenTelemetry Erlang/Elixir"
    url: "https://opentelemetry.io/docs/languages/erlang/"
  - title: "Telemetry Metrics"
    url: "https://hexdocs.pm/telemetry_metrics/telemetry_metrics.html"
tags:
  - telemetry
  - opentelemetry
  - observability
  - tracing
  - monitoring
keyTakeaways:
  - "Telemetry events make system behavior observable without coupling business logic to monitoring tools"
  - "OpenTelemetry traces let you follow requests across process and service boundaries"
  - "Good observability starts with event design, naming consistency, and actionable signals"
---

Observability is not optional in production systems. Without it, debugging becomes guesswork.

In Elixir, observability usually starts with **Telemetry** events and extends to **OpenTelemetry** for distributed tracing.

## Telemetry Basics

Telemetry emits events as:

- event name (list of atoms),
- measurements (numeric values),
- metadata (context about the event).

```elixir
:telemetry.execute(
  [:my_app, :checkout, :completed],
  %{duration_ms: 128},
  %{user_id: user.id, cart_size: 4}
)
```

A handler subscribes and processes these events:

```elixir
:telemetry.attach(
  "checkout-metrics",
  [:my_app, :checkout, :completed],
  fn _event, measurements, metadata, _config ->
    Logger.info("checkout completed in #{measurements.duration_ms}ms for user #{metadata.user_id}")
  end,
  nil
)
```

## Designing Useful Events

Prefer stable naming and semantic consistency.

Good patterns:

- `[:my_app, :http, :request, :stop]`
- `[:my_app, :repo, :query, :stop]`
- `[:my_app, :job, :run, :exception]`

Include metadata that answers operational questions quickly (tenant, endpoint, job name, retry count).

## From Telemetry to Metrics

Metrics backends aggregate events into dashboards and alerts.

Examples:

- request latency percentiles,
- error rate by endpoint,
- queue depth and worker utilization,
- DB query durations.

Avoid metric spam. Track signals you can act on.

## OpenTelemetry Tracing

OpenTelemetry adds request-level traces and spans so you can follow work across boundaries.

Typical flow:

1. inbound request creates/continues a trace,
2. internal spans capture DB calls, jobs, external API calls,
3. exporter sends data to a backend (e.g., Honeycomb, Tempo, Datadog).

This makes high-latency paths and cascade failures visible.

## Propagation Matters

For distributed systems, trace context must be propagated:

- HTTP headers between services,
- message metadata in queues/pubsub,
- background task boundaries.

If context is dropped, traces become fragmented and hard to debug.

{{% compare %}}
```python
# Python ecosystem
# OpenTelemetry SDK + framework middleware instrumentation.
# Similar concepts: spans, context propagation, exporters.
```

```javascript
// Node.js ecosystem
// OpenTelemetry auto/manual instrumentation with context propagation.
// Similar challenge: keeping trace context across async boundaries.
```

```elixir
# Elixir ecosystem
# Telemetry for events + OpenTelemetry for traces.
# Strong fit with BEAM process boundaries when propagation is explicit.
```
{{% /compare %}}

## Common Mistakes

- Instrumenting everything with no clear signal strategy.
- Logging high-cardinality values directly into metric labels.
- Forgetting trace context propagation in background jobs.
- Alerting on raw noise instead of service-level indicators.

## Exercise

{{< exercise title="Instrument a Phoenix Endpoint End-to-End" >}}
Instrument one endpoint in your app:

1. Emit Telemetry events for request start/stop and business operation success/failure.
2. Add a custom measurement for domain latency (for example, checkout processing time).
3. Attach a handler that logs structured data for failures.
4. Create an OpenTelemetry span around an external API call.
5. Verify trace continuity across the request and background task boundary.
{{< /exercise >}}

## FAQ and Troubleshooting

### I added events, but nothing appears in dashboards. Why?
Usually handlers or exporters were not attached in the running environment. Confirm startup wiring, check event names exactly, and ensure your telemetry backend credentials/config are loaded at runtime.

### Why are my traces split into separate fragments?
Trace context was likely not propagated between boundaries (HTTP client calls, jobs, pubsub messages). Add explicit context injection/extraction at every boundary.

### What should I instrument first in a new service?
Start with request latency, error rate, and dependency timings (DB/external API). Add business-domain events next. Resist broad instrumentation until these core signals are stable and useful.
