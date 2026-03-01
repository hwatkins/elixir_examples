---
title: "Strings and Binaries"
description: "Understand Elixir UTF-8 strings, binary representation, string interpolation, the String module, charlists, and numeric parsing. With Python and JS comparisons."
weight: 4
phase: 2
lesson: 8
difficulty: "beginner"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/02-core-language/03-maps-and-keyword-lists"
hexdocsLinks:
  - title: "String"
    url: "https://hexdocs.pm/elixir/String.html"
  - title: "Float"
    url: "https://hexdocs.pm/elixir/Float.html"
  - title: "Integer"
    url: "https://hexdocs.pm/elixir/Integer.html"
tags:
  - strings
  - binaries
  - utf-8
  - charlists
  - string-module
  - parsing
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Strings in Elixir are UTF-8 encoded binaries. This means that every double-quoted string like `"hello"` is actually a sequence of bytes in memory, and Elixir provides full Unicode support out of the box. This lesson covers everything from basic string operations to the binary underpinnings, the String module, charlists, and parsing strings into numeric types.

## String Basics

Strings in Elixir are delimited by double quotes and support interpolation, escape sequences, and multi-line content:

```elixir
# Basic string
name = "Alice"

# String interpolation with #{}
greeting = "Hello, #{name}!"
# => "Hello, Alice!"

# Interpolation evaluates any expression
"2 + 2 = #{2 + 2}"
# => "2 + 2 = 4"

# Escape sequences
"Line one\nLine two"
"Tab\there"
"A backslash: \\"
"A quote: \""

# Multi-line strings
multi = "This is
a multi-line
string"

# Heredoc syntax for long multi-line strings
doc = """
This is a heredoc string.
It preserves newlines and
is great for documentation.
"""
```

{{< concept title="Strings Are Binaries" >}}
In Elixir, a string is a **binary** -- a contiguous sequence of bytes. The `is_binary/1` function returns `true` for strings. Each character is encoded as one or more bytes using UTF-8:

- ASCII characters (a-z, 0-9, etc.) use 1 byte each
- Many accented characters use 2 bytes
- CJK characters, emoji, and others may use 3 or 4 bytes

This means `byte_size/1` (the number of bytes) can differ from `String.length/1` (the number of grapheme clusters, i.e., visible characters).
{{< /concept >}}

{{< iex >}}
iex> is_binary("hello")
true
iex> byte_size("hello")
5
iex> String.length("hello")
5
iex> byte_size("helo")
6
iex> String.length("helo")
4
iex> byte_size("neko")
12
iex> String.length("neko")
4
{{< /iex >}}

## String Concatenation and Operations

```elixir
# Concatenation with <>
"Hello" <> " " <> "World"
# => "Hello World"

# Concatenation in pattern matching
"Hello, " <> name = "Hello, Alice"
name  # => "Alice"

# String.contains?
String.contains?("Hello World", "World")  # => true
String.contains?("Hello World", ["Foo", "World"])  # => true

# String.starts_with? and String.ends_with?
String.starts_with?("Elixir", "El")  # => true
String.ends_with?("hello.ex", ".ex") # => true
```

## The String Module

Elixir's `String` module provides a comprehensive set of functions for working with UTF-8 strings:

```elixir
# Case conversion
String.upcase("hello")      # => "HELLO"
String.downcase("HELLO")    # => "hello"
String.capitalize("hello")  # => "Hello"

# Trimming whitespace
String.trim("  hello  ")       # => "hello"
String.trim_leading("  hello") # => "hello"
String.trim_trailing("hello  ") # => "hello"

# Splitting
String.split("a,b,c", ",")           # => ["a", "b", "c"]
String.split("hello world")          # => ["hello", "world"]
String.split("a--b--c", "--")        # => ["a", "b", "c"]
String.split("abc", "", trim: true)  # => ["a", "b", "c"]

# Replacing
String.replace("Hello World", "World", "Elixir")
# => "Hello Elixir"

# Padding
String.pad_leading("42", 5, "0")   # => "00042"
String.pad_trailing("hi", 10, ".") # => "hi........"

# Slicing
String.slice("Hello World", 0, 5)  # => "Hello"
String.slice("Hello World", 6..-1//1) # => "World"

# Reversing (Unicode-aware)
String.reverse("hello")  # => "olleh"

# Duplicate
String.duplicate("ha", 3)  # => "hahaha"

# Length vs byte size
String.length("cafe")    # => 5
byte_size("cafe")         # => 6
```

{{% compare %}}
```elixir
# Elixir - String module functions
text = "  Hello, World!  "

text
|> String.trim()
|> String.downcase()
|> String.replace("world", "elixir")
|> String.split(", ")
# => ["hello", "elixir!"]
```

```python
# Python - string methods
text = "  Hello, World!  "

text.strip().lower().replace("world", "elixir").split(", ")
# => ['hello', 'elixir!']
```

```javascript
// JavaScript - string methods
const text = "  Hello, World!  ";

text.trim().toLowerCase().replace("world", "elixir").split(", ");
// => ["hello", "elixir!"]
```
{{% /compare %}}

## Parsing Strings to Numbers

Elixir provides multiple ways to convert strings to numeric types, each with different behavior for invalid inputs.

### String.to_float and Float.parse

```elixir
# String.to_float/1 requires a proper float format with a decimal point
String.to_float("2.2017764e+0")  # => 2.2017764
String.to_float("3.0")           # => 3.0

# String.to_float raises on integers or invalid strings:
# String.to_float("34")   # => ** (ArgumentError)
# String.to_float("abc")  # => ** (ArgumentError)

# Float.parse/1 is more forgiving -- it returns a tuple
Float.parse("34")        # => {34.0, ""}
Float.parse("34.25")     # => {34.25, ""}
Float.parse("56.5xyz")   # => {56.5, "xyz"}
Float.parse("xyz56.5")   # => :error
Float.parse("")          # => :error
```

### String.to_integer and Integer.parse

```elixir
# String.to_integer/1 requires a pure integer string
String.to_integer("4")     # => 4
String.to_integer("042")   # => 42

# Raises on non-integer strings:
# String.to_integer("4.1") # => ** (ArgumentError)
# String.to_integer("abc") # => ** (ArgumentError)

# Integer.parse/1 is more forgiving
Integer.parse("34")      # => {34, ""}
Integer.parse("34.25")   # => {34, ".25"}
Integer.parse("0xFF", 16) # => {255, ""}
Integer.parse("abc")     # => :error
```

{{< callout type="tip" >}}
Use `String.to_integer/1` and `String.to_float/1` when you are certain the input is valid (e.g., data you control). Use `Integer.parse/1` and `Float.parse/1` when handling external input, since they return `:error` instead of raising on invalid data. Combine them with pattern matching for clean error handling:

```elixir
case Integer.parse(user_input) do
  {number, ""} -> {:ok, number}
  {_number, _rest} -> {:error, "trailing characters"}
  :error -> {:error, "not a number"}
end
```
{{< /callout >}}

## Binaries

Under the hood, strings are binaries, and you can work with binary data directly using the `<<>>` syntax:

```elixir
# A binary is a sequence of bytes
<<0, 1, 2, 3>>

# Strings are UTF-8 binaries
"hello" == <<104, 101, 108, 108, 111>>
# => true

# You can specify bit sizes
<<3::size(2), 1::size(3), 2::size(3)>>
# => <<202>> (binary: 11 001 010)

# Binary pattern matching
<<first_byte, rest::binary>> = "hello"
first_byte  # => 104 (ASCII 'h')
rest        # => "ello"

# Match a fixed-size prefix
<<head::binary-size(3), tail::binary>> = "hello world"
head  # => "hel"
tail  # => "lo world"
```

### Binary Pattern Matching

Binary pattern matching is a powerful feature for parsing binary protocols, file formats, and network data:

```elixir
defmodule BinaryParser do
  # Parse a simple binary header: 1 byte version, 2 bytes length, rest is payload
  def parse(<<version::8, length::16, payload::binary-size(length), _rest::binary>>) do
    %{version: version, length: length, payload: payload}
  end

  # Parse an RGB color from a hex string like "FF8800"
  def parse_hex_color(<<r::binary-size(2), g::binary-size(2), b::binary-size(2)>>) do
    {String.to_integer(r, 16), String.to_integer(g, 16), String.to_integer(b, 16)}
  end
end

BinaryParser.parse_hex_color("FF8800")
# => {255, 136, 0}
```

{{< callout type="note" >}}
Binary pattern matching is one of Elixir's superpowers, inherited from Erlang. It lets you declaratively describe binary formats and extract data in a single expression. This is especially useful for network protocols, file parsing, and embedded systems work.
{{< /callout >}}

## Charlists

Charlists are lists of integer codepoints, written with single quotes or the `~c` sigil. They exist primarily for compatibility with Erlang, which uses them as its native string type.

```elixir
# Charlists
~c"hello"         # => ~c"hello"
is_list(~c"hello") # => true

# They are just lists of integers
~c"hello" == [104, 101, 108, 108, 111]
# => true

# Converting between strings and charlists
String.to_charlist("hello")   # => ~c"hello"
List.to_string(~c"hello")     # => "hello"
to_string(~c"hello")          # => "hello"
to_charlist("hello")          # => ~c"hello"
```

{{< callout type="warning" >}}
In modern Elixir, always use double-quoted strings (`"hello"`) unless you are specifically interfacing with Erlang code that requires charlists. The String module works only with binaries (double-quoted strings), not charlists.
{{< /callout >}}

## Sigils

Sigils provide syntactic sugar for working with textual representations. The most common string-related sigils are:

```elixir
# ~s creates a string (useful when the string contains double quotes)
~s(She said "hello")
# => "She said \"hello\""

# ~S creates a string without interpolation or escaping
~S(No #{interpolation} here\n)
# => "No \#{interpolation} here\\n"

# ~w creates a word list
~w(apple banana cherry)
# => ["apple", "banana", "cherry"]

# ~w with atom modifier
~w(apple banana cherry)a
# => [:apple, :banana, :cherry]

# ~r creates a regular expression
Regex.match?(~r/hello/, "hello world")
# => true
```

## Practical Example: Text Processing Pipeline

Here is a complete example combining many string operations with the pipe operator:

```elixir
defmodule TextProcessor do
  @doc "Extracts and counts unique words from text, ignoring case and punctuation"
  def word_frequencies(text) do
    text
    |> String.downcase()
    |> String.replace(~r/[^\w\s]/u, "")
    |> String.split()
    |> Enum.frequencies()
    |> Enum.sort_by(fn {_word, count} -> count end, :desc)
  end

  @doc "Truncates a string to max_length, adding ellipsis if truncated"
  def truncate(text, max_length \\ 50) do
    if String.length(text) <= max_length do
      text
    else
      text
      |> String.slice(0, max_length - 3)
      |> Kernel.<>("...")
    end
  end

  @doc "Converts a string to a URL-friendly slug"
  def slugify(text) do
    text
    |> String.downcase()
    |> String.replace(~r/[^\w\s-]/u, "")
    |> String.trim()
    |> String.replace(~r/\s+/, "-")
  end
end

TextProcessor.word_frequencies("the cat sat on the mat the cat")
# => [{"the", 3}, {"cat", 2}, {"sat", 1}, {"on", 1}, {"mat", 1}]

TextProcessor.truncate("This is a very long string that should be truncated", 30)
# => "This is a very long string ..."

TextProcessor.slugify("Hello World! This is Elixir.")
# => "hello-world-this-is-elixir"
```

{{< exercise title="String Parser Module" >}}
Create a `Parser` module with these functions:

1. `parse_csv_line(line)` -- splits a CSV line by commas and trims whitespace from each field. Returns a list of strings.
   ```elixir
   Parser.parse_csv_line("  Alice , 30 , admin ")
   # => ["Alice", "30", "admin"]
   ```

2. `parse_key_value(string, separator \\ "=")` -- parses a `"key=value"` string into a `{key, value}` tuple with trimmed strings.
   ```elixir
   Parser.parse_key_value("name = Alice")
   # => {"name", "Alice"}
   ```

3. `safe_to_integer(string)` -- converts a string to an integer, returning `{:ok, integer}` or `{:error, :invalid}`. Use `Integer.parse/1` internally.
   ```elixir
   Parser.safe_to_integer("42")    # => {:ok, 42}
   Parser.safe_to_integer("42abc") # => {:error, :invalid}
   Parser.safe_to_integer("abc")   # => {:error, :invalid}
   ```

4. `extract_emails(text)` -- extracts all email addresses from a block of text using `Regex.scan/2`.

**Bonus:** Write a `parse_csv(text)` function that splits the text by newlines and maps `parse_csv_line/1` over each line, returning a list of lists.
{{< /exercise >}}
