---
title: "Nx and EXLA for Numerical Computing"
description: "Use Nx and EXLA for high-performance numerical computing in Elixir. Covers tensors, vectorized ops, JIT compilation, and practical integration patterns."
weight: 3
phase: 7
lesson: 38
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-03-01
prerequisites:
  - "/02-core-language/06-enum"
  - "/05-advanced-topics/02-typespecs"
  - "/03-advanced-language/07-task-and-task-supervisor"
hexdocsLinks:
  - title: "Nx"
    url: "https://hexdocs.pm/nx/Nx.html"
  - title: "EXLA"
    url: "https://hexdocs.pm/exla/EXLA.html"
  - title: "Axon"
    url: "https://hexdocs.pm/axon/Axon.html"
tags:
  - nx
  - exla
  - tensors
  - jit
  - machine-learning
keyTakeaways:
  - "Nx introduces tensor-based numerical programming in Elixir"
  - "EXLA compiles numerical code for major performance gains"
  - "Vectorized operations and shape-aware design are critical for correctness and speed"
---

Nx brings tensor computing to Elixir. Instead of scalar-by-scalar loops, you work with arrays/tensors and apply vectorized operations. EXLA can JIT compile these computations for CPU/GPU acceleration.

## Basic Tensor Operations

```elixir
x = Nx.tensor([[1.0, 2.0], [3.0, 4.0]])
y = Nx.tensor([[10.0, 20.0], [30.0, 40.0]])

sum = Nx.add(x, y)
mean = Nx.mean(sum)
```

This style is concise and typically faster than explicit loops for large data.

## JIT Compilation with EXLA

```elixir
defn normalize(x) do
  (x - Nx.mean(x)) / Nx.standard_deviation(x)
end

compiled = EXLA.jit(&normalize/1)
result = compiled.(Nx.tensor([1.0, 2.0, 3.0, 4.0]))
```

Use JIT for stable computation graphs that run repeatedly.

## Practical Use Cases

- feature engineering and preprocessing,
- scoring models in request or batch paths,
- anomaly detection pipelines,
- scientific and optimization workloads.

## Integration Guidance

- Keep tensor-heavy code isolated in modules with clear APIs.
- Convert to native Elixir structures only at boundaries.
- Validate tensor shapes at entry points.
- Benchmark with realistic input sizes.

{{% compare %}}
```python
# NumPy/JAX style numerical stack
# Mature tensor ecosystem with vectorized operations + JIT options.
```

```javascript
// TensorFlow.js style model execution
// Browser/server numerical operations with tensors.
```

```elixir
# Nx + EXLA
# Tensor programming in Elixir with optional JIT acceleration.
```
{{% /compare %}}

## Common Mistakes

- Converting tensors back to lists too early.
- Ignoring shape mismatches until runtime.
- Assuming JIT helps tiny one-off calculations.

## Exercise

{{< exercise title="Vectorized Feature Pipeline" >}}
Build a feature-preprocessing module:

1. Accept a tensor of numeric records.
2. Compute per-column mean/std and normalize.
3. Add clipping for outliers.
4. JIT compile the normalization path.
5. Benchmark JIT vs non-JIT for realistic batch sizes.
{{< /exercise >}}

## FAQ and Troubleshooting

### Why is JIT slower in my benchmark?
Compilation has upfront cost. For small or one-off workloads, non-JIT can be faster. Benchmark warmed-up runs with representative input sizes.

### Why do I get shape errors?
Tensor operations require compatible dimensions. Log and assert shapes at boundaries before running transformations.

### Should I move all data code to Nx?
No. Use Nx where numerical/vectorized workloads dominate. Keep non-numeric business logic in regular Elixir data structures.
