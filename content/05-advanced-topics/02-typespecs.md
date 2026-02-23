---
title: "Typespecs and Dialyzer"
description: "Add type annotations to your Elixir code with @spec and @type, and catch bugs at compile time using Dialyzer and Dialyxir for static analysis."
weight: 2
phase: 5
lesson: 22
difficulty: "advanced"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/05-advanced-topics/01-protocols-and-behaviours"
hexdocsLinks:
  - title: "Typespecs"
    url: "https://hexdocs.pm/elixir/typespecs.html"
  - title: "Dialyzer"
    url: "https://www.erlang.org/doc/apps/dialyzer/dialyzer.html"
  - title: "Dialyxir"
    url: "https://hexdocs.pm/dialyxir/readme.html"
tags:
  - typespecs
  - dialyzer
  - static-analysis
  - spec
  - types
---

Elixir is a dynamically typed language, but it has a rich type annotation system built in. **Typespecs** let you document the expected types of function arguments and return values. **Dialyzer** is a static analysis tool that reads these annotations (along with inferred types) and detects type inconsistencies, unreachable code, and other defects -- all without running your program.

Typespecs serve double duty: they improve documentation and enable automated bug detection.

## Defining Type Specifications

### The @spec Attribute

The `@spec` attribute declares the types of a function's parameters and return value.

```elixir
defmodule Math do
  @spec add(number(), number()) :: number()
  def add(a, b), do: a + b

  @spec divide(number(), number()) :: {:ok, float()} | {:error, String.t()}
  def divide(_a, 0), do: {:error, "division by zero"}
  def divide(a, b), do: {:ok, a / b}

  @spec factorial(non_neg_integer()) :: pos_integer()
  def factorial(0), do: 1
  def factorial(n) when n > 0, do: n * factorial(n - 1)
end
```

{{< concept title="Typespecs Are Not Enforced at Runtime" >}}
Unlike languages with static type systems, Elixir does not check `@spec` annotations at runtime. A function annotated as `@spec greet(String.t()) :: String.t()` will happily accept an integer if called with one. The annotations exist for **documentation** and **static analysis** tools like Dialyzer. Think of them as machine-readable documentation that tooling can verify.
{{< /concept >}}

### Built-in Types

Elixir provides a wide set of built-in types for use in specs.

{{% compare %}}
```elixir {title="Basic Types"}
@spec example1() :: integer()       # ..., -1, 0, 1, ...
@spec example2() :: float()         # IEEE 754 floats
@spec example3() :: number()        # integer() | float()
@spec example4() :: boolean()       # true | false
@spec example5() :: atom()          # :ok, :error, etc.
@spec example6() :: String.t()      # UTF-8 binary string
@spec example7() :: binary()        # any binary
@spec example8() :: pid()           # process identifier
@spec example9() :: reference()     # make_ref() values
@spec example10() :: any()          # any type at all
@spec example11() :: term()         # alias for any()
@spec example12() :: no_return()    # function never returns
```

```elixir {title="Compound Types"}
@spec example13() :: list(integer())       # [1, 2, 3]
@spec example14() :: [integer()]           # same as above
@spec example15() :: {atom(), String.t()}  # {:ok, "hi"}
@spec example16() :: map()                 # any map
@spec example17() :: %{name: String.t()}   # map with key
@spec example18() :: keyword(integer())    # [a: 1, b: 2]
@spec example19() :: nil                   # nil literal
@spec example20() :: :ok | :error          # union of atoms
@spec example21() :: 1..100                # integer range
@spec example22() :: (integer() -> boolean()) # function type
```
{{% /compare %}}

### Defining Custom Types

Use `@type`, `@typep`, and `@opaque` to define reusable type names within a module.

```elixir
defmodule User do
  @type t :: %__MODULE__{
    name: String.t(),
    email: String.t(),
    age: non_neg_integer(),
    role: role()
  }

  @type role :: :admin | :editor | :viewer

  # Private type -- only visible within this module
  @typep internal_id :: pos_integer()

  # Opaque type -- visible to other modules by name,
  # but they should not inspect its internal structure
  @opaque token :: {internal_id(), String.t()}

  defstruct [:name, :email, :age, :role]

  @spec new(String.t(), String.t(), non_neg_integer(), role()) :: t()
  def new(name, email, age, role \\ :viewer) do
    %__MODULE__{name: name, email: email, age: age, role: role}
  end

  @spec admin?(t()) :: boolean()
  def admin?(%__MODULE__{role: :admin}), do: true
  def admin?(_user), do: false
end
```

{{< iex >}}
iex> user = User.new("Alice", "alice@example.com", 30, :admin)
%User{name: "Alice", email: "alice@example.com", age: 30, role: :admin}
iex> User.admin?(user)
true
iex> User.admin?(User.new("Bob", "bob@example.com", 25))
false
{{< /iex >}}

{{< callout type="tip" >}}
Using `@type t :: %__MODULE__{...}` is a strong Elixir convention for structs. It lets other modules write `User.t()` in their own specs, making the codebase self-documenting.
{{< /callout >}}

### Union Types and Complex Specs

Specs can express sophisticated type relationships using the `|` (union) operator.

```elixir
defmodule Config do
  @type value :: String.t() | integer() | boolean() | nil
  @type config :: %{optional(atom()) => value()}

  @spec get(config(), atom()) :: value()
  def get(config, key), do: Map.get(config, key)

  @spec get(config(), atom(), value()) :: value()
  def get(config, key, default), do: Map.get(config, key, default)

  @spec fetch!(config(), atom()) :: value()
  def fetch!(config, key) do
    case Map.fetch(config, key) do
      {:ok, val} -> val
      :error     -> raise KeyError, key: key, term: config
    end
  end
end
```

## Running Dialyzer

Dialyzer (DIscrepancy AnaLYZer for ERlang programs) performs static analysis on compiled BEAM bytecode. The easiest way to use it in an Elixir project is through the **Dialyxir** library.

### Setting Up Dialyxir

```elixir
# In mix.exs, add to deps:
defp deps do
  [
    {:dialyxir, "~> 1.4", only: [:dev, :test], runtime: false}
  ]
end
```

Then run:

```bash
# First run builds the PLT (Persistent Lookup Table)
# This takes several minutes but only happens once
mix dialyzer

# Subsequent runs are much faster
mix dialyzer
```

{{< callout type="warning" >}}
The first time you run `mix dialyzer`, it builds a PLT (Persistent Lookup Table) containing type information for Erlang/OTP, Elixir standard libraries, and your dependencies. This can take 5-15 minutes. Subsequent runs only analyze your changed code and are much faster.
{{< /callout >}}

### Common Dialyzer Warnings

Dialyzer can detect several categories of problems.

```elixir
defmodule Problematic do
  # Warning: function has no local return
  # (the function can never successfully return)
  @spec always_fails() :: :ok
  def always_fails do
    raise "boom"
    :ok  # unreachable code
  end

  # Warning: the pattern can never match
  @spec check(integer()) :: String.t()
  def check(x) when is_integer(x) do
    case x do
      _ when is_binary(x) -> x  # impossible -- x is an integer
      _ -> "number"
    end
  end

  # Warning: contract violation
  # The spec says String.t() but function returns an atom
  @spec name() :: String.t()
  def name, do: :alice
end
```

{{< iex >}}
iex> # Dialyzer output examples (from mix dialyzer):
iex> # lib/problematic.ex:5: Function always_fails/0 has no local return
iex> # lib/problematic.ex:12: The pattern can never match the type integer()
iex> # lib/problematic.ex:19: Invalid type specification for function name/0
{{< /iex >}}

### Dialyzer Configuration

You can configure Dialyzer in your `mix.exs` project definition:

```elixir
def project do
  [
    app: :my_app,
    # ... other config
    dialyzer: [
      plt_add_apps: [:mnesia],           # include extra apps in PLT
      flags: [
        :unmatched_returns,               # warn on ignored return values
        :error_handling,                   # warn on error handling issues
        :underspecs,                       # warn when spec is too broad
        :no_opaque                         # warn on opaque type violations
      ],
      ignore_warnings: ".dialyzer_ignore.exs"
    ]
  ]
end
```

{{< concept title="Dialyzer's Success Typing" >}}
Dialyzer uses a technique called **success typing** rather than traditional type inference. It only reports warnings when it can **prove** something is wrong. This means Dialyzer has no false positives -- if it reports a warning, there really is an issue. The tradeoff is that it can miss some bugs that a stricter type system would catch. Think of it as a "guaranteed problems" detector rather than a "complete correctness" verifier.
{{< /concept >}}

## Typespecs in Practice

### Documenting Callbacks with Specs

Typespecs work hand-in-hand with behaviours. The `@callback` attribute is essentially a `@spec` for behaviour functions:

```elixir
defmodule Cache do
  @type key :: String.t()
  @type value :: term()
  @type ttl :: pos_integer() | :infinity

  @callback get(key()) :: {:ok, value()} | :miss
  @callback put(key(), value(), ttl()) :: :ok
  @callback delete(key()) :: :ok

  @optional_callbacks [delete: 1]
end

defmodule ETSCache do
  @behaviour Cache

  @impl Cache
  @spec get(Cache.key()) :: {:ok, Cache.value()} | :miss
  def get(key) do
    case :ets.lookup(:cache, key) do
      [{^key, val}] -> {:ok, val}
      []            -> :miss
    end
  end

  @impl Cache
  @spec put(Cache.key(), Cache.value(), Cache.ttl()) :: :ok
  def put(key, value, _ttl) do
    :ets.insert(:cache, {key, value})
    :ok
  end
end
```

{{< exercise title="Add Typespecs to a Module" >}}
Take the following module and add complete type specifications:

1. Define a `@type t` for the `Account` struct.
2. Define a custom `@type currency` as a union of `:usd | :eur | :gbp`.
3. Add `@spec` to every function.
4. Run `mix dialyzer` (if you have a project set up) and fix any issues.

```elixir
defmodule Account do
  defstruct [:holder, :balance, :currency]

  def new(holder, currency \\ :usd) do
    %__MODULE__{holder: holder, balance: 0, currency: currency}
  end

  def deposit(%__MODULE__{balance: bal} = acct, amount) when amount > 0 do
    {:ok, %{acct | balance: bal + amount}}
  end

  def deposit(_acct, _amount), do: {:error, "amount must be positive"}

  def withdraw(%__MODULE__{balance: bal} = acct, amount)
      when amount > 0 and amount <= bal do
    {:ok, %{acct | balance: bal - amount}}
  end

  def withdraw(_acct, _amount), do: {:error, "insufficient funds or invalid amount"}

  def balance(%__MODULE__{balance: bal, currency: cur}) do
    {cur, bal}
  end
end
```
{{< /exercise >}}

## Summary

Typespecs bring structured type documentation to Elixir without sacrificing its dynamic nature. They serve as machine-readable documentation that helps both developers and tools understand your code. Dialyzer reads these annotations and uses success typing to find real bugs with zero false positives. The investment of adding `@spec`, `@type`, and `@callback` annotations pays off in clearer APIs, better documentation, and automated defect detection -- especially as your codebase grows.
