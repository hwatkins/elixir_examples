---
title: "AI Observability, Cost, and Runtime Ops"
description: "Run AI features with telemetry, budget controls, latency SLOs, and production incident runbooks."
weight: 7
phase: 8
lesson: 50
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2026-03-01
prerequisites:
  - "/06-web-and-distributed/08-telemetry-and-opentelemetry"
  - "/06-web-and-distributed/06-deployment"
  - "/07-production-and-scale/05-release-engineering-and-runtime-ops"
hexdocsLinks:
  - title: "Telemetry"
    url: "https://hexdocs.pm/telemetry/readme.html"
  - title: "OpenTelemetry Erlang/Elixir"
    url: "https://opentelemetry.io/docs/languages/erlang/"
  - title: "Oban"
    url: "https://hexdocs.pm/oban/Oban.html"
tags:
  - ai
  - observability
  - cost
  - operations
  - telemetry
  - production
keyTakeaways:
  - "AI operations require metrics for quality, latency, error rate, and spend"
  - "Budget and rate controls must exist at request, tenant, and system levels"
  - "Runbooks and alert thresholds should be defined before incident day"
---

Shipping an AI feature is only the beginning. Reliability and cost can degrade quickly without explicit operational controls.

## Operational Objectives

Define target outcomes before launch:

- p95 response latency target,
- error-rate threshold,
- daily and monthly spend limits,
- quality floor for key workflows,
- incident recovery objectives.

If these are undefined, incident decisions become inconsistent.

## Telemetry Event Model

Emit events at each workflow boundary.

Suggested events:

- `[:my_app, :ai, :request, :start]`
- `[:my_app, :ai, :request, :stop]`
- `[:my_app, :ai, :request, :exception]`
- `[:my_app, :ai, :fallback, :activated]`

Example event emission:

```elixir
defmodule MyApp.AI.Instrumentation do
  def emit_stop(duration_ms, attrs) do
    :telemetry.execute(
      [:my_app, :ai, :request, :stop],
      %{
        duration_ms: duration_ms,
        tokens_in: attrs.tokens_in,
        tokens_out: attrs.tokens_out,
        cost_usd: attrs.cost_usd
      },
      %{
        provider: attrs.provider,
        model: attrs.model,
        tenant_id: attrs.tenant_id,
        status: attrs.status
      }
    )
  end
end
```

## Minimal Dashboard Set

At launch, provide dashboards for:

- request rate by feature and tenant,
- p50/p95/p99 latency,
- provider success vs failure rates,
- spend per model and tenant,
- fallback activation trend,
- queue depth and retry rate.

Without these views, on-call response is guesswork.

## Cost Controls

Apply controls at three levels.

### Request-Level Controls

- max token limits,
- strict timeout budgets,
- early-cancel on user disconnect.

### Tenant-Level Controls

- daily spend caps,
- rate limits,
- degraded mode policy when budget exhausted.

### System-Level Controls

- global circuit breaker,
- provider failover rules,
- queue throttling during spikes.

## Runtime Guardrail Example

```elixir
defmodule MyApp.AI.BudgetGuard do
  @daily_limit_usd 250.0

  def allow_request?(tenant_id, estimated_cost) do
    spent_today = MyApp.Billing.daily_ai_spend(tenant_id)
    spent_today + estimated_cost <= @daily_limit_usd
  end
end
```

Reject or degrade requests that exceed limits:

```elixir
case MyApp.AI.BudgetGuard.allow_request?(tenant_id, estimate) do
  true -> MyApp.AI.ChatService.generate(request)
  false -> {:error, :budget_exceeded}
end
```

## Queue and Backpressure for AI Workloads

AI workflows can spike unexpectedly. Use queue isolation.

Recommended queues:

- `:ai_realtime` for user-visible work,
- `:ai_batch` for offline processing,
- `:ai_backfill` for non-urgent operations.

Throttle lower-priority queues when system pressure rises.

## Alerting Strategy

Create actionable alerts only.

Starter alerts:

1. p95 latency above threshold for 10 minutes,
2. provider error rate above threshold for 5 minutes,
3. fallback activation above baseline for 15 minutes,
4. daily spend crossing 70%, 85%, and 100% thresholds,
5. queue retry rate spike above baseline.

Each alert must link to a runbook section.

{{< callout type="important" >}}
Alerts without runbook links increase mean time to recovery because responders must invent process during an incident.
{{< /callout >}}

## Incident Runbook Template

For each AI incident type, define:

1. detection signal,
2. immediate containment actions,
3. mitigation steps,
4. validation checks,
5. communication plan,
6. post-incident follow-up tasks.

### Provider Outage Example

Immediate actions:

- activate fallback provider route,
- reduce non-critical queue concurrency,
- enable degraded response mode,
- publish status update to affected tenants.

Validation checks:

- error rate recovery,
- latency stabilization,
- budget impact from fallback provider.

## Operational Review Cadence

Run a weekly operations review:

- error and latency trends,
- spend by feature and tenant,
- top retries and failures,
- incident follow-up status,
- guardrail tuning decisions.

This prevents slow drift in reliability and cost.

## Exercise

{{< exercise title="Implement AI Operations Baseline" >}}
For one AI feature, deliver:

1. telemetry event schema,
2. dashboard with six core charts,
3. budget guard at tenant level,
4. three runbook-driven alerts,
5. provider outage playbook and drill results.

Treat this as done only when on-call responders can execute without extra context.
{{< /exercise >}}

## Summary

AI operations should be run like any critical production surface: instrument first, define limits, enforce guardrails, and maintain runbooks that responders can execute quickly under pressure.

## FAQ and Troubleshooting

### If I can only build one dashboard first, what should it include?
Start with latency percentiles, error rate, fallback activation, and spend trend by provider/model. These four signals usually drive first-response decisions.

### My alerts are noisy. What should I tune first?
Tune thresholds using baseline traffic windows, add alert suppression for known maintenance, and route lower-severity signals to review queues instead of paging.
