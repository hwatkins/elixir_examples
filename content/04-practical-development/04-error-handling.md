---
title: "Error Handling"
description: "Master Elixir error handling -- ok/error tuples, try/rescue, custom exceptions, the with statement, and the 'let it crash' approach used in OTP applications."
weight: 4
phase: 4
lesson: 19
difficulty: "intermediate"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/04-practical-development/03-documentation"
hexdocsLinks:
  - title: "try, catch, and rescue"
    url: "https://hexdocs.pm/elixir/try-catch-and-rescue.html"
  - title: "Kernel.SpecialForms.with/1"
    url: "https://hexdocs.pm/elixir/Kernel.SpecialForms.html#with/1"
  - title: "Error Handling"
    url: "https://elixir-lang.org/getting-started/try-catch-and-rescue.html"
tags:
  - error-handling
  - ok-error-tuples
  - try-rescue
  - with
  - exceptions
  - let-it-crash
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Error handling in Elixir is fundamentally different from most languages. Instead of relying primarily on exceptions and try/catch, Elixir uses a combination of return-value-based error handling (ok/error tuples), pattern matching, and the OTP "let it crash" philosophy. Exceptions exist but are reserved for truly unexpected situations, not for normal control flow.

## The ok/error Tuple Convention

The most common error handling pattern in Elixir uses tagged tuples: `{:ok, value}` for success and `{:error, reason}` for failure. This convention is so pervasive that it effectively functions as the language's primary error handling mechanism.

```elixir
defmodule UserStore do
  @users %{
    1 => %{name: "Alice", email: "alice@example.com"},
    2 => %{name: "Bob", email: "bob@example.com"}
  }

  @spec fetch_user(integer()) :: {:ok, map()} | {:error, String.t()}
  def fetch_user(id) when is_integer(id) and id > 0 do
    case Map.fetch(@users, id) do
      {:ok, user} -> {:ok, user}
      :error -> {:error, "User #{id} not found"}
    end
  end

  def fetch_user(_id), do: {:error, "Invalid user ID"}

  @spec update_email(integer(), String.t()) :: {:ok, map()} | {:error, String.t()}
  def update_email(id, email) do
    with {:ok, user} <- fetch_user(id),
         :ok <- validate_email(email) do
      {:ok, %{user | email: email}}
    end
  end

  defp validate_email(email) do
    if String.contains?(email, "@"), do: :ok, else: {:error, "Invalid email format"}
  end
end
```

{{< iex >}}
iex> UserStore.fetch_user(1)
{:ok, %{name: "Alice", email: "alice@example.com"}}
iex> UserStore.fetch_user(99)
{:error, "User 99 not found"}
iex> UserStore.update_email(1, "newalice@example.com")
{:ok, %{name: "Alice", email: "newalice@example.com"}}
iex> UserStore.update_email(1, "invalid")
{:error, "Invalid email format"}
iex> UserStore.update_email(99, "test@test.com")
{:error, "User 99 not found"}
{{< /iex >}}

{{< concept title="Why Tuples Instead of Exceptions?" >}}
Elixir prefers ok/error tuples over exceptions for expected failure cases because:

1. **Explicitness** -- the caller sees immediately from the typespec that a function can fail and must handle both cases.
2. **Pattern matching** -- Elixir's pattern matching makes it natural and concise to branch on success vs failure.
3. **Composition** -- tuples work seamlessly with `case`, `with`, and pipeline operators.
4. **No hidden control flow** -- exceptions jump up the call stack invisibly. Tuples flow through the normal return path.

The convention is: use tuples for *expected* errors (user not found, validation failed, file does not exist) and exceptions for *unexpected* bugs (programmer mistakes, violated invariants).
{{< /concept >}}

Many standard library functions have "bang" variants that raise on failure:

{{% compare %}}
```elixir
# Tuple-returning versions (safe)
case File.read("config.json") do
  {:ok, contents} -> Jason.decode!(contents)
  {:error, :enoent} -> %{}  # file missing, use defaults
  {:error, reason} -> raise "Cannot read config: #{reason}"
end

# Map.fetch returns :error for missing keys
case Map.fetch(params, :name) do
  {:ok, name} -> name
  :error -> "Anonymous"
end
```

```elixir
# Bang versions (raise on failure)
# Use when failure is unexpected and should crash
contents = File.read!("config.json")
data = Jason.decode!(contents)

# Map.fetch! raises KeyError for missing keys
name = Map.fetch!(params, :name)

# Enum functions also have bang variants
first = Enum.fetch!(list, 0)
```
{{% /compare %}}

## try, rescue, and after

For the cases where you do need to handle exceptions, Elixir provides `try/rescue/after`. This is similar to try/catch in other languages.

```elixir
defmodule SafeParser do
  def parse_integer(string) do
    try do
      value = String.to_integer(string)
      {:ok, value}
    rescue
      ArgumentError ->
        {:error, "#{inspect(string)} is not a valid integer"}
    end
  end

  def parse_json_file(path) do
    try do
      content = File.read!(path)
      data = Jason.decode!(content)
      {:ok, data}
    rescue
      e in File.Error ->
        {:error, "File error: #{Exception.message(e)}"}
      e in Jason.DecodeError ->
        {:error, "JSON parse error: #{Exception.message(e)}"}
    after
      # This block ALWAYS runs, whether or not an exception occurred.
      # Useful for cleanup. The return value of `after` is ignored.
      IO.puts("Parse attempt finished for #{path}")
    end
  end
end
```

```elixir
# You can also use try with catch for throws and exits
try do
  # throw is rarely used -- mainly for control flow in libraries
  Enum.each(1..100, fn x ->
    if x == 42, do: throw(:found_it)
  end)
  :not_found
catch
  :throw, :found_it -> {:found, 42}
  :exit, reason -> {:exit, reason}
end
```

{{< callout type="warning" >}}
Avoid using `try/rescue` for control flow. If you find yourself rescuing exceptions frequently, consider whether the function should return ok/error tuples instead.

A common anti-pattern:

```elixir
# Bad -- using exceptions for control flow
try do
  user = Repo.get!(User, id)
  {:ok, user}
rescue
  Ecto.NoResultsError -> {:error, :not_found}
end

# Good -- use the non-bang version
case Repo.get(User, id) do
  nil -> {:error, :not_found}
  user -> {:ok, user}
end
```

Reserve `try/rescue` for situations where you genuinely cannot predict failure, such as parsing untrusted external input or calling into Erlang libraries that raise on error.
{{< /callout >}}

## raise and Custom Exceptions

Use `raise` to signal bugs and contract violations -- situations that should never happen if the code is correct.

```elixir
# Raise a RuntimeError with a message
raise "something went terribly wrong"

# Raise a specific exception type
raise ArgumentError, message: "expected a positive integer, got: -5"

# Raise with a shorthand
raise ArgumentError, "expected a positive integer, got: -5"
```

Define custom exceptions with `defexception`:

```elixir
defmodule MyApp.ValidationError do
  @moduledoc "Raised when input validation fails."
  defexception [:message, :field, :value]

  @impl true
  def exception(opts) do
    field = Keyword.fetch!(opts, :field)
    value = Keyword.fetch!(opts, :value)
    message = opts[:message] || "Validation failed for field #{inspect(field)}"

    %__MODULE__{
      message: message,
      field: field,
      value: value
    }
  end
end

defmodule MyApp.NotFoundError do
  defexception [:message, :resource, :id]

  @impl true
  def exception(opts) do
    resource = Keyword.fetch!(opts, :resource)
    id = Keyword.fetch!(opts, :id)
    message = "#{resource} with id #{id} not found"

    %__MODULE__{message: message, resource: resource, id: id}
  end
end
```

```elixir
# Using custom exceptions
raise MyApp.ValidationError, field: :email, value: "bad"
# => ** (MyApp.ValidationError) Validation failed for field :email

raise MyApp.NotFoundError, resource: "User", id: 42
# => ** (MyApp.NotFoundError) User with id 42 not found
```

## The with Statement

The `with` special form is Elixir's answer to deeply nested `case` expressions. It chains multiple pattern-matching steps and short-circuits on the first failure.

```elixir
defmodule OrderProcessor do
  def process_order(params) do
    with {:ok, user} <- fetch_user(params["user_id"]),
         {:ok, items} <- validate_items(params["items"]),
         {:ok, total} <- calculate_total(items),
         :ok <- check_balance(user, total),
         {:ok, order} <- create_order(user, items, total) do
      send_confirmation(user, order)
      {:ok, order}
    else
      {:error, :user_not_found} ->
        {:error, "User not found"}

      {:error, :invalid_items} ->
        {:error, "One or more items are invalid"}

      {:error, :insufficient_balance} ->
        {:error, "Insufficient balance for this order"}

      {:error, reason} ->
        {:error, "Order failed: #{reason}"}
    end
  end
end
```

Without `with`, the same logic becomes a deeply nested pyramid:

```elixir
# Without with -- the "pyramid of doom"
def process_order(params) do
  case fetch_user(params["user_id"]) do
    {:ok, user} ->
      case validate_items(params["items"]) do
        {:ok, items} ->
          case calculate_total(items) do
            {:ok, total} ->
              case check_balance(user, total) do
                :ok ->
                  case create_order(user, items, total) do
                    {:ok, order} ->
                      send_confirmation(user, order)
                      {:ok, order}
                    error -> error
                  end
                error -> error
              end
            error -> error
          end
        error -> error
      end
    error -> error
  end
end
```

{{< concept title="When to Use with vs case vs Pipes" >}}
Choose the right tool for the error-handling job:

- **`with`** -- use when you have multiple sequential steps that can each fail, and you want to short-circuit on the first failure. Each step uses `<-` for pattern matching.
- **`case`** -- use when you have a single expression with multiple possible outcomes to handle.
- **Pipes (`|>`)** -- use when transforming data through a series of steps that *cannot* fail (or where failure should crash).
- **`Enum.reduce_while/3`** -- use when processing a collection where each element might cause early termination.

A rule of thumb: if you are nesting more than two `case` expressions, consider refactoring to `with`.
{{< /concept >}}

{{< iex >}}
iex> # with returns the first non-matching value
iex> with {:ok, a} <- {:ok, 1},
...>      {:ok, b} <- {:error, :oops},
...>      {:ok, c} <- {:ok, 3} do
...>   a + b + c
...> end
{:error, :oops}
iex> # The else block lets you transform error values
iex> with {:ok, n} <- {:error, "bad input"} do
...>   n * 2
...> else
...>   {:error, msg} -> "Failed: #{msg}"
...> end
"Failed: bad input"
iex> # Without else, the non-matching value passes through as-is
iex> with {:ok, n} <- :error do
...>   n * 2
...> end
:error
{{< /iex >}}

## The "Let It Crash" Philosophy

In OTP applications, you do not need to handle every possible error. Supervisors restart failed processes automatically, so sometimes the best error handling strategy is no error handling at all.

```elixir
defmodule MyApp.Worker do
  use GenServer

  # This worker processes jobs. If anything unexpected happens,
  # it crashes and the supervisor restarts it cleanly.

  def handle_call({:process, data}, _from, state) do
    # No try/rescue here. If process_data raises, this GenServer
    # crashes, the supervisor restarts it, and the system recovers.
    result = process_data(data)
    {:reply, {:ok, result}, state}
  end

  defp process_data(data) do
    # Complex processing that might fail in unexpected ways.
    # Rather than trying to anticipate every failure mode,
    # we let OTP handle recovery.
    data
    |> validate!()
    |> transform!()
    |> persist!()
  end
end
```

```elixir
# The supervisor ensures the worker is always running
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      # If Worker crashes, it restarts automatically
      {MyApp.Worker, []},
      # If it crashes too often, the supervisor can escalate
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

{{< callout type="important" >}}
"Let it crash" does not mean "ignore errors." It means:

1. **Handle expected errors** at the call site with ok/error tuples
2. **Let unexpected errors crash** the process
3. **Use supervisors** to restart crashed processes with clean state
4. **Log the crash** for debugging (OTP does this automatically)

This separation gives you reliable systems without trying to anticipate every possible failure. A fresh process restart often resolves transient issues (network hiccups, corrupted state) that complex error recovery code would struggle with.
{{< /callout >}}

## Putting It All Together

Here is a realistic module that combines all the error handling strategies:

```elixir
defmodule MyApp.FileImporter do
  require Logger

  @doc "Imports data from a JSON file into the system."
  @spec import(String.t()) :: {:ok, non_neg_integer()} | {:error, String.t()}
  def import(path) do
    # Use `with` to chain fallible steps
    with {:ok, content} <- read_file(path),
         {:ok, data} <- decode_json(content),
         {:ok, records} <- validate_records(data) do
      # Insert records, counting successes
      count = Enum.count(records, fn record ->
        case insert_record(record) do
          {:ok, _} -> true
          {:error, reason} ->
            Logger.warning("Skipped record: #{reason}")
            false
        end
      end)

      {:ok, count}
    end
  end

  # Expected error: file might not exist
  defp read_file(path) do
    case File.read(path) do
      {:ok, content} -> {:ok, content}
      {:error, :enoent} -> {:error, "File not found: #{path}"}
      {:error, :eacces} -> {:error, "Permission denied: #{path}"}
      {:error, reason} -> {:error, "Cannot read file: #{reason}"}
    end
  end

  # Expected error: file might contain invalid JSON
  defp decode_json(content) do
    case Jason.decode(content) do
      {:ok, data} -> {:ok, data}
      {:error, _} -> {:error, "Invalid JSON format"}
    end
  end

  # Expected error: data might not match expected schema
  defp validate_records(data) when is_list(data) do
    case Enum.all?(data, &valid_record?/1) do
      true -> {:ok, data}
      false -> {:error, "Data contains invalid records"}
    end
  end

  defp validate_records(_), do: {:error, "Expected a JSON array"}

  defp valid_record?(%{"name" => _, "email" => _}), do: true
  defp valid_record?(_), do: false

  # Unexpected error: database issues should crash (let supervisor handle it)
  defp insert_record(record) do
    MyApp.Repo.insert(%MyApp.User{
      name: record["name"],
      email: record["email"]
    })
  end
end
```

{{< exercise title="Build an Error-Handling Pipeline" >}}
Create a module `ConfigLoader` that loads and validates application configuration from a file:

1. Define a function `load(path)` that:
   - Reads the file at `path` (return appropriate error if the file is missing)
   - Parses it as JSON
   - Validates that required keys `"host"`, `"port"`, and `"database"` are present
   - Validates that `"port"` is an integer between 1 and 65535
   - Returns `{:ok, config_map}` or `{:error, reason}`

2. Use `with` for the happy path and provide clear error messages for each failure mode.

3. Define a custom exception `ConfigLoader.InvalidConfigError` with fields `:message` and `:key`.

4. Add a bang function `load!(path)` that calls `load/path` and either returns the config or raises your custom exception.

5. Write tests for all success and failure paths.

**Bonus**: Add a `load_with_defaults(path, defaults)` function that merges loaded config with a defaults map, so missing keys fall back to defaults rather than failing.
{{< /exercise >}}

## Summary

Elixir's error handling is built on three complementary strategies. First, ok/error tuples handle expected failures through normal return values and pattern matching. Second, exceptions (try/rescue/raise) handle unexpected bugs and contract violations. Third, OTP supervisors handle process crashes by restarting processes with clean state. The `with` statement elegantly chains multiple fallible operations. Understanding when to use each strategy -- tuples for expected errors, exceptions for bugs, supervisors for recovery -- is essential for writing robust Elixir applications.

The next lesson covers IO and file system operations, where you will see these error handling patterns applied to reading, writing, and streaming files.
