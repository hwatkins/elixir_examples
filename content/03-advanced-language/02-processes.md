---
title: "Processes"
description: "Understand Elixir's lightweight BEAM processes -- spawning, message passing, process linking, monitoring, and the foundations of concurrency in the Erlang VM."
weight: 2
phase: 3
lesson: 12
difficulty: "intermediate"
estimatedMinutes: 30
draft: false
date: 2025-02-23
prerequisites:
  - "/03-advanced-language/01-recursion"
hexdocsLinks:
  - title: "Processes"
    url: "https://hexdocs.pm/elixir/processes.html"
  - title: "Process module"
    url: "https://hexdocs.pm/elixir/Process.html"
  - title: "Kernel.spawn/1"
    url: "https://hexdocs.pm/elixir/Kernel.html#spawn/1"
tags:
  - processes
  - concurrency
  - message-passing
  - beam
  - spawn
  - send
  - receive
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Processes are the core concurrency primitive in Elixir. Everything runs inside a process -- your IEx session, every GenServer, every Phoenix request handler. Unlike operating system threads or processes, BEAM processes are extraordinarily lightweight: you can run hundreds of thousands of them simultaneously on a single machine, each with its own isolated memory and garbage collection.

## What Is a Process?

{{< concept title="BEAM Processes" >}}
A BEAM process is **not** an OS process or thread. It is a lightweight unit of execution managed entirely by the BEAM virtual machine's scheduler. Key properties:

- **Isolated memory** -- each process has its own heap and stack. There is no shared mutable state.
- **Lightweight** -- a new process starts with only a few kilobytes of memory.
- **Preemptively scheduled** -- the BEAM scheduler gives each process a fair share of CPU time based on reduction counts.
- **Massive scale** -- a single BEAM instance can run millions of processes.
- **Communication via messages** -- processes interact exclusively by sending and receiving messages.
{{< /concept >}}

## Spawning Processes

The simplest way to create a process is with `spawn/1`, which takes a zero-arity function and runs it in a new process:

```elixir
spawn(fn ->
  IO.puts("Hello from process #{inspect(self())}")
end)
```

The `spawn` function returns a **PID** (process identifier) immediately. The spawned process runs concurrently -- the calling process does not wait for it to finish.

{{< iex >}}
iex> pid = spawn(fn -> IO.puts("Hello from a new process!") end)
Hello from a new process!
#PID<0.123.0>
iex> self()
#PID<0.110.0>
iex> Process.alive?(pid)
false
{{< /iex >}}

Notice that after the spawned function completes, the process is dead. Processes are ephemeral by default -- they exist only as long as their function is running.

You can also use `spawn/3` to call a specific module, function, and arguments:

```elixir
spawn(IO, :puts, ["Hello from spawn/3"])
```

## The Process Mailbox and Message Passing

Processes communicate by sending messages with `send/2` and receiving them with `receive`:

```elixir
# Send a message to a process
send(pid, {:greet, "Hello!"})

# Receive a message in the current process
receive do
  {:greet, msg} -> IO.puts("Got greeting: #{msg}")
  {:error, reason} -> IO.puts("Error: #{reason}")
after
  5000 -> IO.puts("No message received within 5 seconds")
end
```

Every process has a **mailbox** -- a queue of messages that have been sent to it but not yet read. The `receive` block pattern-matches against messages in the mailbox in order. If no message matches, the process waits (blocks) until a matching message arrives or the `after` timeout expires.

{{< callout type="note" >}}
Messages are copied between processes, not shared. This is what makes BEAM concurrency safe -- there is no possibility of data races on shared memory. The tradeoff is the cost of copying, but the BEAM optimizes this heavily (large binaries, for example, are reference-counted and shared).
{{< /callout >}}

{{< iex >}}
iex> send(self(), {:hello, "world"})
{:hello, "world"}
iex> receive do
...>   {:hello, name} -> "Got: #{name}"
...> end
"Got: world"
{{< /iex >}}

## Building a Stateful Process with Recursion

Because processes have isolated memory and a mailbox, you can combine message passing with recursion to create long-running stateful processes:

```elixir
defmodule Counter do
  def start(initial_count \\ 0) do
    spawn(fn -> loop(initial_count) end)
  end

  defp loop(count) do
    receive do
      {:increment, amount} ->
        loop(count + amount)

      {:get, caller} ->
        send(caller, {:count, count})
        loop(count)

      :stop ->
        IO.puts("Counter stopped at #{count}")
        # Not calling loop/1 -- the process exits
    end
  end
end
```

{{< iex >}}
iex> pid = Counter.start(0)
#PID<0.150.0>
iex> send(pid, {:increment, 5})
{:increment, 5}
iex> send(pid, {:increment, 3})
{:increment, 3}
iex> send(pid, {:get, self()})
{:get, #PID<0.110.0>}
iex> receive do
...>   {:count, n} -> n
...> end
8
iex> send(pid, :stop)
Counter stopped at 8
:stop
{{< /iex >}}

This is the fundamental pattern behind GenServer (which we will cover in the next lesson). The recursive `loop` function keeps the process alive, the mailbox queues incoming requests, and the function arguments carry the state.

## self() and Process Identification

The `self/0` function returns the PID of the current process. PIDs are how you address messages. You can also register a process under an atom name to make it globally addressable:

```elixir
pid = Counter.start(0)
Process.register(pid, :my_counter)
send(:my_counter, {:increment, 10})
```

{{< callout type="warning" >}}
Registered names must be atoms, and only one process can hold a given name at a time. If the process dies, the name is automatically unregistered. Attempting to register a name that is already taken raises an error.
{{< /callout >}}

## Links and Monitors

When one process depends on another, you need to know if it crashes. Elixir provides two mechanisms for this:

### Links

A **link** is a bidirectional connection between two processes. If either linked process crashes, the other crashes too (unless it traps exits).

```elixir
# spawn_link creates a new process and links it to the caller
pid = spawn_link(fn ->
  raise "something went wrong"
end)
# The current process will also crash!
```

Links propagate failures. This is a deliberate design choice -- it is better to crash related processes than to leave them in an inconsistent state.

### Monitors

A **monitor** is a unidirectional observation. The monitoring process receives a `:DOWN` message when the monitored process exits, but is not killed itself.

```elixir
pid = spawn(fn ->
  Process.sleep(1000)
  exit(:normal)
end)

ref = Process.monitor(pid)

receive do
  {:DOWN, ^ref, :process, ^pid, reason} ->
    IO.puts("Process exited with reason: #{inspect(reason)}")
end
```

{{< concept title="Links vs Monitors" >}}
| Feature | Link | Monitor |
|---------|------|---------|
| Direction | Bidirectional | Unidirectional |
| On crash | Both processes crash | Monitoring process gets `:DOWN` message |
| Setup | `Process.link/1` or `spawn_link/1` | `Process.monitor/1` or `spawn_monitor/1` |
| Use case | Tightly coupled processes that should fail together | Observing a process without coupling your fate to it |

Use **links** when processes are part of the same logical unit of work. Use **monitors** when you need to react to a process dying without dying yourself.
{{< /concept >}}

## The Process Module

The `Process` module provides utilities for working with processes:

```elixir
# Get info about a process
Process.info(self())

# Sleep the current process (useful for demos, not production)
Process.sleep(1000)

# Set a flag to trap exits (turns exit signals into messages)
Process.flag(:trap_exit, true)

# Send a message after a delay
Process.send_after(self(), :timeout, 5000)

# Check if a process is alive
Process.alive?(pid)
```

{{% compare %}}
```elixir
# Elixir -- lightweight process with message passing
pid = spawn(fn ->
  receive do
    {:work, data} -> IO.puts("Processing: #{data}")
  end
end)
send(pid, {:work, "hello"})
```

```python
# Python -- threading with shared state (requires locks)
import threading

def worker(data):
    print(f"Processing: {data}")

t = threading.Thread(target=worker, args=("hello",))
t.start()
t.join()
```

```go
// Go -- goroutine with channel
func main() {
    ch := make(chan string)
    go func() {
        data := <-ch
        fmt.Println("Processing:", data)
    }()
    ch <- "hello"
}
```
{{% /compare %}}

## Process Gotchas

There are a few things to watch out for when working with processes directly:

1. **Unmatched messages stay in the mailbox forever.** If you send a message that no `receive` clause matches, it sits in the mailbox consuming memory. Over time, a growing mailbox degrades performance.

2. **Processes that finish their function just exit.** If you want a process to stay alive, it must call itself recursively (as in the Counter example).

3. **`receive` blocks the process.** A process sitting in `receive` consumes almost zero CPU, but it will not do anything else until a message arrives or the timeout triggers.

{{< exercise title="Practice: Ping-Pong Processes" >}}
Create two processes that play ping-pong with each other. Process A sends `{:ping, self()}` to Process B, which replies with `{:pong, self()}`. They should bounce messages back and forth a specified number of times, then stop.

**Starter code:**

```elixir
defmodule PingPong do
  def start(n) do
    pong_pid = spawn(fn -> pong_loop(n) end)
    spawn(fn -> ping_loop(pong_pid, n) end)
  end

  defp ping_loop(_pong_pid, 0), do: IO.puts("Ping done!")
  defp ping_loop(pong_pid, remaining) do
    send(pong_pid, {:ping, self()})
    receive do
      {:pong, _from} ->
        IO.puts("Got pong! #{remaining - 1} remaining")
        ping_loop(pong_pid, remaining - 1)
    end
  end

  # Implement pong_loop/1 -- it should receive :ping messages,
  # print "Got ping!", send :pong back, and recurse.
end
```

**Bonus:** Add a timeout to the `receive` blocks so neither process hangs forever if the other crashes.
{{< /exercise >}}

## Summary

Processes are the building block of everything concurrent in Elixir. They are lightweight, isolated, and communicate exclusively through message passing. The pattern of a recursive function with `receive` is how you build long-running, stateful services -- and it is exactly the pattern that GenServer abstracts for you. Links and monitors give you tools to detect and respond to failures, laying the groundwork for the supervision strategies covered later in this phase.
