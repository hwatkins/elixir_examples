---
title: "Metaprogramming"
description: "Understand Elixir metaprogramming -- the AST, quote/unquote, writing macros, compile-time code generation, and when to use macros vs functions."
weight: 3
phase: 5
lesson: 23
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-02-23
prerequisites:
  - "/05-advanced-topics/02-typespecs"
hexdocsLinks:
  - title: "Macros"
    url: "https://hexdocs.pm/elixir/macros.html"
  - title: "Quote and unquote"
    url: "https://hexdocs.pm/elixir/quote-and-unquote.html"
  - title: "Kernel.defmacro"
    url: "https://hexdocs.pm/elixir/Kernel.html#defmacro/2"
tags:
  - metaprogramming
  - macros
  - quote
  - unquote
  - AST
  - compile-time
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Metaprogramming is the art of writing code that writes code. In Elixir, metaprogramming is built on a simple idea: Elixir code can be represented as Elixir data structures. This representation is called the **Abstract Syntax Tree** (AST), and macros are functions that receive AST fragments and return new AST fragments at compile time.

Elixir itself is heavily built on its own macro system -- constructs like `if`, `def`, `defmodule`, and even `|>` are macros. Understanding metaprogramming helps you understand the language at a deeper level and gives you the power to extend it when needed.

{{< callout type="warning" >}}
Metaprogramming is powerful but should be used sparingly. The first rule of macros: **do not write a macro when a function will do**. Macros make code harder to read, debug, and reason about. Reach for them only when you need compile-time code generation or when there is no way to achieve the same result with functions.
{{< /callout >}}

## The Abstract Syntax Tree

Every piece of Elixir code can be represented as a three-element tuple: `{function_or_operator, metadata, arguments}`.

{{< iex >}}
iex> quote do: 1 + 2
{:+, [context: Elixir, imports: [{1, Kernel}]], [1, 2]}
iex> quote do: sum(1, 2, 3)
{:sum, [], [1, 2, 3]}
iex> quote do: %{name: "Alice"}
{:%{}, [], [name: "Alice"]}
{{< /iex >}}

{{< concept title="The Shape of the AST" >}}
Elixir's AST has a consistent shape. Every node is one of:

- A **literal**: atoms, numbers, strings, lists of literals, or two-element tuples of literals are represented as themselves.
- A **three-tuple**: `{atom, keyword_list, list}` where the first element is the function/operator name, the second is metadata (like line numbers), and the third is the list of arguments.
- A **two-element tuple** of non-literals: `{left, right}` where both elements are AST nodes.

This regularity is what makes Elixir's macro system tractable. You are always working with the same simple data structures.
{{< /concept >}}

### Exploring the AST with quote

The `quote` special form converts code into its AST representation. The `unquote` special form injects a value back into a quoted expression.

```elixir
# quote converts code to AST
ast = quote do
  Enum.map([1, 2, 3], fn x -> x * 2 end)
end

# Macro.to_string converts AST back to readable code
Macro.to_string(ast)
# => "Enum.map([1, 2, 3], fn x -> x * 2 end)"

# unquote injects values into quoted code
name = :hello
ast = quote do
  def unquote(name)() do
    "world"
  end
end

Macro.to_string(ast)
# => "def hello() do\n  \"world\"\nend"
```

{{< iex >}}
iex> x = 10
10
iex> quote do: x + 1
{:+, [context: Elixir, imports: [{1, Kernel}]], [{:x, [], Elixir}, 1]}
iex> quote do: unquote(x) + 1
{:+, [context: Elixir, imports: [{1, Kernel}]], [10, 1]}
{{< /iex >}}

Notice the difference: without `unquote`, `x` becomes the AST node `{:x, [], Elixir}` (a reference to the variable). With `unquote`, the value `10` is injected directly.

## Writing Macros

A macro is defined with `defmacro`. It receives AST fragments as arguments and must return an AST fragment that will replace the macro call at compile time.

### A Simple Macro

```elixir
defmodule MyMacros do
  defmacro unless(condition, do: block) do
    quote do
      if !unquote(condition) do
        unquote(block)
      end
    end
  end
end
```

Using the macro:

```elixir
require MyMacros

MyMacros.unless false do
  IO.puts("This runs because the condition is false")
end
# Prints: This runs because the condition is false
```

{{< callout type="note" >}}
You must `require` a module before using its macros. This ensures the module is compiled first so its macros are available at compile time. The `import` directive also implicitly requires the module.
{{< /callout >}}

### Macro Hygiene

Elixir macros are **hygienic** by default. Variables defined inside a macro do not leak into the caller's scope, and vice versa.

{{% compare %}}
```elixir {title="Hygienic (default)"}
defmacro hygienic_example do
  quote do
    x = 42
    x
  end
end

# In the caller:
x = 10
result = hygienic_example()
# result is 42
# x is still 10 -- the macro's x is separate
```

```elixir {title="Unhygienic (explicit)"}
defmacro unhygienic_example do
  quote do
    # var! breaks hygiene deliberately
    var!(x) = 42
  end
end

# In the caller:
x = 10
unhygienic_example()
# x is now 42 -- the macro modified the caller's x
```
{{% /compare %}}

{{< callout type="important" >}}
Breaking macro hygiene with `var!` should be rare and well-documented. It makes the macro's effect on the caller's scope invisible, which creates confusing, hard-to-debug code. If you find yourself using `var!`, consider whether a function would be a better approach.
{{< /callout >}}

### Compile-Time vs Runtime

A critical distinction: macro code runs at **compile time**, and the AST it returns is executed at **runtime**. Anything outside `quote` blocks executes during compilation.

```elixir
defmodule Timestamps do
  defmacro compiled_at do
    # This runs at COMPILE TIME
    now = DateTime.utc_now() |> DateTime.to_string()
    IO.puts("Macro expanding at compile time: #{now}")

    # This AST executes at RUNTIME
    quote do
      unquote(now)
    end
  end
end

defmodule MyApp do
  require Timestamps

  def when_compiled do
    # The timestamp is baked in at compile time
    Timestamps.compiled_at()
  end
end

# No matter when you call MyApp.when_compiled(),
# it always returns the same compile-time timestamp
```

## The use Macro Pattern

The `use` macro is one of the most important metaprogramming patterns in Elixir. When you write `use SomeModule`, Elixir calls `SomeModule.__using__/1`, which is a macro that injects code into the calling module.

```elixir
defmodule Validatable do
  defmacro __using__(_opts) do
    quote do
      import Validatable, only: [validate: 2]
      Module.register_attribute(__MODULE__, :validations, accumulate: true)
      @before_compile Validatable
    end
  end

  defmacro validate(field, rule) do
    quote do
      @validations {unquote(field), unquote(rule)}
    end
  end

  defmacro __before_compile__(env) do
    validations = Module.get_attribute(env.module, :validations)

    quote do
      def __validations__, do: unquote(Macro.escape(validations))

      def valid?(struct) do
        Enum.all?(__validations__(), fn {field, rule} ->
          value = Map.get(struct, field)
          apply_rule(value, rule)
        end)
      end

      defp apply_rule(value, :required), do: value != nil && value != ""
      defp apply_rule(value, {:min_length, n}) when is_binary(value), do: String.length(value) >= n
      defp apply_rule(_, _), do: true
    end
  end
end

defmodule UserProfile do
  defstruct [:name, :email]
  use Validatable

  validate :name, :required
  validate :email, :required
  validate :name, {:min_length, 2}
end
```

{{< iex >}}
iex> UserProfile.valid?(%UserProfile{name: "Al", email: "a@b.com"})
true
iex> UserProfile.valid?(%UserProfile{name: "", email: "a@b.com"})
false
iex> UserProfile.__validations__()
[{:name, {:min_length, 2}}, {:email, :required}, {:name, :required}]
{{< /iex >}}

## Practical Macro Techniques

### Generating Functions from Data

Macros shine when you need to generate repetitive function definitions from data:

```elixir
defmodule HTTPStatus do
  @statuses [
    {200, :ok, "OK"},
    {201, :created, "Created"},
    {301, :moved_permanently, "Moved Permanently"},
    {400, :bad_request, "Bad Request"},
    {404, :not_found, "Not Found"},
    {500, :internal_server_error, "Internal Server Error"}
  ]

  for {code, atom, message} <- @statuses do
    def code(unquote(atom)), do: unquote(code)
    def reason(unquote(code)), do: unquote(message)
    def atom(unquote(code)), do: unquote(atom)
  end

  def code(_), do: :unknown
  def reason(_), do: "Unknown"
  def atom(_), do: :unknown
end
```

{{< iex >}}
iex> HTTPStatus.code(:not_found)
404
iex> HTTPStatus.reason(200)
"OK"
iex> HTTPStatus.atom(500)
:internal_server_error
{{< /iex >}}

{{< concept title="When to Use Macros" >}}
Good reasons to use macros:

- **Eliminating boilerplate**: generating repetitive function clauses from data (like the HTTP status example).
- **Building DSLs**: creating domain-specific syntax (like Ecto schemas or ExUnit tests).
- **Compile-time validation**: catching errors before runtime.
- **Accessing caller context**: when you need `__MODULE__`, `__ENV__`, or module attributes.

Bad reasons to use macros:

- **Performance optimization**: the compiler and BEAM VM handle this; macros rarely help.
- **Hiding complexity**: if a function can do the job, prefer it. Functions are easier to trace, test, and understand.
- **Code cleverness**: if a colleague cannot immediately understand what the macro does, reconsider.
{{< /concept >}}

### Debugging Macros

When writing macros, `Macro.to_string/1` and `Macro.expand/2` are your best friends:

```elixir
# See what a macro expands to
ast = quote do
  unless true do
    "hello"
  end
end

# View the unexpanded AST as a string
Macro.to_string(ast)
# => "unless true do\n  \"hello\"\nend"

# Expand the macro once
expanded = Macro.expand_once(ast, __ENV__)
Macro.to_string(expanded)
# => "if !true do\n  \"hello\"\nend"
```

{{< exercise title="Write a debug_value Macro" >}}
Create a macro called `debug_value` that takes an expression, prints both the source code of the expression and its result, then returns the result. This is useful for debugging pipelines.

For example:
```elixir
debug_value(2 + 3)
# Should print: [DEBUG] 2 + 3 = 5
# And return: 5

[1, 2, 3]
|> debug_value(Enum.map(&(&1 * 2)))
# Should print: [DEBUG] Enum.map(&(&1 * 2)) = [2, 4, 6]
# And return: [2, 4, 6]
```

Hints:
- Use `Macro.to_string/1` inside the macro (at compile time) to get the string representation of the expression.
- Use `unquote` to inject both the string and the expression into the runtime code.
- Use `IO.puts` or `IO.inspect` at runtime to print the output.

```elixir
defmodule Debug do
  defmacro debug_value(expr) do
    expr_string = Macro.to_string(expr)
    quote do
      result = unquote(expr)
      IO.puts("[DEBUG] #{unquote(expr_string)} = #{inspect(result)}")
      result
    end
  end
end
```

Extend it: make the macro accept an optional label, so `debug_value(x + 1, label: "step 2")` prints `[DEBUG step 2] x + 1 = 11`.
{{< /exercise >}}

## Summary

Elixir's metaprogramming system is built on three pillars: the AST (a uniform representation of code as data), `quote`/`unquote` (for constructing and interpolating AST fragments), and `defmacro` (for defining compile-time code transformations). The `use` pattern leverages `__using__/1` to inject functionality into modules, and it is the foundation for many libraries you will encounter.

The power of macros comes with responsibility. Write functions first, reach for macros only when you need compile-time code generation, and always prioritize readability. When used judiciously, macros let you build expressive, boilerplate-free APIs that feel like natural extensions of the language.

## FAQ and Troubleshooting

### Why is my Metaprogramming example failing even though the code looks right?
Most failures come from runtime context, not syntax: incorrect app configuration, missing dependencies, process lifecycle timing, or environment-specific settings. Re-run with smaller examples, inspect intermediate values, and verify each prerequisite from this lesson before combining patterns.

### How do I debug this topic in a production-like setup?
Start with reproducible local steps, add structured logs around boundaries, and isolate one moving part at a time. Prefer deterministic tests for the core logic, then layer integration checks for behavior that depends on supervisors, networked services, or external systems.

### What should I optimize first?
Prioritize correctness and observability before performance tuning. Once behavior is stable, profile the hot paths, remove unnecessary work, and only then introduce advanced optimizations.
