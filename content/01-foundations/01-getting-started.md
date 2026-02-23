---
title: "Getting Started"
description: "Install Elixir, explore the IEx interactive shell, and create your first Mix project. A beginner-friendly guide with code examples comparing Elixir to Python and JavaScript."
weight: 1
phase: 1
lesson: 1
difficulty: beginner
estimatedMinutes: 15
draft: false
date: 2025-02-23
prerequisites: []
hexdocsLinks:
  - title: "Elixir Getting Started Guide"
    url: "https://hexdocs.pm/elixir/introduction.html"
  - title: "Mix Documentation"
    url: "https://hexdocs.pm/mix/Mix.html"
tags:
  - installation
  - iex
  - mix
  - hello-world
keyTakeaways:
  - "Elixir runs on the Erlang VM (BEAM), giving it access to decades of battle-tested concurrency and fault-tolerance infrastructure"
  - "IEx is your interactive playground for experimenting with Elixir code"
  - "Mix is the build tool that manages projects, dependencies, and tasks"
  - "Every Elixir project follows a conventional directory structure created by `mix new`"
---

## What Is Elixir?

Elixir is a dynamic, functional programming language designed for building scalable and maintainable applications. Created by Jose Valim in 2011, it runs on the Erlang Virtual Machine (BEAM), the same platform that powers telephone switches, messaging systems, and other infrastructure that demands high availability.

{{< concept title="Why the BEAM Matters" >}}
The BEAM VM was built by Ericsson in the 1980s to run telecom systems that needed 99.9999999% uptime (roughly 31 milliseconds of downtime per year). When you write Elixir, your code inherits this runtime's strengths: lightweight processes, preemptive scheduling, hot code upgrades, and built-in distribution across nodes.
{{< /concept >}}

Elixir adds modern language features on top of the BEAM: a Ruby-like syntax, powerful metaprogramming through macros, first-class documentation, and a thriving ecosystem of libraries published on [hex.pm](https://hex.pm).

### Why Learn Elixir?

- **Concurrency without complexity.** The BEAM spawns lightweight processes (not OS threads) that communicate through message passing. You can run millions of them simultaneously.
- **Fault tolerance by design.** Supervisors monitor processes and restart them when they crash, following the "let it crash" philosophy.
- **Productivity.** Pattern matching, the pipe operator, and a consistent standard library make code concise and readable.
- **Growing ecosystem.** Phoenix (web framework), LiveView (real-time UIs), Nx (numerical computing), and Nerves (embedded systems) are just a few of the major projects in the ecosystem.

## Installing Elixir

The recommended way to install Elixir depends on your operating system.

**macOS** (using Homebrew):

```bash
brew install elixir
```

**Ubuntu/Debian**:

```bash
sudo apt-get update
sudo apt-get install elixir
```

**Windows** (using the official installer):

Download the installer from [elixir-lang.org/install](https://elixir-lang.org/install.html) and follow the prompts.

**Using asdf version manager** (recommended for managing multiple versions):

```bash
asdf plugin add erlang
asdf plugin add elixir
asdf install erlang 27.0
asdf install elixir 1.17.2-otp-27
asdf global erlang 27.0
asdf global elixir 1.17.2-otp-27
```

After installation, verify everything is working:

```bash
elixir --version
```

You should see output similar to:

```
Erlang/OTP 27 [erts-15.0] [source] [64-bit] [smp:10:10] [ds:10:10:10] [async-threads:1] [jit]

Elixir 1.17.2 (compiled with Erlang/OTP 27)
```

{{< callout type="tip" >}}
The output shows both the Erlang/OTP version and the Elixir version. Elixir relies on Erlang being installed, and most installation methods handle both automatically.
{{< /callout >}}

## Exploring IEx

IEx (Interactive Elixir) is Elixir's REPL (Read-Eval-Print Loop). Start it by running `iex` in your terminal:

{{< iex >}}
iex> 1 + 1
2
iex> "hello" <> " " <> "world"
"hello world"
iex> String.upcase("elixir")
"ELIXIR"
{{< /iex >}}

IEx is an essential tool you will use constantly. A few helpful commands inside IEx:

{{< iex >}}
iex> h String.upcase
Returns a string where all characters are converted to uppercase...
iex> i "hello"
Term
  "hello"
Data type
  BitString
Byte size
  5
Description
  This is a string: a UTF-8 encoded binary...
{{< /iex >}}

The `h` helper displays documentation for any module or function. The `i` helper inspects a value, showing its type and metadata. These two commands alone make IEx a powerful learning environment.

{{< callout type="note" >}}
To exit IEx, press `Ctrl+C` twice, or type `System.halt`.
{{< /callout >}}

## Comparing the REPL Experience

If you are coming from Python or JavaScript, the IEx experience will feel familiar but has some Elixir-specific features built in.

{{% compare %}}
```python
# Python REPL
>>> help(str.upper)
>>> type("hello")
<class 'str'>
>>> "hello".upper()
'HELLO'
```

```javascript
// Node.js REPL
> typeof "hello"
'string'
> "hello".toUpperCase()
'HELLO'
```

```elixir
# Elixir IEx
iex> h String.upcase
iex> i "hello"
iex> String.upcase("hello")
"ELIXIR"
```
{{% /compare %}}

Notice that in Elixir, functions are called on modules (`String.upcase("hello")`) rather than on the data itself (`"hello".upper()`). This is a characteristic of functional programming: data and functions are separate.

## Creating Your First Mix Project

Mix is Elixir's build tool. It creates projects, compiles code, runs tests, manages dependencies, and much more. Think of it as a combination of npm, pip, cargo, and make rolled into one.

Create a new project:

```bash
mix new hello
```

This generates a project directory:

```text
hello/
  lib/
    hello.ex        # Your main module
  test/
    hello_test.exs  # Tests
    test_helper.exs # Test configuration
  mix.exs           # Project configuration (like package.json or Cargo.toml)
  README.md
  .formatter.exs    # Code formatter configuration
  .gitignore
```

Let's look at the generated `lib/hello.ex`:

```elixir
defmodule Hello do
  @moduledoc """
  Documentation for `Hello`.
  """

  @doc """
  Hello world.

  ## Examples

      iex> Hello.hello()
      :world

  """
  def hello do
    :world
  end
end
```

This defines a module named `Hello` with a single function `hello/0` that returns the atom `:world`. The `@moduledoc` and `@doc` attributes are documentation that IEx and documentation generators can read.

## Running Your Code

There are several ways to execute Elixir code.

**Run a script directly:**

Create a file called `hello.exs` (note the `.exs` extension for scripts):

```elixir
IO.puts("Hello, world!")
```

Run it:

```bash
elixir hello.exs
```

**Run inside your Mix project:**

```bash
cd hello
iex -S mix
```

The `-S mix` flag tells IEx to start with your project loaded:

{{< iex >}}
iex> Hello.hello()
:world
iex> IO.puts("Hello from my first project!")
Hello from my first project!
:ok
{{< /iex >}}

**Run tests:**

```bash
mix test
```

```
Compiling 1 file (.ex)
Generated hello app
..
Finished in 0.03 seconds (0.03s async, 0.00s sync)
1 test, 0 failures
```

{{< concept title=".ex vs .exs Files" >}}
Elixir uses two file extensions: `.ex` files are compiled into BEAM bytecode and are used for production code. `.exs` files are scripts that are interpreted at runtime, typically used for configuration, tests, and one-off scripts. Both contain valid Elixir code; the difference is in how they are executed.
{{< /concept >}}

## Modifying the Project

Open `lib/hello.ex` and add a new function:

```elixir
defmodule Hello do
  @moduledoc """
  Documentation for `Hello`.
  """

  @doc """
  Greets the given name.

  ## Examples

      iex> Hello.greet("Elixir")
      "Hello, Elixir!"

  """
  def greet(name) do
    "Hello, #{name}!"
  end
end
```

The `#{}` syntax is string interpolation -- it evaluates the expression inside the braces and inserts the result into the string.

Now test it:

{{< iex >}}
iex> Hello.greet("Elixir")
"Hello, Elixir!"
iex> Hello.greet("World")
"Hello, World!"
{{< /iex >}}

{{< exercise title="Create Your Own Mix Project" >}}
1. Run `mix new greeter` to create a new project.
2. In `lib/greeter.ex`, write a function `greet/1` that takes a name and returns `"Welcome, <name>! Let's learn Elixir together."`.
3. Add a function `greet/0` (no arguments) that returns `"Welcome, stranger! Let's learn Elixir together."`.
4. Start `iex -S mix` and call both functions.
5. Run `mix test` to make sure the generated tests still pass.

**Bonus:** Add `@doc` attributes to your functions and use `h Greeter.greet` in IEx to view them.
{{< /exercise >}}

## What's Next

You now have Elixir installed, know how to use IEx for exploration, and can create and run Mix projects. In the next lesson, you will learn about Elixir's basic data types -- the building blocks every program is made of.
