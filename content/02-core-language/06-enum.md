---
title: "Enum and Stream"
description: "Master Elixir's Enum module for eager collection processing and the Stream module for lazy, memory-efficient evaluation. Covers map, filter, reduce, and more."
weight: 6
phase: 2
lesson: 10
difficulty: "beginner"
estimatedMinutes: 30
draft: false
date: 2025-02-23
prerequisites:
  - "/02-core-language/05-modules-and-structs"
hexdocsLinks:
  - title: "Enum"
    url: "https://hexdocs.pm/elixir/Enum.html"
  - title: "Stream"
    url: "https://hexdocs.pm/elixir/Stream.html"
tags:
  - enum
  - stream
  - lazy-evaluation
  - collections
  - pipe-operator
  - map
  - filter
  - reduce
---

The `Enum` module is the most frequently used module in Elixir. It provides a rich set of functions for transforming, filtering, sorting, and aggregating any collection that implements the `Enumerable` protocol -- including lists, maps, ranges, and streams. This lesson covers the essential Enum functions, how to combine them with the pipe operator, and when to switch to the `Stream` module for lazy evaluation.

## The Enum Module

Enum functions are **eager** -- they process the entire collection immediately and return a result. This is the right choice for most day-to-day work.

### Enum.map

`Enum.map/2` transforms every element in a collection by applying a function:

```elixir
# Double every number
Enum.map([1, 2, 3, 4, 5], fn x -> x * 2 end)
# => [2, 4, 6, 8, 10]

# Using the capture shorthand
Enum.map([1, 2, 3, 4, 5], &(&1 * 2))
# => [2, 4, 6, 8, 10]

# Transform strings
Enum.map(["hello", "world"], &String.upcase/1)
# => ["HELLO", "WORLD"]

# Map over a range
Enum.map(1..5, fn n -> n * n end)
# => [1, 4, 9, 16, 25]

# Map over a map (returns a list of transformed key-value pairs)
Enum.map(%{a: 1, b: 2, c: 3}, fn {key, val} -> {key, val * 10} end)
# => [a: 10, b: 20, c: 30]
```

### Enum.filter and Enum.reject

`Enum.filter/2` keeps elements where the function returns a truthy value. `Enum.reject/2` does the opposite -- it removes elements where the function returns a truthy value.

```elixir
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Keep only even numbers
Enum.filter(numbers, fn n -> rem(n, 2) == 0 end)
# => [2, 4, 6, 8, 10]

# Remove even numbers (keep odds)
Enum.reject(numbers, fn n -> rem(n, 2) == 0 end)
# => [1, 3, 5, 7, 9]

# Filter a list of maps
users = [
  %{name: "Alice", age: 30, active: true},
  %{name: "Bob", age: 25, active: false},
  %{name: "Charlie", age: 35, active: true}
]

Enum.filter(users, fn user -> user.active end)
# => [%{name: "Alice", ...}, %{name: "Charlie", ...}]

Enum.filter(users, & &1.active)
# => [%{name: "Alice", ...}, %{name: "Charlie", ...}]
```

### Enum.reduce

`Enum.reduce/3` is the most powerful Enum function. It processes a collection element by element, accumulating a result. Every other Enum function can be implemented with `reduce`.

```elixir
# Sum all numbers
Enum.reduce([1, 2, 3, 4, 5], 0, fn x, acc -> acc + x end)
# => 15

# Build a string
Enum.reduce(["Elixir", "is", "great"], "", fn word, acc ->
  if acc == "", do: word, else: "#{acc} #{word}"
end)
# => "Elixir is great"

# Find the maximum (reduce without initial accumulator uses first element)
Enum.reduce([3, 7, 2, 9, 1], fn x, acc -> max(x, acc) end)
# => 9

# Build a frequency map
words = ["the", "cat", "sat", "on", "the", "mat", "the"]
Enum.reduce(words, %{}, fn word, acc ->
  Map.update(acc, word, 1, &(&1 + 1))
end)
# => %{"cat" => 1, "mat" => 1, "on" => 1, "sat" => 1, "the" => 3}
```

{{< concept title="Understanding Reduce" >}}
`Enum.reduce/3` takes three arguments:

1. A collection to iterate over
2. An initial accumulator value
3. A function that receives `(element, accumulator)` and returns the new accumulator

Think of reduce as a fold -- you are folding the entire collection down into a single value. That single value can be anything: a number, a string, a list, a map, or any data structure.

When called as `Enum.reduce/2` (without an initial accumulator), the first element of the collection becomes the initial accumulator and iteration starts from the second element.
{{< /concept >}}

### Enum.each

`Enum.each/2` iterates over a collection for side effects only. It always returns `:ok`.

```elixir
Enum.each(["Alice", "Bob", "Charlie"], fn name ->
  IO.puts("Hello, #{name}!")
end)
# Hello, Alice!
# Hello, Bob!
# Hello, Charlie!
# => :ok
```

### Enum.sort

`Enum.sort/1` sorts in ascending order. `Enum.sort/2` accepts a comparison function or a sorting directive:

```elixir
Enum.sort([3, 1, 4, 1, 5, 9, 2, 6])
# => [1, 1, 2, 3, 4, 5, 6, 9]

# Descending order
Enum.sort([3, 1, 4, 1, 5, 9, 2, 6], :desc)
# => [9, 6, 5, 4, 3, 2, 1, 1]

# Custom comparison
users = [%{name: "Charlie", age: 35}, %{name: "Alice", age: 30}, %{name: "Bob", age: 25}]

Enum.sort_by(users, & &1.name)
# => [%{name: "Alice", ...}, %{name: "Bob", ...}, %{name: "Charlie", ...}]

Enum.sort_by(users, & &1.age, :desc)
# => [%{name: "Charlie", ...}, %{name: "Alice", ...}, %{name: "Bob", ...}]
```

### Enum.find

`Enum.find/2` returns the first element for which the function returns a truthy value, or `nil` if none is found:

```elixir
Enum.find([1, 2, 3, 4, 5], fn x -> x > 3 end)
# => 4

Enum.find([1, 2, 3], fn x -> x > 10 end)
# => nil

# With a default value
Enum.find([1, 2, 3], :not_found, fn x -> x > 10 end)
# => :not_found

# Enum.find_index returns the index
Enum.find_index(["a", "b", "c"], fn x -> x == "b" end)
# => 1
```

### Other Essential Enum Functions

{{< iex >}}
iex> Enum.sum([1, 2, 3, 4, 5])
15
iex> Enum.min([3, 1, 4, 1, 5])
1
iex> Enum.max([3, 1, 4, 1, 5])
5
iex> Enum.count([1, 2, 3, 4, 5])
5
iex> Enum.count([1, 2, 3, 4, 5], fn x -> rem(x, 2) == 0 end)
2
iex> Enum.any?([1, 2, 3], fn x -> x > 2 end)
true
iex> Enum.all?([1, 2, 3], fn x -> x > 0 end)
true
iex> Enum.member?([1, 2, 3], 2)
true
iex> Enum.zip([1, 2, 3], [:a, :b, :c])
[{1, :a}, {2, :b}, {3, :c}]
iex> Enum.uniq([1, 2, 2, 3, 3, 3])
[1, 2, 3]
iex> Enum.frequencies(["a", "b", "a", "c", "b", "a"])
%{"a" => 3, "b" => 2, "c" => 1}
iex> Enum.chunk_every([1, 2, 3, 4, 5], 2)
[[1, 2], [3, 4], [5]]
iex> Enum.flat_map([[1, 2], [3, 4]], fn x -> x end)
[1, 2, 3, 4]
{{< /iex >}}

## Pipelines with Enum

The pipe operator combined with Enum functions is the bread and butter of Elixir data processing. Pipelines read top-to-bottom and clearly express each transformation step:

```elixir
# Process a list of sales records
sales = [
  %{product: "Widget", amount: 25.00, region: "North"},
  %{product: "Gadget", amount: 50.00, region: "South"},
  %{product: "Widget", amount: 30.00, region: "South"},
  %{product: "Gadget", amount: 45.00, region: "North"},
  %{product: "Widget", amount: 20.00, region: "North"}
]

# Total revenue by region
sales
|> Enum.group_by(& &1.region)
|> Enum.map(fn {region, region_sales} ->
  total = region_sales |> Enum.map(& &1.amount) |> Enum.sum()
  {region, total}
end)
|> Enum.into(%{})
# => %{"North" => 90.0, "South" => 80.0}

# Top-selling product
sales
|> Enum.group_by(& &1.product)
|> Enum.max_by(fn {_product, product_sales} -> length(product_sales) end)
|> elem(0)
# => "Widget"
```

{{% compare %}}
```elixir
# Elixir - pipeline with Enum
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
|> Enum.filter(&(rem(&1, 2) == 0))
|> Enum.map(&(&1 * &1))
|> Enum.sum()
# => 220
```

```python
# Python - list comprehension + sum
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
sum(x ** 2 for x in numbers if x % 2 == 0)
# => 220
```

```javascript
// JavaScript - array method chaining
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  .filter(x => x % 2 === 0)
  .map(x => x * x)
  .reduce((sum, x) => sum + x, 0);
// => 220
```
{{% /compare %}}

## The Stream Module

While Enum is eager (processes everything immediately), `Stream` is **lazy** -- it builds up a series of transformations that are only executed when a terminal operation (like `Enum.to_list/1` or `Enum.sum/1`) is called.

This matters when working with large or potentially infinite collections, or when you want to avoid multiple passes through the data.

### Eager vs Lazy

```elixir
# EAGER: Each Enum call creates an intermediate list
1..1_000_000
|> Enum.map(&(&1 * 3))      # Creates a 1M element list
|> Enum.filter(&(rem(&1, 2) == 0))  # Creates another list
|> Enum.sum()

# LAZY: Stream builds a recipe, executes once at the end
1..1_000_000
|> Stream.map(&(&1 * 3))       # Returns a Stream, no computation yet
|> Stream.filter(&(rem(&1, 2) == 0)) # Still just a Stream
|> Enum.sum()                   # NOW it iterates once, computing as it goes
```

{{< callout type="tip" >}}
Use `Stream` when you are chaining multiple transformations on large collections. With `Enum`, each step creates an intermediate list. With `Stream`, the transformations are composed and the collection is traversed only once when you call a terminal `Enum` function.

For small collections, the overhead of laziness is not worth it -- just use `Enum`.
{{< /callout >}}

### Stream.cycle

`Stream.cycle/1` creates an infinite stream that repeats a collection forever:

```elixir
# Create an infinite cycling stream
colors = Stream.cycle([:red, :green, :blue])

# Take just what you need
colors |> Enum.take(7)
# => [:red, :green, :blue, :red, :green, :blue, :red]

# Pair items with cycling labels
["Alice", "Bob", "Charlie", "Diana", "Eve"]
|> Enum.zip(Stream.cycle([:team_a, :team_b]))
# => [{"Alice", :team_a}, {"Bob", :team_b}, {"Charlie", :team_a},
#     {"Diana", :team_b}, {"Eve", :team_a}]
```

### Stream.iterate

`Stream.iterate/2` generates an infinite stream where each element is computed from the previous one:

```elixir
# Powers of 2
Stream.iterate(1, &(&1 * 2))
|> Enum.take(10)
# => [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]

# Fibonacci sequence
Stream.unfold({0, 1}, fn {a, b} -> {a, {b, a + b}} end)
|> Enum.take(10)
# => [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# Collatz sequence from a starting number
Stream.iterate(27, fn
  n when rem(n, 2) == 0 -> div(n, 2)
  n -> 3 * n + 1
end)
|> Enum.take_while(&(&1 != 1))
|> Enum.count()
# => 111 steps before reaching 1
```

### Other Useful Stream Functions

```elixir
# Stream.repeatedly - generate values from a function
Stream.repeatedly(fn -> Enum.random(1..100) end)
|> Enum.take(5)
# => [42, 17, 83, 5, 61] (random each time)

# Stream.take_while - take elements while condition is true
Stream.iterate(1, &(&1 + 1))
|> Stream.take_while(&(&1 <= 100))
|> Stream.filter(&(rem(&1, 15) == 0))
|> Enum.to_list()
# => [15, 30, 45, 60, 75, 90] (FizzBuzz numbers up to 100)

# Stream.chunk_every - process in batches
1..20
|> Stream.chunk_every(5)
|> Stream.map(fn chunk -> Enum.sum(chunk) end)
|> Enum.to_list()
# => [15, 40, 65, 90]

# Stream.with_index - adds indices lazily
["a", "b", "c"]
|> Stream.with_index()
|> Enum.to_list()
# => [{"a", 0}, {"b", 1}, {"c", 2}]
```

### File Streaming

One of the most practical uses of streams is processing large files line by line without loading the entire file into memory:

```elixir
# Count lines in a large file
File.stream!("large_log.txt")
|> Enum.count()

# Find error lines
File.stream!("app.log")
|> Stream.filter(&String.contains?(&1, "ERROR"))
|> Stream.map(&String.trim/1)
|> Enum.take(10)

# Word count across a file
File.stream!("book.txt")
|> Stream.flat_map(&String.split/1)
|> Enum.reduce(%{}, fn word, acc ->
  Map.update(acc, String.downcase(word), 1, &(&1 + 1))
end)
```

{{< concept title="When to Use Stream vs Enum" >}}
**Use Enum when:**
- Your collection fits comfortably in memory
- You only apply one or two transformations
- You need the result immediately
- Simplicity matters more than optimization

**Use Stream when:**
- Working with large files or datasets
- Chaining many transformations (avoids intermediate lists)
- Dealing with potentially infinite sequences
- Processing data that arrives over time (e.g., network streams)
- You want to take only a subset of results from a large computation

A common pattern: use `Stream` for the transformations and `Enum` for the final terminal operation (e.g., `Enum.to_list/1`, `Enum.sum/1`, `Enum.take/2`).
{{< /concept >}}

## Putting It All Together

Here is a practical example that processes a collection of orders using both Enum and pipe operations:

```elixir
defmodule OrderAnalyzer do
  @doc "Analyzes a list of order maps and returns a summary report"
  def analyze(orders) do
    %{
      total_revenue: total_revenue(orders),
      average_order: average_order(orders),
      top_products: top_products(orders, 3),
      orders_by_status: orders_by_status(orders)
    }
  end

  defp total_revenue(orders) do
    orders
    |> Enum.map(& &1.total)
    |> Enum.sum()
  end

  defp average_order(orders) do
    total_revenue(orders) / Enum.count(orders)
  end

  defp top_products(orders, n) do
    orders
    |> Enum.flat_map(& &1.items)
    |> Enum.frequencies_by(& &1.product)
    |> Enum.sort_by(fn {_product, count} -> count end, :desc)
    |> Enum.take(n)
    |> Enum.map(fn {product, count} -> %{product: product, count: count} end)
  end

  defp orders_by_status(orders) do
    orders
    |> Enum.group_by(& &1.status)
    |> Enum.map(fn {status, group} -> {status, length(group)} end)
    |> Enum.into(%{})
  end
end
```

{{< exercise title="Data Processing Pipeline" >}}
You have a list of student records:

```elixir
students = [
  %{name: "Alice", scores: [95, 87, 92, 88]},
  %{name: "Bob", scores: [78, 82, 75, 80]},
  %{name: "Charlie", scores: [92, 95, 98, 91]},
  %{name: "Diana", scores: [65, 70, 72, 68]},
  %{name: "Eve", scores: [88, 90, 85, 92]}
]
```

Using Enum functions and the pipe operator, write functions that:

1. **`averages(students)`** -- returns a list of `%{name: name, average: avg}` maps with each student's average score.
2. **`honor_roll(students, threshold \\ 85)`** -- returns the names of students whose average is at or above the threshold, sorted alphabetically.
3. **`class_stats(students)`** -- returns a map with `:highest_avg`, `:lowest_avg`, and `:class_average`.
4. **`grade(students)`** -- returns a list of `%{name: name, grade: letter}` maps where A >= 90, B >= 80, C >= 70, D >= 60, and F < 60.

**Bonus:** Use `Stream.iterate/2` to generate the first 20 triangular numbers (1, 3, 6, 10, 15, ...) where the nth triangular number is `n * (n + 1) / 2`.

```elixir
Stream.iterate(1, &(&1 + 1))
|> Stream.map(fn n -> div(n * (n + 1), 2) end)
|> Enum.take(20)
# => [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, ...]
```
{{< /exercise >}}
