---
title: "Portfolio and Proof of Work"
description: "Design portfolio projects that demonstrate practical Elixir depth across OTP, Phoenix, testing, and operations."
weight: 2
phase: 8
lesson: 45
difficulty: "advanced"
estimatedMinutes: 30
draft: false
date: 2026-03-01
prerequisites:
  - "/04-practical-development/02-testing"
  - "/06-web-and-distributed/06-deployment"
tags:
  - career
  - portfolio
  - github
  - projects
  - strategy
keyTakeaways:
  - "A portfolio should prove ownership from feature design to production operations"
  - "Each project needs artifacts that show reliability, failure handling, and measured outcomes"
  - "Two deep, well-documented projects are stronger than many shallow demos"
---

A strong Elixir portfolio is evidence of execution under real constraints. Hiring teams evaluate whether you can design, ship, operate, and improve systems.

## Portfolio Objective

Your portfolio should answer three questions quickly:

1. Can this person build and ship production-grade Elixir software?
2. Can this person reason about failures and tradeoffs?
3. Can this person communicate technical decisions clearly?

{{< concept title="Proof of Work Beats Claims" >}}
Claims like "experienced with OTP" are weak without evidence. A repository that shows supervision design, retries, runbooks, and post-incident notes is much stronger.
{{< /concept >}}

## What One Strong Project Must Demonstrate

Every flagship project should include:

- **System design**: clear architecture and module boundaries.
- **Reliability model**: retries, idempotency, and failure-mode handling.
- **Data model quality**: Ecto schema decisions, constraints, migrations.
- **Operational readiness**: deployment approach, runtime config, and runbook.
- **Testing strategy**: unit, integration, and scenario-based tests.
- **Observability**: telemetry events, dashboards, and alert points.

## Recommended Project Mix

Use two or three projects total.

### Project A: Product Service

Goal: prove delivery execution.

Minimum scope:

- Phoenix API or LiveView UI,
- Ecto-backed persistence,
- authentication and authorization basics,
- one external integration,
- deployment with reproducible instructions.

### Project B: Reliability Workflow

Goal: prove operational thinking.

Minimum scope:

- Oban-based async workflow,
- retry policy and idempotency strategy,
- dead-letter or failed-job handling,
- incident simulation with remediation.

### Optional Project C: Performance or Distributed Focus

Goal: show depth for senior or platform roles.

Example directions:

- throughput optimization with benchmarks,
- distributed node coordination,
- telemetry and tracing deep dive.

## Artifact Checklist Per Project

Include these files in every flagship repo:

- `README.md` with quickstart and architecture summary,
- `docs/architecture.md` with tradeoffs and alternatives,
- `docs/runbook.md` with deploy and incident actions,
- `docs/postmortem-example.md` for one failure scenario,
- `docs/metrics.md` with baseline performance and reliability numbers.

If these are missing, reviewers assume operational maturity is also missing.

## Acceptance Criteria Template

Use explicit acceptance criteria before calling a project done:

1. Service starts from clean clone using documented commands.
2. Core feature has passing tests and failure-path coverage.
3. One load or stress test result is documented.
4. A deploy/recovery path is documented and tested.
5. At least one incident scenario was simulated and written up.

## Portfolio Scoring Rubric

Score each project 1-5 in these categories:

- Problem selection and business relevance,
- Architecture clarity,
- Reliability and failure handling,
- Operational readiness,
- Test quality and confidence,
- Communication quality.

Target average: `>= 4.0` before actively using the project in interviews.

{{< callout type="tip" >}}
If you have limited time, improve one existing project to production grade instead of starting a new one. Depth and completion matter more than novelty.
{{< /callout >}}

## Common Portfolio Mistakes

- Too many toy apps with duplicate scope.
- Missing setup instructions or broken quickstart.
- No explanation for architecture decisions.
- No evidence of performance or reliability thinking.
- Large claims with no measurable outcomes.

## Before/After Example

Weak summary:

```text
Built a Phoenix app with background jobs.
```

Strong summary:

```text
Built and deployed a Phoenix service processing 200k daily jobs with Oban.
Implemented idempotent workers, retry backoff, and failure dashboards.
Reduced failed job replay time from 90m to 12m using queue partitioning and runbook automation.
```

## Interview-Ready Portfolio Packet

When applying, prepare a compact packet:

1. two top repositories,
2. one architecture diagram each,
3. one page of measurable outcomes,
4. one incident write-up,
5. one benchmark snapshot.

This packet helps interviewers evaluate quickly and gives you concrete discussion material.

## Exercise

{{< exercise title="Upgrade One Existing Repo to Portfolio Grade" >}}
Take one current Elixir project and complete the following:

1. add `docs/architecture.md` and `docs/runbook.md`,
2. add one load or benchmark result,
3. add one incident simulation note,
4. rewrite the README with a 5-minute quickstart,
5. score the project using the rubric in this lesson.

Only treat the project as portfolio-ready when all five are complete.
{{< /exercise >}}

## Summary

Portfolio strength comes from operational proof, not app count. Build a small number of projects with clear architecture, reliable runtime behavior, and measurable outcomes that are easy for reviewers to verify.

## FAQ and Troubleshooting

### Can I use work projects if code is private?
Yes. Share sanitized architecture notes, outcomes, and incident lessons without exposing proprietary code or data. Public proof can be process and decision quality, not source access alone.

### I only have small projects. Is that a problem?
Not if they are complete and well-documented. A small, polished project with tests, runbook, and metrics is stronger than a large unfinished demo.
