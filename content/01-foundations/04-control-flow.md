---
title: "Control Flow"
description: "Master Elixir's control flow constructs -- case, cond, if/unless, the with statement, and guard clauses. Includes practical examples with Python and JS comparisons."
weight: 4
phase: 1
lesson: 4
difficulty: beginner
estimatedMinutes: 20
draft: false
date: 2025-02-23
prerequisites:
  - "/01-foundations/03-pattern-matching"
hexdocsLinks:
  - title: "Kernel Module"
    url: "https://hexdocs.pm/elixir/Kernel.html"
  - title: "case, cond, and if Guide"
    url: "https://hexdocs.pm/elixir/case-cond-and-if.html"
tags:
  - control-flow
  - case
  - cond
  - if
  - unless
  - with
  - guards
keyTakeaways:
  - "`case` matches a value against multiple patterns -- it is the most common control flow construct"
  - "`cond` evaluates multiple conditions and executes the first truthy one -- use it when you do not have a single value to match against"
  - "`if`/`unless` are simple two-branch conditionals; prefer `case` or pattern matching for anything more complex"
  - "`with` chains multiple pattern matches together and short-circuits on the first failure"
  - "Guard clauses add extra conditions to patterns using `when`, enabling checks like type testing and range comparisons"
---

## Case

The `case` construct matches a value against a series of patterns. It is the workhorse of Elixir control flow and builds directly on the pattern matching you learned in the previous lesson.

```elixir
case File.read("config.json") do
  {:ok, content} ->
    Jason.decode!(content)

  {:error, :enoent} ->
    %{"defaults" => true}

  {:error, reason} ->
    raise "Failed to read config: #{reason}"
end
```

Each arrow clause (`->`) defines a pattern on the left and the code to execute on the right. Elixir evaluates the clauses top-to-bottom and executes the first one that matches.

{{< iex >}}
iex> value = {:ok, 42}
{:ok, 42}
iex> case value do
...>   {:ok, n} when n > 0 -> "positive: #{n}"
...>   {:ok, n} -> "non-positive: #{n}"
...>   {:error, reason} -> "error: #{reason}"
...> end
"positive: 42"
{{< /iex >}}

{{< concept title="Everything Is an Expression" >}}
In Elixir, `case`, `cond`, `if`, and `with` are all expressions that return values. There are no statements. This means you can bind the result of any control flow construct to a variable:

```elixir
message = case status do
  :ok -> "Success"
  :error -> "Failure"
end
```

This eliminates the need for mutable variables that get reassigned inside branches.
{{< /concept >}}

If no clause matches, Elixir raises a `CaseClauseError`:

```elixir
case :unexpected do
  :ok -> "ok"
  :error -> "error"
end
# ** (CaseClauseError) no case clause matching: :unexpected
```

Always include a catch-all clause (`_`) when the set of possible values is open-ended:

```elixir
case some_value do
  :ok -> "ok"
  :error -> "error"
  _ -> "something else"
end
```

## Guard Clauses

Guards add extra conditions to patterns using the `when` keyword. They appear in `case`, function heads, and other pattern-matching contexts.

```elixir
defmodule Classifier do
  def classify(n) when is_integer(n) and n > 0, do: :positive
  def classify(0), do: :zero
  def classify(n) when is_integer(n) and n < 0, do: :negative
  def classify(_), do: :not_an_integer
end
```

{{< iex >}}
iex> Classifier.classify(42)
:positive
iex> Classifier.classify(0)
:zero
iex> Classifier.classify(-7)
:negative
iex> Classifier.classify("hello")
:not_an_integer
{{< /iex >}}

Guards can also be used in `case`:

```elixir
case value do
  x when is_binary(x) and byte_size(x) > 0 ->
    "non-empty string"

  x when is_binary(x) ->
    "empty string"

  x when is_number(x) and x >= 0 ->
    "non-negative number"

  _ ->
    "something else"
end
```

{{< callout type="warning" >}}
Only a limited set of expressions is allowed in guards. You can use comparison operators (`==`, `!=`, `<`, `>`, etc.), type-check functions (`is_integer/1`, `is_binary/1`, etc.), arithmetic operators, boolean operators (`and`, `or`, `not`), and a few other functions like `abs/1`, `map_size/1`, `length/1`, `hd/1`, `tl/1`, and `elem/2`. Custom functions cannot appear in guards (unless defined with `defguard`).
{{< /callout >}}

Common guard functions:

```elixir
# Type checks
is_integer(x)
is_float(x)
is_number(x)
is_atom(x)
is_binary(x)     # strings
is_list(x)
is_map(x)
is_tuple(x)
is_nil(x)
is_boolean(x)

# Value checks
x in [1, 2, 3]    # membership (compile-time list only)
x > 0 and x < 100 # range check
byte_size(x) > 0   # non-empty string
map_size(x) == 0   # empty map
length(x) > 3      # list length (caution: O(n))
```

## Cond

When you need to evaluate multiple conditions that are not based on matching a single value, use `cond`:

```elixir
cond do
  age < 13 -> "child"
  age < 18 -> "teenager"
  age < 65 -> "adult"
  true -> "senior"
end
```

`cond` evaluates each condition top-to-bottom and executes the block for the first truthy result. The final `true ->` serves as a catch-all (like `else` in an `if/else` chain).

{{< iex >}}
iex> temperature = 35
35
iex> cond do
...>   temperature > 40 -> "extremely hot"
...>   temperature > 30 -> "hot"
...>   temperature > 20 -> "comfortable"
...>   temperature > 10 -> "cool"
...>   true -> "cold"
...> end
"hot"
{{< /iex >}}

When should you use `cond` versus `case`? Use `case` when you are matching against a single value's structure. Use `cond` when you have multiple unrelated boolean conditions.

## If and Unless

For simple two-branch decisions, Elixir provides `if` and `unless`:

```elixir
if age >= 18 do
  "You may enter"
else
  "You must be 18 or older"
end

unless authenticated? do
  "Please log in"
end
```

There is also a single-line form:

```elixir
if condition, do: "yes", else: "no"
```

{{< callout type="tip" >}}
Idiomatic Elixir uses `if` sparingly. Prefer pattern matching and `case` when there are more than two branches, or when the condition involves matching on data structure shapes. Reserve `if` for simple boolean checks.
{{< /callout >}}

### Comparing Control Flow Across Languages

{{% compare %}}
```python
# Python
if status == "ok":
    process(data)
elif status == "retry":
    retry(data)
else:
    raise ValueError(f"Unknown: {status}")
```

```javascript
// JavaScript
switch (status) {
  case "ok":
    process(data); break;
  case "retry":
    retry(data); break;
  default:
    throw new Error(`Unknown: ${status}`);
}
```

```elixir
# Elixir
case status do
  :ok -> process(data)
  :retry -> retry(data)
  other -> raise "Unknown: #{other}"
end
```
{{% /compare %}}

The Elixir version is an expression that returns a value, does not need `break` statements, and can destructure the matched value. Pattern matching makes it strictly more powerful than a traditional `switch`.

## With

The `with` construct chains multiple pattern matches together. It is designed for sequences of operations where each step can fail, and you want to short-circuit on the first failure.

Consider this common pattern of nested `case` expressions:

```elixir
# Without with -- deeply nested and hard to follow
case Map.fetch(params, :user_id) do
  {:ok, user_id} ->
    case Database.find_user(user_id) do
      {:ok, user} ->
        case authorize(user, :admin) do
          :ok -> {:ok, user}
          {:error, reason} -> {:error, reason}
        end
      {:error, reason} -> {:error, reason}
    end
  :error -> {:error, :missing_user_id}
end
```

The same logic with `with`:

```elixir
with {:ok, user_id} <- Map.fetch(params, :user_id),
     {:ok, user} <- Database.find_user(user_id),
     :ok <- authorize(user, :admin) do
  {:ok, user}
else
  :error -> {:error, :missing_user_id}
  {:error, reason} -> {:error, reason}
end
```

{{< concept title="How With Works" >}}
Each `<-` clause in a `with` expression performs a pattern match. If the match succeeds, execution continues to the next clause. If any match fails, the non-matching value is passed to the `else` block (if present) or returned directly.

Think of `with` as a pipeline of pattern matches. It is the idiomatic way to handle the "happy path" when multiple operations must succeed in sequence.
{{< /concept >}}

Here is a complete, practical example:

```elixir
defmodule UserRegistration do
  def register(params) do
    with {:ok, email} <- validate_email(params["email"]),
         {:ok, password} <- validate_password(params["password"]),
         {:ok, user} <- create_user(email, password),
         :ok <- send_welcome_email(user) do
      {:ok, user}
    else
      {:error, :invalid_email} -> {:error, "Please provide a valid email address"}
      {:error, :password_too_short} -> {:error, "Password must be at least 8 characters"}
      {:error, :email_taken} -> {:error, "An account with this email already exists"}
      {:error, reason} -> {:error, "Registration failed: #{reason}"}
    end
  end

  defp validate_email(nil), do: {:error, :invalid_email}
  defp validate_email(email) when is_binary(email) do
    if String.contains?(email, "@"), do: {:ok, email}, else: {:error, :invalid_email}
  end

  defp validate_password(nil), do: {:error, :password_too_short}
  defp validate_password(pw) when byte_size(pw) >= 8, do: {:ok, pw}
  defp validate_password(_), do: {:error, :password_too_short}

  defp create_user(email, _password) do
    # In a real app, this would write to a database
    {:ok, %{email: email, id: :rand.uniform(1000)}}
  end

  defp send_welcome_email(_user), do: :ok
end
```

{{< iex >}}
iex> UserRegistration.register(%{"email" => "alice@example.com", "password" => "secure123"})
{:ok, %{email: "alice@example.com", id: 742}}
iex> UserRegistration.register(%{"email" => "invalid", "password" => "secure123"})
{:error, "Please provide a valid email address"}
iex> UserRegistration.register(%{"email" => "bob@test.com", "password" => "short"})
{:error, "Password must be at least 8 characters"}
{{< /iex >}}

## Choosing the Right Construct

Here is a decision guide:

| Situation | Use |
|-----------|-----|
| Match a value against patterns | `case` |
| Multiple boolean conditions | `cond` |
| Simple true/false check | `if` / `unless` |
| Chain of operations that can fail | `with` |
| Different behavior per input shape | Function head pattern matching |

In practice, experienced Elixir developers use function head pattern matching and `case` for the vast majority of control flow. `with` is reserved for chaining fallible operations. `if` is used for simple guards. `cond` is the least common.

{{< exercise title="Build a Temperature Advisor" >}}
Create a module `Weather` with the following functions:

1. `describe(temp)` using `cond`:
   - Below 0: `"freezing"`
   - 0 to 15: `"cold"`
   - 16 to 25: `"comfortable"`
   - 26 to 35: `"hot"`
   - Above 35: `"extreme heat"`

2. `advise(weather_tuple)` using `case` with guards:
   - `{:sunny, temp}` when temp > 30: `"Stay hydrated and wear sunscreen"`
   - `{:sunny, _}`: `"Enjoy the sunshine"`
   - `{:rainy, temp}` when temp < 10: `"Bundle up and bring an umbrella"`
   - `{:rainy, _}`: `"Bring an umbrella"`
   - `{:snowy, _}`: `"Dress warmly and drive carefully"`
   - Anything else: `"Check the forecast"`

3. `plan_day(params)` using `with` that:
   - Fetches `:location` from params (use `Map.fetch`)
   - Fetches `:temperature` from params
   - Validates temperature is a number (use a helper function)
   - Returns `{:ok, "#{location}: #{describe(temp)}"}`
   - Returns descriptive errors if any step fails

Test all three functions in IEx.
{{< /exercise >}}

## What's Next

You now have a solid grasp of Elixir's control flow mechanisms. Combined with pattern matching, these tools let you write clear, expressive code that handles complex logic without deeply nested conditionals. In the next phase, you will learn about the core data structures -- lists, maps, tuples, and keyword lists -- that tie everything together.
