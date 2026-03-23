title: CuteDSL - Accelerated ML Inference with Custom Triton and CUDA Kernels
date: 2026-03-23 10:00:00
tags: [python, cuda, triton, machine-learning, gpu, inference, optimization]
---

# CuteDSL - Accelerated ML Inference with Custom Triton and CUDA Kernels

[CuteDSL](https://github.com/lee101/cutedsl) converts popular ML models into optimized versions with fused operations, custom attention kernels, and reduced memory allocations -- all while maintaining output equivalence.

The goal is to build the fastest possible frontier model implementations and catalog them, much like the transformers/diffusers ecosystem. A lot of this is created by autoresearch-style bots that try to maintain evals while speeding up models -- fusing kernels with CuteDSL has been working well.

## CuteChronos2 -- 24x Faster Time Series Forecasting

The first target is [Amazon Chronos-2](https://github.com/amazon-science/chronos-forecasting), a state-of-the-art time series forecasting model. CuteChronos2 is a from-scratch reimplementation with custom Triton kernels for every major operation:

- **Unscaled tiled attention** (FlashAttention-style, avoids materializing the S*S attention matrix)
- **Fused RoPE** (inv_freq + cos/sin + Q/K rotation in one kernel)
- **Fused RMS LayerNorm + Linear** (eliminates normalized intermediate tensors)
- **Fused MLP** (two-layer MLP without materializing the 3072-wide hidden)
- **Fused preprocessing** (NaN-aware normalize + arcsinh + patch + time encoding)
- **C++/CUDA preprocessing** kernels for NaN-aware normalization and patching
- **torch.compile support** with `reduce-overhead` mode

### Benchmark Results

On an RTX 5090 with Chronos-2 base (768 d_model, 12 layers), batch=1, length=512:

| Implementation | Latency (ms) | Speedup |
|---|---|---|
| Original Chronos2Pipeline | 30.9 | baseline |
| CuteChronos2 (eager) | 24.0 | **1.3x** |
| CuteChronos2 (torch.compile) | 1.3 | **24.4x** |

The compiled mode uses `torch.compile(mode="reduce-overhead")` which captures CUDA graphs for near-zero kernel launch overhead.

### Quick Start

```bash
pip install uv
uv venv && source .venv/bin/activate
uv pip install -e .

# Convert and benchmark
python -m cutechronos.convert --benchmark --benchmark-compiled
```

```python
import torch
from cutechronos.model import CuteChronos2Model

model = CuteChronos2Model.from_pretrained_compiled(
    "amazon/chronos-bolt-base",
    compile_mode="reduce-overhead",
)
model = model.to("cuda", torch.bfloat16)

context = torch.randn(1, 512, device="cuda")
with torch.inference_mode():
    quantile_preds = model(context)  # (batch, 21_quantiles, prediction_length)
```

## CuteZImage -- Accelerated Text-to-Image

The second model is [Z-Image Turbo](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo), a fast text-to-image diffusion model. CuteZImage reimplements the transformer backbone with:

- **Fused SiLU-gated FFN** -- eliminates the 10240-wide intermediate allocation
- **Fused AdaLN + RMS Norm** -- timestep conditioning fused with normalization
- **Complex-valued RoPE kernel** -- fused reshape + complex multiply + flatten
- **from_diffusers() weight loading** -- load from any HuggingFace Z-Image checkpoint

Architecture: 30 main layers + 2 refiner layers, dim=3840, 30 heads, SiLU-gated FFN (hidden=10240).

## The Triton Kernel Approach

Each kernel fuses multiple PyTorch operations into a single GPU kernel launch, eliminating intermediate tensor allocations and memory bandwidth bottlenecks:

| Kernel | What it fuses |
|---|---|
| `unscaled_attention` | QK^T + mask + softmax + V multiply |
| `rms_layernorm` | T5-style RMS norm (FP32 variance) |
| `rope` | inv_freq + cos/sin + Q/K rotation |
| `fused_rms_norm_linear` | RMS LayerNorm + linear projection |
| `fused_mlp_relu` | Two-layer MLP (linear + relu + linear) |
| `fused_preprocess` | NaN-aware normalize + arcsinh + patch + time_enc |
| `fused_silu_gate_ffn` | SiLU + gating + FFN |
| `fused_adaln_norm` | AdaLN + RMS norm |

## Adding New Models

The pattern for accelerating any model:

1. Profile the original model to identify bottleneck operations
2. Write Triton kernels that fuse multiple operations
3. Create a model class that loads original weights and uses fused kernels
4. Validate output equivalence within tight tolerance (max abs error < 1e-4)
5. Benchmark to confirm speedup

Check out the project on GitHub: [github.com/lee101/cutedsl](https://github.com/lee101/cutedsl)
