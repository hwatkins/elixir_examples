---
title: "AI Security, Privacy, and Governance"
description: "Protect users and organizations with security, privacy, and policy controls for AI-driven Elixir applications."
weight: 4
phase: 9
lesson: 55
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2026-03-01
aliases:
  - /08-career-and-ai-development/08-ai-security-privacy-and-governance/
prerequisites:
  - "/06-web-and-distributed/07-phoenix-authentication"
  - "/07-production-and-scale/06-security-hardening-in-phoenix"
  - "/07-production-and-scale/05-release-engineering-and-runtime-ops"
hexdocsLinks:
  - title: "Phoenix Security"
    url: "https://hexdocs.pm/phoenix/security.html"
  - title: "Plug"
    url: "https://hexdocs.pm/plug/Plug.html"
tags:
  - ai
  - security
  - privacy
  - governance
  - compliance
  - production
keyTakeaways:
  - "AI systems need explicit controls for data access, redaction, retention, and auditability"
  - "Security and privacy policy must be enforced in code paths, not only documentation"
  - "Governance requires change history for prompts, models, policy decisions, and exceptions"
faq:
  - question: "Will strict redaction reduce model quality?"
    answer: "It can in some workflows. Use policy-based selective redaction and test quality impact with evals so you can balance privacy protection and task performance."
  - question: "Who should own AI governance in a team?"
    answer: "Use shared ownership: engineering implements controls, security/compliance defines policy requirements, and product/legal participate in exception and incident decisions."
---

AI features introduce new risk surfaces: sensitive inputs, model-provider boundaries, prompt manipulation, and output misuse. Security and privacy controls must be built into the implementation and operations workflow.

## Threat Model for AI Features

Baseline threat categories:

- unauthorized access to prompts or outputs,
- sensitive data leakage in prompts/logs,
- prompt injection and instruction override attempts,
- unsafe output delivered to downstream systems,
- policy violations during model or prompt changes.

Document threats by feature. Controls are impossible to prioritize without explicit threat mapping.

## Security Foundations

Apply least privilege to:

- provider API credentials,
- internal services that can call AI endpoints,
- access to stored prompt/output artifacts,
- administrative actions (model switching, policy override).

Use separate credentials per environment and rotate them regularly.

## Input and Output Safety Pipeline

A practical pipeline:

1. authenticate and authorize caller,
2. classify input sensitivity,
3. redact or tokenize sensitive fields,
4. apply prompt injection checks,
5. call provider through controlled adapter,
6. validate output against policy,
7. store only policy-approved artifacts.

## Redaction Example

```elixir
defmodule MyApp.AI.Redaction do
  @email ~r/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
  @phone ~r/\+?\d[\d\s\-]{7,}\d/

  def scrub(text) do
    text
    |> String.replace(@email, "[REDACTED_EMAIL]")
    |> String.replace(@phone, "[REDACTED_PHONE]")
  end
end
```

Run redaction before sending user content to providers when policy requires it.

## Authorization Boundary Example

```elixir
defmodule MyAppWeb.Plugs.RequireAIFeatureScope do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    if MyApp.Authz.allowed?(conn.assigns.current_user, :use_ai_features) do
      conn
    else
      conn
      |> send_resp(403, "forbidden")
      |> halt()
    end
  end
end
```

AI endpoints should have explicit authorization checks, not inherited assumptions.

## Retention and Deletion Policy

Define for each stored artifact:

- data class (prompt, output, metadata, audit event),
- retention duration,
- legal/compliance basis,
- deletion mechanism,
- owner responsible for policy.

Use automated deletion jobs for enforcement.

```elixir
defmodule MyApp.Workers.PruneAIArtifacts do
  use Oban.Worker, queue: :maintenance

  @impl Oban.Worker
  def perform(_job) do
    cutoff = DateTime.add(DateTime.utc_now(), -30 * 24 * 60 * 60, :second)
    {count, _} = MyApp.AI.Artifacts.delete_older_than(cutoff)
    MyApp.Logger.info("pruned_ai_artifacts", count: count)
    :ok
  end
end
```

## Governance Controls

Governance needs traceability and approval paths.

Track and audit:

- prompt version changes,
- model selection changes,
- safety policy revisions,
- exception approvals,
- incidents and follow-up decisions.

Use immutable audit records where possible.

## Policy-as-Code Pattern

Represent key controls in code so checks are testable.

```elixir
defmodule MyApp.AI.Policy do
  @max_tokens 2_000
  @blocked_patterns ["ignore previous instructions", "exfiltrate", "credit card"]

  def allow_request?(input, tokens_requested) do
    tokens_requested <= @max_tokens and
      Enum.all?(@blocked_patterns, fn pattern ->
        not String.contains?(String.downcase(input), pattern)
      end)
  end
end
```

This is a baseline starting point. Real prompt injection defense requires layered controls including input classification, output validation, and model-level safety settings. A static blocklist alone is not sufficient protection.

Policy checks should run before provider calls and be covered by tests.

{{< callout type="warning" >}}
If policy lives only in wiki pages, production behavior will drift. Put critical policy logic in versioned code with review and test coverage.
{{< /callout >}}

## Incident Classes and Response

Define response plans for:

- suspected data leakage,
- unauthorized access,
- harmful output exposure,
- provider-side policy mismatch.

Each plan should include legal/compliance notification requirements and communication channels.

## Governance Review Cadence

Recommended monthly review:

1. access-control audit,
2. retention/deletion compliance checks,
3. prompt/model change review,
4. incident trend analysis,
5. policy exception cleanup.

This keeps controls aligned with evolving product behavior.

## Exercise

{{< exercise title="Create an AI Security and Governance Baseline" >}}
For one AI feature, produce:

1. threat model with top 5 risks,
2. input/output safety pipeline diagram,
3. retention matrix with deletion job,
4. policy-as-code module with tests,
5. audit log schema for prompt/model/policy changes.

Run a tabletop incident simulation and document corrective actions.
{{< /exercise >}}

## Summary

AI security and governance require enforceable controls across the full lifecycle: access, redaction, retention, policy checks, and auditable change history. Documentation helps, but code-level enforcement and operational review are what keep systems safe over time.

## FAQ and Troubleshooting

### Will strict redaction reduce model quality?
It can in some workflows. Use policy-based selective redaction and test quality impact with evals so you can balance privacy protection and task performance.

### Who should own AI governance in a team?
Use shared ownership: engineering implements controls, security/compliance defines policy requirements, and product/legal participate in exception and incident decisions.
