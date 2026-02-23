---
title: "Distribution"
description: "Connect Elixir nodes into distributed BEAM clusters -- process registration, distributed tasks, :pg process groups, and cluster management with libcluster."
weight: 5
phase: 6
lesson: 30
difficulty: "advanced"
estimatedMinutes: 30
draft: false
date: 2025-02-23
prerequisites:
  - "/06-web-and-distributed/04-nerves"
hexdocsLinks:
  - title: "Node"
    url: "https://hexdocs.pm/elixir/Node.html"
  - title: ":rpc"
    url: "https://www.erlang.org/doc/apps/kernel/rpc.html"
  - title: ":pg"
    url: "https://www.erlang.org/doc/apps/kernel/pg.html"
  - title: "libcluster"
    url: "https://hexdocs.pm/libcluster/readme.html"
tags:
  - distribution
  - nodes
  - clustering
  - rpc
  - pg
  - libcluster
---

The Erlang VM was designed from the start for distributed computing. Multiple BEAM instances -- called nodes -- can connect to each other and communicate transparently. Processes on one node can send messages to processes on another node using the same syntax as local message passing. This built-in distribution makes it possible to build systems that span multiple machines with remarkably little additional complexity.

## Naming and Connecting Nodes

Every distributed node needs a name. You can start a named node with either short names (within a single machine or LAN) or long names (fully qualified hostnames):

```bash
# Short names -- for development and local clusters
iex --sname alice@localhost
iex --sname bob@localhost

# Long names -- for production across machines
iex --name alice@192.168.1.10
iex --name bob@192.168.1.11
```

Connect nodes using `Node.connect/1`:

{{< iex >}}
iex(alice@localhost)> Node.self()
:alice@localhost
iex(alice@localhost)> Node.connect(:bob@localhost)
true
iex(alice@localhost)> Node.list()
[:bob@localhost]
iex(alice@localhost)> Node.ping(:bob@localhost)
:pong
{{< /iex >}}

Once connected, nodes form a fully connected mesh -- if Alice connects to Bob and Bob is connected to Charlie, then Alice is automatically connected to Charlie too.

{{< concept title="The Erlang Cookie" >}}
Nodes will only connect to each other if they share the same **cookie** -- a shared secret that acts as a simple authentication mechanism. By default, the cookie is read from `~/.erlang.cookie`. You can also set it explicitly:

```bash
iex --sname alice --cookie my_secret_cookie
```

In production, set the cookie via the `RELEASE_COOKIE` environment variable or in your release configuration. The cookie is not encryption -- it is only a connection gate. For actual security between nodes, use TLS distribution.
{{< /concept >}}

## Remote Process Communication

The power of distribution is transparent message passing. You can send messages to processes on remote nodes exactly as you would to local processes:

```elixir
# Spawn a process on a remote node
pid = Node.spawn(:bob@localhost, fn ->
  receive do
    {:hello, sender} ->
      send(sender, {:hi_back, Node.self()})
  end
end)

# Send it a message from Alice
send(pid, {:hello, self()})

# Receive the reply
receive do
  {:hi_back, node} -> IO.puts("Got reply from #{node}")
end
```

Named processes work across nodes too:

```elixir
# On bob@localhost -- start a named GenServer
{:ok, _pid} = GenServer.start_link(MyWorker, [], name: {:global, :my_worker})

# On alice@localhost -- call the remote GenServer
GenServer.call({:global, :my_worker}, :get_status)
```

## The :rpc Module

The `:rpc` module provides a straightforward way to execute functions on remote nodes:

```elixir
# Execute a function on a remote node and get the result
:rpc.call(:bob@localhost, String, :upcase, ["hello"])
# "HELLO"

# Execute on a remote node without waiting for the result
:rpc.cast(:bob@localhost, IO, :puts, ["Hello from Alice!"])
# true

# Execute on multiple nodes simultaneously
:rpc.multicall([:"bob@localhost", :"charlie@localhost"], Enum, :sum, [[1, 2, 3]])
# {[6, 6], []}  -- {successful_results, failed_nodes}

# With a timeout (in milliseconds)
:rpc.call(:bob@localhost, MyModule, :slow_function, [arg], 5_000)
```

{{% compare %}}
```elixir
# Distributed Elixir -- transparent message passing
# On node alice@localhost:

# Call a function on a remote node
result = :rpc.call(:bob@localhost, MyApp.Stats, :compute, [data])

# Send a message to a named process on a remote node
GenServer.cast({MyApp.Worker, :bob@localhost}, {:process, job})

# Spawn and monitor a remote process
pid = Node.spawn_link(:bob@localhost, fn -> do_work() end)
```

```python
# Python -- requires explicit networking
import xmlrpc.client

# Must set up an RPC server on the remote machine
proxy = xmlrpc.client.ServerProxy("http://bob:8000/")
result = proxy.compute(data)

# No transparent process communication
# Must serialize/deserialize manually
# Must handle connection failures explicitly
```
{{% /compare %}}

## Global Process Registry

The `:global` module provides a cluster-wide process registry. Any node can register a process with a global name, and any other node can look it up:

```elixir
defmodule MyApp.ClusterSingleton do
  use GenServer

  def start_link(opts) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: {:global, name})
  end

  def get_state(name \\ __MODULE__) do
    GenServer.call({:global, name}, :get_state)
  end

  @impl true
  def init(opts) do
    {:ok, %{started_on: Node.self(), data: Keyword.get(opts, :data, %{})}}
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end
end
```

{{< iex >}}
iex(alice@localhost)> :global.register_name(:coordinator, self())
:yes
iex(bob@localhost)> :global.whereis_name(:coordinator)
#PID<12345.67.0>
iex(bob@localhost)> send(:global.whereis_name(:coordinator), :hello)
:hello
iex(bob@localhost)> :global.registered_names()
[:coordinator]
{{< /iex >}}

{{< callout type="warning" >}}
The `:global` module uses a global lock for registration, which can be slow under high contention. For most applications, consider using `:pg` (process groups) or libraries like `Horde` or `Swarm` for distributed process management. Reserve `:global` for true singletons where only one process should exist across the entire cluster.
{{< /callout >}}

## Process Groups with :pg

The `:pg` module (which replaced `:pg2` in OTP 23) lets you organize processes into named groups across the cluster. This is ideal for pub/sub patterns, worker pools, and distributing work:

```elixir
defmodule MyApp.WorkerPool do
  use GenServer

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  @impl true
  def init(opts) do
    group = Keyword.get(opts, :group, :workers)
    :pg.join(group, self())
    {:ok, %{group: group}}
  end

  @impl true
  def terminate(_reason, state) do
    :pg.leave(state.group, self())
    :ok
  end

  # Distribute work across all workers in the group
  def distribute_work(group \\ :workers, work_items) do
    members = :pg.get_members(group)

    work_items
    |> Enum.zip(Stream.cycle(members))
    |> Enum.each(fn {item, pid} ->
      GenServer.cast(pid, {:process, item})
    end)
  end

  @impl true
  def handle_cast({:process, item}, state) do
    # Process the work item
    result = do_work(item)
    IO.puts("#{inspect(Node.self())} processed: #{inspect(result)}")
    {:noreply, state}
  end

  defp do_work(item), do: item
end
```

```elixir
# Using :pg for pub/sub across nodes
defmodule MyApp.PubSub do
  def subscribe(topic) do
    :pg.join(topic, self())
  end

  def unsubscribe(topic) do
    :pg.leave(topic, self())
  end

  def broadcast(topic, message) do
    for pid <- :pg.get_members(topic) do
      send(pid, {topic, message})
    end
    :ok
  end

  def local_broadcast(topic, message) do
    for pid <- :pg.get_local_members(topic) do
      send(pid, {topic, message})
    end
    :ok
  end
end
```

{{< concept title=":pg vs :global" >}}
`:global` is for registering a **single process** under a unique name across the cluster -- like a singleton. `:pg` is for organizing **groups of processes** -- multiple processes can join the same group, and you can broadcast to or select from the group. Use `:global` when you need exactly one coordinator. Use `:pg` when you need to fan out work, implement pub/sub, or manage pools of workers across nodes.
{{< /concept >}}

## Distributed Tasks

Elixir's `Task` module works seamlessly across nodes. You can run tasks on remote nodes and collect results:

```elixir
defmodule MyApp.DistributedComputation do
  def parallel_map(nodes, items, fun) do
    # Split work across nodes
    chunks = chunk_by_nodes(items, nodes)

    # Start tasks on each node
    tasks =
      Enum.zip(nodes, chunks)
      |> Enum.map(fn {node, chunk} ->
        Task.Supervisor.async({MyApp.TaskSupervisor, node}, fn ->
          Enum.map(chunk, fun)
        end)
      end)

    # Collect results
    tasks
    |> Task.await_many(30_000)
    |> List.flatten()
  end

  defp chunk_by_nodes(items, nodes) do
    chunk_size = div(length(items), length(nodes)) + 1
    Enum.chunk_every(items, chunk_size)
  end
end

# Usage -- distribute heavy computation across the cluster
nodes = [Node.self() | Node.list()]
results = MyApp.DistributedComputation.parallel_map(nodes, large_dataset, &expensive_transform/1)
```

{{< callout type="tip" >}}
Always use `Task.Supervisor` for distributed tasks rather than bare `Task.async/1`. A supervised task on a remote node will be properly cleaned up if the remote node disconnects, preventing orphaned processes and stuck `await` calls. Make sure each node in your cluster runs a `Task.Supervisor` in its supervision tree.
{{< /callout >}}

## Automatic Clustering with libcluster

In production, you rarely want to connect nodes manually. The `libcluster` library handles automatic node discovery and connection using various strategies:

```elixir
# mix.exs
{:libcluster, "~> 3.3"}

# config/config.exs
config :libcluster,
  topologies: [
    k8s: [
      strategy: Cluster.Strategy.Kubernetes,
      config: [
        mode: :dns,
        kubernetes_node_basename: "my_app",
        kubernetes_selector: "app=my_app",
        polling_interval: 5_000
      ]
    ]
  ]

# For local development, use Gossip or Epmd strategies
config :libcluster,
  topologies: [
    local: [
      strategy: Cluster.Strategy.Gossip
    ]
  ]
```

Add the cluster supervisor to your application:

```elixir
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies, [])

    children = [
      {Cluster.Supervisor, [topologies, [name: MyApp.ClusterSupervisor]]},
      MyApp.Repo,
      MyAppWeb.Endpoint,
      {Task.Supervisor, name: MyApp.TaskSupervisor}
    ]

    Supervisor.start_link(children, strategy: :one_for_one)
  end
end
```

Available strategies include:

| Strategy | Use Case |
|----------|----------|
| `Cluster.Strategy.Gossip` | Local development, LAN discovery |
| `Cluster.Strategy.Epmd` | Known hosts, simple deployments |
| `Cluster.Strategy.Kubernetes` | Kubernetes deployments |
| `Cluster.Strategy.DNSPoll` | DNS-based discovery (Fly.io, etc.) |
| `Cluster.Strategy.ErlangHosts` | Using `.hosts.erlang` file |

## Monitoring the Cluster

You can monitor node connections and disconnections to react to cluster topology changes:

```elixir
defmodule MyApp.ClusterMonitor do
  use GenServer

  require Logger

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    :net_kernel.monitor_nodes(true)
    Logger.info("Cluster monitor started. Connected nodes: #{inspect(Node.list())}")
    {:ok, %{}}
  end

  @impl true
  def handle_info({:nodeup, node}, state) do
    Logger.info("Node joined the cluster: #{node}")
    # Rebalance work, sync state, etc.
    {:noreply, state}
  end

  @impl true
  def handle_info({:nodedown, node}, state) do
    Logger.warning("Node left the cluster: #{node}")
    # Redistribute work from the departed node
    {:noreply, state}
  end
end
```

{{< iex >}}
iex(alice@localhost)> :net_kernel.monitor_nodes(true)
:ok
iex(alice@localhost)> Node.connect(:bob@localhost)
true
iex(alice@localhost)> flush()
{:nodeup, :bob@localhost}
:ok
{{< /iex >}}

{{< exercise title="Build a Distributed Word Counter" >}}
Build a distributed word counter that splits work across connected nodes:

1. Start two or three named IEx nodes and connect them
2. Write a `DistributedCounter` module with a `count_words/2` function that:
   - Accepts a list of file paths and a list of nodes
   - Distributes the files evenly across the nodes using `Task.Supervisor.async/3`
   - Each node reads its assigned files and counts word frequencies
   - Results are merged back on the originating node
3. Use `:pg` to create a `:counters` group and have worker processes on each node join it
4. Add a `broadcast_result/1` function that sends the final word count to all members of the `:counters` group

**Bonus:** Add `:net_kernel.monitor_nodes(true)` and handle the case where a node goes down mid-computation by redistributing its unfinished work to the remaining nodes.
{{< /exercise >}}

## Summary

Distributed Elixir is built on foundations that the BEAM has refined over decades. Connecting nodes is as simple as giving them names and calling `Node.connect/1`. Message passing works transparently across nodes. `:rpc` provides straightforward remote function calls. `:global` gives you cluster-wide name registration. `:pg` organizes processes into groups for pub/sub and work distribution. `libcluster` automates node discovery for production deployments. Combined, these tools let you scale from a single node to a cluster of machines with minimal changes to your application code.
