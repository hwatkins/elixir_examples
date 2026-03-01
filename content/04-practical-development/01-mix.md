---
title: "Mix in Depth"
description: "Master Mix, Elixir's build tool -- create projects, manage Hex dependencies, write custom tasks, configure environments, and build production releases."
weight: 1
phase: 4
lesson: 16
difficulty: "intermediate"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/03-advanced-language/05-otp-apps"
hexdocsLinks:
  - title: "Mix"
    url: "https://hexdocs.pm/mix/Mix.html"
  - title: "Mix.Task"
    url: "https://hexdocs.pm/mix/Mix.Task.html"
  - title: "Hex"
    url: "https://hex.pm"
tags:
  - mix
  - build-tool
  - dependencies
  - hex
  - releases
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Mix is Elixir's build tool and project manager. It handles everything from creating new projects to compiling code, managing dependencies, running tests, and building production releases. If you have worked with tools like Cargo (Rust), npm (JavaScript), or Bundler (Ruby), Mix fills a similar role but is tightly integrated with the language and OTP ecosystem.

## Creating a New Project

The `mix new` command scaffolds a new Elixir project with the standard directory layout.

```elixir
# Create a basic project
$ mix new my_app

# Create a project with a supervision tree (--sup flag)
$ mix new my_app --sup

# Create a project inside a specific module namespace
$ mix new my_app --module MyApplication
```

A newly created project has the following structure:

```text
my_app/
  lib/
    my_app.ex
  test/
    my_app_test.exs
    test_helper.exs
  mix.exs
  .formatter.exs
  .gitignore
  README.md
```

The `--sup` flag adds an `Application` module with a supervision tree, which is essential when you need to start processes at application boot.

## The mix.exs File

The `mix.exs` file is the heart of every Mix project. It defines your project metadata, dependencies, and configuration.

```elixir
defmodule MyApp.MixProject do
  use Mix.Project

  def project do
    [
      app: :my_app,
      version: "0.1.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      aliases: aliases(),

      # Docs
      name: "MyApp",
      source_url: "https://github.com/user/my_app",
      docs: [main: "MyApp", extras: ["README.md"]],

      # Testing
      test_coverage: [tool: ExCoveralls],
      preferred_cli_env: [
        coveralls: :test,
        "coveralls.detail": :test
      ]
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {MyApp.Application, []}
    ]
  end

  defp deps do
    [
      {:jason, "~> 1.4"},
      {:plug_cowboy, "~> 2.7"},
      {:ex_doc, "~> 0.31", only: :dev, runtime: false},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:excoveralls, "~> 0.18", only: :test}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get", "ecto.setup"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"]
    ]
  end
end
```

{{< concept title="Mix Environments" >}}
Mix has three built-in environments: `:dev`, `:test`, and `:prod`. The current environment is available via `Mix.env()`. Dependencies can be scoped to specific environments using the `only:` option. The environment can be set with the `MIX_ENV` environment variable:

- `MIX_ENV=prod mix release` -- build a production release
- `MIX_ENV=test mix test` -- run tests (this is set automatically by `mix test`)
- `mix compile` -- defaults to `:dev`

The `start_permanent: Mix.env() == :prod` setting means that in production, if the application's supervision tree shuts down, the Erlang VM will also shut down. In dev and test, you get a cleaner error instead.
{{< /concept >}}

## Managing Dependencies

Dependencies come from Hex (the Elixir package manager), Git repositories, or local paths.

{{% compare %}}
```elixir
# Hex dependencies (most common)
defp deps do
  [
    {:jason, "~> 1.4"},
    {:plug, "~> 1.15"},
    {:ecto, "~> 3.11"}
  ]
end
```

```elixir
# Git and path dependencies
defp deps do
  [
    {:my_dep, git: "https://github.com/user/my_dep.git", tag: "v0.2.0"},
    {:local_lib, path: "../local_lib"},
    {:forked_lib, github: "myuser/some_lib", branch: "my-fix"}
  ]
end
```
{{% /compare %}}

Common dependency commands:

```elixir
# Fetch all dependencies
$ mix deps.get

# Update a specific dependency
$ mix deps.update jason

# Update all dependencies
$ mix deps.update --all

# List all dependencies and their status
$ mix deps

# Remove unused dependencies from the lock file
$ mix deps.clean --unused --unlock
```

{{< callout type="tip" >}}
Version requirements in Mix follow semantic versioning. The `~>` operator is the most common:

- `"~> 1.4"` allows `1.4.0` up to (but not including) `2.0.0`
- `"~> 1.4.2"` allows `1.4.2` up to (but not including) `1.5.0`
- `">= 1.0.0 and < 2.0.0"` for explicit ranges

Always use `~>` unless you have a specific reason for a different constraint.
{{< /callout >}}

## Essential Mix Tasks

Mix ships with many built-in tasks, and libraries can add their own.

{{< iex >}}
iex> # You run these from the command line, not IEx
iex> # But you can invoke mix tasks from IEx:
iex> Mix.Task.run("compile")
:ok
iex> Mix.Task.rerun("compile")
:ok
iex> # List all available tasks
iex> Mix.Task.load_all()
iex> Mix.Task.all_modules() |> length()
87
{{< /iex >}}

Here are the most important built-in tasks:

```elixir
# Compilation
$ mix compile              # Compile the project
$ mix compile --warnings-as-errors  # Strict mode

# Running code
$ mix run                  # Compile and run the project
$ mix run -e "IO.puts(:hello)"  # Run an expression
$ mix run --no-halt        # Keep the VM running after execution
$ iex -S mix               # Start IEx with the project loaded

# Code quality
$ mix format               # Auto-format code
$ mix format --check-formatted  # CI check for formatting
$ mix credo                # Static analysis (requires credo dep)
$ mix dialyzer             # Type checking (requires dialyxir dep)

# Dependencies
$ mix deps.get             # Fetch dependencies
$ mix deps.compile         # Compile dependencies
$ mix hex.info jason       # Show info about a Hex package

# Testing
$ mix test                 # Run all tests
$ mix test test/my_test.exs:42  # Run a specific test at line 42
```

## Writing Custom Mix Tasks

You can create your own Mix tasks for project-specific automation.

```elixir
defmodule Mix.Tasks.Greet do
  @moduledoc "Greets the given name. Usage: mix greet <name>"
  @shortdoc "Greets someone by name"

  use Mix.Task

  @impl Mix.Task
  def run(args) do
    case args do
      [name | _] ->
        Mix.shell().info("Hello, #{name}! Welcome to #{Mix.Project.config()[:app]}.")

      [] ->
        Mix.shell().error("Usage: mix greet <name>")
        Mix.raise("Missing required argument: name")
    end
  end
end
```

Place custom tasks in `lib/mix/tasks/` and they become available automatically:

```text
lib/
  mix/
    tasks/
      greet.ex
      seed_data.ex
      generate_report.ex
```

A more practical example -- a task that seeds sample data with proper application startup:

```elixir
defmodule Mix.Tasks.SeedData do
  @moduledoc "Seeds the database with sample data"
  @shortdoc "Seed sample data"

  use Mix.Task

  @impl Mix.Task
  def run(_args) do
    # Start the application (needed for Ecto, etc.)
    Mix.Task.run("app.start")

    Mix.shell().info("Seeding data...")

    Enum.each(1..10, fn i ->
      MyApp.Accounts.create_user(%{
        name: "User #{i}",
        email: "user#{i}@example.com"
      })
    end)

    Mix.shell().info("Done! Seeded 10 users.")
  end
end
```

{{< callout type="note" >}}
The `@shortdoc` attribute makes your task appear in the output of `mix help`. Without it, the task still works but is considered hidden. The `@moduledoc` provides the full documentation shown by `mix help greet`.
{{< /callout >}}

## Mix Aliases

Aliases let you define composite tasks or rename existing ones in your `mix.exs`:

```elixir
defp aliases do
  [
    # Run multiple tasks in sequence
    lint: ["format --check-formatted", "credo --strict", "dialyzer"],

    # Override built-in tasks with additional steps
    test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"],

    # Simple shortcuts
    s: "phx.server",
    r: "run",

    # Run a function instead of a task
    seed: fn _args -> Code.eval_file("priv/repo/seeds.exs") end
  ]
end
```

## Building Releases

Mix can build self-contained production releases that include the Erlang runtime:

```elixir
# In mix.exs, add release configuration:
def project do
  [
    app: :my_app,
    version: "0.1.0",
    releases: [
      my_app: [
        include_executables_for: [:unix],
        applications: [runtime_tools: :permanent],
        steps: [:assemble, :tar]
      ]
    ]
  ]
end
```

```elixir
# Build the release
$ MIX_ENV=prod mix release

# The release is self-contained in _build/prod/rel/my_app/
$ _build/prod/rel/my_app/bin/my_app start
$ _build/prod/rel/my_app/bin/my_app stop
$ _build/prod/rel/my_app/bin/my_app remote  # Connect a remote IEx shell

# Runtime configuration with config/runtime.exs
# (evaluated at release boot time, not compile time)
import Config

config :my_app, MyApp.Repo,
  url: System.get_env("DATABASE_URL"),
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")
```

{{< concept title="Compile-Time vs Runtime Configuration" >}}
Elixir has three configuration files that run at different times:

- **`config/config.exs`** -- evaluated at compile time. Values are baked into the release.
- **`config/dev.exs`, `config/test.exs`, `config/prod.exs`** -- also compile time, imported by `config.exs`.
- **`config/runtime.exs`** -- evaluated every time the application starts. Use this for values that come from environment variables in production, such as database URLs, API keys, and port numbers.

A common mistake is putting `System.get_env/1` in `config/prod.exs`. Since that file is evaluated at compile time, it reads the environment of the build machine, not the production server. Always use `config/runtime.exs` for runtime values.
{{< /concept >}}

{{< exercise title="Create a CLI Tool with Mix" >}}
Build a small Mix project that functions as a command-line tool:

1. Run `mix new word_counter` to scaffold a new project.
2. Create a custom Mix task at `lib/mix/tasks/count_words.ex` that accepts a file path as an argument, reads the file, and prints the word count.
3. Add an alias in `mix.exs` so that `mix wc` runs your `count_words` task.
4. Add the `{:jason, "~> 1.4"}` dependency and run `mix deps.get`.
5. Run `mix help` and verify your task appears in the list.

Your task module should handle missing arguments gracefully and use `Mix.shell().info/1` for output.

**Bonus**: Add a `--json` flag that outputs the result as JSON using the `jason` dependency.
{{< /exercise >}}

## Summary

Mix is the central tool in Elixir development. It creates projects, manages dependencies through Hex, compiles code, runs tests, and builds production releases. Custom tasks and aliases let you automate project-specific workflows. Understanding `mix.exs` and the distinction between compile-time and runtime configuration is essential for deploying Elixir applications.

The next lesson covers ExUnit, Elixir's built-in testing framework, which is invoked through `mix test`.
