---
title: "Prompt Versioning, Evals, and Regression Testing"
description: "Implement prompt version control, evaluation harnesses, and regression gates for safer AI feature releases."
weight: 2
phase: 9
lesson: 53
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2026-03-01
aliases:
  - /08-career-and-ai-development/06-prompt-versioning-evals-and-regression-testing/
prerequisites:
  - "/04-practical-development/02-testing"
  - "/07-production-and-scale/07-property-based-testing-with-streamdata"
tags:
  - ai
  - llm
  - testing
  - evals
  - prompts
  - quality
keyTakeaways:
  - "Prompt changes need version control, review, and rollback just like code"
  - "Reliable eval datasets are required to catch quality regressions before release"
  - "Release gates should combine quality, latency, and cost constraints"
faq:
  - question: "Evals are expensive. How can I keep costs controlled?"
    answer: "Use a tiered approach: run a small deterministic smoke set on every change and a larger semantic set on scheduled or release branches. Cache fixtures and limit model size for routine checks."
  - question: "Outputs are non-deterministic. How do I avoid flaky tests?"
    answer: "Use threshold-based assertions on required properties instead of exact string matches. Keep temperature stable in tests and evaluate trends across enough fixtures."
---

Prompt updates can silently change product behavior. Treat prompts as versioned artifacts with tests and release gates.

## Prompt Registry Model

Track prompt templates explicitly:

```elixir
defmodule MyApp.AI.PromptVersion do
  use Ecto.Schema
  import Ecto.Changeset

  schema "ai_prompt_versions" do
    field :name, :string
    field :version, :integer
    field :template, :string
    field :status, Ecto.Enum, values: [:draft, :active, :retired]
    field :notes, :string

    timestamps(type: :utc_datetime)
  end

  def changeset(prompt, attrs) do
    prompt
    |> cast(attrs, [:name, :version, :template, :status, :notes])
    |> validate_required([:name, :version, :template, :status])
    |> unique_constraint([:name, :version])
  end
end
```

Every AI request should reference a specific prompt version.

## Rendering Prompts Safely

Keep template rendering deterministic:

```elixir
defmodule MyApp.AI.Prompts do
  @spec render(String.t(), map()) :: {:ok, String.t()} | {:error, term()}
  def render(template, vars) do
    required = ["task", "input"]

    if Enum.all?(required, &Map.has_key?(vars, &1)) do
      rendered =
        template
        |> String.replace("{{task}}", vars["task"])
        |> String.replace("{{input}}", vars["input"])

      {:ok, rendered}
    else
      {:error, :missing_variables}
    end
  end
end
```

Avoid runtime string interpolation patterns that are hard to test or audit.

## Evaluation Dataset Design

Build datasets that reflect real usage slices:

- normal requests,
- edge cases,
- adversarial or prompt-injection attempts,
- policy-sensitive scenarios,
- multilingual or formatting-sensitive samples.

Each fixture should include:

- input,
- expected properties,
- severity if it fails,
- optional reference answer.

## Eval Runner Example

```elixir
defmodule MyApp.AI.Evals.Runner do
  alias MyApp.AI.{ChatService, Prompts}

  def run_case(prompt_template, vars, rubric) do
    with {:ok, rendered} <- Prompts.render(prompt_template, vars),
         request <- %{model: "gpt-4o-mini", messages: [%{role: "user", content: rendered}]},
         {:ok, %{response: response}} <- ChatService.generate(request, timeout: 15_000) do
      score(response.content, rubric)
    end
  end

  defp score(output, rubric) do
    passed = Enum.all?(rubric.must_include, &String.contains?(output, &1))
    format_ok = String.length(output) <= rubric.max_chars

    %{
      pass: passed and format_ok,
      checks: %{required_terms: passed, max_chars: format_ok}
    }
  end
end
```

This is intentionally simple. Start with deterministic checks, then add semantic evaluators only when needed.

{{< callout type="note" >}}
Non-determinism is normal in LLM outputs. Use stable test settings, enough fixtures, and threshold-based gates instead of expecting byte-for-byte identical output.
{{< /callout >}}

## CI Regression Gate

A lightweight release gate model:

1. Run baseline prompt version against eval dataset.
2. Run candidate prompt version against same dataset.
3. Compare pass rate, latency, and cost.
4. Block merge if candidate violates thresholds.

Example policy:

- quality pass rate must not drop more than 1.5%,
- p95 latency must stay under target,
- cost per request increase must be under 10% unless approved.

## Human Review Loop

Use reviewers for categories automation cannot fully judge:

- tone and clarity,
- harmful or unsafe output risk,
- legal/compliance language.

Record reviewer decisions as part of the prompt version history.

## Rollback Strategy

Prompt rollback should be a standard operation:

- keep last known good version active,
- switch routing to previous version quickly,
- annotate incident and follow-up actions.

No rollback path means slower incident recovery.

{{% compare %}}
```python
# Common flow:
# prompt file in repo + pytest eval suite + CI quality gate.
```

```javascript
// Common flow:
// JSON prompt catalog + eval script + dashboard diff.
```

```elixir
# Elixir flow:
# Ecto-backed prompt registry + ExUnit eval runner + CI thresholds + Oban for async batch evals.
```
{{% /compare %}}

## Exercise

{{< exercise title="Build a Prompt Regression Gate" >}}
Implement a regression harness for one AI feature:

1. define prompt registry schema,
2. create 25-50 eval fixtures,
3. implement pass/fail scoring,
4. compare baseline vs candidate metrics,
5. fail CI on quality, latency, or cost regressions.

Document the gate policy and rollback command in your runbook.
{{< /exercise >}}

## Summary

Prompt quality is a release engineering problem, not only a writing problem. Version prompts explicitly, evaluate changes against representative datasets, and enforce regression gates across quality, latency, and cost.

## FAQ and Troubleshooting

### Evals are expensive. How can I keep costs controlled?
Use a tiered approach: run a small deterministic smoke set on every change and a larger semantic set on scheduled or release branches. Cache fixtures and limit model size for routine checks.

### Outputs are non-deterministic. How do I avoid flaky tests?
Use threshold-based assertions on required properties instead of exact string matches. Keep temperature stable in tests and evaluate trends across enough fixtures.
