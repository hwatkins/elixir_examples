---
title: "Testing with ExUnit"
description: "Write robust Elixir tests with ExUnit -- assertions, describe blocks, setup callbacks, async tests, doctests, tags, and mocking with Mox. Practical testing guide."
weight: 2
phase: 4
lesson: 17
difficulty: "intermediate"
estimatedMinutes: 30
draft: false
date: 2025-02-23
prerequisites:
  - "/04-practical-development/01-mix"
hexdocsLinks:
  - title: "ExUnit"
    url: "https://hexdocs.pm/ex_unit/ExUnit.html"
  - title: "ExUnit.Case"
    url: "https://hexdocs.pm/ex_unit/ExUnit.Case.html"
  - title: "Mox"
    url: "https://hexdocs.pm/mox/Mox.html"
tags:
  - testing
  - exunit
  - assert
  - doctests
  - mocking
  - mox
---

Elixir ships with ExUnit, a full-featured testing framework built into the standard library. Tests in Elixir are first-class citizens -- the community expects thorough test coverage, and the tooling makes it straightforward to write, organize, and run tests efficiently.

## Getting Started

Every Mix project comes preconfigured for testing. The file `test/test_helper.exs` starts ExUnit, and test files live in the `test/` directory with the `_test.exs` suffix.

```elixir
# test/test_helper.exs
ExUnit.start()
```

```elixir
# test/my_app_test.exs
defmodule MyAppTest do
  use ExUnit.Case

  test "greets the world" do
    assert MyApp.hello() == :world
  end
end
```

Run tests with `mix test`:

```text
$ mix test
..

Finished in 0.03 seconds (0.03s async, 0.00s sync)
2 tests, 0 failures
```

## Assertions

ExUnit provides `assert` and `refute` as the primary assertion macros. Unlike many testing frameworks, ExUnit gives detailed failure messages by analyzing the expression at compile time.

```elixir
defmodule AssertionExamplesTest do
  use ExUnit.Case

  test "basic assertions" do
    # Simple truth assertions
    assert true
    refute false

    # Equality -- the most common assertion
    assert 1 + 1 == 2
    refute 1 + 1 == 3

    # Pattern matching assertions
    assert {:ok, value} = {:ok, 42}
    assert value == 42

    # Asserting exceptions are raised
    assert_raise ArithmeticError, fn ->
      1 / 0
    end

    # Asserting exceptions with a specific message
    assert_raise RuntimeError, "oops", fn ->
      raise "oops"
    end

    # Asserting a message is received by the test process
    send(self(), {:hello, "world"})
    assert_received {:hello, "world"}

    # Asserting approximate equality for floats
    assert_in_delta 3.14, 3.141592, 0.01
  end
end
```

{{< iex >}}
iex> # Pattern match assertions give excellent error messages:
iex> # When `assert {:ok, _} = {:error, :not_found}` fails, you see:
iex> #
iex> # match (=) failed
iex> # code:  assert {:ok, _} = {:error, :not_found}
iex> # left:  {:ok, _}
iex> # right: {:error, :not_found}
iex> #
iex> # Comparison assertions show both sides:
iex> # When `assert 1 + 1 == 3` fails:
iex> #
iex> # Assertion with == failed
iex> # code:  assert 1 + 1 == 3
iex> # left:  2
iex> # right: 3
iex> :ok
{{< /iex >}}

{{< concept title="assert vs. assert_receive" >}}
There are two message assertion macros with different timing behaviors:

- **`assert_received`** -- checks the mailbox *right now*. The message must already be there. Use this when you send a message synchronously in the test.
- **`assert_receive`** -- waits up to a timeout (default 100ms) for the message to arrive. Use this when an asynchronous process will send the message.

```elixir
# Synchronous: message is already in the mailbox
send(self(), :ping)
assert_received :ping

# Asynchronous: message will arrive shortly
Task.async(fn -> send(test_pid, :pong) end)
assert_receive :pong, 1000  # wait up to 1 second
```

Mixing these up is a common source of flaky tests. Use `assert_receive` whenever the message comes from another process.
{{< /concept >}}

## Organizing Tests with describe

The `describe` block groups related tests and makes test output more readable. Descriptions appear in failure messages.

```elixir
defmodule Calculator do
  def add(a, b), do: a + b
  def divide(_a, 0), do: {:error, :division_by_zero}
  def divide(a, b), do: {:ok, a / b}
end

defmodule CalculatorTest do
  use ExUnit.Case

  describe "add/2" do
    test "adds two positive numbers" do
      assert Calculator.add(2, 3) == 5
    end

    test "adds negative numbers" do
      assert Calculator.add(-1, -2) == -3
    end

    test "adding zero returns the same number" do
      assert Calculator.add(5, 0) == 5
    end
  end

  describe "divide/2" do
    test "divides two numbers" do
      assert Calculator.divide(10, 2) == {:ok, 5.0}
    end

    test "returns error for division by zero" do
      assert Calculator.divide(10, 0) == {:error, :division_by_zero}
    end
  end
end
```

## Setup and Teardown

ExUnit provides `setup` and `setup_all` callbacks for test preparation. Values returned from setup are available in the test context.

{{% compare %}}
```elixir
# setup runs before EACH test
defmodule UserTest do
  use ExUnit.Case

  setup do
    user = %{name: "Alice", age: 30}
    # Return values become the test context
    {:ok, user: user}
    # Or equivalently:
    # %{user: user}
  end

  # Context is passed as the test's argument
  test "user has a name", %{user: user} do
    assert user.name == "Alice"
  end

  test "user has an age", %{user: user} do
    assert user.age == 30
  end
end
```

```elixir
# setup_all runs ONCE for the entire module
defmodule ExpensiveSetupTest do
  use ExUnit.Case

  setup_all do
    # Expensive operation done once
    data = File.read!("test/fixtures/large_dataset.json")
    parsed = Jason.decode!(data)
    {:ok, dataset: parsed}
  end

  setup %{dataset: dataset} do
    # Per-test setup can use setup_all context
    sample = Enum.take(dataset, 10)
    {:ok, sample: sample}
  end

  test "sample has 10 items", %{sample: sample} do
    assert length(sample) == 10
  end
end
```
{{% /compare %}}

You can also define named setup functions using `on_exit` for cleanup:

```elixir
setup do
  # Create a temporary file
  path = Path.join(System.tmp_dir!(), "test_#{:rand.uniform(10_000)}")
  File.write!(path, "test data")

  on_exit(fn ->
    # Cleanup runs after the test, even if it fails
    File.rm(path)
  end)

  {:ok, path: path}
end
```

{{< callout type="warning" >}}
`setup_all` runs only once per module, so the data it provides is shared across all tests. If tests modify the shared data, they can interfere with each other. Keep `setup_all` data read-only, or use `setup` for data that tests will modify.

Also note: modules using `setup_all` cannot run tests asynchronously (`async: true`), since the shared state would create race conditions.
{{< /callout >}}

## Async Tests

By default, test modules run sequentially. Setting `async: true` allows a module's tests to run concurrently with tests from other async modules.

```elixir
defmodule FastTest do
  # These tests can run concurrently with other async modules
  use ExUnit.Case, async: true

  test "quick computation" do
    assert Enum.sum(1..100) == 5050
  end
end

defmodule AnotherFastTest do
  use ExUnit.Case, async: true

  test "another quick computation" do
    assert String.length("hello") == 5
  end
end
```

{{< callout type="important" >}}
Only use `async: true` when tests do not depend on shared mutable state such as a database, files on disk, or application configuration. Tests within the same module always run sequentially -- `async` only controls concurrency *between* modules.
{{< /callout >}}

## Doctests

Doctests turn documentation examples into tests, ensuring your documentation stays accurate.

```elixir
defmodule StringHelpers do
  @moduledoc "Utility functions for string manipulation."

  @doc """
  Capitalizes every word in the given string.

  ## Examples

      iex> StringHelpers.title_case("hello world")
      "Hello World"

      iex> StringHelpers.title_case("elixir is great")
      "Elixir Is Great"

      iex> StringHelpers.title_case("")
      ""
  """
  def title_case(string) do
    string
    |> String.split()
    |> Enum.map_join(" ", &String.capitalize/1)
  end
end
```

To run the doctests, reference the module in your test file:

```elixir
defmodule StringHelpersTest do
  use ExUnit.Case
  doctest StringHelpers
end
```

Doctests support multiline expressions:

```elixir
@doc """
Builds a greeting map.

## Examples

    iex> greeting = StringHelpers.build_greeting("Alice")
    ...> greeting.message
    "Hello, Alice!"

    iex> StringHelpers.build_greeting("Bob") |>
    ...> Map.get(:message)
    "Hello, Bob!"
"""
```

## Tags and Filtering

Tags let you categorize tests and selectively run subsets of your test suite.

```elixir
defmodule IntegrationTest do
  use ExUnit.Case

  @tag :slow
  test "processes a large dataset" do
    # This test takes a while...
    result = DataProcessor.process(large_dataset())
    assert result.count > 1_000
  end

  @tag :external
  test "calls external API" do
    response = ExternalApi.fetch_data()
    assert response.status == 200
  end

  @tag :slow
  @tag :external
  test "end-to-end workflow" do
    # Both tags apply
    assert Workflow.run() == :ok
  end
end
```

Filter tests from the command line:

```text
# Run only tests tagged :slow
$ mix test --only slow

# Exclude tests tagged :external
$ mix test --exclude external

# Combine filters
$ mix test --only slow --exclude external
```

Configure default exclusions in `test/test_helper.exs`:

```elixir
ExUnit.start()
ExUnit.configure(exclude: [:external, :slow])
```

{{< iex >}}
iex> # You can also use the @moduletag attribute to tag all tests in a module:
iex> # defmodule SlowTests do
iex> #   use ExUnit.Case
iex> #   @moduletag :slow
iex> #
iex> #   test "this is automatically tagged slow" do
iex> #     ...
iex> #   end
iex> # end
iex> #
iex> # And @describetag to tag all tests within a describe block:
iex> # describe "database operations" do
iex> #   @describetag :db
iex> #   test "insert" do ... end
iex> #   test "update" do ... end
iex> # end
iex> :ok
{{< /iex >}}

## Mocking with Mox

Mox is the community-standard library for mocking in Elixir. It works through behaviours (interfaces), encouraging good design by requiring explicit contracts between modules.

First, define a behaviour and set up Mox:

```elixir
# lib/my_app/http_client.ex
defmodule MyApp.HTTPClient do
  @callback get(url :: String.t()) :: {:ok, map()} | {:error, term()}
end

# lib/my_app/http_client/real.ex
defmodule MyApp.HTTPClient.Real do
  @behaviour MyApp.HTTPClient

  @impl true
  def get(url) do
    # Real HTTP call using your HTTP library
    case Req.get(url) do
      {:ok, %{status: 200, body: body}} -> {:ok, body}
      {:ok, %{status: status}} -> {:error, {:http_error, status}}
      {:error, reason} -> {:error, reason}
    end
  end
end
```

Configure which implementation to use:

```elixir
# config/config.exs
config :my_app, http_client: MyApp.HTTPClient.Real

# config/test.exs
config :my_app, http_client: MyApp.HTTPClientMock
```

Set up the mock in your test helper and write tests:

```elixir
# test/test_helper.exs
ExUnit.start()
Mox.defmock(MyApp.HTTPClientMock, for: MyApp.HTTPClient)

# test/my_app/weather_test.exs
defmodule MyApp.WeatherTest do
  use ExUnit.Case, async: true

  import Mox

  # Ensure mocks are verified after each test
  setup :verify_on_exit!

  test "fetches weather data successfully" do
    MyApp.HTTPClientMock
    |> expect(:get, fn "https://api.weather.com/london" ->
      {:ok, %{"temp" => 15, "condition" => "cloudy"}}
    end)

    # The module under test reads the client from config:
    # @http_client Application.compile_env(:my_app, :http_client)
    assert {:ok, weather} = MyApp.Weather.get_forecast("london")
    assert weather.temperature == 15
  end

  test "handles API errors gracefully" do
    MyApp.HTTPClientMock
    |> expect(:get, fn _url ->
      {:error, :timeout}
    end)

    assert {:error, "Weather service unavailable"} =
             MyApp.Weather.get_forecast("london")
  end
end
```

{{< concept title="Why Mox Uses Behaviours" >}}
Mox enforces that mocks implement a behaviour (an Elixir interface). This has several advantages:

1. **Contract safety** -- the mock must have the same function signatures as the real module, so tests cannot drift from the actual interface.
2. **Explicit dependencies** -- modules declare their dependencies as behaviours, making the architecture clearer.
3. **Concurrency safe** -- Mox mocks are process-specific by default, so async tests do not interfere with each other.

This approach follows Jose Valim's recommendation: "Mock the boundary, not the internals." Define behaviours at the edges of your application (HTTP clients, email senders, payment gateways) and mock those in tests.
{{< /concept >}}

{{< exercise title="Build a Tested Module" >}}
Create a module `MathUtils` with the following functions, and write a complete ExUnit test module for it:

1. `factorial(n)` -- returns the factorial of n (raise `ArgumentError` for negative numbers)
2. `fibonacci(n)` -- returns the nth Fibonacci number
3. `prime?(n)` -- returns true if n is prime

Your test module should:
- Use `describe` blocks for each function
- Include at least 3 tests per function
- Test edge cases (0, 1, negative numbers)
- Use `assert_raise` for invalid inputs
- Add doctests to your module and include `doctest MathUtils` in the test file
- Tag the Fibonacci test for large numbers as `@tag :slow`

Run your tests with `mix test` and verify they all pass. Then try `mix test --exclude slow` to skip the slow test.
{{< /exercise >}}

## Useful Testing Patterns

A few patterns appear frequently in real Elixir test suites:

```elixir
defmodule PatternsTest do
  use ExUnit.Case, async: true

  # Test that a function returns any ok tuple, capturing the value
  test "returns ok with a map" do
    assert {:ok, result} = MyApp.process("input")
    assert is_map(result)
    assert Map.has_key?(result, :id)
  end

  # Use capture_log to test that code logs a warning
  import ExUnit.CaptureLog

  test "logs a warning on invalid input" do
    log = capture_log(fn ->
      MyApp.validate(%{name: ""})
    end)

    assert log =~ "invalid input"
  end

  # Use capture_io to test code that writes to stdout
  import ExUnit.CaptureIO

  test "prints a greeting" do
    output = capture_io(fn ->
      MyApp.greet("Alice")
    end)

    assert output =~ "Hello, Alice"
  end

  # Use tmp_dir to get a unique temporary directory per test
  @tag :tmp_dir
  test "writes to a file", %{tmp_dir: tmp_dir} do
    path = Path.join(tmp_dir, "output.txt")
    MyApp.write_report(path)
    assert File.exists?(path)
  end
end
```

## Summary

ExUnit is a comprehensive testing framework built into Elixir. It provides clear assertions with detailed error messages, organizational tools like `describe` blocks and tags, setup callbacks for test preparation, async execution for speed, and doctests for verifying documentation. Combined with Mox for mocking external boundaries, you have everything needed to build a thorough and maintainable test suite.

The next lesson covers documentation, including how doctests connect your docs and tests into a single, self-verifying system.
