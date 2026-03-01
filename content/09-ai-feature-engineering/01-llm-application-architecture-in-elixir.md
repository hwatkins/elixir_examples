---
title: "LLM Application Architecture in Elixir"
description: "Design reliable LLM-backed features with Phoenix, Oban, retries, and provider abstraction in Elixir systems."
weight: 1
phase: 9
lesson: 52
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2026-03-01
aliases:
  - /08-career-and-ai-development/05-llm-application-architecture-in-elixir/
prerequisites:
  - "/06-web-and-distributed/01-phoenix"
  - "/06-web-and-distributed/08-telemetry-and-opentelemetry"
  - "/07-production-and-scale/02-oban-and-reliable-background-jobs"
hexdocsLinks:
  - title: "Req"
    url: "https://hexdocs.pm/req/Req.html"
  - title: "Oban"
    url: "https://hexdocs.pm/oban/Oban.html"
  - title: "Phoenix"
    url: "https://hexdocs.pm/phoenix/overview.html"
tags:
  - ai
  - llm
  - architecture
  - phoenix
  - oban
  - production
keyTakeaways:
  - "LLM architecture should separate synchronous user flow from asynchronous orchestration"
  - "Provider behavior abstractions reduce vendor lock-in and simplify fallback design"
  - "Retries, budgets, and observability must be designed before shipping AI features"
faq:
  - question: "Should I start with synchronous or asynchronous workflows?"
    answer: "Start synchronous for short, low-risk interactions that must return immediately. Use asynchronous jobs when calls are slow, retry-prone, or involve multi-step orchestration."
  - question: "How many providers should I support initially?"
    answer: "One provider is fine to start if your abstraction boundary is clean. Add a second provider when reliability, cost, or policy requirements justify fallback complexity."
---

LLM features are production features. They need explicit architecture boundaries, failure handling, and operational visibility.

## Core Architecture Pattern

A practical baseline for Elixir applications:

1. **Phoenix edge** for request validation, auth, and UX response contracts.
2. **AI service layer** for prompt assembly and provider routing.
3. **Oban workers** for long-running or retryable operations.
4. **Persistence layer** for prompt version, output metadata, cost, and auditability.

{{< concept title="Synchronous vs Asynchronous Boundaries" >}}
Use synchronous calls only when users need immediate feedback in the same interaction. For expensive generation, tool calls, or multi-step workflows, enqueue a job and return a task handle to the client.
{{< /concept >}}

## Provider Abstraction with Behaviors

Define one provider contract:

```elixir
defmodule MyApp.AI.Provider do
  @type request :: %{model: String.t(), messages: list(map())}
  @type response :: %{content: String.t(), usage: map(), raw: map()}

  @callback chat(request(), keyword()) :: {:ok, response()} | {:error, term()}
end
```

Implement adapters per vendor:

```elixir
defmodule MyApp.AI.Providers.OpenAI do
  @behaviour MyApp.AI.Provider

  @impl true
  def chat(request, opts) do
    timeout = Keyword.get(opts, :timeout, 15_000)

    body = %{
      model: request.model,
      messages: request.messages
    }

    case Req.post("https://api.openai.com/v1/chat/completions", json: body, receive_timeout: timeout) do
      {:ok, %{status: 200, body: payload}} ->
        {:ok, %{content: extract_text(payload), usage: payload["usage"] || %{}, raw: payload}}

      {:ok, %{status: status, body: payload}} ->
        {:error, {:provider_error, status, payload}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp extract_text(payload) do
    payload
    |> get_in(["choices", Access.at(0), "message", "content"])
    |> to_string()
  end
end
```

Now application code depends on `MyApp.AI.Provider`, not a vendor SDK.

## Service Layer and Fallback Routing

```elixir
defmodule MyApp.AI.ChatService do
  alias MyApp.AI.Providers.{OpenAI, Anthropic}

  @providers [OpenAI, Anthropic]

  def generate(request, opts \\ []) do
    Enum.reduce_while(@providers, {:error, :no_provider_available}, fn provider, _acc ->
      case provider.chat(request, opts) do
        {:ok, response} -> {:halt, {:ok, %{provider: provider, response: response}}}
        {:error, _reason} -> {:cont, {:error, :try_next_provider}}
      end
    end)
  end
end
```

Fallback order should be explicit and tied to cost, latency, and quality constraints.

## Async Orchestration with Oban

```elixir
defmodule MyApp.Workers.GenerateSummary do
  use Oban.Worker,
    queue: :ai,
    max_attempts: 8

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"document_id" => id, "prompt_version" => version}}) do
    with {:ok, doc} <- MyApp.Documents.fetch(id),
         request <- MyApp.AI.Prompts.build_summary_request(doc, version),
         {:ok, %{provider: provider, response: response}} <- MyApp.AI.ChatService.generate(request, timeout: 20_000),
         :ok <- MyApp.AI.Results.store(id, version, provider, response) do
      :ok
    else
      {:error, :invalid_input} -> :discard
      {:error, reason} -> {:error, reason}
    end
  end
end
```

Use `:discard` for non-retryable errors. Retry transient provider and network failures.

## Data Model for Traceability

Persist enough data to debug and audit:

- prompt version id,
- provider name and model,
- response content hash,
- token usage and unit cost,
- latency and retry count,
- safety decision metadata.

Store raw provider payloads only when policy allows it.

{{< callout type="important" >}}
Do not log full prompts or outputs by default when they may contain sensitive user data. Log structured metadata first, then add redacted payload capture behind explicit controls.
{{< /callout >}}

## Telemetry Events

Emit events at clear boundaries:

```elixir
:telemetry.execute(
  [:my_app, :ai, :request],
  %{duration_ms: duration_ms, tokens_in: in_tokens, tokens_out: out_tokens, cost_usd: cost},
  %{provider: provider, model: model, status: status}
)
```

This enables dashboards for latency, error rate, and spend trends.

## Architecture Decision Checklist

Before shipping an AI endpoint, decide:

- sync vs async boundary,
- timeout and retry budgets,
- fallback provider policy,
- cost guardrails and tenant limits,
- data retention and redaction rules,
- quality evaluation threshold for release.

{{% compare %}}
```python
# Typical Python pattern:
# FastAPI + Celery + provider SDK + Redis queue.
# Works well, but requires more manual process supervision choices.
```

```javascript
// Typical JS pattern:
// API route + BullMQ + provider SDK.
// Strong ecosystem, but runtime isolation and retries need careful ops discipline.
```

```elixir
# Typical Elixir pattern:
# Phoenix + Oban + behavior adapters + Telemetry.
# Strong fit for supervised retries, observability, and runtime resilience.
```
{{% /compare %}}

## Exercise

{{< exercise title="Design a Production-Grade AI Endpoint" >}}
Design a "summarize document" feature and include:

1. sync API contract and async fallback path,
2. provider behaviour and two adapters,
3. Oban worker with retry and discard rules,
4. telemetry event schema,
5. data retention and redaction policy.

Write one architecture note explaining tradeoffs and why you chose them.
{{< /exercise >}}

## Summary

Reliable LLM architecture in Elixir comes from clear boundaries: Phoenix at the edge, provider abstraction in the service layer, and durable async orchestration with Oban. Design retries, fallbacks, telemetry, and data policy before launch.

## FAQ and Troubleshooting

### Should I start with synchronous or asynchronous workflows?
Start synchronous for short, low-risk interactions that must return immediately. Use asynchronous jobs when calls are slow, retry-prone, or involve multi-step orchestration.

### How many providers should I support initially?
One provider is fine to start if your abstraction boundary is clean. Add a second provider when reliability, cost, or policy requirements justify fallback complexity.
