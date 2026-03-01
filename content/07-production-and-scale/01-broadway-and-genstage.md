---
title: "Broadway and GenStage"
description: "Build high-throughput, back-pressure-aware event pipelines in Elixir using Broadway and GenStage. Covers producers, processors, batching, acknowledgements, and fault handling."
weight: 1
phase: 7
lesson: 36
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-03-01
prerequisites:
  - "/03-advanced-language/03-genserver"
  - "/03-advanced-language/07-task-and-task-supervisor"
  - "/06-web-and-distributed/05-distribution"
hexdocsLinks:
  - title: "Broadway"
    url: "https://hexdocs.pm/broadway/Broadway.html"
  - title: "GenStage"
    url: "https://hexdocs.pm/gen_stage/GenStage.html"
  - title: "BroadwayRabbitMQ"
    url: "https://hexdocs.pm/broadway_rabbitmq/BroadwayRabbitMQ.html"
tags:
  - broadway
  - genstage
  - event-processing
  - back-pressure
  - batching
keyTakeaways:
  - "Broadway gives structured, supervised event pipelines with built-in back-pressure"
  - "GenStage concepts explain demand flow and throughput behavior"
  - "Batching, acknowledgements, and failure strategy determine operational reliability"
---

Broadway is the standard Elixir tool for building high-throughput event-processing pipelines. It wraps GenStage patterns into a practical abstraction with supervision, concurrency controls, and failure handling.

## Why Broadway Instead of Hand-Rolled Consumers

Broadway gives you:

- bounded demand and back-pressure,
- clear stage boundaries (producer/processor/batcher),
- configurable concurrency per stage,
- acknowledgement and failure hooks.

This removes a large amount of boilerplate that appears in custom queue workers.

## Pipeline Structure

```elixir
defmodule MyApp.InvoicePipeline do
  use Broadway

  alias Broadway.Message

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [module: {BroadwayRabbitMQ.Producer, queue: "invoices"}, concurrency: 1],
      processors: [default: [concurrency: 10]],
      batchers: [db: [concurrency: 4, batch_size: 100, batch_timeout: 1_000]]
    )
  end

  @impl true
  def handle_message(_, %Message{data: payload} = message, _) do
    case decode(payload) do
      {:ok, invoice} -> Message.put_data(message, invoice)
      {:error, reason} -> Message.failed(message, reason)
    end
  end

  @impl true
  def handle_batch(:db, messages, _, _) do
    persist_batch(messages)
    messages
  end
end
```

## Demand and Back-Pressure

GenStage demand flows downstream to upstream. Processors request work only when they can handle it. This prevents unbounded memory growth and gives predictable throughput.

Tune in this order:

1. correctness,
2. stage concurrency,
3. batch size/timeouts,
4. broker and downstream limits.

## Failure and Retry Strategy

Decide explicitly:

- retryable vs non-retryable errors,
- dead-letter behavior,
- idempotency requirements for reprocessing.

Do not assume exactly-once processing. Design for at-least-once delivery and idempotent handlers.

{{% compare %}}
```python
# Celery worker pool
# Concurrency and retries are task-queue managed,
# but back-pressure behavior depends on broker/consumer settings.
```

```javascript
// Node stream/queue consumers
// Often custom: manual concurrency + retry + ack logic.
```

```elixir
# Broadway
# Structured stages + built-in demand/back-pressure + supervision.
```
{{% /compare %}}

## Operational Metrics to Track

- ingest rate,
- processing latency (p50/p95/p99),
- failure rate by reason,
- retries and dead-letter volume,
- consumer lag.

## Exercise

{{< exercise title="Implement a Batching Import Pipeline" >}}
Create a Broadway pipeline that ingests events from a queue and writes to your database:

1. Decode messages and validate schema.
2. Route invalid events to failure reasons with acknowledgements.
3. Batch valid events for efficient inserts.
4. Add retry behavior for transient DB failures.
5. Emit Telemetry for throughput and failure rate.
{{< /exercise >}}

## FAQ and Troubleshooting

### Why is throughput lower after increasing concurrency?
You may be saturating a downstream dependency (DB/API) or creating lock contention. Increase concurrency only after measuring bottlenecks across the full path.

### Why am I seeing duplicate processing?
At-least-once delivery is expected in many queue systems. Ensure handlers are idempotent and retries are safe.

### Should I start with GenStage directly?
Start with Broadway unless you need custom stage behavior beyond its abstraction.
