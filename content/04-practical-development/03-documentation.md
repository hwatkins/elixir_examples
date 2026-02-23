---
title: "Documentation"
description: "Write excellent Elixir documentation with module attributes, doctests, typespecs, and ExDoc. Create self-verifying, publishable docs for your Hex packages."
weight: 3
phase: 4
lesson: 18
difficulty: "intermediate"
estimatedMinutes: 20
draft: false
date: 2025-02-23
prerequisites:
  - "/04-practical-development/02-testing"
hexdocsLinks:
  - title: "Writing Documentation"
    url: "https://hexdocs.pm/elixir/writing-documentation.html"
  - title: "ExDoc"
    url: "https://hexdocs.pm/ex_doc/readme.html"
  - title: "Typespecs"
    url: "https://hexdocs.pm/elixir/typespecs.html"
tags:
  - documentation
  - moduledoc
  - doctests
  - exdoc
  - typespecs
---

Elixir treats documentation as a first-class feature of the language. Documentation is written directly in source code using module attributes, supports full Markdown formatting, can include executable examples that double as tests, and generates beautiful HTML documentation with ExDoc. The Elixir community has some of the best library documentation in any ecosystem, and the tooling makes it easy to maintain that standard.

## Module and Function Documentation

The three core documentation attributes are `@moduledoc`, `@doc`, and `@typedoc`.

```elixir
defmodule MyApp.Accounts do
  @moduledoc """
  The Accounts context manages users and authentication.

  This module provides functions for creating, updating, and
  authenticating users. All functions that interact with the
  database return `{:ok, struct}` or `{:error, changeset}` tuples.

  ## Usage

      {:ok, user} = Accounts.create_user(%{email: "alice@example.com"})
      {:ok, user} = Accounts.authenticate(user.email, "password123")
  """

  @typedoc "A unique user identifier"
  @type user_id :: pos_integer()

  @doc """
  Creates a new user with the given attributes.

  ## Parameters

    - `attrs` - A map containing `:email` and `:name` keys

  ## Returns

    - `{:ok, %User{}}` on success
    - `{:error, %Ecto.Changeset{}}` on validation failure

  ## Examples

      iex> MyApp.Accounts.create_user(%{email: "test@example.com", name: "Test"})
      {:ok, %MyApp.User{email: "test@example.com", name: "Test"}}

      iex> MyApp.Accounts.create_user(%{email: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  @spec create_user(map()) :: {:ok, User.t()} | {:error, Ecto.Changeset.t()}
  def create_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  @doc false
  def internal_helper do
    # @doc false hides this function from generated documentation
    # but it remains public and callable
  end
end
```

{{< concept title="The Documentation Trinity" >}}
Elixir documentation works best when three elements work together:

1. **`@doc` / `@moduledoc`** -- human-readable prose explaining *what* and *why*
2. **`@spec`** -- machine-readable type signatures showing the contract
3. **`## Examples` with doctests** -- executable code proving it works

When all three are present, your documentation is self-verifying, type-aware, and clear to readers. ExDoc renders them together into a cohesive reference page.

```elixir
@doc "Doubles the given number."
@spec double(number()) :: number()
def double(n), do: n * 2
```

The `@spec` appears directly above the function definition, while `@doc` can include longer prose and examples.
{{< /concept >}}

## Markdown in Documentation

Documentation strings support full Markdown, including headers, lists, code blocks, tables, and links.

```elixir
defmodule MyApp.Config do
  @moduledoc """
  Application configuration helpers.

  ## Configuration Keys

  | Key          | Type     | Default | Description               |
  |--------------|----------|---------|---------------------------|
  | `:port`      | integer  | `4000`  | HTTP server port          |
  | `:host`      | string   | `"localhost"` | Server hostname    |
  | `:pool_size` | integer  | `10`    | Database connection pool  |

  ## Links

  See `MyApp.Repo` for database configuration.
  See the [deployment guide](https://example.com/deploy) for production setup.

  > **Note:** Configuration loaded from environment variables takes
  > precedence over values in `config.exs`.

  ## Code Examples

  Configuration is typically set in `config/runtime.exs`:

      import Config

      config :my_app,
        port: String.to_integer(System.get_env("PORT") || "4000"),
        host: System.get_env("HOST") || "localhost"
  """
end
```

{{< callout type="tip" >}}
Use backticks to create links to other modules and functions in your documentation. ExDoc automatically converts them into clickable hyperlinks:

- `` `MyApp.Accounts` `` -- links to the module
- `` `MyApp.Accounts.create_user/1` `` -- links to a specific function
- `` `Enum` `` -- links to standard library modules on HexDocs

This cross-referencing makes it easy for readers to navigate between related modules.
{{< /callout >}}

## Typespecs and @typedoc

Typespecs define the types of function arguments and return values. They serve as documentation and can be checked with Dialyzer.

{{% compare %}}
```elixir
# Basic typespecs
defmodule Geometry do
  @type point :: {number(), number()}
  @type shape :: :circle | :square | :triangle

  @spec distance(point(), point()) :: float()
  def distance({x1, y1}, {x2, y2}) do
    :math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  end

  @spec area(shape(), number()) :: float()
  def area(:circle, radius), do: :math.pi() * radius ** 2
  def area(:square, side), do: side * side * 1.0
  def area(:triangle, side), do: side * side * :math.sqrt(3) / 4
end
```

```elixir
# Documented custom types
defmodule MyApp.User do
  @typedoc """
  A user struct with profile information.

  The `:role` field determines access permissions:
  - `:admin` -- full access to all resources
  - `:editor` -- can create and modify content
  - `:viewer` -- read-only access
  """
  @type t :: %__MODULE__{
    id: pos_integer() | nil,
    email: String.t(),
    name: String.t(),
    role: role(),
    inserted_at: DateTime.t() | nil
  }

  @typedoc "Allowed user roles"
  @type role :: :admin | :editor | :viewer

  defstruct [:id, :email, :name, :role, :inserted_at]
end
```
{{% /compare %}}

Common built-in types for specs:

```elixir
# Primitive types
@spec example(
  integer(),          # any integer
  pos_integer(),      # positive integer (> 0)
  non_neg_integer(),  # >= 0
  float(),            # any float
  number(),           # integer or float
  boolean(),          # true or false
  atom(),             # any atom
  String.t(),         # binary string (most common string type)
  binary(),           # raw binary
  pid(),              # process identifier
  reference(),        # unique reference
  term(),             # literally any Elixir term
  any()               # alias for term()
) :: :ok

# Compound types
@spec process(list(integer())) :: {:ok, map()} | {:error, String.t()}
@spec transform(Enumerable.t()) :: [term()]
@spec callback((integer() -> boolean())) :: :ok
```

{{< iex >}}
iex> # You can check typespecs at runtime using the Code module:
iex> {:docs_v1, _, _, _, _, _, docs} = Code.fetch_docs(Enum)
iex> # Find the spec for map/2
iex> Enum.__info__(:functions) |> Keyword.get_values(:map)
[2]
iex> # Typespecs are also available through the Erlang type system:
iex> {:ok, specs} = Code.Typespec.fetch_specs(Enum)
iex> specs |> Enum.find(fn {{name, arity}, _} -> name == :map and arity == 2 end) |> elem(0)
{:map, 2}
{{< /iex >}}

## Doctests

Doctests are examples in `@doc` strings that ExUnit executes as tests. They keep documentation honest by failing the test suite when examples become outdated.

```elixir
defmodule StringUtils do
  @doc """
  Truncates a string to the given length, adding "..." if truncated.

  ## Examples

      iex> StringUtils.truncate("Hello, World!", 5)
      "He..."

      iex> StringUtils.truncate("Hi", 10)
      "Hi"

      iex> StringUtils.truncate("", 5)
      ""

  Multi-line results work with the ...> continuation prompt:

      iex> result = StringUtils.truncate("A very long string", 8)
      ...> String.length(result)
      8

  Doctest expressions can span multiple lines:

      iex> "Hello, World!"
      ...> |> StringUtils.truncate(7)
      "Hell..."
  """
  def truncate("", _length), do: ""
  def truncate(string, length) when byte_size(string) <= length, do: string
  def truncate(string, length) do
    String.slice(string, 0, length - 3) <> "..."
  end
end
```

{{< callout type="warning" >}}
Doctests have some limitations to keep in mind:

- They compare string representations, so `%{a: 1, b: 2}` might fail if the map prints in a different key order. Use pattern matching or pin specific keys instead.
- Complex setup (database records, file fixtures) does not belong in doctests. Use regular tests for those scenarios.
- Each doctest example is independent -- variables do not carry over between separate `iex>` blocks.
- A single `iex>` block (including `...>` continuations) shares bindings within that block.

Doctests work best for pure functions with simple inputs and outputs.
{{< /callout >}}

## Generating Documentation with ExDoc

ExDoc generates beautiful HTML documentation from your source code. Add it as a dev dependency:

```elixir
# mix.exs
defp deps do
  [
    {:ex_doc, "~> 0.31", only: :dev, runtime: false}
  ]
end

def project do
  [
    app: :my_app,
    version: "0.1.0",
    name: "MyApp",
    source_url: "https://github.com/user/my_app",
    homepage_url: "https://example.com",
    docs: docs()
  ]
end

defp docs do
  [
    main: "MyApp",
    logo: "assets/logo.png",
    extras: ["README.md", "CHANGELOG.md", "guides/getting-started.md"],
    groups_for_modules: [
      "Accounts": [MyApp.Accounts, MyApp.User],
      "Content": [MyApp.Posts, MyApp.Comments],
      "Utilities": [MyApp.StringUtils, MyApp.DateUtils]
    ],
    groups_for_extras: [
      "Guides": ~r/guides\/.*/
    ],
    before_closing_head_tag: &before_closing_head_tag/1
  ]
end

defp before_closing_head_tag(:html) do
  """
  <style>
    /* Custom CSS for your docs */
  </style>
  """
end

defp before_closing_head_tag(_), do: ""
```

Generate and view the docs:

```text
# Generate HTML documentation
$ mix docs

# Open in the browser
$ open doc/index.html

# Docs are generated in the doc/ directory
$ ls doc/
index.html  MyApp.html  MyApp.Accounts.html  ...
```

{{< concept title="Publishing to HexDocs" >}}
When you publish a package to Hex, documentation is automatically generated and hosted on HexDocs (hexdocs.pm). The process is simple:

```text
$ mix hex.publish
```

This command publishes both the package and its documentation. Anyone can then read your docs at `https://hexdocs.pm/your_package`.

For private packages in organizations, Hex supports private documentation as well. The key takeaway: if you write good `@moduledoc` and `@doc` strings, HexDocs handles the rest.
{{< /concept >}}

## Documentation Best Practices

A well-documented module follows a consistent structure:

```elixir
defmodule MyApp.Cache do
  @moduledoc """
  An in-memory key-value cache backed by ETS.

  The cache is started as part of the application supervision tree
  and is available throughout the application lifetime. Keys can be
  any term, and values are stored with an optional TTL (time to live).

  ## Examples

      MyApp.Cache.put(:user_123, %{name: "Alice"}, ttl: :timer.minutes(5))
      MyApp.Cache.get(:user_123)
      #=> {:ok, %{name: "Alice"}}

  ## Configuration

  The cache table name can be configured in `config.exs`:

      config :my_app, MyApp.Cache, table: :my_custom_table
  """

  @doc """
  Retrieves a value from the cache by key.

  Returns `{:ok, value}` if the key exists and has not expired,
  or `:error` if the key is missing or expired.

  ## Examples

      iex> MyApp.Cache.put(:key, "value")
      iex> MyApp.Cache.get(:key)
      {:ok, "value"}

      iex> MyApp.Cache.get(:nonexistent)
      :error
  """
  @spec get(term()) :: {:ok, term()} | :error
  def get(key) do
    # implementation
  end

  @doc """
  Stores a value in the cache under the given key.

  ## Options

    - `:ttl` - Time to live in milliseconds. Defaults to `:infinity`.

  ## Examples

      iex> MyApp.Cache.put(:key, "value")
      :ok

      iex> MyApp.Cache.put(:temp, "data", ttl: 5000)
      :ok
  """
  @spec put(term(), term(), keyword()) :: :ok
  def put(key, value, opts \\ []) do
    # implementation
  end
end
```

{{< exercise title="Document a Module" >}}
Take this undocumented module and add complete documentation:

```elixir
defmodule Temperature do
  def c_to_f(celsius), do: celsius * 9 / 5 + 32
  def f_to_c(fahrenheit), do: (fahrenheit - 32) * 5 / 9
  def c_to_k(celsius), do: celsius + 273.15
  def k_to_c(kelvin), do: kelvin - 273.15
end
```

Add the following:

1. A `@moduledoc` with a description and usage examples
2. A `@doc` for each function with a description and at least one doctest example
3. A `@spec` for each function
4. A custom `@type` for `scale :: :celsius | :fahrenheit | :kelvin`
5. Add `{:ex_doc, "~> 0.31", only: :dev, runtime: false}` to your `mix.exs` deps
6. Run `mix docs` and open the generated HTML in your browser

Verify your doctests pass by adding `doctest Temperature` to your test file and running `mix test`.
{{< /exercise >}}

## Summary

Elixir's documentation system is built into the language through `@moduledoc`, `@doc`, and `@typedoc` attributes. Documentation supports full Markdown formatting, cross-references between modules, and executable examples via doctests. Typespecs with `@spec` and `@type` add machine-readable type information that tools like Dialyzer can verify. ExDoc generates polished HTML documentation that is automatically published to HexDocs when you release a Hex package. Good documentation is a hallmark of the Elixir ecosystem -- invest the time and your future self (and your users) will thank you.

The next lesson covers error handling patterns, including the `{:ok, value}` / `{:error, reason}` convention that you have seen throughout the documentation examples.
