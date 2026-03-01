---
title: "Release Engineering and Runtime Ops"
description: "Operate Elixir releases in production with strong runtime practices. Covers release config, migrations, rollbacks, health checks, and incident-ready runbooks."
weight: 5
phase: 7
lesson: 40
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-03-01
prerequisites:
  - "/06-web-and-distributed/06-deployment"
  - "/03-advanced-language/05-otp-apps"
  - "/06-web-and-distributed/08-telemetry-and-opentelemetry"
hexdocsLinks:
  - title: "Mix Releases"
    url: "https://hexdocs.pm/mix/Mix.Tasks.Release.html"
  - title: "Config Provider"
    url: "https://hexdocs.pm/elixir/Config.Provider.html"
  - title: "Ecto Migrations"
    url: "https://hexdocs.pm/ecto_sql/Ecto.Migrator.html"
tags:
  - releases
  - operations
  - runbooks
  - migrations
  - rollback
keyTakeaways:
  - "Release engineering is about repeatability, safety, and operability under failure"
  - "Runtime configuration and migration strategy must be explicit and tested"
  - "Runbooks and health checks reduce incident recovery time"
---

Shipping a release is only the start. Reliable operations require clear procedures for configuration, migrations, rollback, and diagnostics.

## Release Checklist

- reproducible build artifacts,
- immutable release bundles,
- runtime config from environment/providers,
- pre-deploy and post-deploy health checks,
- rollback procedure validated in staging.

## Runtime Configuration

Use runtime config for environment-specific values:

```elixir
# runtime.exs
config :my_app, MyApp.Repo,
  url: System.fetch_env!("DATABASE_URL"),
  pool_size: String.to_integer(System.get_env("POOL_SIZE", "10"))
```

Avoid baking secrets into compile-time config.

## Migration Strategy

Decide deployment order:

1. backward-compatible schema changes,
2. deploy app code,
3. cleanup migrations later.

For zero-downtime systems, avoid destructive schema changes in first rollout.

## Health and Readiness

Track:

- startup success,
- DB connectivity,
- queue/subscription readiness,
- critical dependency reachability.

Expose readiness checks that reflect true service ability, not only process liveness.

## Rollback Planning

A rollback plan should include:

- artifact version selection,
- configuration compatibility check,
- migration compatibility constraints,
- communication and validation steps.

{{% compare %}}
```python
# Typical release ops
# Virtualenv/container artifact + migration orchestration + health checks.
```

```javascript
// Typical Node ops
// Container image deploy + env injection + rollback to previous image.
```

```elixir
# Elixir releases
# OTP release artifacts + runtime config + operational scripts.
```
{{% /compare %}}

## Exercise

{{< exercise title="Create a Production Runbook" >}}
Write and test a deployment runbook:

1. Build and version a release artifact.
2. Define pre-deploy checks and rollback trigger thresholds.
3. Add migration execution and verification steps.
4. Define post-deploy health validation.
5. Rehearse rollback in staging with a known-bad release.
{{< /exercise >}}

## FAQ and Troubleshooting

### Why did the release boot locally but fail in production?
Most often due to missing runtime env vars, network differences, or secret/config provider issues.

### Can I always roll back quickly?
Not if migrations are incompatible. Design schema changes for rollback safety.

### What is the most valuable ops artifact?
A tested, concise runbook that a different engineer can execute under pressure.
