---
title: "Performance Profiling and Benchmarking"
description: "Measure and optimize Elixir performance with Benchee, profiling tools, and telemetry. Covers CPU/memory hotspots, process-level analysis, and safe optimization workflow."
weight: 8
phase: 7
lesson: 43
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-03-01
prerequisites:
  - "/04-practical-development/05-io-and-files"
  - "/06-web-and-distributed/08-telemetry-and-opentelemetry"
  - "/03-advanced-language/03-genserver"
hexdocsLinks:
  - title: "Benchee"
    url: "https://hexdocs.pm/benchee/readme.html"
  - title: "Erlang :fprof"
    url: "https://www.erlang.org/doc/man/fprof.html"
  - title: "Erlang :eprof"
    url: "https://www.erlang.org/doc/man/eprof.html"
tags:
  - performance
  - benchmarking
  - profiling
  - telemetry
  - optimization
keyTakeaways:
  - "Optimization should follow measurement, never intuition alone"
  - "Benchmarking and profiling answer different questions and should be used together"
  - "Process-level visibility is essential for diagnosing BEAM performance issues"
---

Performance work in Elixir should follow a repeatable loop:

1. measure,
2. identify bottleneck,
3. change one variable,
4. measure again.

Without this loop, optimization often creates complexity without meaningful gains.

## Benchmarking with Benchee

Use Benchee for controlled micro/mid-level comparisons:

```elixir
Benchee.run(%{
  "enum_map" => fn -> Enum.map(1..100_000, &(&1 * 2)) end,
  "for_comp" => fn -> for x <- 1..100_000, do: x * 2 end
})
```

Benchmark tips:

- warm-up sufficiently,
- test realistic input sizes,
- isolate noisy external dependencies.

## Profiling for Hotspots

Profilers answer where time is spent, not just which function is faster in isolation.

Useful tools:

- `:fprof` for call-time analysis,
- `:eprof` for function-level profiling,
- tracing and telemetry for production paths.

## BEAM-Specific Performance Signals

- scheduler utilization imbalance,
- mailbox growth and message queue pressure,
- excessive process churn,
- binary memory retention.

Inspect these before rewriting algorithms prematurely.

## Optimization Priorities

- reduce unnecessary allocations/copies,
- batch expensive IO,
- move repeated computation out of hot loops,
- choose appropriate concurrency boundaries.

{{% compare %}}
```python
# cProfile + pytest-benchmark + tracing stacks
# Similar measurement-first methodology.
```

```javascript
// Node perf hooks + clinic/flame tools
# Similar hotspot and throughput analysis approach.
```

```elixir
# Benchee + BEAM profilers + Telemetry
# Combined offline and runtime profiling for reliable optimization.
```
{{% /compare %}}

## Exercise

{{< exercise title="Profile and Optimize a Real Endpoint" >}}
Choose one slow endpoint/job and run an optimization cycle:

1. Capture baseline latency and throughput.
2. Add telemetry around key operations.
3. Profile to identify top hotspot.
4. Apply one focused optimization.
5. Re-measure and document before/after metrics.
{{< /exercise >}}

## FAQ and Troubleshooting

### Why do microbenchmarks improve but endpoint latency does not?
The real bottleneck may be IO, contention, or downstream services not represented in the microbenchmark.

### How do I avoid over-optimizing?
Set target SLOs first. Stop optimizing when targets are met and complexity costs outweigh gains.

### Should I optimize memory or CPU first?
Optimize the limiting resource observed in production metrics for your actual workload.
