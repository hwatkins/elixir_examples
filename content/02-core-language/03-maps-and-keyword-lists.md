---
title: "Maps and Keyword Lists"
description: "Work with Elixir maps and keyword lists -- general-purpose key-value lookups, ordered option lists, nested updates, and pattern matching on map fields."
weight: 3
phase: 2
lesson: 7
difficulty: "beginner"
estimatedMinutes: 20
draft: false
date: 2025-02-23
prerequisites:
  - "/02-core-language/02-lists-and-tuples"
hexdocsLinks:
  - title: "Map"
    url: "https://hexdocs.pm/elixir/Map.html"
  - title: "Keyword"
    url: "https://hexdocs.pm/elixir/Keyword.html"
  - title: "Access"
    url: "https://hexdocs.pm/elixir/Access.html"
tags:
  - maps
  - keyword-lists
  - data-structures
  - pattern-matching
  - access
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Maps and keyword lists are Elixir's primary key-value data structures. Maps are the go-to choice for general-purpose key-value storage with fast lookups. Keyword lists serve a specialized role as ordered collections of key-value pairs, most commonly used for function options. This lesson covers both, including when to choose one over the other.

## Maps

Maps are created with the `%{}` syntax and can use any value as a key. They are Elixir's main general-purpose dictionary structure, similar to Python's `dict` or JavaScript's plain objects.

```elixir
# A map with atom keys
user = %{name: "Alice", age: 30, role: :admin}

# A map with string keys
headers = %{"Content-Type" => "application/json", "Authorization" => "Bearer token123"}

# Mixed key types (valid but uncommon)
mixed = %{:atom_key => 1, "string_key" => 2, 42 => "integer key"}

# Empty map
empty = %{}
```

{{< concept title="Atom Keys vs String Keys" >}}
Maps support any type as keys, but you will most commonly see **atom keys** and **string keys**:

- **Atom keys** (`%{name: "Alice"}`) are used for internal data you control. The shorthand syntax `key: value` is cleaner and allows dot access (`user.name`). This is the sugar for `%{name: "Alice"}` which is equivalent to `%{:name => "Alice"}`.
- **String keys** (`%{"name" => "Alice"}`) are used for external data like JSON payloads, HTTP parameters, or any data where keys come from user input. String keys require the `=>` arrow syntax and bracket access.

Use atom keys for your internal structs and domain data. Use string keys for data coming from the outside world.
{{< /concept >}}

### Accessing Map Values

There are several ways to read values from a map:

```elixir
user = %{name: "Alice", age: 30, role: :admin}

# Dot access (atom keys only, raises on missing key)
user.name   # => "Alice"
user.age    # => 30

# Bracket access with Access (returns nil on missing key)
user[:name]  # => "Alice"
user[:email] # => nil

# Map.get/3 with an optional default
Map.get(user, :name)             # => "Alice"
Map.get(user, :email, "unknown") # => "unknown"

# Map.fetch/2 returns {:ok, value} or :error
Map.fetch(user, :name)   # => {:ok, "Alice"}
Map.fetch(user, :email)  # => :error

# Map.fetch!/2 raises on missing key
Map.fetch!(user, :name)  # => "Alice"
# Map.fetch!(user, :email)  # => ** (KeyError)
```

{{< callout type="warning" >}}
The dot syntax (`map.key`) only works with atom keys and will raise a `KeyError` if the key does not exist. If you are not certain a key is present, use `map[:key]` (which returns `nil`) or `Map.get/3` (which accepts a default value).
{{< /callout >}}

For string keys, use the bracket or Map function syntax:

```elixir
params = %{"username" => "alice", "password" => "secret"}

params["username"]               # => "alice"
Map.get(params, "email", "none") # => "none"

# Dot syntax does NOT work with string keys:
# params.username  # => ** (KeyError)
```

### Updating Maps

Elixir data structures are immutable. "Updating" a map creates a new map with the changes applied. The original is unaffected.

```elixir
user = %{name: "Alice", age: 30, role: :admin}

# Update with the pipe syntax (key must already exist)
updated = %{user | age: 31}
# => %{name: "Alice", age: 31, role: :admin}

# The original is unchanged
user.age  # => 30

# Map.put/3 adds or updates a key
Map.put(user, :email, "alice@example.com")
# => %{name: "Alice", age: 30, role: :admin, email: "alice@example.com"}

# Map.delete/2 removes a key
Map.delete(user, :role)
# => %{name: "Alice", age: 30}

# Map.merge/2 combines two maps (second wins on conflicts)
defaults = %{role: :user, active: true}
Map.merge(defaults, %{name: "Bob", role: :admin})
# => %{role: :admin, active: true, name: "Bob"}
```

{{< callout type="important" >}}
The update syntax `%{map | key: value}` only works for keys that **already exist** in the map. If you try to update a key that does not exist, you will get a `KeyError`. Use `Map.put/3` when you want to add new keys.
{{< /callout >}}

### Pattern Matching with Maps

Maps support partial matching -- the pattern only needs to contain the keys you care about:

```elixir
# Match specific keys
%{name: name} = %{name: "Alice", age: 30, role: :admin}
name  # => "Alice"

# Use in function heads
defmodule UserGreeter do
  def greet(%{name: name, role: :admin}) do
    "Welcome back, Admin #{name}!"
  end

  def greet(%{name: name}) do
    "Hello, #{name}!"
  end
end

UserGreeter.greet(%{name: "Alice", role: :admin, age: 30})
# => "Welcome back, Admin Alice!"

UserGreeter.greet(%{name: "Bob", role: :user})
# => "Hello, Bob!"
```

{{< iex >}}
iex> user = %{name: "Alice", scores: [95, 87, 92]}
%{name: "Alice", scores: [95, 87, 92]}
iex> %{name: name, scores: [first | _]} = user
%{name: "Alice", scores: [95, 87, 92]}
iex> name
"Alice"
iex> first
95
iex> Map.keys(user)
[:name, :scores]
iex> Map.values(user)
["Alice", [95, 87, 92]]
iex> Map.has_key?(user, :name)
true
{{< /iex >}}

## Keyword Lists

A keyword list is a list of two-element tuples where the first element is an atom. Elixir provides special syntax and a dedicated `Keyword` module for working with them.

```elixir
# These two forms are equivalent
opts = [name: "Alice", age: 30, active: true]
opts = [{:name, "Alice"}, {:age, 30}, {:active, true}]

# Keyword lists allow duplicate keys
colors = [primary: "blue", secondary: "green", primary: "red"]
Keyword.get_values(colors, :primary)
# => ["blue", "red"]

# Access the first value for a key
colors[:primary]  # => "blue"
Keyword.get(colors, :primary)  # => "blue"
```

Keyword lists are most commonly used for function options. When a keyword list is the last argument in a function call, you can omit the brackets:

```elixir
# These are the same
String.split("a-b-c", "-", trim: true)
String.split("a-b-c", "-", [trim: true])

# Multi-option example
query = [where: "age > 21", order_by: :name, limit: 10]
```

### Maps vs Keyword Lists

{{% compare %}}
```elixir
# Elixir Map - unique keys, fast lookup
config = %{host: "localhost", port: 4000}
config.host       # => "localhost"
config[:port]     # => 4000

# Elixir Keyword List - ordered, duplicate keys allowed
opts = [host: "localhost", port: 4000]
opts[:host]       # => "localhost"
Keyword.get(opts, :port)  # => 4000
```

```python
# Python dict - similar to Elixir maps
config = {"host": "localhost", "port": 4000}
config["host"]    # => "localhost"
config.get("port")  # => 4000
```

```javascript
// JavaScript object
const config = { host: "localhost", port: 4000 };
config.host       // => "localhost"
config["port"]    // => 4000
```
{{% /compare %}}

{{< concept title="When to Use Maps vs Keyword Lists" >}}
**Use Maps when:**
- You need fast key lookup
- Keys must be unique
- You are storing structured data (users, products, configurations)
- You need pattern matching on keys

**Use Keyword Lists when:**
- You are passing options to a function
- Key order matters
- You need duplicate keys
- You are working with Ecto queries or similar DSLs

As a rule of thumb: if you are uncertain which to use, choose a map. Keyword lists serve a specialized purpose; maps are the general-purpose key-value structure.
{{< /concept >}}

## The Access Module and Nested Data

The `Access` module provides a unified way to access nested data structures. It works with both maps and keyword lists through the bracket syntax and dedicated functions.

```elixir
# Nested maps
users = %{
  "alice" => %{name: "Alice", address: %{city: "Portland", state: "OR"}},
  "bob" => %{name: "Bob", address: %{city: "Austin", state: "TX"}}
}

# get_in/2 navigates nested structures
get_in(users, ["alice", :address, :city])
# => "Portland"

# put_in/3 updates a nested value
updated = put_in(users, ["alice", :address, :city], "Seattle")
get_in(updated, ["alice", :address, :city])
# => "Seattle"

# update_in/3 transforms a nested value with a function
updated = update_in(users, ["bob", :address, :state], &String.downcase/1)
get_in(updated, ["bob", :address, :state])
# => "tx"
```

These nested access functions also work with keyword lists:

```elixir
config = [
  database: [
    host: "localhost",
    port: 5432,
    pool_size: 10
  ],
  web: [
    port: 4000,
    host: "0.0.0.0"
  ]
]

get_in(config, [:database, :host])
# => "localhost"

put_in(config, [:web, :port], 8080)
# => [database: [host: "localhost", port: 5432, pool_size: 10], web: [port: 8080, host: "0.0.0.0"]]
```

{{< callout type="tip" >}}
The `get_in/2`, `put_in/3`, and `update_in/3` functions are Kernel functions, not part of the Access module -- but they rely on the Access behaviour under the hood. They are the idiomatic way to work with nested data in Elixir.
{{< /callout >}}

## Practical Map Operations

Here is a summary of the most commonly used Map functions:

```elixir
map = %{a: 1, b: 2, c: 3}

# Transforming maps
Map.new([{:x, 1}, {:y, 2}])            # => %{x: 1, y: 2}
Map.new(map, fn {k, v} -> {k, v * 10} end)  # => %{a: 10, b: 20, c: 30}

# Filtering
Map.filter(map, fn {_k, v} -> v > 1 end)    # => %{b: 2, c: 3}
Map.reject(map, fn {_k, v} -> v > 1 end)    # => %{a: 1}

# Splitting
Map.split(map, [:a, :b])
# => {%{a: 1, b: 2}, %{c: 3}}

# Taking specific keys
Map.take(map, [:a, :c])  # => %{a: 1, c: 3}
Map.drop(map, [:b])      # => %{a: 1, c: 3}

# Converting
Map.to_list(map)  # => [a: 1, b: 2, c: 3]
```

{{< exercise title="Contact Book" >}}
Build a `ContactBook` module that manages a map of contacts (keyed by name) with nested information:

```elixir
contacts = %{
  "Alice" => %{phone: "555-0001", email: "alice@example.com", tags: [:friend, :coworker]},
  "Bob" => %{phone: "555-0002", email: "bob@example.com", tags: [:friend]}
}
```

Implement these functions:

1. `add(contacts, name, info)` -- adds a new contact. Return `{:error, :already_exists}` if the name is already in the contacts map.
2. `find(contacts, name)` -- returns `{:ok, info}` or `{:error, :not_found}`.
3. `update_email(contacts, name, new_email)` -- updates a contact's email using `update_in/3`.
4. `with_tag(contacts, tag)` -- returns a map of only the contacts who have the given tag.
5. `summary(contacts)` -- returns a keyword list of `[name: email]` pairs, sorted by name.

Test:

```elixir
contacts = ContactBook.add(%{}, "Alice", %{phone: "555-0001", email: "a@example.com", tags: [:friend]})
ContactBook.find(contacts, "Alice")
# => {:ok, %{phone: "555-0001", email: "a@example.com", tags: [:friend]}}
```
{{< /exercise >}}
