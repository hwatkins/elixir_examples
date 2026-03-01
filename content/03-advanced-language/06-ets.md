---
title: "ETS"
description: "Use ETS (Erlang Term Storage) for fast in-memory reads and concurrent shared state in Elixir. Covers table types, ownership, access modes, and production patterns."
weight: 6
phase: 3
lesson: 32
difficulty: "intermediate"
estimatedMinutes: 30
draft: false
date: 2025-03-01
prerequisites:
  - "/03-advanced-language/03-genserver"
  - "/03-advanced-language/04-supervisors"
hexdocsLinks:
  - title: "ETS (:ets)"
    url: "https://www.erlang.org/doc/man/ets.html"
  - title: "ETS in ElixirSchool"
    url: "https://elixirschool.com/en/lessons/storage/ets"
tags:
  - ets
  - in-memory-storage
  - concurrency
  - caching
  - otp
keyTakeaways:
  - "ETS gives you high-performance shared in-memory storage without centralizing all reads through one process"
  - "Table ownership and supervision matter as much as table schema"
  - "Choosing the right table type and access mode prevents subtle correctness and performance issues"
---

ETS (Erlang Term Storage) is a built-in in-memory store optimized for high-throughput concurrent access. It is one of the most important tools for Elixir applications that need very fast lookups, counters, or caches.

If you have used GenServer state for everything, ETS is often the next step when reads become hot or when many processes need shared access.

## What ETS Is Good For

Use ETS when you need:

- very fast lookups by key,
- shared data across many processes,
- counters or rolling aggregates,
- short-lived caches with predictable invalidation.

Avoid ETS when:

- data must survive restarts or deployments,
- relational queries are required,
- correctness depends on multi-step transactions (use Ecto/DB instead).

{{< callout type="tip" >}}
A good rule: treat ETS as an in-memory acceleration layer, not your source of truth.
{{< /callout >}}

## Creating a Table

```elixir
defmodule MyApp.Cache do
  @table :user_cache

  def start_link(_opts) do
    Task.start_link(fn ->
      :ets.new(@table, [
        :named_table,
        :set,
        :public,
        read_concurrency: true,
        write_concurrency: true
      ])

      Process.sleep(:infinity)
    end)
  end
end
```

Common options:

- `:set`, `:ordered_set`, `:bag`, `:duplicate_bag` table types,
- `:named_table` for global name access,
- `:public`, `:protected`, `:private` access control,
- `read_concurrency` and `write_concurrency` for contention-heavy workloads.

## Core Operations

```elixir
# Insert or replace
:ets.insert(:user_cache, {"u_123", %{name: "Alice", tier: :pro}})

# Lookup always returns a list
case :ets.lookup(:user_cache, "u_123") do
  [{"u_123", user}] -> {:ok, user}
  [] -> :error
end

# Delete by key
:ets.delete(:user_cache, "u_123")

# Atomic counter
:ets.update_counter(:request_counts, "/api/search", 1, {"/api/search", 0})
```

## Ownership and Supervision

Each ETS table has an owner process. If the owner exits, the table disappears.

This is the #1 production pitfall.

A common pattern is to create tables in a dedicated supervised process:

```elixir
defmodule MyApp.ETSTables do
  use GenServer

  def start_link(_opts), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    :ets.new(:user_cache, [:named_table, :set, :protected, read_concurrency: true])
    :ets.new(:request_counts, [:named_table, :set, :public, write_concurrency: true])
    {:ok, %{}}
  end
end
```

This keeps lifecycle explicit and restart behavior predictable.

## ETS + GenServer Pattern

A pragmatic split:

- GenServer handles writes, invalidation, and lifecycle policy.
- ETS handles read-heavy access directly from many callers.

This reduces mailbox pressure on the GenServer while keeping update rules centralized.

{{% compare %}}
```python
# Python dict cache (single-process memory)
cache = {}
cache["u_123"] = {"name": "Alice"}
user = cache.get("u_123")
```

```javascript
// Node.js Map cache (single runtime instance)
const cache = new Map();
cache.set("u_123", { name: "Alice" });
const user = cache.get("u_123");
```

```elixir
# ETS cache (shared across BEAM processes)
:ets.insert(:user_cache, {"u_123", %{name: "Alice"}})
case :ets.lookup(:user_cache, "u_123") do
  [{_, user}] -> user
  [] -> nil
end
```
{{% /compare %}}

## Common Mistakes

- Creating tables in short-lived request processes.
- Using `:public` when writes should be controlled.
- Forgetting eviction/invalidation strategy.
- Storing unbounded data with no memory guardrails.

## Choosing Table Types Quickly

- `:set`: one value per key (most common).
- `:ordered_set`: sorted keys.
- `:bag`: multiple unique values per key.
- `:duplicate_bag`: duplicate values per key.

## Exercise

{{< exercise title="Build a Read-Optimized Profile Cache" >}}
Implement a cache layer for user profiles:

1. Create an ETS table owned by a supervised process.
2. Add `get_profile/1`, `put_profile/2`, and `delete_profile/1` functions.
3. Implement a miss path that fetches from your data source and writes back to ETS.
4. Add a simple TTL strategy by storing `{value, inserted_at}` tuples.
5. Measure lookup latency before and after caching.
{{< /exercise >}}

When done, continue to [Task and Task.Supervisor](/03-advanced-language/07-task-and-task-supervisor/) to run concurrent workloads safely on top of these data patterns.
