---
title: "Recursion"
description: "Master recursive thinking in Elixir -- base cases, tail call optimization, accumulator patterns, and when to use recursion vs Enum. With practical examples."
weight: 1
phase: 3
lesson: 11
difficulty: "intermediate"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/02-core-language/06-enum"
hexdocsLinks:
  - title: "Recursion"
    url: "https://hexdocs.pm/elixir/recursion.html"
  - title: "Kernel module"
    url: "https://hexdocs.pm/elixir/Kernel.html"
tags:
  - recursion
  - tail-call
  - accumulator
  - functional-programming
---

Recursion is the fundamental looping mechanism in functional programming. While Elixir provides `Enum` and `Stream` for most collection work, understanding recursion is essential -- it underpins how those modules work internally and gives you the flexibility to solve problems that don't fit neatly into existing abstractions.

## Why Recursion in Elixir?

Elixir has no traditional `for` or `while` loops in the imperative sense. Instead, iteration is accomplished through recursion: a function that calls itself with modified arguments until it reaches a terminating condition. This fits naturally with immutable data -- rather than mutating a loop counter, you pass a new value to the next function call.

{{< concept title="How Recursion Works" >}}
Every recursive function needs two things:

1. **Base case(s)** -- one or more conditions where the function returns a value without calling itself again. This stops the recursion.
2. **Recursive case(s)** -- the function calls itself with arguments that move closer to a base case.

Without a base case, recursion runs forever (until the process runs out of memory or the stack overflows -- though Elixir mitigates this with tail call optimization).
{{< /concept >}}

## A Simple Recursive Function

Let's start with the classic example: computing the length of a list.

```elixir
defmodule MyList do
  # Base case: an empty list has length 0
  def length([]), do: 0

  # Recursive case: the length is 1 + the length of the tail
  def length([_head | tail]), do: 1 + length(tail)
end
```

When you call `MyList.length([10, 20, 30])`, here is what happens step by step:

```
MyList.length([10, 20, 30])
  = 1 + MyList.length([20, 30])
  = 1 + 1 + MyList.length([30])
  = 1 + 1 + 1 + MyList.length([])
  = 1 + 1 + 1 + 0
  = 3
```

Each call waits for the next call to return before it can add `1`. This means the runtime must keep every intermediate frame on the call stack. For a list of one million elements, that is one million stack frames -- and that can cause a stack overflow.

{{< iex >}}
iex> defmodule MyList do
...>   def length([]), do: 0
...>   def length([_head | tail]), do: 1 + length(tail)
...> end
{:module, MyList, ...}
iex> MyList.length([1, 2, 3, 4, 5])
5
iex> MyList.length([])
0
{{< /iex >}}

## Tail Call Optimization and the Accumulator Pattern

Elixir (via the BEAM VM) supports **tail call optimization** (TCO). When the very last operation a function performs is calling itself, the runtime can reuse the current stack frame instead of pushing a new one. This means tail-recursive functions run in constant stack space, no matter how deeply they recurse.

The key rule: **the recursive call must be the last thing the function does.** In the `length` example above, the last operation is `1 + length(tail)` -- the addition happens *after* the recursive call returns, so it is **not** tail recursive.

To make it tail recursive, we introduce an **accumulator** -- an extra argument that carries the intermediate result:

```elixir
defmodule MyList do
  def length(list), do: do_length(list, 0)

  # Base case: return the accumulated count
  defp do_length([], acc), do: acc

  # Recursive case: increment the accumulator, recurse on the tail
  defp do_length([_head | tail], acc), do: do_length(tail, acc + 1)
end
```

Now the recursive call `do_length(tail, acc + 1)` is the very last operation -- nothing happens after it returns. The BEAM can optimize this into a loop that uses constant memory.

{{< callout type="tip" >}}
A common Elixir convention is to define a public function with a friendly API and delegate to a private helper (prefixed with `do_`) that carries the accumulator. This keeps the accumulator hidden from callers.
{{< /callout >}}

## More Recursive Examples

### Summing a List

```elixir
defmodule Math do
  def sum(list), do: do_sum(list, 0)

  defp do_sum([], acc), do: acc
  defp do_sum([head | tail], acc), do: do_sum(tail, acc + head)
end
```

### Reversing a List

```elixir
defmodule MyList do
  def reverse(list), do: do_reverse(list, [])

  defp do_reverse([], acc), do: acc
  defp do_reverse([head | tail], acc), do: do_reverse(tail, [head | acc])
end
```

This works because prepending to a list is O(1). Each element gets moved from the front of the input to the front of the accumulator, effectively reversing the order.

### Fibonacci with Multiple Base Cases

Not all recursion operates on lists. Here is the Fibonacci sequence with two base cases:

```elixir
defmodule Fib do
  def of(0), do: 0
  def of(1), do: 1
  def of(n) when n > 1, do: of(n - 1) + of(n - 2)
end
```

{{< callout type="warning" >}}
The naive Fibonacci implementation above is **not** tail recursive and has exponential time complexity. Each call branches into two more calls. For practical use, rewrite it with an accumulator or use `Stream` / memoization.
{{< /callout >}}

A tail-recursive Fibonacci using two accumulators:

```elixir
defmodule Fib do
  def of(n), do: do_fib(n, 0, 1)

  defp do_fib(0, a, _b), do: a
  defp do_fib(n, a, b), do: do_fib(n - 1, b, a + b)
end
```

{{< iex >}}
iex> defmodule Fib do
...>   def of(n), do: do_fib(n, 0, 1)
...>   defp do_fib(0, a, _b), do: a
...>   defp do_fib(n, a, b), do: do_fib(n - 1, b, a + b)
...> end
{:module, Fib, ...}
iex> Fib.of(10)
55
iex> Fib.of(50)
12586269025
{{< /iex >}}

## Recursion vs Enum

In practice, you will reach for `Enum` and `Stream` most of the time. They are built on recursion internally, but provide a higher-level, more readable API. Use explicit recursion when:

- You need fine-grained control over traversal (e.g., processing a tree structure).
- You are building your own data structure or abstraction.
- The problem does not map cleanly to `map`, `reduce`, `filter`, or other `Enum` functions.
- You are implementing a stateful loop (e.g., a process receive loop).

{{% compare %}}
```elixir
# Elixir -- using Enum.reduce (preferred for most cases)
Enum.reduce([1, 2, 3, 4, 5], 0, fn x, acc -> acc + x end)
# => 15
```

```python
# Python -- using functools.reduce
from functools import reduce
reduce(lambda acc, x: acc + x, [1, 2, 3, 4, 5], 0)
# => 15
```

```javascript
// JavaScript -- using Array.reduce
[1, 2, 3, 4, 5].reduce((acc, x) => acc + x, 0);
// => 15
```
{{% /compare %}}

The `Enum.reduce/3` function is itself implemented with tail recursion under the hood. When you use it, you get the performance benefits of tail call optimization without writing the recursive plumbing yourself.

## Recursion on Non-List Structures

Recursion is not limited to lists. Any problem with a self-similar structure can be solved recursively. Here is a function that flattens an arbitrarily nested list:

```elixir
defmodule MyList do
  def flatten(list), do: do_flatten(list, []) |> Enum.reverse()

  defp do_flatten([], acc), do: acc
  defp do_flatten([head | tail], acc) when is_list(head) do
    do_flatten(tail, do_flatten(head, acc))
  end
  defp do_flatten([head | tail], acc) do
    do_flatten(tail, [head | acc])
  end
end
```

{{< iex >}}
iex> MyList.flatten([1, [2, 3], [4, [5, 6]], 7])
[1, 2, 3, 4, 5, 6, 7]
{{< /iex >}}

{{< exercise title="Practice: Recursive Map" >}}
Implement a `MyList.map/2` function that takes a list and a function, and returns a new list with the function applied to each element. Write both a naive version and a tail-recursive version with an accumulator.

**Naive version skeleton:**

```elixir
defmodule MyList do
  def map([], _func), do: []
  def map([head | tail], func), do: [func.(head) | map(tail, func)]
end
```

**Challenge:** Convert this to a tail-recursive version. Remember that building a list with the accumulator reverses it, so you will need to reverse the result at the end.

**Bonus:** What happens if you call your naive version on a list with 10 million elements? Try it in IEx and compare with the tail-recursive version. You should notice the tail-recursive version handles it without issue.
{{< /exercise >}}

## Summary

Recursion is the backbone of iteration in Elixir. The pattern is always the same: define base cases that stop the recursion, and recursive cases that move toward a base case. Use the accumulator pattern to achieve tail call optimization, which lets your recursive functions run in constant stack space. For everyday collection operations, prefer `Enum` and `Stream` -- but when you need full control, recursion is the tool to reach for.
