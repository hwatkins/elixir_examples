---
title: "Lists and Tuples"
description: "Master Elixir lists and tuples -- linked lists for dynamic collections, tuples for fixed-size groups, pattern matching on both, and performance trade-offs."
weight: 2
phase: 2
lesson: 6
difficulty: "beginner"
estimatedMinutes: 20
draft: false
date: 2025-02-23
prerequisites:
  - "/02-core-language/01-functions"
hexdocsLinks:
  - title: "List"
    url: "https://hexdocs.pm/elixir/List.html"
  - title: "Tuple"
    url: "https://hexdocs.pm/elixir/Tuple.html"
  - title: "Kernel"
    url: "https://hexdocs.pm/elixir/Kernel.html"
tags:
  - lists
  - tuples
  - collections
  - pattern-matching
  - head-tail
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Elixir provides two fundamental ordered collection types: **lists** and **tuples**. While they may seem similar at first glance, they have different internal representations and are suited for different tasks. Understanding when and why to use each one is essential for writing efficient Elixir code.

## Lists

Lists in Elixir are linked lists. Each element points to the next, which means accessing the first element is very fast, but reaching the last element requires traversing the entire list. Lists are the workhorse collection for dynamic, variable-length data.

### Head and Tail

Every non-empty list can be decomposed into a **head** (the first element) and a **tail** (everything else, which is itself a list). This is the key to understanding how lists work in Elixir.

```elixir
# Get the head and tail of a list
[head | tail] = [1, 2, 3]
head  # => 1
tail  # => [2, 3]

# A single-element list has an empty tail
[head | tail] = [1]
head  # => 1
tail  # => []

# The empty list is the base case
[] = []

# This does NOT match -- a list must have at least one element for [head | tail]
# [head | tail] = []
# ** (MatchError) no match of right hand side value: []

# You can match a specific head value
[1 | tail] = [1, 2, 3]
tail  # => [2, 3]

# Use underscore to ignore the tail
[head | _] = [1, 2, 3]
head  # => 1
```

{{< concept title="Linked Lists Under the Hood" >}}
An Elixir list like `[1, 2, 3]` is actually a chain of cons cells: `[1 | [2 | [3 | []]]]`. Each cell holds a value and a pointer to the rest of the list. This is why:

- **Prepending** is O(1) -- you just create a new cell pointing to the existing list.
- **Appending** is O(n) -- you must traverse to the end to add an element.
- **Getting the length** is O(n) -- you must count every element.
- **Accessing by index** is O(n) -- you must walk through the list.

This differs fundamentally from arrays in languages like Python or JavaScript, which provide O(1) random access but O(n) prepending.
{{< /concept >}}

### Combining Lists

Elixir provides operators for combining and subtracting lists:

```elixir
# Concatenate two lists with ++
[1, 2, 3] ++ [4, 5, 6]
# => [1, 2, 3, 4, 5, 6]

# Subtract elements with -- (removes first occurrence of each)
[1, true, 2, false, 3, true] -- [true, false]
# => [1, 2, 3, true]

# Prepend an element with the cons operator (fast!)
new = 0
list = [1, 2, 3]
[new | list]
# => [0, 1, 2, 3]
```

{{< callout type="tip" >}}
Always prefer prepending with `[new | list]` over appending with `list ++ [new]`. Prepending is a constant-time operation, while appending requires copying the entire list. If you need to build a list by adding elements, prepend them and reverse at the end with `Enum.reverse/1`.
{{< /callout >}}

### Common List Operations

{{< iex >}}
iex> list = [3, 1, 4, 1, 5, 9, 2, 6]
[3, 1, 4, 1, 5, 9, 2, 6]
iex> hd(list)
3
iex> tl(list)
[1, 4, 1, 5, 9, 2, 6]
iex> length(list)
8
iex> Enum.at(list, 0)
3
iex> Enum.reverse(list)
[6, 2, 9, 5, 1, 4, 1, 3]
iex> Enum.sort(list)
[1, 1, 2, 3, 4, 5, 6, 9]
iex> Enum.member?(list, 5)
true
iex> 5 in list
true
{{< /iex >}}

## Tuples

Tuples are fixed-size, ordered collections stored contiguously in memory. They are defined with curly braces and are most commonly used for returning multiple values from a function, especially in the `{:ok, value}` / `{:error, reason}` convention.

```elixir
# Basic tuples
point = {10, 20}
color = {255, 128, 0}
result = {:ok, "Success"}
error = {:error, "File not found"}

# Access by index (zero-based)
elem(point, 0)   # => 10
elem(point, 1)   # => 20

# Get the tuple size
tuple_size(color) # => 3

# Update a value at an index (returns a new tuple)
put_elem(point, 0, 99)
# => {99, 20}
```

### Pattern Matching with Tuples

Pattern matching with tuples is one of the most common patterns in Elixir, especially for handling function return values:

```elixir
# Match the :ok/:error convention
case File.read("hello.txt") do
  {:ok, contents} -> "File contains: #{contents}"
  {:error, reason} -> "Error: #{reason}"
end

# Destructure in function heads
defmodule Geometry do
  def area({:circle, radius}), do: :math.pi() * radius * radius
  def area({:rectangle, width, height}), do: width * height
  def area({:triangle, base, height}), do: 0.5 * base * height
end

Geometry.area({:circle, 5})          # => 78.53981633974483
Geometry.area({:rectangle, 4, 6})    # => 24
Geometry.area({:triangle, 3, 8})     # => 12.0
```

{{< callout type="note" >}}
The `{:ok, value}` and `{:error, reason}` pattern is pervasive in Elixir. Standard library functions like `File.read/1`, `Map.fetch/2`, and `Integer.parse/1` all follow this convention. When writing your own functions that can fail, adopt this same pattern.
{{< /callout >}}

## Lists vs Tuples: When to Use Which

{{< concept title="Choosing Between Lists and Tuples" >}}
Use the right collection for the job:

**Use Lists when:**
- You have a collection of similar items (a list of users, a list of numbers)
- The number of elements can vary
- You need to iterate over the elements
- You want to use Enum functions (map, filter, reduce)

**Use Tuples when:**
- You have a fixed number of elements with known positions
- Each position has a specific meaning (like `{:ok, value}`)
- You need fast access to elements by index
- You are returning multiple values from a function

**Performance differences:**
- Tuples: O(1) access by index, O(n) to update (copies the whole tuple)
- Lists: O(n) access by index, O(1) to prepend, O(n) to append
{{< /concept >}}

```elixir
# GOOD: Tuple for a fixed structure with meaningful positions
user = {"Alice", 30, :admin}
{name, age, role} = user

# GOOD: List for a variable-length collection
scores = [95, 87, 92, 78, 88]
average = Enum.sum(scores) / length(scores)

# GOOD: Tuples for tagged return values
def fetch_user(id) do
  case Database.find(id) do
    nil -> {:error, :not_found}
    user -> {:ok, user}
  end
end

# GOOD: List of tuples for structured collections
users = [
  {"Alice", :admin},
  {"Bob", :user},
  {"Charlie", :moderator}
]
```

## Pattern Matching with Lists

Pattern matching is especially powerful with lists. You can match specific elements, destructure the head and tail, and use it in function definitions for recursive processing:

```elixir
defmodule ListOps do
  # Sum all elements recursively
  def sum([]), do: 0
  def sum([head | tail]), do: head + sum(tail)

  # Get the last element
  def last([x]), do: x
  def last([_ | tail]), do: last(tail)

  # Check if a list contains a value
  def member?([], _value), do: false
  def member?([value | _tail], value), do: true
  def member?([_head | tail], value), do: member?(tail, value)
end

ListOps.sum([1, 2, 3, 4, 5])    # => 15
ListOps.last([10, 20, 30])      # => 30
ListOps.member?([1, 2, 3], 2)   # => true
ListOps.member?([1, 2, 3], 4)   # => false
```

{{% compare %}}
```elixir
# Elixir - pattern matching on lists
defmodule MyList do
  def sum([]), do: 0
  def sum([h | t]), do: h + sum(t)
end

MyList.sum([1, 2, 3])
# => 6
```

```python
# Python - lists are arrays, typically use built-ins
numbers = [1, 2, 3]
total = sum(numbers)  # => 6

# Recursive approach (less idiomatic)
def my_sum(lst):
    if not lst:
        return 0
    return lst[0] + my_sum(lst[1:])
```

```javascript
// JavaScript - arrays with reduce
const numbers = [1, 2, 3];
const total = numbers.reduce((sum, n) => sum + n, 0);
// => 6
```
{{% /compare %}}

## Charlists

One important caveat: a list of integers that all fall within the printable ASCII range will be displayed as a charlist (single-quoted string). This can be surprising:

{{< iex >}}
iex> [104, 101, 108, 108, 111]
~c"hello"
iex> is_list([104, 101, 108, 108, 111])
true
iex> [104, 101, 108, 108, 111] == ~c"hello"
true
iex> [0, 104, 101, 108, 108, 111]
[0, 104, 101, 108, 108, 111]
{{< /iex >}}

{{< callout type="warning" >}}
Charlists (`~c"hello"`) are **not** the same as strings (`"hello"`). Strings are UTF-8 encoded binaries, while charlists are lists of integer codepoints. You will rarely use charlists in modern Elixir, but you may encounter them when working with Erlang libraries. We will cover this distinction in more detail in the Strings and Binaries lesson.
{{< /callout >}}

{{< exercise title="Recursive List Operations" >}}
Without using any Enum functions, implement the following functions in a module called `MyList`:

1. `length(list)` -- returns the number of elements in the list (do not use the built-in `length/1`).
2. `reverse(list)` -- returns the list in reverse order. Hint: use an accumulator parameter with a default value of `[]`.
3. `map(list, func)` -- applies `func` to each element and returns a new list.
4. `max(list)` -- returns the largest element. Raise an error for an empty list.

Example usage:

```elixir
MyList.length([1, 2, 3, 4])          # => 4
MyList.reverse([1, 2, 3])            # => [3, 2, 1]
MyList.map([1, 2, 3], &(&1 * 2))    # => [2, 4, 6]
MyList.max([3, 7, 2, 9, 1])          # => 9
```

**Hint:** For `reverse/1`, define `reverse(list, acc \\ [])` with clauses: `reverse([], acc)` returns `acc`, and `reverse([h | t], acc)` calls `reverse(t, [h | acc])`.
{{< /exercise >}}
