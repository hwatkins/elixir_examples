---
title: "AI Tools and Workflows for Elixir Engineers"
description: "Use AI coding tools effectively with Elixir through OTP-aware prompting, review checklists, and practical daily workflows."
weight: 6
phase: 8
lesson: 49
difficulty: "advanced"
estimatedMinutes: 30
draft: false
date: 2026-03-01
prerequisites:
  - "/04-practical-development/02-testing"
  - "/05-otp-and-fault-tolerance/01-genserver"
tags:
  - career
  - ai
  - tools
  - workflows
  - tidewave
keyTakeaways:
  - "Elixir-specific AI tools like Tidewave and Phoenix.new provide OTP-aware development assistance"
  - "AGENTS.md and usage-rules.md conventions give AI tools project-specific context for better output"
  - "A structured prompt-generate-compile-test-review workflow prevents AI-generated code from introducing subtle defects"
faq:
  - question: "Which AI coding tool should I start with for Elixir?"
    answer: "Start with whichever tool integrates with your current editor. The review discipline matters more than tool choice. If you want Elixir-specific features, evaluate Tidewave for its OTP-aware capabilities."
  - question: "How do I prevent AI tools from generating Ruby-like code in Elixir files?"
    answer: "Provide explicit context in your prompts: specify Elixir conventions, reference module documentation, and use AGENTS.md or usage-rules.md files to set project conventions. Always run the formatter and compiler as first-pass filters."
---

AI coding tools are practical infrastructure for Elixir development. This lesson covers the tool landscape, effective prompting strategies, and the review discipline that makes AI-assisted Elixir work reliable.

## Tool Landscape

### Tidewave

[Tidewave](https://tidewave.ai) is an Elixir-native AI development tool created by José Valim. It provides OTP-aware code generation, understands Phoenix conventions, and integrates with the Elixir compiler and documentation system. Tidewave is designed specifically for Elixir and Phoenix workflows.

### Phoenix.new

Chris McCord's [Phoenix.new](https://phoenix.new) provides AI-assisted Phoenix project generation and scaffolding. It understands Phoenix conventions, LiveView patterns, and Ecto schema design, producing idiomatic starting points for new features.

### General-Purpose Tools

- **Claude Code SDK**: programmable AI assistant with tool use, useful for custom development workflows and automation.
- **GitHub Copilot**: inline code suggestions in supported editors. Works well for Elixir data transformations but may suggest Ruby patterns.
- **Cursor**: AI-powered editor with codebase-aware completions and chat.

Each tool has different strengths. Tidewave and Phoenix.new understand Elixir deeply. General-purpose tools have broader capabilities but weaker Elixir-specific knowledge.

## Project Context with AGENTS.md

Zach Daniel proposed the `AGENTS.md` convention for providing AI tools with project-specific context. This file lives in your project root and describes conventions, architecture decisions, and constraints that AI tools should follow.

Example structure:

```markdown
# Project: MyApp

## Architecture
- Phoenix 1.8 with LiveView 1.1
- Oban for background jobs
- Multi-tenant with tenant_id scoping

## Conventions
- Use pattern matching over if/else
- All GenServers must have child_spec/1
- Tests use ExUnit async: true where possible
- Contexts own business logic, controllers are thin

## Constraints
- No raw SQL outside migrations
- No process spawning outside supervision trees
- All AI provider calls go through MyApp.AI.ChatService
```

### usage-rules.md

Some tools use `usage-rules.md` or `.cursorrules` for similar purposes. The key principle is the same: give the AI tool explicit project context so it generates code that fits your codebase rather than generic patterns.

## OTP-Aware Prompting Strategies

Generic prompts produce generic code. Elixir-specific prompts produce better results.

### Specify OTP Requirements Explicitly

```text
Implement a GenServer-backed cache with:
- public API module (MyApp.Cache)
- supervision child spec for Application supervisor
- explicit timeout handling in handle_call
- ETS table for storage, GenServer for coordination
- ExUnit tests for happy path, timeout, and crash recovery
Return only Elixir code and tests.
```

### Request Supervision Context

```text
Add a rate limiter process to MyApp.Application's supervision tree.
- Use a GenServer with a sliding window counter
- Include child_spec with restart: :permanent
- Handle the case where the process crashes and restarts with empty state
- Show where it fits in the existing supervision tree
```

### Ask for Idiomatic Patterns

```text
Refactor this function to use pattern matching and the pipe operator
instead of nested case statements. Preserve all error handling paths.
```

{{< concept title="Prompt Specificity and Output Quality" >}}
AI tools generate better Elixir code when prompts mention specific OTP behaviors, supervision strategies, and Elixir conventions. Generic prompts like "build a cache" produce code that compiles but often misses process ownership, supervision, and failure handling.
{{< /concept >}}

## Review Checklist for AI-Generated Elixir Code

Run this checklist before merging any AI-generated code:

### Compilation and Formatting
- [ ] Code compiles without warnings (`mix compile --warnings-as-errors`)
- [ ] Code passes formatter (`mix format --check-formatted`)
- [ ] No unused variables or imports

### Process Ownership
- [ ] `start_link` and child spec are correct if processes are involved
- [ ] Supervision strategy matches failure semantics
- [ ] Process naming avoids global bottlenecks
- [ ] No unsupervised process spawning (`spawn` without supervision)

### Failure Handling
- [ ] Error tuples (`{:error, reason}`) are handled, not ignored
- [ ] Timeouts are explicit, not default infinity
- [ ] Retry logic has bounds (max attempts, backoff)

### Domain Boundaries
- [ ] Domain logic is not coupled to web-layer modules
- [ ] Context modules own business rules
- [ ] No leaking of implementation details across boundaries

### Test Quality
- [ ] Tests include edge cases, not only happy path
- [ ] Async tests do not depend on timing
- [ ] Test descriptions match actual assertions

### Idiom Quality
- [ ] Pattern matching used over `if/else` chains where appropriate
- [ ] Pipe operator used for sequential transformations
- [ ] Structs used where enforced keys matter
- [ ] No unnecessary `Enum.into` or redundant conversions

## Common Anti-Patterns in AI Output

Watch for these recurring issues:

### Over-Abstraction
AI tools sometimes generate abstraction layers that add complexity without value. A direct function call is better than a behavior with one implementation.

### Missing Process Boundaries
Generated code may put state management in a regular module instead of a GenServer, or create a GenServer where a simple module function would suffice.

### Copy-Paste Vendor Patterns
AI tools may suggest patterns from vendor documentation (AWS SDK style, Rails-like controllers) that do not fit Elixir conventions. Translate the intent, not the implementation.

### Incomplete Error Handling
Generated `with` chains sometimes use a bare `else` clause that swallows specific error types. Each error path should be explicit.

## Daily Workflow

A practical daily cycle for AI-assisted Elixir development:

1. **Prompt**: describe the change with Elixir-specific context and constraints.
2. **Generate**: let the tool produce code and tests.
3. **Compile**: run `mix compile --warnings-as-errors` immediately.
4. **Format**: run `mix format` to normalize style.
5. **Test**: run `mix test` to verify behavior.
6. **Review**: apply the checklist above, focusing on OTP patterns and boundaries.
7. **Merge**: commit only after human review and CI gates pass.

{{< callout type="important" >}}
Never skip the compile and test steps. The Elixir compiler catches structural errors that look correct in isolation. Tests catch semantic errors that compile cleanly. Both are faster than debugging in production.
{{< /callout >}}

## Exercise

{{< exercise title="Build an AI-Assisted Development Workflow" >}}
Set up a complete AI-assisted workflow for one feature:

1. Create an AGENTS.md file for your project with architecture and conventions.
2. Use an AI tool to generate a GenServer-backed feature with supervision.
3. Apply the full review checklist and document every correction needed.
4. Compare the AI-generated version with what you would have written manually.

Record the time saved and the types of corrections required. Use this data to calibrate your trust level for different categories of generated code.
{{< /exercise >}}

## Summary

Effective AI-assisted Elixir development combines the right tools with disciplined workflows. Elixir-specific tools like Tidewave provide OTP-aware generation, while AGENTS.md conventions give any tool project-specific context. The review checklist and daily workflow ensure that AI-generated code meets the same standards as manually written code before it reaches production.

## FAQ and Troubleshooting

### Which AI coding tool should I start with for Elixir?
Start with whichever tool integrates with your current editor. The review discipline matters more than tool choice. If you want Elixir-specific features, evaluate Tidewave for its OTP-aware capabilities.

### How do I prevent AI tools from generating Ruby-like code in Elixir files?
Provide explicit context in your prompts: specify Elixir conventions, reference module documentation, and use AGENTS.md or usage-rules.md files to set project conventions. Always run the formatter and compiler as first-pass filters.
