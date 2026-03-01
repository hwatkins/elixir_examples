---
title: "Functions"
description: "Define and use Elixir named functions, anonymous functions, captures, multi-clause functions, guards, and the pipe operator. With Python and JS comparisons."
weight: 1
phase: 2
lesson: 5
difficulty: "beginner"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/01-foundations/04-control-flow"
hexdocsLinks:
  - title: "Kernel"
    url: "https://hexdocs.pm/elixir/Kernel.html"
  - title: "Function"
    url: "https://hexdocs.pm/elixir/Function.html"
tags:
  - functions
  - anonymous-functions
  - pipe-operator
  - guards
  - pattern-matching
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Functions are the fundamental building blocks of Elixir programs. Unlike object-oriented languages where behavior lives inside classes, Elixir organizes code into modules containing named functions. You will also encounter anonymous functions, which are first-class values that can be passed around like any other data. This lesson covers the full range of function features that make Elixir expressive and powerful.

## Named Functions

Named functions are defined inside modules using `def` (public) and `defp` (private). Every named function belongs to a module -- you cannot define a standalone named function outside of a `defmodule` block.

```elixir
defmodule Greeter do
  # Public function - callable from outside the module
  def hello(name) do
    greeting = build_greeting(name)
    greeting
  end

  # Private function - only callable within this module
  defp build_greeting(name) do
    "Hello, #{name}! Welcome to Elixir."
  end
end

Greeter.hello("Alice")
# => "Hello, Alice! Welcome to Elixir."

# This would raise an error:
# Greeter.build_greeting("Alice")
# ** (UndefinedFunctionError) function Greeter.build_greeting/1 is undefined or private
```

{{< callout type="tip" >}}
Use `def` for your module's public API and `defp` for internal helper functions. This makes it clear which functions are meant to be called from outside the module and which are implementation details.
{{< /callout >}}

For single-expression functions, you can use the shorthand `do:` syntax:

```elixir
defmodule Math do
  def square(x), do: x * x
  def cube(x), do: x * x * x
  def double(x), do: x * 2
end

Math.square(4)   # => 16
Math.cube(3)     # => 27
Math.double(5)   # => 10
```

## Anonymous Functions

Anonymous functions (also called lambdas) are defined with the `fn` keyword and invoked with a dot (`.`) before the parentheses. They are first-class values -- you can assign them to variables, pass them as arguments, and return them from other functions.

```elixir
# Define an anonymous function
add = fn a, b -> a + b end

# Call it with the dot syntax
add.(1, 2)
# => 3

# Anonymous functions can close over variables from the outer scope
multiplier = 3
multiply = fn x -> x * multiplier end
multiply.(10)
# => 30

# They can also have multiple clauses
describe = fn
  0 -> "zero"
  x when x > 0 -> "positive"
  x when x < 0 -> "negative"
end

describe.(0)   # => "zero"
describe.(42)  # => "positive"
describe.(-7)  # => "negative"
```

{{< iex >}}
iex> greet = fn name -> "Hello, #{name}!" end
#Function<...>
iex> greet.("World")
"Hello, World!"
iex> is_function(greet)
true
iex> is_function(greet, 1)
true
iex> is_function(greet, 2)
false
{{< /iex >}}

{{< concept title="Named vs Anonymous Functions" >}}
Named functions and anonymous functions serve different purposes:

- **Named functions** (`def`/`defp`) live inside modules, support multiple clauses and guards naturally, and are called with `Module.function(args)`.
- **Anonymous functions** (`fn`) are values you can store in variables and pass to other functions. They are called with `variable.(args)` -- note the dot.

The dot in `variable.(args)` is required for anonymous functions. This distinguishes them from named function calls and makes it clear you are invoking a function value rather than a module function.
{{< /concept >}}

## The Capture Operator (&)

The capture operator `&` provides a shorthand for creating anonymous functions. It has two main uses: capturing a named function as a value, and creating short anonymous functions.

```elixir
# Capture a named function to pass it around
upcase = &String.upcase/1
upcase.("hello")
# => "HELLO"

# Use it directly as an argument
Enum.map(["hello", "world"], &String.upcase/1)
# => ["HELLO", "WORLD"]

# Shorthand anonymous function syntax
# &1, &2, etc. refer to the first, second, etc. argument
double = &(&1 * 2)
double.(5)
# => 10

add = &(&1 + &2)
add.(3, 4)
# => 7

Enum.map([1, 2, 3, 4], &(&1 * &1))
# => [1, 4, 9, 16]
```

{{< callout type="note" >}}
When capturing a named function, you must specify its arity (the number of arguments) with `/n`. For example, `&String.upcase/1` captures the one-argument version of `String.upcase`. This is because Elixir allows multiple functions with the same name but different arities.
{{< /callout >}}

## Default Arguments

You can define default values for function parameters using `\\`. When a caller omits those arguments, the defaults are used.

```elixir
defmodule Greeting do
  def say_hello(name, greeting \\ "Hello") do
    "#{greeting}, #{name}!"
  end
end

Greeting.say_hello("Alice")            # => "Hello, Alice!"
Greeting.say_hello("Alice", "Bonjour") # => "Bonjour, Alice!"
```

When a function with default arguments has multiple clauses, you need to define a function head (a clause with no body) to declare the defaults:

```elixir
defmodule DefaultExample do
  # Function head declares the defaults
  def describe(value, opts \\ [])

  def describe(value, opts) when is_list(opts) do
    label = Keyword.get(opts, :label, "Value")
    "#{label}: #{inspect(value)}"
  end
end

DefaultExample.describe(42)                  # => "Value: 42"
DefaultExample.describe(42, label: "Answer") # => "Answer: 42"
```

## Multi-Clause Functions

One of Elixir's most powerful features is the ability to define multiple clauses for the same function. Elixir tries each clause from top to bottom and uses the first one whose pattern matches the arguments.

```elixir
defmodule Fibonacci do
  def of(0), do: 0
  def of(1), do: 1
  def of(n) when n > 1 do
    of(n - 1) + of(n - 2)
  end
end

Fibonacci.of(0)   # => 0
Fibonacci.of(1)   # => 1
Fibonacci.of(10)  # => 55
```

This pattern replaces lengthy `if`/`case` chains with declarative function heads. Each clause clearly states what inputs it handles:

```elixir
defmodule HTTPStatus do
  def describe(200), do: "OK"
  def describe(201), do: "Created"
  def describe(301), do: "Moved Permanently"
  def describe(404), do: "Not Found"
  def describe(500), do: "Internal Server Error"
  def describe(code), do: "HTTP #{code}"
end

HTTPStatus.describe(200)  # => "OK"
HTTPStatus.describe(418)  # => "HTTP 418"
```

## Guards in Function Heads

Guards are boolean expressions in `when` clauses that add extra conditions beyond pattern matching. They let you dispatch on types, ranges, and other properties of arguments.

```elixir
defmodule TypeChecker do
  def describe(value) when is_integer(value), do: "integer: #{value}"
  def describe(value) when is_float(value), do: "float: #{value}"
  def describe(value) when is_binary(value), do: "string: #{value}"
  def describe(value) when is_atom(value), do: "atom: #{value}"
  def describe(value) when is_list(value), do: "list with #{length(value)} elements"
  def describe(_value), do: "something else"
end

TypeChecker.describe(42)        # => "integer: 42"
TypeChecker.describe(3.14)      # => "float: 3.14"
TypeChecker.describe("hello")   # => "string: hello"
TypeChecker.describe(:ok)       # => "atom: ok"
TypeChecker.describe([1, 2, 3]) # => "list with 3 elements"
```

Guards support a limited set of expressions including type checks (`is_integer/1`, `is_binary/1`, etc.), comparison operators, arithmetic, boolean operators (`and`, `or`, `not`), and a few Kernel functions like `abs/1`, `length/1`, and `map_size/1`.

{{< callout type="warning" >}}
Not all Elixir functions are allowed in guards. Custom functions cannot be used in guards unless they are defined with `defguard`. If a guard expression raises an error, it is treated as a failed match rather than crashing -- Elixir moves on to the next clause.
{{< /callout >}}

## The Pipe Operator

The pipe operator `|>` takes the result of the expression on the left and passes it as the **first argument** to the function on the right. It turns deeply nested calls into a readable top-to-bottom pipeline.

```elixir
# Without the pipe -- hard to read, evaluated inside-out
String.split(String.upcase(String.trim("  hello world  ")))
# => ["HELLO", "WORLD"]

# With the pipe -- clear, left-to-right flow
"  hello world  "
|> String.trim()
|> String.upcase()
|> String.split()
# => ["HELLO", "WORLD"]
```

The pipe operator works beautifully with the Enum module (covered in a later lesson):

```elixir
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
|> Enum.filter(fn x -> rem(x, 2) == 0 end)
|> Enum.map(fn x -> x * x end)
|> Enum.sum()
# => 220 (4 + 16 + 36 + 64 + 100)
```

{{% compare %}}
```elixir
# Elixir - pipe operator
"  hello world  "
|> String.trim()
|> String.upcase()
|> String.split()
# => ["HELLO", "WORLD"]
```

```python
# Python - method chaining (only works on str methods)
"  hello world  ".strip().upper().split()
# => ['HELLO', 'WORLD']
```

```javascript
// JavaScript - no built-in pipe, nested or chained
"  hello world  ".trim().toUpperCase().split(" ")
// => ["HELLO", "WORLD"]
```
{{% /compare %}}

{{< concept title="Pipe Operator Best Practices" >}}
The pipe operator is idiomatic Elixir. Follow these conventions:

- **Start with a data value**, not a function call. The first line of a pipeline should be the data being transformed.
- **Each step should take the piped value as its first argument.** If a function does not accept the data as its first argument, write a wrapper or use an anonymous function.
- **Keep pipelines readable.** If a single step is complex, extract it into a named function.
- **Do not pipe into single functions** when a plain function call is clearer: `String.upcase(name)` is better than `name |> String.upcase()` for simple cases.
{{< /concept >}}

## Putting It All Together

Here is a more complete example combining multi-clause functions, guards, default arguments, and the pipe operator:

```elixir
defmodule WordCounter do
  @doc "Counts words in a string, optionally filtering by minimum length"
  def count(text, min_length \\ 1) when is_binary(text) and is_integer(min_length) do
    text
    |> normalize()
    |> split_words()
    |> filter_by_length(min_length)
    |> length()
  end

  defp normalize(text) do
    text
    |> String.downcase()
    |> String.replace(~r/[^a-z\s]/, "")
    |> String.trim()
  end

  defp split_words(""), do: []
  defp split_words(text), do: String.split(text)

  defp filter_by_length(words, 1), do: words
  defp filter_by_length(words, min_length) do
    Enum.filter(words, fn word -> String.length(word) >= min_length end)
  end
end

WordCounter.count("Hello, World!")         # => 2
WordCounter.count("The quick brown fox", 4) # => 2 ("quick" and "brown")
```

{{< exercise title="Build a Temperature Converter" >}}
Create a module `TempConverter` with the following functions:

1. `to_celsius(temp, scale)` that accepts a number and an atom (`:fahrenheit` or `:kelvin`) and converts to Celsius. Use multi-clause functions with pattern matching on the scale atom.
2. `to_fahrenheit(temp, scale)` that converts from `:celsius` or `:kelvin` to Fahrenheit.
3. A private helper `round_to(value, decimals \\ 2)` that rounds the result.

Formulas:
- Fahrenheit to Celsius: `(f - 32) * 5 / 9`
- Kelvin to Celsius: `k - 273.15`
- Celsius to Fahrenheit: `c * 9 / 5 + 32`
- Kelvin to Fahrenheit: `(k - 273.15) * 9 / 5 + 32`

Test your module in IEx:

```elixir
TempConverter.to_celsius(212, :fahrenheit)  # => 100.0
TempConverter.to_celsius(373.15, :kelvin)   # => 100.0
TempConverter.to_fahrenheit(0, :celsius)    # => 32.0
```

**Bonus:** Add a guard to ensure the temperature argument is a number. Add a catch-all clause that returns a helpful error tuple like `{:error, "unknown scale"}`.
{{< /exercise >}}
