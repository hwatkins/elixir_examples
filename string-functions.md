---
layout: markdown.njk
title: String functions in Elixir
eleventyNavigation:
  key: Strings
  title: String functions in Elixir
---
# String functions in Elixir
Elixir has functions across many different modules to parse strings to numeric values
## Convert String to Float in Elixir
```elixir
# Must be the string representation of a float including a decimal point
String.to_float("2.2017764e+0")
2.2017764
String.to_float("3.0")
3.0

# Float module can parse binary without the decimal
Float.parse("34")
{34.0, ""}
# Can also parse binary with the decimal
Float.parse("34.25")
{34.25, ""}
# Can also parse binary with non numeric information at the end
Float.parse("56.5xyz")
{56.5, "xyz"}
# Can not parse binary with leading non numeric
Float.parse("xyz56.5")
:error
```
[String Module](https://hexdocs.pm/elixir/master/String.html)
[Float Module](https://hexdocs.pm/elixir/master/Float.html)
***
## Convert String to Integer in Elixir
```elixir
# Must be the string representation of a integer
String.to_integer("4")
4
# non integer will result in ArgumentError
String.to_integer("4.1")
** (ArgumentError) argument error
    :erlang.binary_to_integer("4.1")

# Integer module can parse string representation of a integer
Integer.parse("34")
{34.0, ""}
# Any non integer part will be treated as extra
Integer.parse("34.25")
{34, ".25"}
```
[String Module](https://hexdocs.pm/elixir/master/String.html)
[Integer Module](https://hexdocs.pm/elixir/master/Integer.html)
***
