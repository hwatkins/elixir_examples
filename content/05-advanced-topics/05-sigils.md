---
title: "Sigils"
description: "Learn Elixir sigil syntax for concise literals -- ~r for regexes, ~w for word lists, ~D for dates, and how to define your own custom sigils."
weight: 5
phase: 5
lesson: 25
difficulty: "advanced"
estimatedMinutes: 15
draft: false
date: 2025-02-23
prerequisites:
  - "/05-advanced-topics/04-comprehensions"
hexdocsLinks:
  - title: "Sigils"
    url: "https://hexdocs.pm/elixir/sigils.html"
  - title: "Regex"
    url: "https://hexdocs.pm/elixir/Regex.html"
  - title: "Date"
    url: "https://hexdocs.pm/elixir/Date.html"
tags:
  - sigils
  - regex
  - word-lists
  - dates
  - custom-sigils
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Sigils are one of Elixir's mechanisms for working with textual representations of data. A sigil starts with the tilde `~` followed by a letter that determines its type, then delimiters surrounding the content. They provide a concise way to create strings, regular expressions, word lists, charlists, dates, times, and more -- and you can define your own.

## Sigil Syntax

Every sigil follows the same pattern: `~X{content}` where `X` is a letter (uppercase or lowercase) and the delimiters can be any matching pair.

Supported delimiters:

| Delimiter | Example |
|-----------|---------|
| `//`      | `~r/pattern/` |
| `\|\|`    | `~s\|hello\|` |
| `""`      | `~s"hello"` |
| `''`      | `~s'hello'` |
| `()`      | `~w(foo bar)` |
| `[]`      | `~w[foo bar]` |
| `{}`      | `~w{foo bar}` |
| `<>`      | `~s<hello>` |

Uppercase sigils do **not** perform interpolation or escape sequences. Lowercase sigils **do**.

{{< iex >}}
iex> name = "world"
"world"
iex> ~s(hello #{name})
"hello world"
iex> ~S(hello #{name})
"hello \#{name}"
iex> ~s(tab:\there)
"tab:\there"
iex> ~S(tab:\there)
"tab:\\there"
{{< /iex >}}

{{< concept title="Uppercase vs Lowercase Sigils" >}}
This is a universal rule across all sigils:

- **Lowercase** (`~s`, `~r`, `~w`, etc.): supports interpolation (`#{expr}`) and escape sequences (`\n`, `\t`, etc.)
- **Uppercase** (`~S`, `~R`, `~W`, etc.): treats content as raw/literal -- no interpolation, no escape processing

Choose uppercase when your content has many backslashes or braces that you do not want to escape (common with regex patterns and file paths).
{{< /concept >}}

## String and Charlist Sigils

### ~s and ~S -- Strings

The string sigils create binary strings, just like double quotes. They are especially useful when your string contains quotes that would otherwise need escaping.

```elixir
# Instead of escaping quotes:
"She said, \"Hello!\""

# Use a sigil with different delimiters:
~s(She said, "Hello!")

# Multiline strings with heredoc-style sigils:
~s"""
This is a multiline string.
It preserves "quotes" without escaping.
Interpolation works: #{1 + 1}
"""
```

### ~c and ~C -- Charlists

Charlist sigils create lists of character codepoints, equivalent to single-quoted strings. These are mainly used when interfacing with Erlang libraries.

{{< iex >}}
iex> ~c(hello)
~c"hello"
iex> ~c(hello) == 'hello'
true
iex> ~C(no #{interpolation})
~c"no \#{interpolation}"
{{< /iex >}}

## The Regex Sigil: ~r and ~R

The `~r` sigil creates compiled regular expressions. It is by far the most commonly used sigil.

```elixir
# Basic regex
regex = ~r/^\d{3}-\d{4}$/
"555-1234" =~ regex  # => true
"abcd"     =~ regex  # => false

# With modifiers
~r/hello/i           # case-insensitive
~r/^start.*end$/s    # dotall -- . matches newlines
~r/pattern/m         # multiline -- ^ and $ match line boundaries
~r/verbose # comment/x  # extended -- whitespace and comments ignored

# Named captures
regex = ~r/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
Regex.named_captures(regex, "2025-03-15")
# => %{"day" => "15", "month" => "03", "year" => "2025"}

# Use ~R when the pattern has many backslashes
~R/\d+\.\d+/   # no need to double-escape
```

{{% compare %}}
```elixir {title="~r (interpolation)"}
# Lowercase: interpolation works
field = "name"
regex = ~r/#{field}:\s+\w+/
"name: Alice" =~ regex
# => true
```

```elixir {title="~R (raw)"}
# Uppercase: no interpolation, no escaping
regex = ~R/#{literal}\n\t/
"#{literal}\\n\\t" =~ regex
# => true (matches the literal characters)
```
{{% /compare %}}

{{< iex >}}
iex> Regex.scan(~r/\d+/, "I have 3 cats and 12 dogs")
[["3"], ["12"]]
iex> Regex.replace(~r/\s+/, "hello   world", " ")
"hello world"
iex> Regex.split(~r/[,;\s]+/, "one, two; three four")
["one", "two", "three", "four"]
{{< /iex >}}

## The Word List Sigil: ~w and ~W

The `~w` sigil splits a string by whitespace and returns a list. It accepts a modifier to control the element type.

```elixir
# Default: list of strings
~w(foo bar baz)
# => ["foo", "bar", "baz"]

# Atom modifier
~w(foo bar baz)a
# => [:foo, :bar, :baz]

# Charlist modifier
~w(foo bar baz)c
# => [~c"foo", ~c"bar", ~c"baz"]
```

{{< iex >}}
iex> ~w(red green blue)
["red", "green", "blue"]
iex> ~w(red green blue)a
[:red, :green, :blue]
iex> colors = "primary"
"primary"
iex> ~w(#{colors} secondary tertiary)
["primary", "secondary", "tertiary"]
iex> ~W(#{colors} secondary tertiary)
["\#{colors}", "secondary", "tertiary"]
{{< /iex >}}

{{< callout type="tip" >}}
The `~w` sigil with the `a` modifier is extremely common for defining lists of atoms in Elixir code. You will see it used for Ecto schema fields, keyword lists, configuration keys, and anywhere a list of known atoms is needed.
{{< /callout >}}

## Date and Time Sigils

Elixir provides sigils for creating date, time, and datetime structs with compile-time validation.

```elixir
# ~D -- Date
~D[2025-03-15]
# => ~D[2025-03-15]

# ~T -- Time
~T[14:30:00]
# => ~T[14:30:00]

# ~N -- NaiveDateTime (no timezone)
~N[2025-03-15 14:30:00]
# => ~N[2025-03-15 14:30:00]

# ~U -- UTC DateTime
~U[2025-03-15 14:30:00Z]
# => ~U[2025-03-15 14:30:00Z]
```

{{< iex >}}
iex> date = ~D[2025-12-25]
~D[2025-12-25]
iex> date.year
2025
iex> date.month
12
iex> time = ~T[09:30:00]
~T[09:30:00]
iex> time.hour
9
iex> naive = ~N[2025-06-15 10:00:00]
~N[2025-06-15 10:00:00]
iex> NaiveDateTime.add(naive, 3600, :second)
~N[2025-06-15 11:00:00]
{{< /iex >}}

{{< callout type="note" >}}
Date and time sigils validate their content at compile time. Writing `~D[2025-02-30]` (February 30th does not exist) will produce a compile error. This catches invalid date literals before your code ever runs.
{{< /callout >}}

## Custom Sigils

You can define your own sigils by implementing a function named `sigil_x` (where `x` is the letter) that takes two arguments: the string content and a list of modifiers (single-character atoms).

```elixir
defmodule MySigils do
  @doc "Parses a comma-separated string into a list, trimming whitespace"
  def sigil_l(string, []) do
    string
    |> String.split(",")
    |> Enum.map(&String.trim/1)
  end

  def sigil_l(string, [?i]) do
    string
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.map(&String.to_integer/1)
  end

  @doc "Creates a Map from key:value pairs"
  def sigil_m(string, []) do
    string
    |> String.split(~r/[,\n]/, trim: true)
    |> Enum.map(fn pair ->
      [key, value] = String.split(String.trim(pair), ":", parts: 2)
      {String.to_atom(String.trim(key)), String.trim(value)}
    end)
    |> Map.new()
  end
end
```

```elixir
import MySigils

~l(apples, bananas, cherries)
# => ["apples", "bananas", "cherries"]

~l(1, 2, 3, 42)i
# => [1, 2, 3, 42]

~m(name: Alice, role: admin)
# => %{name: "Alice", role: "admin"}
```

{{< concept title="How Sigil Modifiers Work" >}}
The letters after the closing delimiter are passed as a charlist (list of character codes) to the sigil function. For example, `~r/pattern/im` passes `[?i, ?m]` as the modifiers argument (which are the integers `[105, 109]`). You can pattern match on these to implement different behaviors for different modifier combinations.
{{< /concept >}}

{{< exercise title="Create a Custom Sigil" >}}
Define a custom `~j` sigil that parses JSON strings at compile time:

```elixir
defmodule JSONSigil do
  def sigil_j(string, []) do
    # Parse the JSON string and return the Elixir equivalent
    # Use Jason.decode!/1 or implement simple parsing
    # for basic types (objects, arrays, strings, numbers)
  end

  def sigil_j(string, [?a]) do
    # With the 'a' modifier, convert string keys to atoms
  end
end
```

Usage should look like:
```elixir
import JSONSigil

~j({"name": "Alice", "age": 30})
# => %{"name" => "Alice", "age" => 30}

~j({"name": "Alice", "age": 30})a
# => %{name: "Alice", age: 30}

~j([1, 2, 3])
# => [1, 2, 3]
```

Bonus: Make a `~J` (uppercase) version that does not support interpolation, for embedding raw JSON safely.
{{< /exercise >}}

## Summary

Sigils provide a concise, readable syntax for creating common data types from textual representations. The lowercase/uppercase convention (interpolation vs raw) is consistent across all sigils and easy to remember. The built-in sigils cover the most common needs -- strings, charlists, regexes, word lists, and date/time types -- while the custom sigil mechanism lets you extend the language for your domain. Combined with compile-time validation (as seen with date sigils), sigils help you write expressive code with fewer errors.

## FAQ and Troubleshooting

### Why is my Sigils example failing even though the code looks right?
Most failures come from runtime context, not syntax: incorrect app configuration, missing dependencies, process lifecycle timing, or environment-specific settings. Re-run with smaller examples, inspect intermediate values, and verify each prerequisite from this lesson before combining patterns.

### How do I debug this topic in a production-like setup?
Start with reproducible local steps, add structured logs around boundaries, and isolate one moving part at a time. Prefer deterministic tests for the core logic, then layer integration checks for behavior that depends on supervisors, networked services, or external systems.

### What should I optimize first?
Prioritize correctness and observability before performance tuning. Once behavior is stable, profile the hot paths, remove unnecessary work, and only then introduce advanced optimizations.
