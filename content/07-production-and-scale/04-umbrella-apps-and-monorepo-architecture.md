---
title: "Umbrella Apps and Monorepo Architecture"
description: "Structure large Elixir systems with umbrella apps and monorepo boundaries. Covers app decomposition, dependencies, shared code, and team-scale workflows."
weight: 4
phase: 7
lesson: 39
difficulty: "advanced"
estimatedMinutes: 30
draft: false
date: 2025-03-01
prerequisites:
  - "/03-advanced-language/05-otp-apps"
  - "/04-practical-development/01-mix"
  - "/06-web-and-distributed/01-phoenix"
hexdocsLinks:
  - title: "Mix Umbrellas"
    url: "https://hexdocs.pm/mix/1.12/Mix.Tasks.New.html#module-umbrella-projects"
  - title: "Application"
    url: "https://hexdocs.pm/elixir/Application.html"
tags:
  - umbrella
  - monorepo
  - architecture
  - boundaries
  - scaling
keyTakeaways:
  - "Umbrella apps help enforce boundaries in growing Elixir systems"
  - "Dependency direction and ownership rules matter more than folder layout"
  - "Shared code should be explicit libraries, not accidental cross-app coupling"
---

Umbrella projects are useful when a system grows beyond a single application but still benefits from coordinated development in one repository.

## When Umbrella Makes Sense

Use umbrellas when:

- multiple deployable components share domain code,
- teams need clear ownership boundaries,
- coordinated refactors are frequent.

Avoid umbrellas when:

- services are fully independent and versioned separately,
- deployment cadence differs heavily between components.

## Typical Layout

```text
apps/
  core_domain/
  billing/
  web/
  worker/
```

Each app has its own `mix.exs`, dependencies, and OTP application config.

## Dependency Rules

Strong pattern:

- domain apps depend only on stable lower-level libraries,
- web/worker apps depend on domain apps,
- never create circular dependencies.

Document these rules early and enforce in code review.

## Shared Code Strategy

If code is reused by 2+ apps, extract it into a dedicated internal app with explicit API boundaries. Avoid ad-hoc imports from random sibling apps.

## Build and CI Considerations

- run tests per app and for integration paths,
- cache dependencies at umbrella level,
- support targeted CI for changed apps where possible.

{{% compare %}}
```python
# Monorepo with multiple packages/services
# Similar trade-offs: shared tooling vs independent release cadence.
```

```javascript
// Monorepo with workspaces/turborepo
// Shared packages + service apps in one repository.
```

```elixir
# Umbrella
# Native Mix support for multi-app codebases with shared tooling.
```
{{% /compare %}}

## Exercise

{{< exercise title="Split a Single App into an Umbrella" >}}
Take an existing app and split it into two apps:

1. Extract core business logic into `core_domain`.
2. Keep web adapters in `web`.
3. Move shared contracts/types into explicit modules.
4. Add tests that validate cross-app integration.
5. Document dependency direction rules in the repo.
{{< /exercise >}}

## FAQ and Troubleshooting

### Why does app startup fail after splitting?
Check application dependencies and startup order (`extra_applications`, supervision trees, and runtime config).

### How small should each app be?
Split by ownership and change boundaries, not by arbitrary size.

### Should every large Elixir repo become umbrella?
No. Umbrellas solve specific coordination and boundary problems; they add structure and overhead.
