---
title: "Oban and Reliable Background Jobs"
description: "Use Oban for durable background jobs in Elixir. Covers retries, scheduling, uniqueness, workflows, idempotency, and operational monitoring."
weight: 2
phase: 7
lesson: 37
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-03-01
prerequisites:
  - "/04-practical-development/02-testing"
  - "/06-web-and-distributed/03-ecto"
  - "/06-web-and-distributed/06-deployment"
hexdocsLinks:
  - title: "Oban"
    url: "https://hexdocs.pm/oban/Oban.html"
  - title: "Oban Workers"
    url: "https://hexdocs.pm/oban/Oban.Worker.html"
  - title: "Oban Testing"
    url: "https://hexdocs.pm/oban/testing.html"
tags:
  - production-clinic
  - clinic-oban-ops
  - oban
  - background-jobs
  - retries
  - idempotency
  - reliability
keyTakeaways:
  - "Oban provides durable, database-backed background processing with predictable retry behavior"
  - "Idempotent worker design is required for correctness under retries"
  - "Queues, uniqueness, and scheduling settings are core operational controls"
---

Oban is the de facto background job system for Elixir applications that need reliability and operational visibility. It stores jobs in PostgreSQL and executes them with supervised workers.

## Core Worker Example

```elixir
defmodule MyApp.Workers.SendReceipt do
  use Oban.Worker, queue: :mailers, max_attempts: 10

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"order_id" => order_id}}) do
    with {:ok, order} <- Orders.fetch(order_id),
         :ok <- Mailer.send_receipt(order) do
      :ok
    else
      {:error, :not_found} -> :discard
      {:error, reason} -> {:error, reason}
    end
  end
end
```

Key return values:

- `:ok` completed,
- `{:error, reason}` retry,
- `:discard` non-retryable,
- `{:snooze, seconds}` reschedule.

## Enqueueing Jobs

```elixir
%{"order_id" => order.id}
|> MyApp.Workers.SendReceipt.new(unique: [period: 300, keys: [:order_id]])
|> Oban.insert()
```

`unique` prevents duplicate inserts for the same logical task in a time window.

## Idempotency First

Jobs must be safe to run more than once.

Practical strategies:

- use unique constraints for side effects,
- store external provider ids/status,
- make worker operations state-aware (`already_sent` checks).

## Queue and Retry Design

Split workloads by behavior:

- `:default` for normal jobs,
- `:mailers` for external providers,
- `:critical` for time-sensitive jobs,
- `:low` for backfill tasks.

Tune:

- queue concurrency,
- retry backoff,
- max attempts,
- dead/failed job handling policies.

{{% compare %}}
```python
# Celery
# Broker + worker model, often Redis/RabbitMQ-backed.
# Reliability depends on broker durability and task design.
```

```javascript
// BullMQ / Agenda
// Queue libraries with retries and scheduling,
// usually Redis-backed.
```

```elixir
# Oban
# PostgreSQL-backed durability + Ecto integration + rich job controls.
```
{{% /compare %}}

## Testing Workers

Use Oban test helpers to assert inserts and execution behavior.

Test both:

- happy path side effects,
- retries/discards for known failure classes.

## Exercise

{{< exercise title="Build a Resilient Email Job Flow" >}}
Implement a worker flow for transactional emails:

1. Enqueue with uniqueness by recipient and template.
2. Handle transient provider failures with retries.
3. Discard permanent failures (invalid address).
4. Record delivery attempts and final status in DB.
5. Add tests for success, retry, and discard cases.
{{< /exercise >}}

## Production Clinic: Oban Operations

Oban problems in production are usually queue-shape and idempotency design issues.

Common failure modes:

- queue starvation where low-priority jobs block high-priority work,
- non-idempotent workers causing duplicate side effects during retries,
- retry storms after downstream provider outages,
- missing visibility into failed/snoozed job trends.

Decision checklist:

1. Are queues split by SLA and failure profile (`critical`, `default`, `backfill`)?
2. Do workers guarantee idempotency for all external side effects?
3. Are retry backoff and max-attempt settings tuned by error class?
4. Is there an explicit policy for dead/failed job replay?
5. Are queue depth, retry rate, and failure rate visible in dashboards/alerts?

Runbook snippet:

1. Check queue depth by queue and state (`available`, `scheduled`, `retryable`).
2. Identify top failing workers and classify transient vs permanent failures.
3. Throttle or pause non-critical queues during incident containment.
4. Apply provider fallback/degraded mode and watch retry drain behavior.
5. Replay dead jobs only after idempotency safeguards are validated.

## FAQ and Troubleshooting

### Why are jobs stuck in `available` or `scheduled`?
Check queue configuration, plugin startup, and node clock synchronization. Misconfigured queues or disabled execution environment are common causes.

### Why do duplicate emails still occur?
Uniqueness windows only prevent duplicate inserts within configured constraints. You still need idempotent worker logic for retries and out-of-band replays.

### When should I split into multiple queues?
Split when workloads have different latency, retry, or resource profiles.
