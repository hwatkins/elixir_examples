---
title: "Protocols and Behaviours"
description: "Learn how Elixir achieves polymorphism through protocols and defines contracts with behaviours. Implement custom protocols and derive built-in ones like Enumerable."
weight: 1
phase: 5
lesson: 21
difficulty: "advanced"
estimatedMinutes: 30
draft: false
date: 2025-02-23
prerequisites:
  - "/04-practical-development/05-io-and-files"
hexdocsLinks:
  - title: "Protocol"
    url: "https://hexdocs.pm/elixir/Protocol.html"
  - title: "Behaviour"
    url: "https://hexdocs.pm/elixir/typespecs.html#behaviours"
  - title: "Enumerable Protocol"
    url: "https://hexdocs.pm/elixir/Enumerable.html"
tags:
  - protocols
  - behaviours
  - polymorphism
  - defprotocol
  - defimpl
  - callbacks
---

Elixir provides two complementary mechanisms for defining contracts and achieving polymorphism: **protocols** and **behaviours**. Protocols dispatch based on the data type of the first argument, giving you ad-hoc polymorphism without inheritance. Behaviours define a set of function signatures that a module must implement, acting as a compile-time contract.

Understanding when to reach for each one is a key skill for writing extensible Elixir code.

## Protocols: Data-Driven Polymorphism

A protocol defines a set of functions that can be implemented differently for each data type. When you call a protocol function, Elixir looks at the type of the first argument and dispatches to the correct implementation.

{{< concept title="Protocols vs Interfaces" >}}
If you come from an object-oriented background, protocols are similar to interfaces -- but with an important difference. In OOP, a class must declare that it implements an interface at definition time. With Elixir protocols, you can implement a protocol for a type **after** that type has been defined, even for types you did not write. This is called **ad-hoc polymorphism**.
{{< /concept >}}

### Defining a Protocol

Use `defprotocol` to declare the function signatures, then `defimpl` to provide type-specific implementations.

```elixir
defprotocol Describable do
  @doc "Returns a human-readable description of the value"
  @fallback_to_any true
  def describe(value)
end

defimpl Describable, for: Integer do
  def describe(value), do: "the integer #{value}"
end

defimpl Describable, for: BitString do
  def describe(value), do: "the string \"#{value}\""
end

defimpl Describable, for: List do
  def describe(value), do: "a list with #{length(value)} element(s)"
end

defimpl Describable, for: Any do
  def describe(value), do: "a #{inspect(value)}"
end
```

{{< iex >}}
iex> Describable.describe(42)
"the integer 42"
iex> Describable.describe("hello")
"the string \"hello\""
iex> Describable.describe([1, 2, 3])
"a list with 3 element(s)"
iex> Describable.describe({:ok, "result"})
"a {:ok, \"result\"}"
{{< /iex >}}

### Implementing Protocols for Structs

Protocols are especially powerful with structs. Each struct is its own type for protocol dispatch.

```elixir
defmodule User do
  defstruct [:name, :email]
end

defmodule Product do
  defstruct [:name, :price]
end

defimpl Describable, for: User do
  def describe(%User{name: name, email: email}) do
    "user #{name} (#{email})"
  end
end

defimpl Describable, for: Product do
  def describe(%Product{name: name, price: price}) do
    "product #{name} at $#{price}"
  end
end
```

{{< iex >}}
iex> Describable.describe(%User{name: "Alice", email: "alice@example.com"})
"user Alice (alice@example.com)"
iex> Describable.describe(%Product{name: "Widget", price: 9.99})
"product Widget at $9.99"
{{< /iex >}}

### Built-in Protocols

Elixir ships with several protocols that you can implement for your own types.

{{% compare %}}
```elixir {title="String.Chars"}
# Enables to_string/1 and string interpolation
defimpl String.Chars, for: User do
  def to_string(%User{name: name}) do
    name
  end
end

# Now you can do:
"Hello, #{%User{name: "Alice", email: "a@b.com"}}"
# => "Hello, Alice"
```

```elixir {title="Inspect"}
# Controls how a value appears in inspect/1 and IEx
defimpl Inspect, for: User do
  def inspect(%User{name: name}, _opts) do
    "#User<#{name}>"
  end
end

# Now in IEx:
# iex> %User{name: "Alice", email: "a@b.com"}
# #User<Alice>
```

```elixir {title="Enumerable"}
# Makes your type work with Enum and Stream
# Requires implementing: count/1, member?/2,
# reduce/3, and slice/1
defimpl Enumerable, for: Countdown do
  def count(%Countdown{from: n}), do: {:ok, n + 1}
  def member?(%Countdown{from: n}, el),
    do: {:ok, el in 0..n}
  def slice(_), do: {:error, __MODULE__}
  def reduce(%Countdown{from: n}, acc, fun) do
    Enumerable.List.reduce(Enum.to_list(n..0//-1), acc, fun)
  end
end
```
{{% /compare %}}

{{< callout type="tip" >}}
The `@fallback_to_any true` annotation in a protocol allows a default `Any` implementation to catch unhandled types. Without it, calling the protocol on an unimplemented type raises a `Protocol.UndefinedError`.
{{< /callout >}}

### Protocol Consolidation

In development, protocol dispatch performs a lookup at runtime. In production releases, Elixir **consolidates** protocols at compile time, mapping each known type to its implementation directly. This makes protocol dispatch very fast.

```elixir
# Mix automatically consolidates protocols for :prod
# You can check consolidation status:
Protocol.consolidated?(Enumerable)
# => true (in a compiled release)

# In config/config.exs you can control this:
# config :my_app, consolidate_protocols: true
```

{{< callout type="note" >}}
Protocol consolidation happens automatically when you build a release with `mix release` or when `MIX_ENV=prod`. In development mode, protocols are not consolidated so that new implementations can be picked up without recompilation.
{{< /callout >}}

## Behaviours: Module-Level Contracts

While protocols dispatch on data types, behaviours define a contract that a **module** must fulfil. A behaviour declares a set of callback functions with their type signatures, and any module that adopts the behaviour must implement all of them.

### Defining a Behaviour

```elixir
defmodule Parser do
  @doc "Parses raw input into structured data"
  @callback parse(input :: String.t()) :: {:ok, term()} | {:error, String.t()}

  @doc "Returns the list of supported file extensions"
  @callback extensions() :: [String.t()]
end
```

### Implementing a Behaviour

```elixir
defmodule JSONParser do
  @behaviour Parser

  @impl Parser
  def parse(input) do
    case Jason.decode(input) do
      {:ok, data} -> {:ok, data}
      {:error, _} -> {:error, "invalid JSON"}
    end
  end

  @impl Parser
  def extensions, do: [".json"]
end

defmodule CSVParser do
  @behaviour Parser

  @impl Parser
  def parse(input) do
    rows =
      input
      |> String.split("\n", trim: true)
      |> Enum.map(&String.split(&1, ","))

    {:ok, rows}
  end

  @impl Parser
  def extensions, do: [".csv"]
end
```

{{< concept title="@impl Annotations" >}}
The `@impl Parser` annotation is optional but strongly recommended. It tells the compiler that the function is an implementation of a behaviour callback. If you accidentally misspell a callback name or get the arity wrong, the compiler will warn you -- catching bugs before they reach runtime.
{{< /concept >}}

### Using Behaviours for Dispatch

A common pattern is to select a behaviour implementation at runtime based on configuration or input:

```elixir
defmodule ParserRouter do
  @parsers %{
    ".json" => JSONParser,
    ".csv"  => CSVParser
  }

  def parse_file(path) do
    ext = Path.extname(path)

    case Map.fetch(@parsers, ext) do
      {:ok, parser} -> parser.parse(File.read!(path))
      :error        -> {:error, "unsupported format: #{ext}"}
    end
  end
end
```

{{< iex >}}
iex> CSVParser.parse("name,age\nAlice,30\nBob,25")
{:ok, [["name", "age"], ["Alice", "30"], ["Bob", "25"]]}
iex> CSVParser.extensions()
[".csv"]
{{< /iex >}}

## Protocols vs Behaviours

{{% compare %}}
```elixir {title="Protocol"}
# Dispatches based on DATA TYPE
# Define once, implement per type
# Used for: polymorphic operations on data

defprotocol Serializable do
  def serialize(data)
end

defimpl Serializable, for: Map do
  def serialize(map), do: Jason.encode!(map)
end

# Calling:
Serializable.serialize(%{a: 1})
```

```elixir {title="Behaviour"}
# Defines a MODULE CONTRACT
# Each module opts in with @behaviour
# Used for: pluggable implementations

defmodule Storage do
  @callback store(key :: String.t(), value :: term()) :: :ok
  @callback fetch(key :: String.t()) :: {:ok, term()} | :error
end

defmodule DiskStorage do
  @behaviour Storage
  @impl Storage
  def store(key, value), do: # ...
  @impl Storage
  def fetch(key), do: # ...
end
```
{{% /compare %}}

{{< callout type="important" >}}
Choose **protocols** when the dispatch decision depends on the **data type** of the argument (e.g., "how do I convert this value to a string?"). Choose **behaviours** when you need interchangeable **modules** that conform to a contract (e.g., "any module that can store and fetch data").
{{< /callout >}}

{{< exercise title="Build a Printable Protocol" >}}
1. Define a `Printable` protocol with a single function `to_formatted_string/1`.
2. Create two structs: `Circle` (with a `:radius` field) and `Rectangle` (with `:width` and `:height` fields).
3. Implement `Printable` for both structs so that:
   - `Circle` returns `"Circle(r=5.0)"` (using the actual radius)
   - `Rectangle` returns `"Rectangle(3.0x4.0)"` (using actual dimensions)
4. Implement `Printable` for `Any` that returns `"Unknown shape"`.
5. Bonus: Also define a `Shape` behaviour with a `@callback area(t()) :: float()` and implement it in both struct modules.

```elixir
# Your starting point:
defprotocol Printable do
  # Define the function here
end

defmodule Circle do
  defstruct [:radius]
  # Implement Printable and optionally Shape
end

defmodule Rectangle do
  defstruct [:width, :height]
  # Implement Printable and optionally Shape
end
```
{{< /exercise >}}

## Summary

Protocols and behaviours are two sides of Elixir's approach to polymorphism and contracts. Protocols give you type-based dispatch that is extensible after the fact -- you can implement a protocol for types you did not define. Behaviours give you compile-time guarantees that a module provides the functions your system expects. Together, they let you build flexible, well-structured systems without the coupling that comes with inheritance hierarchies.
