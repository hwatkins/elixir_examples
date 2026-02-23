---
title: "Pattern Matching"
description: "Master Elixir's pattern matching -- the match operator, destructuring tuples, lists, and maps, the pin operator, and matching in function heads."
weight: 3
phase: 1
lesson: 3
difficulty: beginner
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/01-foundations/02-basic-types"
hexdocsLinks:
  - title: "Pattern Matching Guide"
    url: "https://hexdocs.pm/elixir/pattern-matching.html"
  - title: "Kernel Module"
    url: "https://hexdocs.pm/elixir/Kernel.html"
tags:
  - pattern-matching
  - destructuring
  - match-operator
  - pin-operator
  - function-heads
keyTakeaways:
  - "The `=` operator is the match operator, not assignment -- it binds variables on the left to values on the right"
  - "Destructuring lets you extract values from tuples, lists, and maps in a single expression"
  - "The pin operator `^` prevents rebinding and forces a match against a variable's current value"
  - "Functions can have multiple clauses that pattern match on their arguments, eliminating the need for conditional logic"
  - "Pattern matching is used everywhere in Elixir: function heads, `case`, `with`, and more"
---

## The Match Operator

In most programming languages, `=` means "assign the value on the right to the variable on the left." In Elixir, `=` is the **match operator**. It still binds variables, but it does much more.

{{< iex >}}
iex> x = 1
1
iex> 1 = x
1
iex> 2 = x
** (MatchError) no match of right hand side value: 1
{{< /iex >}}

The first line binds `x` to `1` -- this looks like assignment. But the second line reveals what is really happening: Elixir checks whether the left side matches the right side. Since `x` is `1`, the expression `1 = x` succeeds. The third line fails because `2` does not match `1`.

{{< concept title="Matching, Not Assigning" >}}
Think of `=` as an assertion: "the left side must match the right side." When the left side contains unbound variables, Elixir binds them to make the match succeed. When the left side is a literal or an already-bound variable (using `^`), it checks for equality. This single operator replaces both assignment and several forms of conditional checking found in other languages.
{{< /concept >}}

## Destructuring Tuples

Pattern matching becomes powerful when you destructure complex data structures. Tuples are the most common target:

```elixir
# Basic tuple destructuring
{a, b, c} = {1, 2, 3}
# a => 1, b => 2, c => 3

# Extracting values from function returns
{:ok, content} = File.read("mix.exs")
# content now holds the file's contents

# Matching on a specific atom
{:ok, result} = {:ok, 42}
# result => 42

{:ok, result} = {:error, :not_found}
# ** (MatchError) no match of right hand side value: {:error, :not_found}
```

The last example is a deliberate pattern: by matching on `{:ok, result}`, your code will crash immediately if the function returns an error. This is often what you want -- fail fast rather than silently propagating bad data.

{{< iex >}}
iex> {:ok, content} = File.read("mix.exs")
{:ok, "defmodule ..."}
iex> content
"defmodule ..."
iex> {:ok, content} = File.read("nonexistent.txt")
** (MatchError) no match of right hand side value: {:error, :enoent}
{{< /iex >}}

## Destructuring Lists

Lists can be matched by their structure. The `[head | tail]` syntax splits a list into its first element and the remaining elements:

```elixir
# Match exact list
[a, b, c] = [1, 2, 3]
# a => 1, b => 2, c => 3

# Head and tail
[head | tail] = [1, 2, 3, 4]
# head => 1, tail => [2, 3, 4]

# First two elements
[first, second | rest] = [1, 2, 3, 4, 5]
# first => 1, second => 2, rest => [3, 4, 5]

# Empty tail
[only | rest] = [42]
# only => 42, rest => []

# Cannot match empty list with head|tail
[head | tail] = []
# ** (MatchError) no match of right hand side value: []
```

The `[head | tail]` pattern is fundamental to recursive programming in Elixir. You will see it frequently in functions that process lists element by element.

## Destructuring Maps

Maps can be partially matched -- you only need to specify the keys you care about:

```elixir
# Partial match (map can have extra keys)
%{name: name} = %{name: "Alice", age: 30, city: "Portland"}
# name => "Alice"

# Multiple keys
%{name: name, age: age} = %{name: "Alice", age: 30, city: "Portland"}
# name => "Alice", age => 30

# Nested destructuring
%{address: %{city: city}} = %{name: "Alice", address: %{city: "Portland", state: "OR"}}
# city => "Portland"

# Empty map matches any map
%{} = %{name: "Alice", age: 30}
# succeeds
```

{{< callout type="tip" >}}
Map pattern matching is **partial**: `%{name: name}` matches any map that has a `:name` key, regardless of what other keys are present. This is different from tuples and lists, where the structure must match exactly.
{{< /callout >}}

## Comparing Destructuring Across Languages

{{% compare %}}
```python
# Python destructuring
a, b, c = (1, 2, 3)
first, *rest = [1, 2, 3, 4]
name = {"name": "Alice", "age": 30}["name"]

# No built-in match failure
```

```javascript
// JavaScript destructuring
const [a, b, c] = [1, 2, 3];
const [first, ...rest] = [1, 2, 3, 4];
const { name } = { name: "Alice", age: 30 };

// No match failure -- undefined if missing
```

```elixir
# Elixir pattern matching
{a, b, c} = {1, 2, 3}
[first | rest] = [1, 2, 3, 4]
%{name: name} = %{name: "Alice", age: 30}

# Raises MatchError on mismatch!
{:ok, val} = {:error, :oops}  # crash!
```
{{% /compare %}}

The key difference is that Elixir's match operator enforces constraints. In JavaScript, destructuring a missing key silently gives you `undefined`. In Elixir, a match failure raises a `MatchError`. This strictness prevents bugs from propagating.

## The Underscore Variable

Use `_` to ignore values you do not need. Any variable starting with underscore signals that it is intentionally unused:

```elixir
{_, second, _} = {1, 2, 3}
# second => 2

[_ | tail] = [1, 2, 3]
# tail => [2, 3]

{:ok, _result} = {:ok, "some value"}
# _result is bound but signals "I don't plan to use this"
```

The bare `_` is truly discarded -- you cannot reference it. Variables prefixed with `_` (like `_result`) are bound but the prefix tells the compiler not to warn about them being unused.

## The Pin Operator

By default, variables on the left side of `=` are rebound to new values. The pin operator `^` prevents this, forcing a match against the variable's current value:

{{< iex >}}
iex> x = 1
1
iex> x = 2
2
iex> ^x = 3
** (MatchError) no match of right hand side value: 3
iex> ^x = 2
2
{{< /iex >}}

Without `^`, `x = 3` would rebind `x` to `3`. With `^x`, Elixir matches the right side against `x`'s current value (`2`), which fails because `3 != 2`.

The pin operator is most useful inside more complex patterns:

```elixir
expected_status = :ok

# Pin to match against the variable's value
{^expected_status, result} = {:ok, 42}
# result => 42

{^expected_status, result} = {:error, "oops"}
# ** (MatchError) -- :error does not match :ok
```

{{< callout type="note" >}}
You will use the pin operator frequently in database queries (Ecto), `case` expressions, and anywhere you need to match against a previously computed value rather than rebinding a variable.
{{< /callout >}}

## Pattern Matching in Function Heads

One of Elixir's most distinctive features is using pattern matching to define multiple clauses of the same function. The runtime tries each clause in order and executes the first one that matches:

```elixir
defmodule Greeting do
  def say(:morning), do: "Good morning!"
  def say(:afternoon), do: "Good afternoon!"
  def say(:evening), do: "Good evening!"
  def say(_), do: "Hello!"
end
```

{{< iex >}}
iex> Greeting.say(:morning)
"Good morning!"
iex> Greeting.say(:evening)
"Good evening!"
iex> Greeting.say(:midnight)
"Hello!"
{{< /iex >}}

This replaces the `if/else` chains or `switch` statements you might write in other languages. Each clause is a self-contained definition of behavior for a specific input shape.

Here is a more practical example that processes the `{:ok, value}` / `{:error, reason}` convention:

```elixir
defmodule FileReader do
  def read_and_upcase(path) do
    path
    |> File.read()
    |> handle_result()
  end

  defp handle_result({:ok, content}) do
    String.upcase(content)
  end

  defp handle_result({:error, reason}) do
    "Failed to read file: #{reason}"
  end
end
```

Each `handle_result` clause matches a different tuple shape. There is no `if` statement deciding which branch to take -- the pattern match handles it.

### Matching on Multiple Arguments

Pattern matching works across all arguments simultaneously:

```elixir
defmodule Math do
  def divide(_, 0), do: {:error, :division_by_zero}
  def divide(a, b), do: {:ok, a / b}
end
```

{{< iex >}}
iex> Math.divide(10, 2)
{:ok, 5.0}
iex> Math.divide(10, 0)
{:error, :division_by_zero}
{{< /iex >}}

The first clause catches division by zero before it happens. Order matters: if you reversed the clauses, the second pattern (`divide(a, b)`) would match everything, and the zero-check would never execute.

{{< callout type="warning" >}}
Always place more specific patterns before more general ones. The Elixir compiler will warn you if a clause can never be reached because a previous clause always matches.
{{< /callout >}}

## Combining Patterns

You can combine all these techniques in a single match:

```elixir
defmodule UserParser do
  def parse(%{name: name, role: :admin}) do
    "Admin: #{name}"
  end

  def parse(%{name: name, role: :user, email: email}) do
    "User: #{name} (#{email})"
  end

  def parse(%{name: name}) do
    "Guest: #{name}"
  end
end
```

{{< iex >}}
iex> UserParser.parse(%{name: "Alice", role: :admin, email: "alice@example.com"})
"Admin: Alice"
iex> UserParser.parse(%{name: "Bob", role: :user, email: "bob@example.com"})
"User: Bob (bob@example.com)"
iex> UserParser.parse(%{name: "Charlie"})
"Guest: Charlie"
{{< /iex >}}

Notice how the first clause matches any map with `role: :admin`, regardless of what other keys are present. The third clause is the catch-all, requiring only a `:name` key.

{{< exercise title="Practice Pattern Matching" >}}
Create a module called `Calculator` with a function `compute/1` that takes a tuple and returns the result:

1. `{:add, a, b}` should return `a + b`
2. `{:subtract, a, b}` should return `a - b`
3. `{:multiply, a, b}` should return `a * b`
4. `{:divide, a, 0}` should return `{:error, :division_by_zero}`
5. `{:divide, a, b}` should return `a / b`
6. Any other input should return `{:error, :unknown_operation}`

Test your module in IEx:

```elixir
Calculator.compute({:add, 3, 5})           # => 8
Calculator.compute({:divide, 10, 0})       # => {:error, :division_by_zero}
Calculator.compute({:power, 2, 3})         # => {:error, :unknown_operation}
```

**Hint:** Remember that clause order matters. The `{:divide, a, 0}` clause must appear before the general `{:divide, a, b}` clause.
{{< /exercise >}}

## What's Next

Pattern matching is the foundation of idiomatic Elixir code. You will use it in every module you write. In the next lesson, you will learn about control flow constructs -- `case`, `cond`, `if`, and `with` -- all of which build on the pattern matching concepts you have just learned.
