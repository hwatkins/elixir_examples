---
title: "Core Language"
description: "Master Elixir's core data structures, functions, modules, strings, and the powerful Enum and Stream modules. Build fluent, idiomatic Elixir code."
date: 2025-02-23
weight: 2
---

Phase 2 is where Elixir starts to feel natural. You move beyond basic syntax and learn the language building blocks that appear in almost every real codebase: function design, data-structure trade-offs, modules, structs, and collection pipelines. If you complete this phase carefully, later topics like GenServer, Ecto, and Phoenix will be much easier.

This phase includes [Functions](/02-core-language/01-functions/), [Lists and Tuples](/02-core-language/02-lists-and-tuples/), [Maps and Keyword Lists](/02-core-language/03-maps-and-keyword-lists/), [Strings and Binaries](/02-core-language/04-strings/), [Modules and Structs](/02-core-language/05-modules-and-structs/), and [Enum and Stream](/02-core-language/06-enum/).

Who this phase is for:

- Developers who can read simple Elixir but need idiomatic day-to-day fluency.
- Teams standardizing on Elixir style and conventions.
- Anyone preparing for production features that depend on strong functional foundations.

What you should be able to do after this phase:

- Design function APIs with clear arity and guard choices.
- Pick the right data structure based on lookup, update, and traversal needs.
- Build readable pipelines and know when to stop piping.
- Use `Enum` and `Stream` deliberately for eager vs lazy processing.
- Model domain data with modules and structs instead of ad-hoc maps.

Common pitfalls to watch for:

- Overusing keyword lists where maps or structs are better.
- Confusing binaries, UTF-8 strings, and charlists.
- Chaining long pipelines that hide logic and make debugging harder.

A good checkpoint before Phase 3 is being able to write a small module from scratch with public/private functions, proper data modeling, and testable transformation pipelines.

If you get stuck in this phase, revisit lessons with IEx open and re-type every core example. Mechanical repetition helps you internalize tuple/map/list transformations and the shape of idiomatic pipelines. That investment reduces friction dramatically when you begin stateful process design in the next phase.
