# Elixir Forum Trends (Mar 1, 2024 to Mar 1, 2026)

Date prepared: 2026-03-01
Purpose: private research notes for curriculum/site planning (not for publication).

## Scope
- Window reviewed: March 1, 2024 through March 1, 2026.
- Method: qualitative scan of forum category/tag pages plus representative threads.
- Caveat: this is pattern-focused, not a full quantitative crawl of every thread.

## High-confidence recurring themes

1. Deployment and production setup questions are constant.
- Typical asks: where to host Phoenix, Fly.io runtime/compile env pitfalls, container/release setup, cloud-specific gotchas.
- Implication: users struggle most at the "it works locally -> production" transition.

2. LiveView architecture and team workflow debates keep recurring.
- Typical asks: LiveView in multi-role teams (dev + QA), preview environments, boundaries between backend/UI ownership.
- Implication: not just syntax questions; teams need workflow and architecture guidance.

3. Ecto usage in real apps remains a heavy source of questions.
- Typical asks: transactions, migrations defaults, query patterns, SQLite/Postgres edge cases, updates/timestamps behavior.
- Implication: practical database ergonomics and production patterns are high-value teaching areas.

4. Oban reliability/operations issues appear repeatedly.
- Typical asks: queue fairness, stuck jobs, queue behavior under load, multi-node distribution.
- Implication: background-job operations is a recurring pain point after initial adoption.

5. Static typing and type-system direction is an active ongoing discussion.
- Typical asks/debates: set-theoretic types, annotation style, type-checking ergonomics.
- Implication: advanced language evolution topics are top-of-mind for experienced users.

6. AI/LLM adoption in Elixir accelerated strongly in 2025-2026.
- Typical asks: which LLM plans/tools work best for Elixir workflows, Tidewave usage, RAG/agent tooling.
- Implication: developer tooling expectations are shifting; audience expects AI-aware guidance.

7. Career/adoption concerns remain common.
- Typical asks: transition into Elixir, senior/junior market dynamics, salary transparency, ecosystem viability.
- Implication: trust-building content (roadmaps, role expectations, practical outcomes) matters.

## Evidence links (starter set)

Category/tag signal pages:
- https://elixirforum.com/c/questions-help/53
- https://elixirforum.com/tag/deployment
- https://elixirforum.com/tag/ecto
- https://elixirforum.com/tag/static-types
- https://elixirforum.com/tag/llm

Representative threads (2024-2026):
- https://elixirforum.com/t/best-way-to-deploy-phoenix-projects/64887
- https://elixirforum.com/t/fly-io-compile-time-and-runtime-env-values-mismatch/69959
- https://elixirforum.com/t/deploy-phoenix-app-to-aws-lightsail/66835
- https://elixirforum.com/t/workflows-for-liveview-in-a-team-environment/67891
- https://elixirforum.com/t/ensure-fairness-in-shared-oban-queue/67698
- https://elixirforum.com/t/a-case-for-inline-type-annotations/71220
- https://elixirforum.com/t/career-shift-to-elixir-in-my-40s/70661
- https://elixirforum.com/t/elixir-developer-salaries-what-216-remote-job-listings-tell-us/74239
- https://elixirforum.com/t/suggestions-for-a-good-llm-subscription-for-elixir-tidewave/74063

## Curriculum implications (draft)

Current need looks less like "more advanced theory" and more like "production decision-making playbooks":
- deployment playbook (runtime config, releases, infra tradeoffs)
- LiveView team workflows and architecture boundaries
- Ecto in production (transactions, migrations, query tuning)
- Oban operations and failure handling
- type-system roadmap orientation
- AI-assisted Elixir workflow patterns and guardrails

## Do we need a separate "Super Advanced" section?

Recommendation (for discussion before any site changes):
- Not yet as a standalone top-level section.

Why:
- The dominant pain is operational and architectural judgment, not purely advanced language mechanics.
- Splitting too early into a "super advanced" area may hide high-demand production topics from upper-beginner/intermediate users who need them soon.

Better near-term structure:
- Add a "Production Clinics" layer (or badges) within existing tracks.
- Keep lessons discoverable from current learning paths.
- Reserve a separate "Super Advanced" section for later if usage data shows sustained demand.

Suggested trigger criteria for later creating a top-level "Super Advanced":
- repeated learner demand for deep-dive content beyond production clinics
- analytics showing frequent navigation to advanced-production topics
- enough content volume to justify a coherent independent section

## Open questions before site changes

- Should "Production Clinics" be a new section label or only lesson tags?
- Do we prioritize Deployment + Ecto + Oban first, or Deployment + LiveView workflow first?
- Do we include AI/LLM workflow content now, or after core production clinics stabilize?
