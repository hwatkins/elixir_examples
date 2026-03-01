---
title: "GenServer"
description: "Learn Elixir's GenServer behaviour -- the OTP workhorse for building stateful, concurrent server processes. Covers callbacks, handle_call, handle_cast, and state management."
weight: 3
phase: 3
lesson: 13
difficulty: "intermediate"
estimatedMinutes: 35
draft: false
date: 2025-02-23
prerequisites:
  - "/03-advanced-language/02-processes"
hexdocsLinks:
  - title: "GenServer"
    url: "https://hexdocs.pm/elixir/GenServer.html"
  - title: "GenServer behaviour"
    url: "https://hexdocs.pm/elixir/GenServer.html#module-how-to-supervise"
tags:
  - genserver
  - otp
  - processes
  - state-management
  - callbacks
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

In the previous lesson, you built a stateful process by hand using `spawn`, `receive`, and recursion. That pattern works, but it requires you to handle a lot of boilerplate: the receive loop, timeouts, process registration, and error handling. **GenServer** (Generic Server) is an OTP behaviour that extracts all of that boilerplate into a battle-tested framework, letting you focus on the logic that matters.

## What Is a GenServer?

{{< concept title="The GenServer Behaviour" >}}
A **behaviour** in Elixir is similar to an interface or trait in other languages. It defines a set of callback functions that your module must implement. The `GenServer` behaviour provides:

- A managed receive loop that runs forever (until told to stop)
- Synchronous requests (**calls**) where the caller waits for a reply
- Asynchronous requests (**casts**) where the caller does not wait
- Handling of arbitrary messages (**info**)
- Built-in support for timeouts, hibernation, and code upgrades
- Integration with supervisors for fault tolerance

You implement the callbacks; GenServer handles the process lifecycle.
{{< /concept >}}

## Your First GenServer

Let's rebuild the Counter from the processes lesson as a GenServer:

```elixir
defmodule Counter do
  use GenServer

  # --- Client API ---

  def start_link(initial_count \\ 0) do
    GenServer.start_link(__MODULE__, initial_count, name: __MODULE__)
  end

  def increment(amount \\ 1) do
    GenServer.cast(__MODULE__, {:increment, amount})
  end

  def get_count do
    GenServer.call(__MODULE__, :get_count)
  end

  # --- Server Callbacks ---

  @impl true
  def init(initial_count) do
    {:ok, initial_count}
  end

  @impl true
  def handle_cast({:increment, amount}, count) do
    {:noreply, count + amount}
  end

  @impl true
  def handle_call(:get_count, _from, count) do
    {:reply, count, count}
  end
end
```

{{< iex >}}
iex> Counter.start_link(0)
{:ok, #PID<0.150.0>}
iex> Counter.increment(5)
:ok
iex> Counter.increment(3)
:ok
iex> Counter.get_count()
8
{{< /iex >}}

Compare this to the manual process version -- no explicit receive loop, no manual message sending, no worrying about the recursive call. GenServer handles all of that.

## The Callbacks in Detail

### init/1

Called when the GenServer starts. Receives the argument passed to `GenServer.start_link/3` and must return the initial state.

```elixir
@impl true
def init(args) do
  # Perform any setup here
  {:ok, initial_state}

  # Other valid returns:
  # {:ok, state, timeout}       -- sets a timeout
  # {:ok, state, :hibernate}    -- hibernates to save memory
  # {:stop, reason}             -- stops immediately
  # :ignore                     -- don't start
end
```

{{< callout type="important" >}}
The `init/1` callback runs in the new GenServer process, but the calling process (the one that called `start_link`) **blocks** until `init/1` returns. If `init/1` takes a long time (e.g., connecting to a database), it will block the caller -- including a supervisor starting up your application. For expensive initialization, return `{:ok, state}` quickly and send yourself a message to do the work asynchronously:

```elixir
def init(args) do
  send(self(), :do_expensive_setup)
  {:ok, %{status: :initializing}}
end

def handle_info(:do_expensive_setup, state) do
  # expensive work here
  {:noreply, %{state | status: :ready}}
end
```
{{< /callout >}}

### handle_call/3 -- Synchronous Requests

Used when the caller needs a response. The caller blocks until the GenServer replies.

```elixir
@impl true
def handle_call(:get_count, _from, count) do
  {:reply, count, count}
  #  ^reply  ^value  ^new_state
end
```

The `from` argument is a tuple `{pid, ref}` identifying the caller. You rarely need it directly because the `:reply` tuple sends the response automatically. However, you can use `GenServer.reply/2` to respond later:

```elixir
@impl true
def handle_call(:slow_operation, from, state) do
  # Respond later from another process or handle_info
  spawn(fn ->
    result = do_expensive_work()
    GenServer.reply(from, result)
  end)
  {:noreply, state}
end
```

### handle_cast/2 -- Asynchronous Requests

Used for fire-and-forget operations. The caller sends a message and moves on immediately.

```elixir
@impl true
def handle_cast({:increment, amount}, count) do
  {:noreply, count + amount}
end
```

{{< callout type="tip" >}}
**When to use call vs cast:** Use `call` when the caller needs a result or needs to know the operation succeeded. Use `cast` for operations where the caller does not need confirmation. When in doubt, prefer `call` -- it provides back-pressure (the caller slows down if the server is overloaded) and makes errors visible.
{{< /callout >}}

### handle_info/2 -- All Other Messages

Handles messages that are not sent through `GenServer.call` or `GenServer.cast`. This includes messages from `send/2`, `:DOWN` messages from monitors, timer messages from `Process.send_after`, and anything else that lands in the mailbox.

```elixir
@impl true
def handle_info(:periodic_cleanup, state) do
  new_state = cleanup(state)
  # Schedule the next cleanup
  Process.send_after(self(), :periodic_cleanup, 60_000)
  {:noreply, new_state}
end

@impl true
def handle_info({:DOWN, _ref, :process, pid, reason}, state) do
  IO.puts("Monitored process #{inspect(pid)} died: #{inspect(reason)}")
  {:noreply, remove_from_state(state, pid)}
end
```

## A Complete Example: Key-Value Store

Here is a more realistic GenServer -- a simple in-memory key-value store:

```elixir
defmodule KVStore do
  use GenServer

  # --- Client API ---

  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, %{}, name: name)
  end

  def put(server \\ __MODULE__, key, value) do
    GenServer.call(server, {:put, key, value})
  end

  def get(server \\ __MODULE__, key) do
    GenServer.call(server, {:get, key})
  end

  def delete(server \\ __MODULE__, key) do
    GenServer.cast(server, {:delete, key})
  end

  def keys(server \\ __MODULE__) do
    GenServer.call(server, :keys)
  end

  # --- Server Callbacks ---

  @impl true
  def init(initial_state) do
    {:ok, initial_state}
  end

  @impl true
  def handle_call({:put, key, value}, _from, state) do
    new_state = Map.put(state, key, value)
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call({:get, key}, _from, state) do
    {:reply, Map.get(state, key), state}
  end

  @impl true
  def handle_call(:keys, _from, state) do
    {:reply, Map.keys(state), state}
  end

  @impl true
  def handle_cast({:delete, key}, state) do
    {:noreply, Map.delete(state, key)}
  end
end
```

{{< iex >}}
iex> KVStore.start_link()
{:ok, #PID<0.200.0>}
iex> KVStore.put(:name, "Elixir")
:ok
iex> KVStore.put(:version, "1.16")
:ok
iex> KVStore.get(:name)
"Elixir"
iex> KVStore.keys()
[:name, :version]
iex> KVStore.delete(:version)
:ok
iex> KVStore.keys()
[:name]
{{< /iex >}}

## Client API vs Server Callbacks

A well-structured GenServer separates the **client API** (public functions that other modules call) from the **server callbacks** (functions that run inside the GenServer process).

{{% compare %}}
```elixir
# Elixir -- GenServer with client/server separation
defmodule Cache do
  use GenServer

  # Client API (runs in the caller's process)
  def get(key), do: GenServer.call(__MODULE__, {:get, key})
  def put(key, val), do: GenServer.cast(__MODULE__, {:put, key, val})

  # Server callbacks (run in the GenServer process)
  def handle_call({:get, key}, _from, state) do
    {:reply, Map.get(state, key), state}
  end

  def handle_cast({:put, key, val}, state) do
    {:noreply, Map.put(state, key, val)}
  end
end
```

```ruby
# Ruby -- Concurrent::Actor (concurrent-ruby gem)
class Cache < Concurrent::Actor::Context
  def initialize
    @state = {}
  end

  def on_message(message)
    case message
    when Array
      cmd, *args = message
      case cmd
      when :get then @state[args[0]]
      when :put then @state[args[0]] = args[1]
      end
    end
  end
end
```

```java
// Java -- using an Actor-style approach (e.g., Akka)
public class Cache extends AbstractActor {
    private final Map<String, Object> state = new HashMap<>();

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(GetMsg.class, msg ->
                getSender().tell(state.get(msg.key), getSelf()))
            .match(PutMsg.class, msg ->
                state.put(msg.key, msg.value))
            .build();
    }
}
```
{{% /compare %}}

## Return Values and State Transitions

All server callbacks return tuples that instruct GenServer what to do next:

| Callback | Common Returns |
|----------|---------------|
| `init/1` | `{:ok, state}`, `{:stop, reason}`, `:ignore` |
| `handle_call/3` | `{:reply, response, new_state}`, `{:noreply, new_state}`, `{:stop, reason, reply, new_state}` |
| `handle_cast/2` | `{:noreply, new_state}`, `{:stop, reason, new_state}` |
| `handle_info/2` | `{:noreply, new_state}`, `{:stop, reason, new_state}` |

Returning `{:stop, reason, state}` from any callback causes the GenServer to shut down, calling the optional `terminate/2` callback.

## Naming and Registration

GenServers can be registered under a name for easy access:

```elixir
# Register with a local atom name
GenServer.start_link(MyServer, arg, name: MyServer)

# Then call by name instead of PID
GenServer.call(MyServer, :some_request)

# For dynamic naming, use {:via, Registry, ...} or {:global, name}
GenServer.start_link(MyServer, arg, name: {:via, Registry, {MyRegistry, "user:42"}})
```

{{< exercise title="Practice: Shopping Cart GenServer" >}}
Build a `ShoppingCart` GenServer that supports the following operations:

1. `start_link/0` -- starts with an empty list of items
2. `add_item(item, price)` -- adds an item (use `call` so the caller gets confirmation)
3. `remove_item(item)` -- removes the first matching item (use `call`)
4. `list_items/0` -- returns all items as a list of `{item, price}` tuples
5. `total/0` -- returns the sum of all item prices
6. `clear/0` -- empties the cart (use `cast` since we don't need confirmation)

**Hint:** Use a list of `{item, price}` tuples as your state. For `remove_item`, look at `List.keydelete/3`.

**Bonus:** Add a `handle_info` callback that clears the cart after 30 minutes of inactivity. Reset the timer on every add or remove operation using `Process.send_after/3`.
{{< /exercise >}}

## Summary

GenServer is the standard way to build stateful, concurrent processes in Elixir. It encapsulates the receive loop, message dispatch, and process lifecycle management that you would otherwise write by hand. The separation of client API and server callbacks makes the code clear and testable. Understanding GenServer thoroughly is essential -- it is the building block for nearly every stateful service in an Elixir application, and it plugs directly into the supervision tree, which is the topic of the next lesson.
