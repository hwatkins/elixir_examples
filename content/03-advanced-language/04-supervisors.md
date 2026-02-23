---
title: "Supervisors"
description: "Build fault-tolerant Elixir systems with supervision trees, restart strategies, DynamicSupervisor, and the 'let it crash' philosophy. Essential OTP patterns."
weight: 4
phase: 3
lesson: 14
difficulty: "intermediate"
estimatedMinutes: 30
draft: false
date: 2025-02-23
prerequisites:
  - "/03-advanced-language/03-genserver"
hexdocsLinks:
  - title: "Supervisor"
    url: "https://hexdocs.pm/elixir/Supervisor.html"
  - title: "DynamicSupervisor"
    url: "https://hexdocs.pm/elixir/DynamicSupervisor.html"
  - title: "Supervisor child spec"
    url: "https://hexdocs.pm/elixir/Supervisor.html#module-child-specification"
tags:
  - supervisors
  - otp
  - fault-tolerance
  - supervision-trees
  - let-it-crash
  - restart-strategies
---

In most languages, an unhandled error crashes your application. You write defensive code, wrap everything in try/catch, and hope for the best. Elixir takes a radically different approach: instead of preventing crashes, you **embrace them** and build systems that automatically recover. Supervisors are the mechanism that makes this possible.

## The "Let It Crash" Philosophy

{{< concept title="Let It Crash" >}}
The "let it crash" philosophy does **not** mean you should be careless about errors. It means:

1. **Don't write defensive code for problems you cannot fix.** If a database connection drops, wrapping every call in a rescue and trying to reconnect in-place makes the code complex and fragile.
2. **Let the process crash.** A clean crash is better than a process limping along in a corrupt state.
3. **Have a supervisor restart it.** The fresh process starts with clean state and a new connection. Most transient errors resolve themselves on restart.

This works because BEAM processes are isolated. One crashing process does not corrupt another. And supervisors can restart crashed children within milliseconds.
{{< /concept >}}

## What Is a Supervisor?

A supervisor is a process whose sole job is to monitor its child processes and restart them according to a defined strategy when they crash. Supervisors can supervise other supervisors, forming a **supervision tree** -- a hierarchical structure where failures at any level are contained and recovered from.

## Your First Supervisor

Here is a supervisor that manages the `Counter` and `KVStore` GenServers from the previous lesson:

```elixir
defmodule MyApp.Supervisor do
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      {Counter, 0},
      {KVStore, []}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

When you call `MyApp.Supervisor.start_link(:ok)`, the supervisor starts both `Counter` and `KVStore` as child processes. If either one crashes, the supervisor restarts it automatically.

{{< iex >}}
iex> MyApp.Supervisor.start_link(:ok)
{:ok, #PID<0.200.0>}
iex> Counter.get_count()
0
iex> Counter.increment(10)
:ok
iex> Counter.get_count()
10
iex> Process.exit(Process.whereis(Counter), :kill)
true
iex> Counter.get_count()
0
{{< /iex >}}

Notice that after killing the Counter process, calling `Counter.get_count()` still works -- the supervisor restarted it with a fresh state of `0`.

## Child Specifications

Each child in a supervisor needs a **child specification** -- a map describing how to start the child, what to do if it crashes, and how to shut it down.

```elixir
%{
  id: Counter,               # unique identifier
  start: {Counter, :start_link, [0]},  # {Module, function, args}
  restart: :permanent,       # :permanent | :temporary | :transient
  shutdown: 5000,            # milliseconds to wait for graceful shutdown
  type: :worker              # :worker | :supervisor
}
```

When you `use GenServer`, the module automatically defines a `child_spec/1` function that generates this map. That is why you can write `{Counter, 0}` in the children list -- it calls `Counter.child_spec(0)` under the hood.

| Restart Value | Behavior |
|--------------|----------|
| `:permanent` | Always restart (default). Use for processes that must always be running. |
| `:temporary` | Never restart. Use for one-off tasks. |
| `:transient` | Restart only if the exit reason is abnormal. Use for processes that are expected to finish normally. |

{{< callout type="tip" >}}
You can override the default child spec in your module:

```elixir
defmodule MyTemporaryWorker do
  use GenServer, restart: :temporary

  # Or override child_spec/1 directly:
  def child_spec(arg) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [arg]},
      restart: :temporary
    }
  end
end
```
{{< /callout >}}

## Restart Strategies

The strategy determines how the supervisor responds when a child crashes. This is the key design decision when building a supervision tree.

### :one_for_one

If a child crashes, only that child is restarted. Other children are unaffected.

```
     Supervisor
    /    |    \
  A      B     C    <-- C crashes
    /    |    \
  A      B     C'   <-- only C is restarted
```

Use this when children are independent of each other. This is the most common strategy.

### :one_for_all

If any child crashes, **all** children are terminated and restarted.

```
     Supervisor
    /    |    \
  A      B     C    <-- C crashes
    /    |    \
  A'     B'    C'   <-- all restarted
```

Use this when children depend on each other and cannot function correctly if one of them is in a fresh state.

### :rest_for_one

If a child crashes, that child and all children **started after it** are terminated and restarted. Children started before it are left alone.

```
     Supervisor
    /    |    \
  A      B     C    <-- B crashes
    /    |    \
  A      B'    C'   <-- B and C restarted, A left alone
```

Use this when children have a sequential dependency -- later children depend on earlier ones.

{{% compare %}}
```elixir
# Elixir -- Supervisor with restart strategy
defmodule MyApp.Supervisor do
  use Supervisor

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  def init(_arg) do
    children = [
      {Database, []},
      {Cache, []},
      {WebServer, []}
    ]
    # If Database crashes, restart it, Cache, and WebServer
    Supervisor.init(children, strategy: :rest_for_one)
  end
end
```

```python
# Python -- manual restart logic (no built-in supervision)
import threading, time

def supervised_worker(target, args, restart=True):
    while True:
        t = threading.Thread(target=target, args=args)
        t.start()
        t.join()  # Wait for it to finish/crash
        if not restart:
            break
        print("Worker crashed, restarting...")
        time.sleep(1)  # No equivalent to strategies
```

```go
// Go -- manual goroutine restart (no built-in supervision)
func supervise(work func() error) {
    for {
        err := work()
        if err != nil {
            log.Printf("Worker crashed: %v, restarting...", err)
            time.Sleep(time.Second)
            continue
        }
        break
    }
}
```
{{% /compare %}}

## Supervision Trees

Real applications have multiple layers of supervisors. A top-level supervisor manages subsystem supervisors, which manage individual workers. This creates a tree structure where failures are contained at the appropriate level.

```
            Application Supervisor
           /          |           \
    Database       Cache        Web
    Supervisor     Supervisor   Supervisor
    /     \        /    \       /    \
 Repo    Pool   Store  TTL   Router  Handler
```

Each subsystem supervisor can use a different strategy. If a cache worker crashes, only the cache subsystem deals with it -- the database and web subsystems are completely unaffected.

```elixir
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      MyApp.Database.Supervisor,
      MyApp.Cache.Supervisor,
      MyApp.Web.Supervisor
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: MyApp.Supervisor)
  end
end
```

## Max Restarts and Max Seconds

Supervisors have built-in protection against infinite restart loops. By default, a supervisor allows **3 restarts within 5 seconds**. If a child exceeds this limit, the supervisor itself shuts down (and its parent supervisor handles the failure).

```elixir
Supervisor.init(children,
  strategy: :one_for_one,
  max_restarts: 5,
  max_seconds: 10
)
```

{{< callout type="warning" >}}
If your process keeps crashing immediately after restart, you will hit the max restart limit quickly and bring down the whole supervisor. This is by design -- it prevents a broken process from consuming resources in an infinite crash loop. Fix the root cause rather than increasing the limit.
{{< /callout >}}

## DynamicSupervisor

A regular `Supervisor` starts a fixed list of children at boot time. A `DynamicSupervisor` starts with no children and lets you add them at runtime. This is useful for processes that are created on demand, like user sessions, file upload handlers, or game rooms.

```elixir
defmodule MyApp.SessionSupervisor do
  use DynamicSupervisor

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_session(user_id) do
    spec = {MyApp.Session, user_id}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  def stop_session(pid) do
    DynamicSupervisor.terminate_child(__MODULE__, pid)
  end
end
```

{{< iex >}}
iex> MyApp.SessionSupervisor.start_link(:ok)
{:ok, #PID<0.300.0>}
iex> {:ok, session1} = MyApp.SessionSupervisor.start_session("user_1")
{:ok, #PID<0.301.0>}
iex> {:ok, session2} = MyApp.SessionSupervisor.start_session("user_2")
{:ok, #PID<0.302.0>}
iex> DynamicSupervisor.count_children(MyApp.SessionSupervisor)
%{active: 2, specs: 2, supervisors: 0, workers: 2}
{{< /iex >}}

{{< concept title="Supervisor vs DynamicSupervisor" >}}
| Feature | Supervisor | DynamicSupervisor |
|---------|-----------|-------------------|
| Children defined | At compile/start time | At runtime |
| Strategies | `:one_for_one`, `:one_for_all`, `:rest_for_one` | `:one_for_one` only |
| Use case | Fixed set of known services | Variable number of similar processes |
| Examples | Database pool, cache, web endpoint | User sessions, game rooms, file uploads |
{{< /concept >}}

{{< exercise title="Practice: Build a Supervision Tree" >}}
Design and implement a supervision tree for a chat application with the following components:

1. A `ChatApp.Supervisor` (top-level, `:one_for_one`)
2. A `ChatApp.RoomSupervisor` (DynamicSupervisor for chat rooms)
3. A `ChatApp.Room` (GenServer -- one per room, tracks users and messages)
4. A `ChatApp.Logger` (GenServer -- single process that logs events)

**Requirements:**
- The top-level supervisor should start `ChatApp.Logger` and `ChatApp.RoomSupervisor`
- `ChatApp.RoomSupervisor` should allow creating new rooms dynamically
- `ChatApp.Room` should support `:join`, `:leave`, and `:send_message` operations
- If a room crashes, only that room restarts (other rooms unaffected)
- If the logger crashes, it restarts independently

**Starter code:**

```elixir
defmodule ChatApp.Supervisor do
  use Supervisor

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  def init(_arg) do
    children = [
      ChatApp.Logger,
      {DynamicSupervisor, name: ChatApp.RoomSupervisor, strategy: :one_for_one}
    ]
    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

Fill in the `ChatApp.Room` and `ChatApp.Logger` GenServers, and add a function to create new rooms via the DynamicSupervisor.
{{< /exercise >}}

## Summary

Supervisors are what transform Elixir from a programming language into a platform for building reliable systems. The "let it crash" philosophy, backed by supervision trees, means you spend less time writing defensive error-handling code and more time writing clean, focused business logic. Choose the right restart strategy for each supervisor level, use DynamicSupervisor for processes created at runtime, and structure your tree so that failures are contained at the lowest possible level.
