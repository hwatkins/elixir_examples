---
title: "Property-Based Testing with StreamData"
description: "Catch deep edge cases with property-based testing in Elixir using StreamData. Covers generators, shrinking, invariants, and integration with ExUnit."
weight: 7
phase: 7
lesson: 42
difficulty: "advanced"
estimatedMinutes: 30
draft: false
date: 2025-03-01
prerequisites:
  - "/04-practical-development/02-testing"
  - "/01-foundations/03-pattern-matching"
  - "/02-core-language/03-maps-and-keyword-lists"
hexdocsLinks:
  - title: "StreamData"
    url: "https://hexdocs.pm/stream_data/StreamData.html"
  - title: "ExUnitProperties"
    url: "https://hexdocs.pm/stream_data/ExUnitProperties.html"
tags:
  - testing
  - streamdata
  - property-based-testing
  - quality
  - invariants
keyTakeaways:
  - "Property tests validate invariants across many generated inputs, not single examples"
  - "Good generator design is the foundation of useful property tests"
  - "Shrinking makes failures actionable by producing minimal counterexamples"
---

Example tests are necessary but limited. Property-based testing checks that general rules hold across many randomized inputs.

## Example vs Property

Example test:

```elixir
test "sum adds two numbers" do
  assert add(2, 3) == 5
end
```

Property test:

```elixir
use ExUnitProperties

property "adding zero returns same value" do
  check all x <- integer() do
    assert add(x, 0) == x
  end
end
```

The property validates an invariant for many values, not one.

## Generator Design

Useful generators reflect realistic domains:

- bounded ranges,
- valid structured maps,
- combinations that include edge values.

```elixir
def user_gen do
  fixed_map(%{
    age: integer(0..120),
    email: string(:alphanumeric, min_length: 3),
    active: boolean()
  })
end
```

## Shrinking and Debugging

When a property fails, StreamData shrinks toward a minimal failing input. This is often the fastest path to root cause.

Treat failing shrunk values as regression fixtures in regular tests.

## High-Value Property Targets

- parsers/serializers round-trip behavior,
- sorting and set invariants,
- idempotency rules,
- normalization/canonicalization logic,
- permission checks under combinatorial inputs.

{{% compare %}}
```python
# Hypothesis
# Similar concept: generators + properties + shrinking.
```

```javascript
// fast-check
// Similar concept in JS ecosystem.
```

```elixir
# StreamData
# Native ExUnit integration for property checks and shrinking.
```
{{% /compare %}}

## Exercise

{{< exercise title="Property-Test a Normalization Pipeline" >}}
Choose one normalization function in your app and add properties:

1. Idempotency (`f(f(x)) == f(x)`).
2. Shape invariant (required keys always present).
3. Range invariant (numeric bounds preserved).
4. Add at least one custom generator for realistic inputs.
5. Convert a discovered counterexample into a fixed regression test.
{{< /exercise >}}

## FAQ and Troubleshooting

### My property test fails intermittently. Why?
You may rely on time/random/external state. Make the function deterministic or control side effects for test runs.

### How many runs are enough?
Start with defaults, then increase for critical properties and CI stability thresholds.

### Should property tests replace example tests?
No. Use both: examples for intent/readability, properties for broad invariant coverage.
