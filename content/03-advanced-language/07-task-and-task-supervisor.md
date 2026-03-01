---
title: "Task and Task.Supervisor"
description: "Run concurrent work safely with Task and Task.Supervisor. Covers async/await, async_stream, cancellation, timeouts, and supervision-friendly background work."
weight: 7
phase: 3
lesson: 33
difficulty: "intermediate"
estimatedMinutes: 30
draft: false
date: 2025-03-01
prerequisites:
  - "/03-advanced-language/02-processes"
  - "/03-advanced-language/03-genserver"
hexdocsLinks:
  - title: "Task"
    url: "https://hexdocs.pm/elixir/Task.html"
  - title: "Task.Supervisor"
    url: "https://hexdocs.pm/elixir/Task.Supervisor.html"
tags:
  - task
  - task-supervisor
  - concurrency
  - async
  - fault-tolerance
keyTakeaways:
  - "Task is the simplest way to parallelize bounded units of work in Elixir"
  - "Task.Supervisor gives you safer lifecycle control for spawned background tasks"
  - "Timeouts, cancellation, and back-pressure are required for robust async code"
---

`Task` is the standard Elixir abstraction for one-off concurrent work. It is ideal when you want to run a computation in parallel and collect the result.

`Task.Supervisor` is the production companion: it gives explicit ownership, visibility, and safer spawning rules for task processes.

## Task Basics: async + await

```elixir
task = Task.async(fn ->
  expensive_calculation()
end)

result = Task.await(task, 5_000)
```

This pattern is great for a small number of independent calls.

## Running Multiple Tasks with Back-Pressure

For collections, prefer `Task.async_stream/3`:

```elixir
urls
|> Task.async_stream(&fetch_url/1,
  max_concurrency: 10,
  timeout: 3_000,
  on_timeout: :kill_task
)
|> Enum.map(fn
  {:ok, body} -> {:ok, body}
  {:exit, reason} -> {:error, reason}
end)
```

Why this is better than manual spawning:

- concurrency is bounded (`max_concurrency`),
- failure semantics are explicit,
- timeouts are built in.

## Task.Supervisor in Applications

For tasks launched from long-running processes (controllers, GenServers, jobs), use a supervisor:

```elixir
# in your supervision tree
{Task.Supervisor, name: MyApp.TaskSupervisor}

# spawn a supervised task
Task.Supervisor.start_child(MyApp.TaskSupervisor, fn ->
  send_email(user)
end)
```

This avoids coupling task lifecycles to request processes unexpectedly.

## Choosing the Right Tool

Use `Task` when:

- the caller needs a result,
- work is short and bounded,
- failure should propagate to caller.

Use `Task.Supervisor` when:

- you need explicit supervision and ownership,
- work can outlive the immediate caller,
- you want operational visibility into spawned jobs.

## Error Handling and Timeouts

- Always set realistic timeouts.
- Decide whether timeout should fail-fast, retry, or degrade gracefully.
- Normalize `{:ok, value}` and `{:error, reason}` output for callers.

```elixir
def safe_fetch(id) do
  task = Task.async(fn -> fetch_remote(id) end)

  try do
    {:ok, Task.await(task, 2_000)}
  catch
    :exit, {:timeout, _} ->
      Task.shutdown(task, :brutal_kill)
      {:error, :timeout}
  end
end
```

{{% compare %}}
```python
# Python asyncio.gather
results = await asyncio.gather(
    fetch_user(id1),
    fetch_user(id2),
    return_exceptions=True,
)
```

```javascript
// JavaScript Promise.allSettled
const results = await Promise.allSettled([
  fetchUser(id1),
  fetchUser(id2),
]);
```

```elixir
# Elixir Task.async_stream
ids
|> Task.async_stream(&fetch_user/1, max_concurrency: 8, timeout: 2_000)
|> Enum.to_list()
```
{{% /compare %}}

## Common Mistakes

- Spawning unbounded tasks from large collections.
- Forgetting timeout and cancellation paths.
- Using fire-and-forget tasks for critical writes without retries or monitoring.

## Exercise

{{< exercise title="Parallel API Aggregator" >}}
Create a module that queries three external endpoints concurrently and returns a merged response:

1. Use `Task.async_stream/3` with `max_concurrency` and timeout.
2. Convert partial failures into structured errors instead of crashing.
3. Add a fallback for timed-out endpoints.
4. Move background refresh work into `Task.Supervisor.start_child/2`.
5. Add tests that simulate timeout and crash behavior.
{{< /exercise >}}

With `Task` patterns in place, you are ready for production workflow topics in [Practical Development](/04-practical-development/).
