---
title: "Comprehensions"
description: "Master Elixir's for comprehension -- generators, filters, :into collectors, and bitstring generators for transforming and collecting data in one expressive construct."
weight: 4
phase: 5
lesson: 24
difficulty: "advanced"
estimatedMinutes: 20
draft: false
date: 2025-02-23
prerequisites:
  - "/05-advanced-topics/03-metaprogramming"
hexdocsLinks:
  - title: "Comprehensions"
    url: "https://hexdocs.pm/elixir/comprehensions.html"
  - title: "Kernel.SpecialForms.for/1"
    url: "https://hexdocs.pm/elixir/Kernel.SpecialForms.html#for/1"
tags:
  - comprehensions
  - for
  - generators
  - filters
  - into
  - reduce
---

Elixir's `for` comprehension is a powerful construct that combines generation, filtering, and collection into a single expression. If you have used list comprehensions in Python or LINQ in C#, Elixir's version will feel familiar -- but it goes further with support for multiple generators, arbitrary collectables, reductions, and bitstring generators.

Comprehensions are not just syntactic sugar for `Enum.map` and `Enum.filter`. They provide a declarative way to express data transformations that can be more readable when you have complex combinations of iteration, filtering, and collection.

## Basic Comprehensions

A comprehension has three parts: **generators** that produce values, optional **filters** that select which values to keep, and a **body** that transforms each value.

```elixir
# Basic: square each number
for x <- [1, 2, 3, 4, 5], do: x * x
# => [1, 4, 9, 16, 25]

# With a filter: only even numbers
for x <- 1..10, rem(x, 2) == 0, do: x
# => [2, 4, 6, 8, 10]

# Pattern matching in the generator
for {:ok, val} <- [{:ok, 1}, {:error, 2}, {:ok, 3}], do: val
# => [1, 3]
# Note: non-matching elements are silently skipped
```

{{< iex >}}
iex> for x <- 1..5, do: x * x
[1, 4, 9, 16, 25]
iex> for x <- 1..10, rem(x, 2) == 0, do: x * 3
[6, 12, 18, 24, 30]
iex> for {:ok, val} <- [{:ok, "a"}, {:error, "b"}, {:ok, "c"}], do: val
["a", "c"]
{{< /iex >}}

{{< concept title="Generator Pattern Matching as Filtering" >}}
When a generator uses a pattern, values that do not match the pattern are silently skipped -- no error is raised. This is different from `Enum.map/2`, which processes every element. This built-in pattern filtering is one of the most useful features of comprehensions, especially when processing heterogeneous data.
{{< /concept >}}

## Multiple Generators

When you use multiple generators, the comprehension produces the **Cartesian product** of all generators -- every combination of values.

```elixir
# All pairs from two lists
for x <- [:a, :b], y <- [1, 2, 3] do
  {x, y}
end
# => [a: 1, a: 2, a: 3, b: 1, b: 2, b: 3]

# Multiplication table
for x <- 1..3, y <- 1..3 do
  {x, y, x * y}
end
# => [{1,1,1}, {1,2,2}, {1,3,3}, {2,1,2}, {2,2,4}, {2,3,6}, {3,1,3}, {3,2,6}, {3,3,9}]

# Dependent generators: y depends on x
for x <- 1..4, y <- x..4 do
  {x, y}
end
# => [{1,1}, {1,2}, {1,3}, {1,4}, {2,2}, {2,3}, {2,4}, {3,3}, {3,4}, {4,4}]
```

### Combining Generators with Filters

Filters can reference variables from any preceding generator:

```elixir
# Pythagorean triples up to 20
for a <- 1..20,
    b <- a..20,
    c <- b..20,
    a * a + b * b == c * c do
  {a, b, c}
end
# => [{3, 4, 5}, {5, 12, 13}, {6, 8, 10}, {8, 15, 17}, {9, 12, 15}]
```

{{% compare %}}
```elixir {title="Comprehension"}
# Find all anagram pairs from a word list
words = ["cat", "act", "dog", "god", "tac"]

for w1 <- words,
    w2 <- words,
    w1 < w2,
    Enum.sort(String.graphemes(w1)) ==
      Enum.sort(String.graphemes(w2)) do
  {w1, w2}
end
# => [{"act", "cat"}, {"act", "tac"}, {"cat", "tac"}, {"dog", "god"}]
```

```elixir {title="Enum equivalent"}
words = ["cat", "act", "dog", "god", "tac"]

words
|> Enum.flat_map(fn w1 ->
  words
  |> Enum.filter(fn w2 -> w1 < w2 end)
  |> Enum.filter(fn w2 ->
    Enum.sort(String.graphemes(w1)) ==
      Enum.sort(String.graphemes(w2))
  end)
  |> Enum.map(fn w2 -> {w1, w2} end)
end)
# => [{"act", "cat"}, {"act", "tac"}, {"cat", "tac"}, {"dog", "god"}]
```
{{% /compare %}}

## The :into Option

By default, comprehensions return a list. The `:into` option lets you collect results into any data structure that implements the `Collectable` protocol -- maps, MapSets, binaries, IO devices, and more.

```elixir
# Collect into a map
for {key, val} <- [a: 1, b: 2, c: 3], into: %{} do
  {key, val * 10}
end
# => %{a: 10, b: 20, c: 30}

# Collect into a MapSet
for x <- [1, 2, 2, 3, 3, 3], into: MapSet.new() do
  x
end
# => MapSet.new([1, 2, 3])

# Collect into an existing map (merge/update)
existing = %{a: 0, d: 99}
for {key, val} <- [a: 1, b: 2, c: 3], into: existing do
  {key, val}
end
# => %{a: 1, b: 2, c: 3, d: 99}

# Collect into a binary string
for c <- ?a..?z, rem(c - ?a, 2) == 0, into: "" do
  <<c>>
end
# => "acegikmoqsuwy"
```

{{< iex >}}
iex> for {k, v} <- %{name: "Alice", age: 30}, into: %{}, do: {k, to_string(v)}
%{age: "30", name: "Alice"}
iex> for <<c <- "hello world">>, c != ?\s, into: "", do: <<c>>
"helloworld"
{{< /iex >}}

{{< callout type="tip" >}}
Using `:into` with `%{}` is an idiomatic way to transform maps. It is often cleaner than `Enum.map/2` followed by `Enum.into/2` or `Map.new/2`.
{{< /callout >}}

## The :reduce Option

The `:reduce` option turns a comprehension into a fold/accumulator operation. Instead of collecting results into a data structure, you thread an accumulator through each iteration.

```elixir
# Sum of squares of even numbers
for x <- 1..10, rem(x, 2) == 0, reduce: 0 do
  acc -> acc + x * x
end
# => 220  (4 + 16 + 36 + 64 + 100)

# Build a frequency map
for char <- String.graphemes("mississippi"), reduce: %{} do
  acc -> Map.update(acc, char, 1, &(&1 + 1))
end
# => %{"i" => 4, "m" => 1, "p" => 2, "s" => 4}

# Find the longest word
for word <- ~w(elixir erlang beam otp phoenix liveview), reduce: "" do
  longest ->
    if String.length(word) > String.length(longest), do: word, else: longest
end
# => "liveview"
```

{{< callout type="note" >}}
When using `:reduce`, the `do` block uses the `acc -> expression` syntax (like a case clause) instead of the usual `do: expression`. The accumulator variable name is up to you -- `acc` is conventional but not required.
{{< /callout >}}

## The :uniq Option

The `:uniq` option removes duplicate results from the output:

```elixir
for x <- [1, 1, 2, 2, 3, 3], uniq: true, do: x
# => [1, 2, 3]

for x <- 1..20, uniq: true do
  rem(x, 5)
end
# => [1, 2, 3, 4, 0]
```

## Bitstring Generators

Besides iterating over enumerables, comprehensions can iterate over **bitstrings** using the `<<>>` generator syntax. This is powerful for parsing binary data.

```elixir
# Extract bytes from a binary
for <<byte <- "hello">>, do: byte
# => [104, 101, 108, 108, 111]

# Parse fixed-width fields from binary data
pixels = <<255, 0, 0, 0, 255, 0, 0, 0, 255>>
for <<r, g, b <- pixels>> do
  {r, g, b}
end
# => [{255, 0, 0}, {0, 255, 0}, {0, 0, 255}]

# Extract 16-bit integers (big-endian)
data = <<0, 1, 0, 2, 0, 3>>
for <<value::16 <- data>>, do: value
# => [1, 2, 3]

# Combine bitstring generator with :into to transform binary data
for <<c <- "Hello, World!">>, c in ?A..?Z, into: "", do: <<c + 32>>
# => "elloorld"  (lowercase only the uppercase chars that exist)
```

{{< iex >}}
iex> for <<byte <- "Elixir">>, do: byte
[69, 108, 105, 120, 105, 114]
iex> for <<r, g, b <- <<10, 20, 30, 40, 50, 60>>>>, do: {r, g, b}
[{10, 20, 30}, {40, 50, 60}]
{{< /iex >}}

{{< concept title="When to Use Comprehensions vs Enum" >}}
Use **comprehensions** when you have:
- Multiple generators (Cartesian products or dependent iteration)
- Pattern matching filters in the generator
- A need to collect into a non-list collectable (`:into`)
- Binary/bitstring parsing

Use **Enum functions** when you have:
- Simple map/filter/reduce chains on a single collection
- Complex transformations that benefit from the pipeline operator
- A need for functions like `Enum.chunk_every/2`, `Enum.group_by/2`, or `Enum.zip/2` that have no comprehension equivalent

Neither is universally better. Choose whichever reads more clearly for the specific transformation.
{{< /concept >}}

{{< exercise title="Comprehension Challenges" >}}
Solve each of the following using a `for` comprehension:

**1. FizzBuzz:** Generate a list from 1 to 30 where multiples of 3 become `"Fizz"`, multiples of 5 become `"Buzz"`, multiples of both become `"FizzBuzz"`, and everything else becomes the number as a string.

**2. Matrix transpose:** Given a list of lists representing a matrix, transpose it.
```elixir
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
# Expected: [[1, 4, 7], [2, 5, 8], [3, 6, 9]]
```
Hint: use `Enum.zip_with/2` or nested comprehensions with `Enum.at/2`.

**3. Word frequency map:** Given a string of text, produce a `%{word => count}` map using `:reduce`.
```elixir
text = "the cat sat on the mat the cat"
# Expected: %{"the" => 3, "cat" => 2, "sat" => 1, "on" => 1, "mat" => 1}
```

**4. Hex decoder:** Given a hex string like `"48656C6C6F"`, decode it to a regular string using a bitstring generator. Each pair of hex characters represents one byte.
{{< /exercise >}}

## Summary

Elixir's `for` comprehension is a versatile tool that combines generation, filtering, transformation, and collection into a single readable expression. With multiple generators you can express Cartesian products and dependent iteration. Filters and pattern matching let you select exactly the data you need. The `:into` option targets any collectable, `:reduce` threads an accumulator for fold operations, and `:uniq` deduplicates output. Bitstring generators open up binary data parsing. Together, these features make comprehensions a natural fit for many data transformation tasks.
