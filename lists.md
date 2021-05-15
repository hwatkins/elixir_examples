---
layout: markdown.njk
title: Lists in Elixir
eleventyNavigation:
  key: List
  title: Lists in Elixir
---
# Lists in Elixir
Elixir has built in processing and functions to work with Lists
## Working with Lists in Elixir
```elixir
# Get the head and tail of a list
[head|tail] = [1, 2, 3]
head = 1
tail = [2, 3]

# Get the head of a list with no tail
[head|tail] = [1]
head = 1
tail = []
[] = []

# This does not match, no value for head
[head|tail] = []

# match head value
[1 | tail ]= [1, 2, 3]
tail = [2, 3]

# use underscore to ignore a variable
[head | _ ]= [1, 2, 3]
head = 1

# adding two lists
[1, 2, 3] ++ [4, 5, 6]
[1, 2, 3, 4, 5, 6]

# subtracting two lists
[1, true, 2, false, 3, true] -- [true, false]
[1, 2, 3, true]

# prepend list
new = 0
list = [1, 2, 3]
[new | list]
[0, 1, 2, 3]
```
[List Module](https://hexdocs.pm/elixir/master/List.html)
***

