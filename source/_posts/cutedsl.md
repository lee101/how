---
title: CuteDSL - Accelerating ML Inference with Fused Triton and CUDA Kernels
date: 2026-03-23 10:00:00
tags: [Python, CUDA, Triton, Machine Learning, GPU, Inference, Optimization]
---

# CuteDSL - Accelerating ML Inference with Fused Triton and CUDA Kernels

Production ML inference is bottlenecked by memory bandwidth, not compute. Every PyTorch operation launches a separate GPU kernel, allocates intermediate tensors, and round-trips through global memory. [CuteDSL](https://github.com/lee101/cutedsl) fixes this by fusing multiple operations into single Triton/CUDA kernels -- delivering up to 24x speedups while maintaining output equivalence.

## The Problem

A standard transformer forward pass is death by a thousand cuts. RMS norm writes a normalized tensor to global memory, then the next linear layer reads it back. Multiply that by 12 layers, add attention, MLP, preprocessing, and postprocessing -- you get dozens of unnecessary memory round-trips per inference call.

## Kernel Fusion

The core idea: combine multiple sequential operations into a single GPU kernel. Instead of launching separate kernels for RMS norm, then Q/K/V projection, CuteDSL fuses them so the normalized values never leave registers.

| Kernel | Fused Operations |
|---|---|
| `unscaled_attention` | QK^T + mask + softmax + V multiply |
| `rms_layernorm` | T5-style RMS norm (FP32 variance) |
| `rope` | inv_freq + cos/sin + Q/K rotation |
| `fused_rms_norm_linear` | RMS LayerNorm + linear projection |
| `fused_rms_norm_qkv` | RMS LayerNorm + Q/K/V projections |
| `fused_mlp_relu` | Two-layer MLP (linear + relu + linear) |
| `fused_preprocess` | NaN-aware normalize + arcsinh + patch + time encoding |
| `fused_output_transform` | Rearrange + sinh + unscale |

Each kernel eliminates intermediate tensor allocations and reduces global memory traffic.

## CuteChronos2: 24x Faster Time Series Forecasting

The first model is [Amazon Chronos-2](https://github.com/amazon-science/chronos-forecasting), a state-of-the-art time series forecasting model. CuteChronos2 is a from-scratch reimplementation with custom Triton kernels for every major operation, plus C++/CUDA preprocessing kernels for NaN-aware normalization and patching.

### Benchmarks

On an RTX 5090 with Chronos-2 base (768 d_model, 12 layers), batch=1, length=512:

| Implementation | Latency (ms) | Speedup |
|---|---|---|
| Original Chronos2Pipeline | 30.9 | baseline |
| CuteChronos2 (eager) | 24.0 | **1.3x** |
| CuteChronos2 (torch.compile) | 1.3 | **24.4x** |

Output equivalence maintained throughout: max absolute error < 1e-4.

The compiled mode uses `torch.compile(mode="reduce-overhead")` which captures CUDA graphs for near-zero kernel launch overhead.

### Usage

Drop-in replacement API matching HuggingFace upstream:

```python
import torch
from cutechronos.model import CuteChronos2Model

model = CuteChronos2Model.from_pretrained("amazon/chronos-bolt-base")
model = model.to("cuda", torch.bfloat16)

context = torch.randn(1, 512, device="cuda")
with torch.inference_mode():
    quantile_preds = model(context)
```

For maximum performance with torch.compile:

```python
model = CuteChronos2Model.from_pretrained_compiled(
    "amazon/chronos-bolt-base",
    compile_mode="reduce-overhead",
)
```

There's also a pipeline API that handles variable-length batching:

```python
from cutechronos.pipeline import CuteChronos2Pipeline

pipe = CuteChronos2Pipeline.from_pretrained(
    "amazon/chronos-bolt-base",
    device="cuda",
    dtype=torch.bfloat16,
)
predictions = pipe.predict(torch.randn(512), prediction_length=30)
```

## CuteZImage: Accelerated Text-to-Image

The second model is [Z-Image Turbo](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo), a fast text-to-image diffusion model. CuteZImage reimplements the transformer backbone (30 main layers + 2 refiner layers, dim=3840, 30 heads) with:

- **Fused SiLU-gated FFN** -- eliminates the 10240-wide intermediate allocation
- **Fused AdaLN + RMS Norm** -- timestep conditioning fused with normalization
- **Complex-valued RoPE kernel** -- fused reshape + complex multiply + flatten for multi-axis rotations
- **from_diffusers() weight loading** -- load directly from any HuggingFace Z-Image checkpoint

## Design Philosophy

CuteDSL provides pure PyTorch fallbacks for every fused kernel, so models run on CPU without Triton. On GPU, kernels are swapped in transparently. No vendor lock-in -- if a kernel doesn't load, the fallback activates silently.

## Autoresearch Bots

Much of this work is driven by automated research bots. They profile models, identify fusion opportunities, generate candidate Triton kernels, and validate output equivalence -- all while maintaining eval metrics. The bots search the space of possible kernel fusions and keep what works. CuteDSL's kernel fusion approach has been particularly effective as a target for this automated optimization pipeline.

## Links

- GitHub: [github.com/lee101/cutedsl](https://github.com/lee101/cutedsl)
