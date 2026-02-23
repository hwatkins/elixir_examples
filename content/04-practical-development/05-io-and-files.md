---
title: "IO and File System"
description: "Read, write, and stream files in Elixir using the IO, File, Path, and System modules. Covers standard IO, file system navigation, and streaming large files."
weight: 5
phase: 4
lesson: 20
difficulty: "intermediate"
estimatedMinutes: 20
draft: false
date: 2025-02-23
prerequisites:
  - "/04-practical-development/04-error-handling"
hexdocsLinks:
  - title: "IO"
    url: "https://hexdocs.pm/elixir/IO.html"
  - title: "File"
    url: "https://hexdocs.pm/elixir/File.html"
  - title: "Path"
    url: "https://hexdocs.pm/elixir/Path.html"
  - title: "File.Stream"
    url: "https://hexdocs.pm/elixir/File.Stream.html"
tags:
  - io
  - file
  - path
  - streams
  - file-system
---

Working with input/output and the file system is fundamental to most applications. Elixir provides a clean set of modules for these operations: `IO` for reading and writing to standard IO and other devices, `File` for file system operations, `Path` for manipulating file paths portably, and `File.stream!` for processing large files without loading them entirely into memory.

## Standard IO

The `IO` module handles reading from and writing to standard input/output, as well as formatting and inspecting values.

```elixir
# Writing output
IO.puts("Hello, world!")          # Writes a string followed by a newline
IO.write("No newline here")       # Writes without a trailing newline
IO.inspect({1, 2, 3})             # Writes an inspected term and returns it
IO.puts(:stderr, "Error message") # Write to standard error

# IO.inspect is invaluable for debugging pipelines
[1, 2, 3, 4, 5]
|> Enum.map(&(&1 * 2))
|> IO.inspect(label: "after doubling")  # prints: after doubling: [2, 4, 6, 8, 10]
|> Enum.filter(&(&1 > 5))
|> IO.inspect(label: "after filtering") # prints: after filtering: [6, 8, 10]
|> Enum.sum()
```

{{< iex >}}
iex> IO.puts("Hello!")
Hello!
:ok
iex> IO.inspect(%{a: 1, b: 2}, label: "map")
map: %{a: 1, b: 2}
%{a: 1, b: 2}
iex> IO.inspect([1, 2, 3], charlists: :as_lists)
[1, 2, 3]
[1, 2, 3]
iex> name = IO.gets("Enter your name: ")
Enter your name: Alice
"Alice\n"
iex> String.trim(name)
"Alice"
{{< /iex >}}

{{< callout type="tip" >}}
`IO.inspect/2` returns its first argument unchanged, making it perfect for inserting into pipelines without affecting the data flow. The `:label` option adds context so you can distinguish multiple inspect calls. Other useful options include:

- `limit: :infinity` -- show all elements of large collections
- `pretty: true` -- format output across multiple lines
- `width: 80` -- set the line width for pretty printing
- `charlists: :as_lists` -- print charlists as lists of integers

In production, use `Logger` instead of `IO.puts` for output that should be captured by logging infrastructure.
{{< /callout >}}

## Reading and Writing Files

The `File` module provides functions for every common file operation. Most functions come in two variants: a tuple-returning version and a bang version that raises on error.

```elixir
# Writing files
File.write("output.txt", "Hello, file!")
# => :ok

File.write("data.csv", "name,age\nAlice,30\nBob,25")
# => :ok

# Appending to a file
File.write("log.txt", "First line\n")
File.write("log.txt", "Second line\n", [:append])

# Reading files
{:ok, content} = File.read("output.txt")
# content => "Hello, file!"

# Bang version -- raises on error
content = File.read!("output.txt")
# content => "Hello, file!"

# Reading lines
lines = File.read!("data.csv") |> String.split("\n", trim: true)
# => ["name,age", "Alice,30", "Bob,25"]
```

{{% compare %}}
```elixir
# Tuple-returning versions (handle errors gracefully)
case File.read("config.json") do
  {:ok, content} ->
    IO.puts("File contents: #{content}")
  {:error, :enoent} ->
    IO.puts("File not found")
  {:error, :eacces} ->
    IO.puts("Permission denied")
  {:error, reason} ->
    IO.puts("Error: #{reason}")
end
```

```elixir
# Bang versions (raise on error)
# Use when failure is unexpected
content = File.read!("config.json")
IO.puts("File contents: #{content}")

# Common File error atoms:
# :enoent  - file does not exist
# :eacces  - permission denied
# :eisdir  - path is a directory
# :enospc  - no space left on device
# :enomem  - not enough memory
```
{{% /compare %}}

## File Streams

For large files, loading everything into memory is impractical. `File.stream!/1` creates a lazy stream that reads the file line by line.

```elixir
# Process a large log file line by line
File.stream!("server.log")
|> Stream.filter(&String.contains?(&1, "ERROR"))
|> Stream.map(&String.trim/1)
|> Enum.each(&IO.puts/1)

# Count lines in a file without loading it all into memory
line_count =
  File.stream!("huge_file.csv")
  |> Enum.count()

# Process a CSV file, skipping the header
File.stream!("data.csv")
|> Stream.drop(1)                             # skip header row
|> Stream.map(&String.trim/1)                 # remove trailing newlines
|> Stream.map(&String.split(&1, ","))         # split into fields
|> Stream.filter(fn [_name, age | _] ->       # filter by age
  String.to_integer(age) >= 18
end)
|> Enum.to_list()
```

```elixir
# Write to a file using a stream
1..1_000_000
|> Stream.map(&"Line #{&1}\n")
|> Stream.into(File.stream!("output.txt"))
|> Stream.run()

# Copy and transform a file
File.stream!("input.txt")
|> Stream.map(&String.upcase/1)
|> Stream.into(File.stream!("output.txt"))
|> Stream.run()

# Stream with custom line separator and byte size
File.stream!("binary_data.bin", 4096)  # read in 4KB chunks
|> Enum.reduce(0, fn chunk, acc -> acc + byte_size(chunk) end)
```

{{< concept title="Streams vs Eager Reading" >}}
Choose between `File.read/1` and `File.stream!/1` based on the file size and your processing needs:

- **`File.read/1`** -- loads the entire file into memory as a single binary. Fast for small files (under a few MB). Simple to work with since you have the whole string at once.
- **`File.stream!/1`** -- returns a lazy `Stream` that reads the file on demand, line by line (by default). Constant memory usage regardless of file size. Essential for large files (logs, CSV data, database dumps).

A good rule of thumb: if the file fits comfortably in memory and you need to access the content randomly, use `File.read/1`. If the file is large or you only need a single pass through the data, use `File.stream!/1`.
{{< /concept >}}

## The Path Module

The `Path` module manipulates file paths in a cross-platform way. Never build paths by concatenating strings with `/` -- use `Path.join/2` instead.

```elixir
# Joining paths (platform-aware)
Path.join("data", "users.csv")
# => "data/users.csv"

Path.join(["home", "user", "documents", "file.txt"])
# => "home/user/documents/file.txt"

# Extracting components
Path.basename("/var/log/app.log")
# => "app.log"

Path.basename("/var/log/app.log", ".log")
# => "app"

Path.dirname("/var/log/app.log")
# => "/var/log"

Path.extname("photo.jpg")
# => ".jpg"

Path.rootname("photo.jpg")
# => "photo"

# Expanding and resolving paths
Path.expand("~/documents")
# => "/Users/alice/documents"

Path.absname("lib/my_app.ex")
# => "/current/working/dir/lib/my_app.ex"

# Wildcard matching
Path.wildcard("lib/**/*.ex")
# => ["lib/my_app.ex", "lib/my_app/worker.ex", ...]

Path.wildcard("test/*_test.exs")
# => ["test/my_app_test.exs", "test/worker_test.exs"]
```

{{< iex >}}
iex> Path.join("foo", "bar")
"foo/bar"
iex> Path.split("/usr/local/bin")
["/", "usr", "local", "bin"]
iex> Path.relative_to("/usr/local/bin", "/usr/local")
"bin"
iex> Path.type("foo/bar")
:relative
iex> Path.type("/foo/bar")
:absolute
iex> Path.expand(".")
"/Users/hwatkins/src/mergate/elixir_examples"
{{< /iex >}}

## Working with Directories

The `File` module also handles directory operations -- creating, listing, removing, and traversing directories.

```elixir
# Create directories
File.mkdir("new_dir")
# => :ok

File.mkdir_p("path/to/nested/dir")
# => :ok  (creates all intermediate directories)

# List directory contents
{:ok, entries} = File.ls("lib")
# => {:ok, ["my_app.ex", "my_app"]}

# Check file properties
File.exists?("mix.exs")
# => true

File.dir?("lib")
# => true

File.regular?("mix.exs")
# => true

# Get file metadata
{:ok, stat} = File.stat("mix.exs")
# => {:ok, %File.Stat{size: 1234, type: :regular, ...}}

# Copy, rename, and delete
File.cp("source.txt", "dest.txt")
File.cp_r("source_dir", "dest_dir")
File.rename("old.txt", "new.txt")
File.rm("unwanted.txt")
File.rm_rf("temp_dir")  # recursive delete
```

```elixir
# Recursively find all Elixir files in a directory
defmodule FileFinder do
  def find_by_extension(dir, extension) do
    dir
    |> Path.join("**/*#{extension}")
    |> Path.wildcard()
  end

  def directory_size(dir) do
    dir
    |> Path.join("**/*")
    |> Path.wildcard()
    |> Enum.filter(&File.regular?/1)
    |> Enum.map(fn path ->
      {:ok, %{size: size}} = File.stat(path)
      size
    end)
    |> Enum.sum()
  end
end
```

## Temporary Files and Directories

For operations that need scratch space, use the system's temporary directory:

```elixir
# Get the system temporary directory
System.tmp_dir!()
# => "/tmp" (or platform equivalent)

# Create a unique temporary file
tmp_path = Path.join(System.tmp_dir!(), "myapp_#{:rand.uniform(100_000)}.tmp")
File.write!(tmp_path, "temporary data")

# Process and clean up
try do
  data = File.read!(tmp_path)
  process(data)
after
  File.rm(tmp_path)
end
```

{{< callout type="note" >}}
In tests, ExUnit provides a built-in `tmp_dir` tag that creates a unique temporary directory for each test and cleans it up automatically:

```elixir
@tag :tmp_dir
test "writes output", %{tmp_dir: tmp_dir} do
  path = Path.join(tmp_dir, "output.txt")
  File.write!(path, "test data")
  assert File.read!(path) == "test data"
  # tmp_dir is cleaned up after the test
end
```

This is safer than managing temporary files manually and avoids test pollution.
{{< /callout >}}

## Practical Example: A Log Analyzer

Here is a complete example combining IO, File, and Path operations:

```elixir
defmodule LogAnalyzer do
  @moduledoc "Analyzes log files and produces summary reports."

  @doc """
  Analyzes all .log files in the given directory and writes a report.

  ## Examples

      LogAnalyzer.analyze("logs/", "report.txt")
  """
  @spec analyze(String.t(), String.t()) :: :ok | {:error, String.t()}
  def analyze(log_dir, output_path) do
    log_files = Path.wildcard(Path.join(log_dir, "*.log"))

    if log_files == [] do
      {:error, "No log files found in #{log_dir}"}
    else
      report =
        log_files
        |> Enum.map(&analyze_file/1)
        |> format_report()

      File.write!(output_path, report)
      IO.puts("Report written to #{output_path}")
      :ok
    end
  end

  defp analyze_file(path) do
    counts =
      File.stream!(path)
      |> Enum.reduce(%{total: 0, errors: 0, warnings: 0}, fn line, acc ->
        acc = %{acc | total: acc.total + 1}

        cond do
          String.contains?(line, "ERROR") -> %{acc | errors: acc.errors + 1}
          String.contains?(line, "WARN") -> %{acc | warnings: acc.warnings + 1}
          true -> acc
        end
      end)

    {Path.basename(path), counts}
  end

  defp format_report(results) do
    header = "Log Analysis Report\n#{String.duplicate("=", 40)}\n\n"

    body =
      Enum.map_join(results, "\n", fn {filename, counts} ->
        """
        #{filename}:
          Total lines:  #{counts.total}
          Errors:       #{counts.errors}
          Warnings:     #{counts.warnings}
        """
      end)

    totals = Enum.reduce(results, %{total: 0, errors: 0, warnings: 0}, fn {_, c}, acc ->
      %{total: acc.total + c.total, errors: acc.errors + c.errors, warnings: acc.warnings + c.warnings}
    end)

    footer = """

    #{String.duplicate("-", 40)}
    TOTAL: #{totals.total} lines, #{totals.errors} errors, #{totals.warnings} warnings
    """

    header <> body <> footer
  end
end
```

{{< exercise title="Build a File Processing Tool" >}}
Create a module `WordFrequency` that analyzes text files:

1. Write a function `analyze(path)` that:
   - Reads a text file using `File.stream!/1`
   - Splits each line into words (downcased, stripped of punctuation)
   - Counts the frequency of each word
   - Returns `{:ok, %{word => count}}` or `{:error, reason}`

2. Write a function `top_words(path, n \\ 10)` that returns the top N most frequent words as a sorted list of `{word, count}` tuples.

3. Write a function `report(path, output_path)` that:
   - Calls `analyze/1` and `top_words/2`
   - Writes a formatted report to `output_path` using `File.write/2`
   - The report should include the total word count, unique word count, and the top 20 words with their frequencies

4. Use `Path.expand/1` to handle `~` in file paths.

Test your module with any text file on your system (e.g., a README or source file). Verify that the stream-based approach uses constant memory by testing with a large file.
{{< /exercise >}}

## Summary

Elixir provides a comprehensive set of modules for IO and file system operations. The `IO` module handles standard input/output and debugging with `IO.inspect`. The `File` module covers reading, writing, copying, and deleting files and directories, with both safe (tuple-returning) and bang (exception-raising) variants. `File.stream!` enables memory-efficient processing of large files through lazy evaluation. The `Path` module ensures cross-platform path manipulation. Together, these modules give you everything needed to build file-processing tools, log analyzers, data importers, and any other application that interacts with the file system.

This completes Phase 4: Practical Development. You now have the core skills for building real Elixir projects -- managing them with Mix, testing with ExUnit, documenting with ExDoc, handling errors idiomatically, and working with the file system. Phase 5 covers advanced topics including metaprogramming, protocols, and NIFs.
