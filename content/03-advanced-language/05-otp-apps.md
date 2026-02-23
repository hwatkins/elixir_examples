---
title: "OTP Applications"
description: "Understand the Elixir Application behaviour -- how to package, configure, and start supervised process trees using OTP. Covers app callbacks and runtime config."
weight: 5
phase: 3
lesson: 15
difficulty: "intermediate"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/03-advanced-language/04-supervisors"
hexdocsLinks:
  - title: "Application"
    url: "https://hexdocs.pm/elixir/Application.html"
  - title: "Application behaviour"
    url: "https://hexdocs.pm/elixir/Application.html#module-the-application-callback-module"
  - title: "Config"
    url: "https://hexdocs.pm/elixir/config-and-releases.html"
tags:
  - otp
  - application
  - configuration
  - mix
  - supervision-trees
---

You have learned how to build stateful processes with GenServer and organize them into fault-tolerant supervision trees. The final piece of the OTP puzzle is the **Application** -- the standard way to package, configure, start, and stop a complete system of supervised processes as a single unit.

## What Is an OTP Application?

{{< concept title="OTP Application" >}}
An OTP Application is not a user-facing application in the traditional sense. It is a **component** -- a self-contained unit of code with:

- A defined set of modules
- A supervision tree that starts automatically
- Configuration values
- Dependencies on other applications

When you create a Mix project, you are creating an OTP application. When you add a dependency like `phoenix` or `ecto`, each of those is also an OTP application. The BEAM starts them all in the correct order based on their dependency graph.

Think of it as a plugin or microservice within the BEAM -- it can be started, stopped, and configured independently.
{{< /concept >}}

## The Application Module

Every OTP application can have a **callback module** that implements the `Application` behaviour. Its primary job is to start the top-level supervisor:

```elixir
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      MyApp.Repo,
      MyApp.Cache,
      {Phoenix.PubSub, name: MyApp.PubSub},
      MyAppWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

The `start/2` callback receives a start type (usually `:normal`) and the arguments defined in your mix config. It must return `{:ok, pid}` where `pid` is the top-level supervisor. Everything in your application's supervision tree hangs off this supervisor.

## Connecting the Application to Mix

Mix projects declare their application configuration in `mix.exs`:

```elixir
defmodule MyApp.MixProject do
  use Mix.Project

  def project do
    [
      app: :my_app,
      version: "0.1.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      mod: {MyApp.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:ecto_sql, "~> 3.10"}
    ]
  end
end
```

The key parts of the `application/0` function:

- **`mod`** -- specifies the callback module and the arguments passed to its `start/2`. This is what tells the BEAM to call `MyApp.Application.start/2` when the application starts.
- **`extra_applications`** -- Erlang/Elixir applications that should be started before yours but are not listed in `deps`. Common examples: `:logger`, `:runtime_tools`, `:crypto`, `:ssl`.

{{< callout type="note" >}}
Dependencies listed in `deps/0` are automatically added to your application's dependency tree. You do not need to list them in `extra_applications`. The `extra_applications` key is only for applications that ship with Erlang/OTP or Elixir itself.
{{< /callout >}}

## Application Startup Order

When you run `mix run` or `iex -S mix`, the BEAM starts applications in dependency order. If your app depends on `:logger` and `:ecto`, those start first. This guarantees that by the time your `start/2` callback runs, every dependency is already running and available.

{{< iex >}}
iex> Application.started_applications()
[
  {:my_app, ~c"my_app", ~c"0.1.0"},
  {:phoenix, ~c"phoenix", ~c"1.7.10"},
  {:ecto_sql, ~c"ecto_sql", ~c"3.10.2"},
  {:logger, ~c"logger", ~c"1.16.0"},
  ...
]
iex> Application.spec(:my_app, :modules)
[MyApp, MyApp.Application, MyApp.Repo, MyApp.Cache, ...]
{{< /iex >}}

## Configuration

Elixir applications are configured through config files in the `config/` directory. The configuration system has evolved over time, and modern Elixir projects use `Config`:

```elixir
# config/config.exs -- shared config loaded at compile time
import Config

config :my_app,
  cache_ttl: 300_000,
  max_connections: 10

config :my_app, MyApp.Repo,
  database: "my_app_dev",
  hostname: "localhost",
  pool_size: 10
```

```elixir
# config/runtime.exs -- loaded at runtime (ideal for environment variables)
import Config

config :my_app,
  secret_key: System.fetch_env!("SECRET_KEY"),
  database_url: System.fetch_env!("DATABASE_URL")
```

Reading configuration values at runtime:

```elixir
# Fetch a value (returns nil if not set)
Application.get_env(:my_app, :cache_ttl)
# => 300_000

# Fetch with a default
Application.get_env(:my_app, :max_retries, 3)
# => 3

# Fetch a value (raises if not set)
Application.fetch_env!(:my_app, :secret_key)
# => "my_secret_value"
```

{{< callout type="warning" >}}
Do not call `Application.get_env/2` at the module level or inside module attributes outside of a function body. Module attributes are evaluated at **compile time**, so the config value gets baked into the compiled bytecode and will not change at runtime. Always read config values inside functions:

```elixir
# BAD -- reads at compile time
defmodule MyApp.Worker do
  @ttl Application.get_env(:my_app, :cache_ttl)
  def ttl, do: @ttl
end

# GOOD -- reads at runtime
defmodule MyApp.Worker do
  def ttl, do: Application.get_env(:my_app, :cache_ttl)
end
```
{{< /callout >}}

## Config Files by Environment

A typical Elixir project has several config files:

| File | Purpose | When Loaded |
|------|---------|-------------|
| `config/config.exs` | Shared configuration across all environments | Compile time |
| `config/dev.exs` | Development-specific overrides | Compile time |
| `config/test.exs` | Test-specific overrides | Compile time |
| `config/prod.exs` | Production-specific overrides | Compile time |
| `config/runtime.exs` | Runtime configuration (env vars, secrets) | Application start |

The main `config/config.exs` typically imports the environment-specific file at the end:

```elixir
import Config

config :my_app, ecto_repos: [MyApp.Repo]

# Import environment specific config
import_config "#{config_env()}.exs"
```

{{% compare %}}
```elixir
# Elixir -- Application configuration
# config/config.exs
import Config

config :my_app,
  port: 4000,
  pool_size: 10

# Reading at runtime
Application.get_env(:my_app, :port)
```

```python
# Python -- environment-based config
import os

class Config:
    PORT = int(os.environ.get("PORT", 4000))
    POOL_SIZE = int(os.environ.get("POOL_SIZE", 10))

# Reading at runtime
Config.PORT
```

```javascript
// Node.js -- dotenv + config
require("dotenv").config();

const config = {
  port: parseInt(process.env.PORT || "4000"),
  poolSize: parseInt(process.env.POOL_SIZE || "10"),
};

// Reading at runtime
config.port;
```
{{% /compare %}}

## The Application Environment

Beyond static configuration, you can read and write the application environment at runtime. This is useful for feature flags, dynamic settings, or testing:

```elixir
# Set a value at runtime
Application.put_env(:my_app, :feature_enabled, true)

# Read it back
Application.get_env(:my_app, :feature_enabled)
# => true

# Get all config for an application
Application.get_all_env(:my_app)
# => [cache_ttl: 300_000, max_connections: 10, feature_enabled: true]
```

## Starting and Stopping Applications

You can manually start and stop applications. This is mainly useful in scripts, tests, or when managing optional subsystems:

```elixir
# Start an application and all its dependencies
Application.ensure_all_started(:my_app)

# Stop an application (but leave its dependencies running)
Application.stop(:my_app)

# Get information about a running application
Application.spec(:my_app)
```

{{< iex >}}
iex> Application.ensure_all_started(:logger)
{:ok, []}
iex> Application.stop(:logger)
:ok
iex> Application.ensure_all_started(:logger)
{:ok, [:logger]}
{{< /iex >}}

## A Complete Application Example

Putting it all together, here is the full structure of a simple OTP application:

```elixir
# mix.exs
defmodule TaskTracker.MixProject do
  use Mix.Project

  def project do
    [
      app: :task_tracker,
      version: "0.1.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      mod: {TaskTracker.Application, []},
      extra_applications: [:logger]
    ]
  end

  defp deps, do: []
end

# lib/task_tracker/application.ex
defmodule TaskTracker.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      TaskTracker.Store,
      {TaskTracker.Scheduler, interval: 60_000}
    ]

    opts = [strategy: :one_for_one, name: TaskTracker.Supervisor]
    Supervisor.start_link(children, opts)
  end
end

# lib/task_tracker/store.ex
defmodule TaskTracker.Store do
  use GenServer

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def add_task(name, priority \\ :normal) do
    GenServer.call(__MODULE__, {:add, name, priority})
  end

  def list_tasks do
    GenServer.call(__MODULE__, :list)
  end

  @impl true
  def init(state), do: {:ok, state}

  @impl true
  def handle_call({:add, name, priority}, _from, tasks) do
    id = System.unique_integer([:positive])
    task = %{id: id, name: name, priority: priority, created_at: DateTime.utc_now()}
    {:reply, {:ok, id}, Map.put(tasks, id, task)}
  end

  @impl true
  def handle_call(:list, _from, tasks) do
    {:reply, Map.values(tasks), tasks}
  end
end
```

When you run `iex -S mix`, the BEAM starts the `:logger` application, then starts `:task_tracker`, which calls `TaskTracker.Application.start/2`, which starts the supervisor, which starts `TaskTracker.Store` and `TaskTracker.Scheduler`. Your entire system is up and running with fault tolerance built in.

{{< concept title="start_permanent" >}}
The `start_permanent: Mix.env() == :prod` option in `mix.exs` controls what happens if your application's top-level supervisor crashes and cannot recover. In production (`start_permanent: true`), the entire BEAM node shuts down -- this is the right behavior because your application is in an unrecoverable state. In development, the BEAM stays running so you can debug the issue in IEx.
{{< /concept >}}

{{< exercise title="Practice: Build a Complete OTP Application" >}}
Create a minimal OTP application called `Bookshelf` with the following structure:

1. **`Bookshelf.Application`** -- starts the supervision tree
2. **`Bookshelf.Library`** -- a GenServer that stores books as a map of `isbn => %{title, author, year}`
3. **`Bookshelf.RecentlyViewed`** -- a GenServer that tracks the last 10 books viewed (a bounded list)

**Configuration (in config/config.exs):**

```elixir
config :bookshelf, max_recently_viewed: 10
```

**Requirements:**
- `Bookshelf.Library` should support `add_book/3`, `get_book/1`, `list_books/0`, and `remove_book/1`
- `Bookshelf.RecentlyViewed` should support `record_view/1` and `recent/0`, reading `max_recently_viewed` from the application config
- The supervision tree should use `:one_for_one` strategy
- If the Library crashes, RecentlyViewed should keep running (and vice versa)

**Bonus:** Add a `Bookshelf.Stats` GenServer that periodically (every 30 seconds) logs the total number of books and recent views. Use `handle_info` with `Process.send_after` for the periodic timer.
{{< /exercise >}}

## Summary

OTP Applications are the packaging and lifecycle layer for Elixir systems. They define how your supervision tree starts, how configuration flows into your processes, and how dependencies between components are managed. Every Mix project is an OTP application, and every library you depend on is too. Together with GenServer and Supervisors, the Application behaviour completes the OTP foundation -- you now have all the pieces needed to build production-grade, fault-tolerant Elixir systems.
