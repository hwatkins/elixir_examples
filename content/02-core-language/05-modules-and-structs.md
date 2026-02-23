---
title: "Modules and Structs"
description: "Organize Elixir code with modules and structs -- module attributes, custom data types, alias, import, require, and use directives explained."
weight: 5
phase: 2
lesson: 9
difficulty: "beginner"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/02-core-language/04-strings"
hexdocsLinks:
  - title: "Kernel (defmodule)"
    url: "https://hexdocs.pm/elixir/Kernel.html#defmodule/2"
  - title: "Kernel (defstruct)"
    url: "https://hexdocs.pm/elixir/Kernel.html#defstruct/1"
  - title: "Module"
    url: "https://hexdocs.pm/elixir/Module.html"
tags:
  - modules
  - structs
  - alias
  - import
  - require
  - use
  - documentation
  - module-attributes
---

Modules are Elixir's primary organizational unit. Every named function lives inside a module, and modules provide namespacing, documentation, and a home for custom data types called structs. This lesson covers the full module system: defining modules, using module attributes for documentation and constants, creating structs, and the four directives (`alias`, `import`, `require`, `use`) that control how modules interact.

## Defining Modules

Modules are defined with `defmodule` and conventionally use CamelCase names. A module groups related functions together:

```elixir
defmodule Calculator do
  def add(a, b), do: a + b
  def subtract(a, b), do: a - b
  def multiply(a, b), do: a * b

  def divide(_a, 0), do: {:error, :division_by_zero}
  def divide(a, b), do: {:ok, a / b}
end

Calculator.add(2, 3)       # => 5
Calculator.divide(10, 3)   # => {:ok, 3.3333333333333335}
Calculator.divide(10, 0)   # => {:error, :division_by_zero}
```

### Module Nesting

Modules can be nested to create hierarchical namespaces. The dots in module names are purely conventional -- `MyApp.Accounts.User` is a single flat atom name, not a hierarchy of modules.

```elixir
defmodule MyApp.Accounts do
  defmodule User do
    # This module's full name is MyApp.Accounts.User
    def new(name, email) do
      %{name: name, email: email}
    end
  end

  def create_user(name, email) do
    User.new(name, email)
  end
end

# Access from outside
MyApp.Accounts.User.new("Alice", "alice@example.com")
MyApp.Accounts.create_user("Bob", "bob@example.com")
```

You can also define nested modules at the top level:

```elixir
# This is equivalent to nesting inside MyApp.Accounts
defmodule MyApp.Accounts.User do
  def new(name, email) do
    %{name: name, email: email}
  end
end
```

{{< callout type="tip" >}}
In a Mix project, module names typically mirror the directory structure. A module `MyApp.Accounts.User` would live in `lib/my_app/accounts/user.ex`. Following this convention makes it easy to find code.
{{< /callout >}}

## Module Attributes

Module attributes serve three purposes: as annotations (documentation), as constants, and as temporary storage during compilation.

### Documentation

Elixir has first-class support for documentation through the `@moduledoc` and `@doc` attributes:

```elixir
defmodule MyApp.Math do
  @moduledoc """
  A module providing basic mathematical operations.

  All functions handle both integer and float inputs.
  """

  @doc """
  Adds two numbers together.

  ## Examples

      iex> MyApp.Math.add(1, 2)
      3

      iex> MyApp.Math.add(1.5, 2.5)
      4.0
  """
  def add(a, b), do: a + b

  @doc """
  Computes the factorial of a non-negative integer.

  Raises `ArgumentError` for negative inputs.

  ## Examples

      iex> MyApp.Math.factorial(5)
      120

      iex> MyApp.Math.factorial(0)
      1
  """
  def factorial(0), do: 1
  def factorial(n) when n > 0, do: n * factorial(n - 1)
end
```

{{< concept title="ExDoc and Doctests" >}}
Elixir's documentation is not just comments -- it is structured data accessible at runtime. The `h/1` helper in IEx displays module and function docs. The ExDoc tool generates beautiful HTML documentation from `@moduledoc` and `@doc` attributes.

The `## Examples` sections with `iex>` prompts are **doctests**. When you run `mix test`, Elixir automatically extracts these examples and verifies they produce the expected output. This keeps your documentation accurate and up to date.

Use `@moduledoc false` or `@doc false` to explicitly mark a module or function as undocumented (hidden from generated docs).
{{< /concept >}}

### Constants

Module attributes defined with `@` act as compile-time constants:

```elixir
defmodule Circle do
  @pi 3.14159265358979

  def area(radius), do: @pi * radius * radius
  def circumference(radius), do: 2 * @pi * radius
end

Circle.area(5)            # => 78.53981633974483
Circle.circumference(5)   # => 31.41592653589793
```

{{< callout type="note" >}}
Module attributes are resolved at **compile time**, not runtime. They are inlined into the function body during compilation. This means they cannot be changed once the module is compiled. For runtime configuration, use application environment or config files instead.
{{< /callout >}}

## Structs

A struct is a special map with a fixed set of fields and default values. Structs are defined inside a module using `defstruct` and provide compile-time guarantees about which keys are present.

```elixir
defmodule User do
  @enforce_keys [:name, :email]
  defstruct [:name, :email, role: :user, active: true]
end

# Creating a struct
alice = %User{name: "Alice", email: "alice@example.com"}
# => %User{name: "Alice", email: "alice@example.com", role: :user, active: true}

# Accessing fields (same as maps)
alice.name   # => "Alice"
alice.role   # => :user

# Updating (same as maps, but type is preserved)
admin_alice = %{alice | role: :admin}
# => %User{name: "Alice", email: "alice@example.com", role: :admin, active: true}

# @enforce_keys means these are required:
# %User{name: "Bob"}
# => ** (ArgumentError) the following keys must also be given when building
#    struct User: [:email]
```

### Pattern Matching with Structs

Structs support pattern matching just like maps, with the added benefit that you can match on the struct type:

```elixir
defmodule Notification do
  defstruct [:message, :type, read: false]
end

defmodule NotificationHandler do
  def handle(%Notification{type: :urgent, message: msg}) do
    "URGENT: #{msg}"
  end

  def handle(%Notification{type: :info, message: msg}) do
    "Info: #{msg}"
  end

  def handle(%Notification{message: msg}) do
    "Notice: #{msg}"
  end
end

urgent = %Notification{message: "Server down!", type: :urgent}
info = %Notification{message: "Deploy complete", type: :info}

NotificationHandler.handle(urgent)  # => "URGENT: Server down!"
NotificationHandler.handle(info)    # => "Info: Deploy complete"
```

{{< callout type="important" >}}
Structs are maps under the hood, but with important differences: they have a `__struct__` key holding the module name, they only allow predefined keys, and they do **not** implement the Access protocol by default. This means `user[:name]` will not work on a struct unless you explicitly implement Access -- use `user.name` or `Map.get(user, :name)` instead.
{{< /callout >}}

### Adding Functions to Struct Modules

It is idiomatic to define functions that operate on a struct within the same module:

```elixir
defmodule Product do
  defstruct [:name, :price, quantity: 0]

  @doc "Creates a new product"
  def new(name, price, quantity \\ 0) do
    %Product{name: name, price: price, quantity: quantity}
  end

  @doc "Calculates the total value of the product in stock"
  def total_value(%Product{price: price, quantity: qty}) do
    price * qty
  end

  @doc "Adds stock to the product"
  def restock(%Product{} = product, amount) when amount > 0 do
    %{product | quantity: product.quantity + amount}
  end

  @doc "Applies a percentage discount"
  def discount(%Product{} = product, percent) when percent > 0 and percent <= 100 do
    %{product | price: product.price * (1 - percent / 100)}
  end
end

widget = Product.new("Widget", 9.99, 100)
Product.total_value(widget)  # => 999.0
widget = Product.restock(widget, 50)
Product.total_value(widget)  # => 1498.5
```

{{% compare %}}
```elixir
# Elixir - struct with module functions
defmodule User do
  defstruct [:name, :email, role: :user]

  def admin?(%User{role: :admin}), do: true
  def admin?(%User{}), do: false
end

user = %User{name: "Alice", email: "a@b.com", role: :admin}
User.admin?(user)  # => true
```

```python
# Python - dataclass
from dataclasses import dataclass

@dataclass
class User:
    name: str
    email: str
    role: str = "user"

    def is_admin(self):
        return self.role == "admin"

user = User("Alice", "a@b.com", "admin")
user.is_admin()  # => True
```

```javascript
// JavaScript - class
class User {
  constructor(name, email, role = "user") {
    this.name = name;
    this.email = email;
    this.role = role;
  }

  isAdmin() {
    return this.role === "admin";
  }
}

const user = new User("Alice", "a@b.com", "admin");
user.isAdmin(); // => true
```
{{% /compare %}}

## alias, import, require, and use

Elixir provides four directives for managing module references within your code.

### alias

`alias` creates a short name for a module, reducing verbosity:

```elixir
defmodule MyApp.Web.UserController do
  alias MyApp.Accounts.User
  alias MyApp.Accounts.Authorization, as: Auth

  def show(id) do
    # Instead of MyApp.Accounts.User.find(id)
    User.find(id)
  end

  def authorize(user) do
    Auth.check(user)
  end
end

# You can alias multiple modules from the same namespace
alias MyApp.Accounts.{User, Authorization, Session}
```

### import

`import` brings functions from another module into the current scope so you can call them without the module prefix:

```elixir
defmodule MathHelper do
  import Integer, only: [is_odd: 1, is_even: 1]

  def classify(n) when is_odd(n), do: :odd
  def classify(n) when is_even(n), do: :even
end

# You can also import all functions (use sparingly)
# import String
# Then call split("hello world") instead of String.split("hello world")
```

{{< callout type="warning" >}}
Be selective with `import`. Always use `only:` or `except:` to limit what you bring into scope. Importing entire modules can cause name conflicts and makes it harder to tell where functions come from when reading the code.
{{< /callout >}}

### require

`require` ensures a module is compiled and available, which is necessary when you want to use its macros:

```elixir
# Logger uses macros, so it must be required
require Logger

Logger.info("Application started")
Logger.debug("Debug info: #{inspect(some_data)}")

# Without require, you would get:
# ** (CompileError) you must require Logger before invoking the macro Logger.info/1
```

### use

`use` invokes a module's `__using__/1` macro, which can inject code into your module. It is essentially shorthand for calling a macro that sets up boilerplate:

```elixir
defmodule MyTest do
  use ExUnit.Case

  test "basic math" do
    assert 1 + 1 == 2
  end
end

# `use ExUnit.Case` expands to something like:
# require ExUnit.Case
# ExUnit.Case.__using__(opts)
# ... which imports test macros, sets up callbacks, etc.
```

{{< iex >}}
iex> defmodule Demo do
...>   @greeting "Hello"
...>   def greet(name), do: "#{@greeting}, #{name}!"
...> end
{:module, Demo, ...}
iex> Demo.greet("World")
"Hello, World!"
iex> i Demo
Term
  Demo
Data type
  Atom
...
iex> exports = Demo.__info__(:functions)
[greet: 1]
{{< /iex >}}

## Deriving Protocols

Structs can derive protocol implementations for common behaviours:

```elixir
defmodule Event do
  @derive {Inspect, only: [:name, :date]}
  defstruct [:name, :date, :internal_id, :metadata]
end

# When inspected, only :name and :date are shown
event = %Event{name: "Conference", date: ~D[2025-06-15], internal_id: "abc123", metadata: %{}}
inspect(event)
# => "#Event<name: \"Conference\", date: ~D[2025-06-15], ...>"
```

Other commonly derived protocols include `Jason.Encoder` for JSON serialization and `Ecto.Type` for database mapping.

{{< exercise title="Build a Library Catalog" >}}
Create the following modules:

1. **`Library.Book`** -- a struct with fields `:title` (required), `:author` (required), `:isbn`, `:pages`, and `checked_out: false`. Include:
   - A `new/2` function that takes `title` and `author` and returns a new book
   - A `checkout/1` function that sets `checked_out` to `true`
   - A `return/1` function that sets `checked_out` to `false`

2. **`Library.Catalog`** -- a module with functions for managing a list of books:
   - `add(catalog, book)` -- adds a book to the catalog (a list)
   - `find_by_author(catalog, author)` -- returns all books by a given author
   - `available(catalog)` -- returns all books where `checked_out` is `false`
   - `summary(catalog)` -- returns a string like `"3 books (1 checked out)"`

3. Use `alias` in `Library.Catalog` to refer to `Library.Book` as just `Book`.

Test in IEx:

```elixir
alias Library.{Book, Catalog}

catalog = []
|> Catalog.add(Book.new("Elixir in Action", "Sasa Juric"))
|> Catalog.add(Book.new("Programming Elixir", "Dave Thomas"))

Catalog.summary(catalog)
# => "2 books (0 checked out)"
```
{{< /exercise >}}
