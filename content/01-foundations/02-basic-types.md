---
title: "Basic Types"
description: "Learn Elixir's fundamental data types -- integers, floats, atoms, booleans, strings, and ranges. Includes comparisons with Python and JavaScript equivalents."
weight: 2
phase: 1
lesson: 2
difficulty: beginner
estimatedMinutes: 20
draft: false
date: 2025-02-23
prerequisites:
  - "/01-foundations/01-getting-started"
hexdocsLinks:
  - title: "Kernel Module"
    url: "https://hexdocs.pm/elixir/Kernel.html"
  - title: "Basic Types Guide"
    url: "https://hexdocs.pm/elixir/basic-types.html"
tags:
  - types
  - integers
  - floats
  - atoms
  - booleans
  - strings
  - charlists
keyTakeaways:
  - "Elixir is dynamically typed -- values have types, but variables do not"
  - "Atoms are constants whose name is their value, widely used as labels and keys"
  - "Booleans `true` and `false` are actually atoms"
  - "Strings are UTF-8 encoded binaries, and charlists are lists of codepoints -- they are different types"
  - "Use `is_*` guard functions to check types at runtime"
---

## Numbers

Elixir has two numeric types: integers and floats.

### Integers

Integers have arbitrary precision -- there is no upper limit on their size. Elixir will handle numbers as large as your machine's memory allows.

{{< iex >}}
iex> 42
42
iex> 1_000_000
1000000
iex> 0xFF
255
iex> 0b1010
10
iex> 0o777
511
{{< /iex >}}

Underscores in integer literals are ignored by the compiler and serve purely as visual separators. The prefixes `0x`, `0b`, and `0o` denote hexadecimal, binary, and octal notation respectively.

```elixir
# Arbitrary precision means no overflow
factorial = Enum.reduce(1..100, 1, &(&1 * &2))
# => 93326215443944152681699238856266700490715968264381621468...
```

### Floats

Floats are 64-bit double-precision numbers following the IEEE 754 standard. They require at least one digit before and after the decimal point.

{{< iex >}}
iex> 3.14
3.14
iex> 1.0e10
10000000000.0
iex> 1 / 3
0.3333333333333333
iex> 0.1 + 0.2
0.30000000000000004
{{< /iex >}}

{{< callout type="warning" >}}
Like every language using IEEE 754 floats, `0.1 + 0.2` does not equal `0.3` exactly. For financial calculations or any domain requiring exact decimal arithmetic, use the [Decimal](https://hex.pm/packages/decimal) library from Hex.
{{< /callout >}}

### Arithmetic

```elixir
10 + 3    # => 13
10 - 3    # => 7
10 * 3    # => 30
10 / 3    # => 3.3333333333333335  (always returns a float)
div(10, 3) # => 3                  (integer division)
rem(10, 3) # => 1                  (remainder)
```

Note that the `/` operator always returns a float. Use `div/2` and `rem/2` for integer division and remainder.

## Atoms

Atoms are constants whose name is their own value. They are prefixed with a colon and are used pervasively throughout Elixir and Erlang.

{{< iex >}}
iex> :ok
:ok
iex> :error
:error
iex> :hello_world
:hello_world
iex> :"atoms with spaces"
:"atoms with spaces"
iex> :ok == :ok
true
iex> :ok == :error
false
{{< /iex >}}

{{< concept title="Atoms Are Global Constants" >}}
Atoms are stored in a global atom table and are compared by identity, not by string content. This makes atom comparison an O(1) operation -- extremely fast. However, atoms are never garbage collected, so you should never dynamically create atoms from user input (e.g., using `String.to_atom/1` on untrusted data). Use `String.to_existing_atom/1` if you must convert strings to atoms at runtime.
{{< /concept >}}

Atoms are used everywhere in Elixir: as map keys, function return values, module names, and boolean values. The most common atoms you will encounter are `:ok` and `:error`, which appear in return tuples throughout the standard library:

```elixir
File.read("existing_file.txt")
# => {:ok, "file contents here"}

File.read("missing.txt")
# => {:error, :enoent}
```

## Booleans

Booleans in Elixir are the atoms `true` and `false`. There is no separate boolean type.

{{< iex >}}
iex> true
true
iex> false
false
iex> is_atom(true)
true
iex> is_boolean(true)
true
iex> true == :true
true
{{< /iex >}}

Elixir has two sets of boolean operators. The strict operators `and`, `or`, and `not` require boolean arguments. The relaxed operators `&&`, `||`, and `!` accept any type and treat `nil` and `false` as falsy -- everything else is truthy.

```elixir
# Strict boolean operators (require true/false)
true and false  # => false
true or false   # => true
not true        # => false

# Relaxed operators (any type, nil/false are falsy)
nil && "hello"  # => nil
0 && "hello"    # => "hello"  (0 is truthy!)
nil || "default" # => "default"
!nil            # => true
```

{{< callout type="important" >}}
Unlike Python, JavaScript, and Ruby, the number `0` and the empty string `""` are truthy in Elixir. Only `nil` and `false` are falsy.
{{< /callout >}}

## Strings

Strings in Elixir are UTF-8 encoded binaries, enclosed in double quotes.

```elixir
name = "Elixir"

# Interpolation
"Hello, #{name}!"          # => "Hello, Elixir!"

# Concatenation
"Hello, " <> name <> "!"   # => "Hello, Elixir!"

# Multi-line with heredoc
message = """
This is a
multi-line string.
"""

# Common String functions
String.length("cafe\u0301")  # => 4 (grapheme count)
byte_size("cafe\u0301")      # => 6 (byte count)
String.upcase("hello")       # => "HELLO"
String.split("a,b,c", ",")  # => ["a", "b", "c"]
String.trim("  hi  ")       # => "hi"
```

{{< concept title="Strings Are Binaries" >}}
Under the hood, an Elixir string is a sequence of bytes (`<<104, 101, 108, 108, 111>>`). The `String` module is Unicode-aware and operates on graphemes (human-perceived characters), while `byte_size/1` counts raw bytes. This distinction matters for characters outside the ASCII range, where a single grapheme can be multiple bytes.
{{< /concept >}}

### Strings in Elixir vs Other Languages

{{% compare %}}
```python
# Python strings
name = "World"
greeting = f"Hello, {name}!"
length = len(greeting)
parts = "a,b,c".split(",")
upper = "hello".upper()
```

```javascript
// JavaScript strings
const name = "World";
const greeting = `Hello, ${name}!`;
const length = greeting.length;
const parts = "a,b,c".split(",");
const upper = "hello".toUpperCase();
```

```elixir
# Elixir strings
name = "World"
greeting = "Hello, #{name}!"
length = String.length(greeting)
parts = String.split("a,b,c", ",")
upper = String.upcase("hello")
```
{{% /compare %}}

The key difference is that Elixir uses module functions (`String.upcase/1`) rather than methods on the string object. This is consistent with functional programming: data is transformed by functions, not mutated by methods.

## Charlists

Charlists are lists of integer codepoints, enclosed in single quotes. They exist primarily for interoperability with Erlang, which uses them as its string type.

{{< iex >}}
iex> 'hello'
~c"hello"
iex> [104, 101, 108, 108, 111]
~c"hello"
iex> is_list('hello')
true
iex> is_binary("hello")
true
{{< /iex >}}

{{< callout type="warning" >}}
Single quotes (`'hello'`) and double quotes (`"hello"`) create different types in Elixir. Double-quoted strings are binaries; single-quoted values are charlists (lists of integers). This is a common source of confusion for newcomers. You will almost always want double-quoted strings.
{{< /callout >}}

## Nil

The value `nil` represents the absence of a value. Like booleans, `nil` is an atom:

{{< iex >}}
iex> nil
nil
iex> is_atom(nil)
true
iex> nil == :nil
true
{{< /iex >}}

## Type Checking

Elixir provides a set of `is_*` functions (technically guard-safe functions) for runtime type checking:

```elixir
is_integer(42)       # => true
is_float(3.14)       # => true
is_number(42)        # => true  (integer or float)
is_atom(:hello)      # => true
is_boolean(true)     # => true
is_binary("hello")   # => true  (strings are binaries)
is_list([1, 2, 3])   # => true
is_nil(nil)          # => true
is_map(%{})          # => true
is_tuple({1, 2})     # => true
```

These functions are special because they can be used in guard clauses (which you will learn about in the Control Flow lesson). Regular functions cannot appear in guards.

## Comparison Operators

Elixir values can be compared using the standard operators:

```elixir
1 == 1      # => true
1 == 1.0    # => true   (loose equality)
1 === 1.0   # => false  (strict equality -- types must match)
1 != 2      # => true
1 !== 1.0   # => true
1 < 2       # => true
1 > 2       # => false
1 <= 2      # => true
1 >= 2      # => false
```

Elixir also defines a sorting order across all types:

```
number < atom < reference < function < port < pid < tuple < map < list < bitstring
```

This allows comparing values of different types, which is useful for sorting heterogeneous collections, but it is rarely needed in practice.

{{< exercise title="Exploring Types in IEx" >}}
Open IEx and work through these tasks:

1. Create a large integer by computing `2` to the power of `100` (hint: use `:math.pow(2, 100)` and then `trunc/1`, or try `Integer.pow(2, 100)`). What does the result look like?

2. Demonstrate the difference between `==` and `===` using an integer and a float.

3. Create a string with your name and use `String.graphemes/1` to split it into individual characters. Then use `byte_size/1` and `String.length/1` on a string containing an emoji like `"hello"` -- are the results the same?

4. Predict the result of each expression, then verify in IEx:
   - `is_atom(false)`
   - `nil || "fallback"`
   - `0 && "zero is truthy"`
   - `"" && "empty string is truthy"`

5. What happens when you compare an atom to a string? Try `:hello > "hello"` and explain the result using the type sorting order.
{{< /exercise >}}

## What's Next

You now know Elixir's primitive data types. In the next lesson, you will learn about pattern matching -- Elixir's most distinctive and powerful feature, which changes how you think about assigning values and writing functions.
