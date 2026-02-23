---
title: "Deployment"
description: "Ship Elixir applications to production -- Mix releases, Docker containers, runtime configuration, monitoring with telemetry, and deployment to Fly.io and Gigalixir."
weight: 6
phase: 6
lesson: 31
difficulty: "advanced"
estimatedMinutes: 30
draft: false
date: 2025-02-23
prerequisites:
  - "/06-web-and-distributed/05-distribution"
hexdocsLinks:
  - title: "Mix Release"
    url: "https://hexdocs.pm/mix/Mix.Tasks.Release.html"
  - title: "Phoenix Deployment"
    url: "https://hexdocs.pm/phoenix/deployment.html"
  - title: "Config.Provider"
    url: "https://hexdocs.pm/elixir/Config.Provider.html"
tags:
  - deployment
  - release
  - docker
  - monitoring
  - production
  - observer
  - logging
  - fly.io
---

Deploying Elixir applications means compiling your code into a standalone release, configuring it for the target environment, and running it on infrastructure where it can be monitored and maintained. Elixir's `mix release` produces self-contained bundles that include the Erlang runtime, your compiled code, and all dependencies -- no Elixir or Erlang installation required on the production server.

## Mix Releases

A release is a self-contained directory that includes everything needed to run your application. It packages your compiled BEAM bytecode, the Erlang runtime system (ERTS), all dependencies, and boot scripts into a single deployable artifact.

```elixir
# mix.exs
def project do
  [
    app: :my_app,
    version: "1.0.0",
    elixir: "~> 1.16",
    start_permanent: Mix.env() == :prod,
    deps: deps(),
    releases: [
      my_app: [
        include_executables_for: [:unix],
        applications: [runtime_tools: :permanent]
      ]
    ]
  ]
end
```

Build and run a release:

```bash
# Compile assets (if using Phoenix)
MIX_ENV=prod mix assets.deploy

# Build the release
MIX_ENV=prod mix release

# The release is in _build/prod/rel/my_app/
# Start it
_build/prod/rel/my_app/bin/my_app start

# Other commands
_build/prod/rel/my_app/bin/my_app stop
_build/prod/rel/my_app/bin/my_app restart
_build/prod/rel/my_app/bin/my_app pid

# Start an interactive console attached to the running release
_build/prod/rel/my_app/bin/my_app remote
```

{{< concept title="Releases vs. Mix" >}}
In development, you run `iex -S mix phx.server`, which compiles and loads code on the fly. In production, you should always use releases. Releases are pre-compiled, start faster, do not require Mix or source code on the server, include the Erlang runtime, and can be configured for clustering and hot upgrades. Think of a release as the production-grade packaging of your application.
{{< /concept >}}

## Runtime Configuration

Elixir distinguishes between **compile-time** and **runtime** configuration. This distinction is critical for releases:

```elixir
# config/config.exs -- evaluated at COMPILE time
# Values are baked into the release. Use for static settings.
import Config

config :my_app, MyAppWeb.Endpoint,
  render_errors: [formats: [html: MyAppWeb.ErrorHTML, json: MyAppWeb.ErrorJSON]]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]
```

```elixir
# config/runtime.exs -- evaluated at BOOT time
# Values are read from the environment when the release starts.
import Config

config :my_app, MyAppWeb.Endpoint,
  url: [host: System.get_env("PHX_HOST") || "localhost"],
  http: [
    port: String.to_integer(System.get_env("PORT") || "4000")
  ],
  secret_key_base: System.fetch_env!("SECRET_KEY_BASE")

config :my_app, MyApp.Repo,
  url: System.fetch_env!("DATABASE_URL"),
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

if config_env() == :prod do
  config :my_app, MyAppWeb.Endpoint,
    server: true
end
```

{{< callout type="important" >}}
A common deployment mistake is putting `System.get_env/1` calls in `config/config.exs` or `config/prod.exs`. Those files are evaluated at **compile time**, so the environment variable values from your build machine get baked into the release. Always use `config/runtime.exs` for values that should come from the production environment, like database URLs, API keys, and secret keys.
{{< /callout >}}

## Docker Deployments

Docker is the most common way to package and deploy Elixir releases. Phoenix generates a production-ready `Dockerfile` for you:

```dockerfile
# Dockerfile for a Phoenix application
ARG ELIXIR_VERSION=1.16.1
ARG OTP_VERSION=26.2.2
ARG DEBIAN_VERSION=bookworm-20240130-slim

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

# Build stage
FROM ${BUILDER_IMAGE} as builder

RUN apt-get update -y && apt-get install -y build-essential git \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

WORKDIR /app

RUN mix local.hex --force && mix local.rebar --force

ENV MIX_ENV="prod"

COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

COPY priv priv
COPY lib lib
COPY assets assets
RUN mix assets.deploy
RUN mix compile

COPY config/runtime.exs config/
RUN mix release

# Runtime stage
FROM ${RUNNER_IMAGE}

RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG en_US.UTF-8

WORKDIR /app
RUN chown nobody /app

ENV MIX_ENV="prod"

COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/my_app ./

USER nobody

CMD ["/app/bin/server"]
```

Build and run:

```bash
# Build the image
docker build -t my_app .

# Run with environment variables
docker run -d \
  --name my_app \
  -p 4000:4000 \
  -e DATABASE_URL="ecto://user:pass@db:5432/my_app" \
  -e SECRET_KEY_BASE="$(mix phx.gen.secret)" \
  -e PHX_HOST="myapp.example.com" \
  -e PORT="4000" \
  my_app
```

{{% compare %}}
```dockerfile
# Multi-stage Docker build (recommended)
# Build stage: ~1.5GB with all build tools
FROM hexpm/elixir:1.16.1-erlang-26.2.2 as builder
# ... compile, build release

# Runtime stage: ~80MB, minimal attack surface
FROM debian:bookworm-slim
COPY --from=builder /app/_build/prod/rel/my_app ./
CMD ["/app/bin/server"]
```

```dockerfile
# Single-stage build (not recommended)
# Final image: ~1.5GB, includes compilers
# and build tools unnecessarily
FROM hexpm/elixir:1.16.1-erlang-26.2.2
WORKDIR /app
COPY . .
RUN mix deps.get && mix compile
CMD ["mix", "phx.server"]
```
{{% /compare %}}

## Health Checks

Production applications need health check endpoints for load balancers and container orchestrators to verify the application is running correctly:

```elixir
defmodule MyAppWeb.HealthController do
  use MyAppWeb, :controller

  def check(conn, _params) do
    checks = %{
      status: "ok",
      version: Application.spec(:my_app, :vsn) |> to_string(),
      node: Node.self() |> to_string(),
      uptime_seconds: :erlang.statistics(:wall_clock) |> elem(0) |> div(1000),
      checks: %{
        database: check_database(),
        memory: check_memory()
      }
    }

    status_code = if all_healthy?(checks), do: 200, else: 503
    json(conn |> put_status(status_code), checks)
  end

  defp check_database do
    case Ecto.Adapters.SQL.query(MyApp.Repo, "SELECT 1") do
      {:ok, _} -> %{status: "ok"}
      {:error, reason} -> %{status: "error", message: inspect(reason)}
    end
  end

  defp check_memory do
    memory_mb = :erlang.memory(:total) |> div(1_048_576)
    %{status: "ok", total_mb: memory_mb}
  end

  defp all_healthy?(%{checks: checks}) do
    Enum.all?(checks, fn {_name, check} -> check.status == "ok" end)
  end
end
```

```elixir
# In router.ex
scope "/", MyAppWeb do
  get "/health", HealthController, :check
end
```

## Monitoring with :observer

The BEAM provides powerful built-in monitoring tools. In production, you can connect a remote observer to a running node:

```elixir
# Ensure runtime_tools is included in your release (it is by default)
# In mix.exs releases config:
releases: [
  my_app: [
    applications: [runtime_tools: :permanent]
  ]
]
```

```bash
# Connect to a running release's remote console
_build/prod/rel/my_app/bin/my_app remote

# In the remote console, you can inspect the system
iex> :observer_cli.start()  # Terminal-based observer
iex> Process.list() |> length()
iex> :erlang.memory()
iex> :erlang.system_info(:process_count)
```

{{< iex >}}
iex> :erlang.memory() |> Enum.map(fn {k, v} -> {k, div(v, 1_048_576)} end)
[
  total: 45,
  processes: 18,
  processes_used: 18,
  system: 27,
  atom: 1,
  atom_used: 1,
  binary: 2,
  code: 19,
  ets: 3
]
iex> :erlang.system_info(:process_count)
287
iex> :erlang.system_info(:schedulers_online)
8
iex> :erlang.statistics(:wall_clock)
{1234567, 1234567}
{{< /iex >}}

For production monitoring, use telemetry-based tools:

```elixir
# In mix.exs deps
{:telemetry_metrics, "~> 1.0"},
{:telemetry_poller, "~> 1.0"},
{:phoenix_live_dashboard, "~> 0.8"}

# In router.ex -- protect with authentication in production!
import Phoenix.LiveDashboard.Router

scope "/" do
  pipe_through [:browser, :require_admin]
  live_dashboard "/dashboard", metrics: MyAppWeb.Telemetry
end
```

```elixir
defmodule MyAppWeb.Telemetry do
  use Supervisor
  import Telemetry.Metrics

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    children = [
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      # Phoenix Metrics
      summary("phoenix.endpoint.start.system_time", unit: {:native, :millisecond}),
      summary("phoenix.endpoint.stop.duration", unit: {:native, :millisecond}),
      summary("phoenix.router_dispatch.stop.duration", unit: {:native, :millisecond}),

      # Database Metrics
      summary("my_app.repo.query.total_time", unit: {:native, :millisecond}),
      summary("my_app.repo.query.queue_time", unit: {:native, :millisecond}),

      # VM Metrics
      last_value("vm.memory.total", unit: :byte),
      last_value("vm.total_run_queue_lengths.total"),
      last_value("vm.total_run_queue_lengths.cpu"),
      last_value("vm.system_counts.process_count")
    ]
  end

  defp periodic_measurements do
    []
  end
end
```

## Logging

Configure structured logging for production:

```elixir
# config/runtime.exs
config :logger, :console,
  format: {MyApp.LogFormatter, :format},
  metadata: [:request_id, :user_id, :trace_id]

config :logger,
  level: String.to_existing_atom(System.get_env("LOG_LEVEL") || "info")
```

```elixir
defmodule MyApp.LogFormatter do
  def format(level, message, timestamp, metadata) do
    # Output JSON logs for log aggregation services
    %{
      timestamp: format_timestamp(timestamp),
      level: level,
      message: IO.chardata_to_string(message),
      metadata: Map.new(metadata)
    }
    |> Jason.encode!()
    |> Kernel.<>("\n")
  rescue
    _ -> "#{inspect({level, message, metadata})}\n"
  end

  defp format_timestamp({date, {h, m, s, ms}}) do
    {date, {h, m, s}}
    |> NaiveDateTime.from_erl!(ms * 1000)
    |> NaiveDateTime.to_iso8601()
  end
end
```

{{< callout type="tip" >}}
In production, set the log level to `:info` or `:warning`. Debug-level logging generates enormous volume and can degrade performance. Use `Logger.debug/1` freely during development -- it costs nothing in production when the level is set higher. For temporary debugging in production, you can change the log level at runtime without restarting: `Logger.configure(level: :debug)`.
{{< /callout >}}

## Production Best Practices

Here is a checklist for production-ready Elixir deployments:

```elixir
# 1. Generate a strong secret key base
# mix phx.gen.secret

# 2. Configure SSL termination (typically at the load balancer)
# Or use Bandit/Cowboy HTTPS directly:
config :my_app, MyAppWeb.Endpoint,
  https: [
    port: 443,
    cipher_suite: :strong,
    keyfile: System.get_env("SSL_KEY_PATH"),
    certfile: System.get_env("SSL_CERT_PATH")
  ]

# 3. Set appropriate pool sizes
config :my_app, MyApp.Repo,
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

# 4. Enable gzip compression
plug Plug.Static,
  at: "/",
  from: :my_app,
  gzip: true

# 5. Configure DNS clustering for multi-node deployments
config :my_app,
  dns_cluster_query: System.get_env("DNS_CLUSTER_QUERY")
```

{{< concept title="The Twelve-Factor App and Elixir" >}}
Elixir releases align naturally with twelve-factor app principles:

- **Config in the environment** -- `runtime.exs` reads from env vars at boot
- **Stateless processes** -- BEAM processes are lightweight and disposable
- **Port binding** -- Phoenix binds to `$PORT` directly
- **Concurrency** -- The BEAM scheduler handles this natively
- **Disposability** -- Releases start fast and shut down gracefully via `SIGTERM`
- **Dev/prod parity** -- `mix phx.server` in dev, `bin/server` in prod, same code

The main adaptation is that Elixir applications are long-lived and maintain in-memory state in processes. Design your processes so that state can be reconstructed from the database on restart, and you get the best of both worlds.
{{< /concept >}}

## Deploying to Fly.io

Fly.io has first-class Elixir support with built-in clustering:

```bash
# Install flyctl and authenticate
fly auth login

# Launch your app (generates fly.toml)
fly launch

# Deploy
fly deploy

# Open the deployed app
fly open

# Check logs
fly logs

# SSH into the running machine
fly ssh console

# Connect to the running BEAM
fly ssh console --command "/app/bin/my_app remote"

# Scale horizontally
fly scale count 3

# Set secrets (environment variables)
fly secrets set SECRET_KEY_BASE=$(mix phx.gen.secret)
fly secrets set DATABASE_URL="postgres://..."
```

The generated `fly.toml` handles most configuration:

```toml
[env]
  PHX_HOST = "my-app.fly.dev"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    timeout = "5s"
    path = "/health"
```

## Deploying to Render

Render is another platform with good Elixir support:

```yaml
# render.yaml
services:
  - type: web
    name: my-app
    runtime: elixir
    buildCommand: |
      mix deps.get --only prod
      MIX_ENV=prod mix compile
      MIX_ENV=prod mix assets.deploy
      MIX_ENV=prod mix release
    startCommand: _build/prod/rel/my_app/bin/server
    envVars:
      - key: SECRET_KEY_BASE
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: my-app-db
          property: connectionString

databases:
  - name: my-app-db
    plan: starter
```

{{< exercise title="Prepare an Application for Production" >}}
Take an existing Phoenix application (or create a new one) and make it production-ready:

1. **Runtime configuration:** Move all environment-dependent config (database URL, secret key base, host) to `config/runtime.exs` using `System.fetch_env!/1`
2. **Health check:** Add a `/health` endpoint that checks database connectivity and returns the application version
3. **Dockerfile:** Write a multi-stage Dockerfile that builds a release in the first stage and copies it to a minimal runtime image
4. **Logging:** Configure JSON-formatted logs suitable for a log aggregation service
5. **Telemetry:** Set up `Phoenix.LiveDashboard` with at least three custom metrics

Test your setup locally:
```bash
docker build -t my_app .
docker run -p 4000:4000 \
  -e SECRET_KEY_BASE="$(mix phx.gen.secret)" \
  -e DATABASE_URL="ecto://localhost/my_app" \
  -e PHX_HOST="localhost" \
  my_app
```

Verify that `curl http://localhost:4000/health` returns a 200 status with your health check JSON.
{{< /exercise >}}

## Summary

Deploying Elixir applications is a well-defined process. `mix release` produces self-contained artifacts that include everything needed to run. Runtime configuration via `config/runtime.exs` keeps secrets and environment-specific values out of the build. Multi-stage Docker builds create small, secure production images. Health checks and telemetry give visibility into running systems. The BEAM's built-in monitoring tools -- from `:observer` to LiveDashboard -- let you inspect processes, memory, and queries in real time. With platforms like Fly.io offering native clustering support, taking an Elixir application from development to a scaled production deployment is straightforward.
