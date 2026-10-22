---
title: RTX 5090 for Machine Learning - Benchmarks, Compatibility, and GPU Comparison
date: 2026-03-25 11:00:00
tags: [gpu, nvidia, rtx-5090, machine-learning, cuda, benchmarks]
---

The RTX 5090 is NVIDIA's Blackwell-architecture consumer flagship -- 21,760 CUDA cores, 32GB GDDR7, and 209.5 FP16/BF16 TFLOPS for $1,999 MSRP. It is the most powerful consumer GPU ever released for machine learning workloads. But raw specs don't tell the whole story: framework compatibility issues, VRAM limitations vs datacenter cards, and wild street pricing all factor into whether it's the right pick for your ML workflow.

<!-- more -->

## Specs Comparison

| Spec | RTX 5090 | H100 SXM | A100 80GB | RTX 4090 | RTX 3090 |
|---|---|---|---|---|---|
| Architecture | Blackwell | Hopper | Ampere | Ada Lovelace | Ampere |
| CUDA Cores | 21,760 | 16,896 | 6,912 | 16,384 | 10,496 |
| Tensor Cores | 680 (5th gen) | 528 (4th gen) | 432 (3rd gen) | 512 (4th gen) | 328 (3rd gen) |
| VRAM | 32GB GDDR7 | 80GB HBM3 | 80GB HBM2e | 24GB GDDR6X | 24GB GDDR6X |
| Memory BW | 1,792 GB/s | 3,350 GB/s | 2,039 GB/s | 1,008 GB/s | 936 GB/s |
| FP16/BF16 | 209.5 TFLOPS | 989 TFLOPS* | 312 TFLOPS | 165 TFLOPS | 71 TFLOPS |
| FP32 | 104.8 TFLOPS | 67 TFLOPS | 19.5 TFLOPS | 82.6 TFLOPS | 35.6 TFLOPS |
| TDP | 575W | 700W | 400W | 450W | 350W |
| MSRP / List | $1,999 | ~$30,000 | ~$15,000 | $1,599 | $1,499 (launch) |

*H100 FP16 with sparsity via Transformer Engine.

The standout numbers: 1,792 GB/s memory bandwidth (78% over the 4090) and 32GB VRAM. For memory-bound LLM inference, bandwidth matters more than raw TFLOPS, and the 5090 closes the gap with datacenter cards significantly.

## Training Performance

For LLM fine-tuning, the RTX 5090 achieves approximately 720 tokens/sec training throughput on Mistral 7B with QLoRA INT4. The 5th-gen Tensor Cores with native FP4/FP8 support deliver meaningful speedups in mixed-precision training compared to the 4090's FP8-only support.

Practical training results:

- **QLoRA/LoRA fine-tuning of 7B-13B models**: Fits comfortably in 32GB. The 4090 can handle 7B QLoRA but struggles with 13B at reasonable batch sizes.
- **Diffusion model training**: 38 img/min on SDXL (1024x1024, 20 steps) -- a 36% improvement over the 4090. Flux.1 Dev FP8 hits ~23 img/min.
- **Upgrading from RTX 3090**: Expect roughly 2x throughput across most training workloads, with higher gains on tasks that benefit from FP4/FP8 precision.
- **vs A100/H100 for training**: Datacenter cards still win for large-scale distributed training due to NVLink/NVSwitch interconnects and 80GB VRAM. You can't replace an 8xH100 node with 8x5090s -- PCIe bandwidth and lack of NVLink kill multi-GPU scaling.

The 32GB VRAM is the real upgrade over the 4090 for training. Full fine-tuning of 7B models, which required aggressive gradient checkpointing on 24GB cards, runs with more comfortable batch sizes on the 5090.

## Inference Performance

This is where the 5090 punches way above its price class.

- **LLM inference (Ollama)**: 213 tokens/sec on the 5090 vs 144 tok/s on H100 and 138 tok/s on A100 for medium-sized models. The 5090 achieved 5,841 tokens/sec at 1024 tokens with batch size 8, outperforming the A100 by 2.6x.
- **Dual RTX 5090 vs H100**: Two 5090s deliver ~27 tok/s eval rate on 70B models, matching single H100 speeds at a fraction of the cost.
- **Time-to-first-token**: 84% faster than the A100 -- the GDDR7 bandwidth advantage is real for prefill-heavy workloads.
- **Small model throughput**: Qwen2-0.5B hits 65,000 tokens/sec with concurrent requests. Phi-3-mini-4k-instruct achieves 6,400 tok/s.

For single-GPU inference serving of 7B-32B parameter models, the 5090 is arguably the best GPU available at any price point. The combination of high bandwidth GDDR7 and 5th-gen Tensor Cores gives it an edge over even datacenter cards for latency-sensitive serving. We benchmarked custom [CuteDSL fused Triton kernels](/2026/03/23/cutedsl-accelerated-ml-inference-triton-cuda-kernels/) on the 5090 and saw 24x speedups on time series inference with torch.compile -- the new architecture responds very well to kernel fusion.

## The Compatibility Problem

Here is the catch. The RTX 5090 uses compute capability `sm_120` (Blackwell), and as of March 2026, PyTorch stable releases still have incomplete support. If you install PyTorch from pip the standard way, you'll likely hit:

```
RuntimeError: CUDA error: no kernel image is available for execution on the device
```

This means the installed PyTorch binary wasn't compiled with sm_120 kernels. The situation:

- **PyTorch 2.6**: No sm_120 support.
- **PyTorch 2.7**: Partial sm_120 support announced, but not all platforms/configs work reliably.
- **Nightly builds** (2.10.0.dev + CUDA 12.9): Detect sm_120 but can be unstable.
- **Building from source**: Works with `TORCH_CUDA_ARCH_LIST="12.0"` but is painful.
- **NVIDIA NGC containers**: The most reliable path -- NVIDIA's optimized PyTorch containers are tuned for Blackwell.

**Recommendation**: Use NVIDIA's NGC PyTorch containers or nightly builds. Don't expect `pip install torch` to just work on a 5090 yet. TensorFlow has similar gaps. vLLM and llama.cpp added Blackwell support faster than the major frameworks.

This is a recurring pattern -- the RTX 3090 had similar issues at launch with sm_86. It resolves within 6-12 months, but early adopters pay the tax.

## VRAM: 32GB and What It Enables

The jump from 24GB (4090) to 32GB (5090) unlocks specific workflows:

- **Llama 3.1 8B at FP16**: Fits in 32GB with room for KV cache. Tight squeeze on 24GB.
- **13B model QLoRA**: Comfortable on 32GB, marginal on 24GB.
- **70B quantized (Q4)**: Runs on a single 5090. Not possible on 24GB cards.
- **SDXL training at 1024x1024**: Larger batch sizes without gradient checkpointing tricks.
- **Longer context windows**: More KV cache budget for serving long-context models.

But 32GB is still not 80GB. You cannot run 70B FP16, train 30B+ models without heavy quantization, or serve multiple concurrent large models. For those workloads, the A100 80GB and H100 80GB remain necessary.

## Price-Performance Analysis

The economics have gotten complicated. MSRP is $1,999 but street prices in March 2026 range from $2,900 to $5,000+ depending on model and availability.

At MSRP ($1,999):
- **5090 vs A100 80GB (~$15,000)**: The 5090 matches or beats the A100 in single-GPU inference at 13% of the price. Best value in ML hardware if you can find one at MSRP.
- **5090 vs H100 (~$30,000)**: For inference of models that fit in 32GB, the 5090 is competitive at 7% of the price.
- **5090 vs 4090 ($2,200+ used)**: 33% more VRAM, 78% more bandwidth, ~40% faster across most workloads. Worth it if you're buying new.

At street price ($3,500+):
- The value proposition weakens significantly. A used RTX 4090 at $1,500-1,800 delivers better price-performance for workloads that fit in 24GB.
- Cloud H100 instances at $2-3/hr may be cheaper for bursty training workloads.

## When to Pick Each GPU

**RTX 5090** -- You're running inference or fine-tuning models up to 32B parameters. You want the fastest single-GPU consumer card and can handle framework compatibility headaches. Best for: local LLM serving, diffusion model inference, QLoRA fine-tuning up to 13B.

**H100** -- You're training large models (30B+), need multi-GPU NVLink scaling, or require 80GB VRAM for large batch training. The only real choice for serious distributed training. Best for: pre-training, large-scale fine-tuning, production inference clusters.

**A100 80GB** -- Budget datacenter option. Still excellent for workloads that need 80GB VRAM but don't need Hopper's Transformer Engine. Prices are falling as H100 supply improves. Best for: memory-bound training, multi-instance serving.

**RTX 4090** -- Best value pick if you find one at $1,500-1,800 used. 24GB handles most 7B model workloads. Full PyTorch/CUDA ecosystem support with zero compatibility issues. Best for: budget ML workstation, 7B model fine-tuning and inference.

**RTX 3090** -- The budget king at $600-800 used. Same 24GB VRAM as the 4090 at half the performance. Good enough for inference and light fine-tuning. Best for: entry-level ML, inference-only workloads on a budget.

## Final Thoughts

The RTX 5090 is the most capable consumer GPU for ML ever released. The 32GB GDDR7 at 1,792 GB/s bandwidth makes it competitive with datacenter cards for single-GPU workloads, and the inference benchmarks are genuinely impressive -- matching or beating an A100 at a fraction of the cost.

The two real downsides are framework compatibility (sm_120 support is still not seamless) and pricing (good luck finding one at MSRP). If you're building a new ML workstation today and can get one at a reasonable price, the 5090 is the clear pick. If you're budget-constrained, a used 4090 remains the sweet spot. And if you need 80GB VRAM or multi-GPU scaling, datacenter cards are still the only option.
