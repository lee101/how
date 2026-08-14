---
title: Triton vs TensorRT vs ONNX Runtime - ML Inference Optimization Compared
date: 2026-03-23 12:00:00
tags: [python, cuda, triton, tensorrt, onnx, machine-learning, gpu, inference]
---

# Triton vs TensorRT vs ONNX Runtime - ML Inference Optimization Compared

In the [CuteDSL post](/2026/03/23/cutedsl-accelerated-ml-inference-triton-cuda-kernels/) we used OpenAI Triton to fuse GPU kernels and hit 24x speedups on time series inference. But Triton is just one tool in the inference optimization stack. TensorRT and ONNX Runtime solve overlapping but different problems. Here's when to use each.

<!-- more -->

## What Each Tool Actually Is

These three tools operate at different levels of the stack, and understanding that is key to picking the right one.

**OpenAI Triton** is a Python DSL for writing GPU kernels. You write blocked programs in Python that compile down to PTX/AMDGPU IR. It replaces hand-written CUDA for custom operations -- attention, normalization, activation fusions. It's what powers `torch.compile` under the hood and what [CuteDSL](https://github.com/lee101/cutedsl) uses for its fused kernels.

**NVIDIA TensorRT** (currently v10.16) is a graph-level inference optimizer. You feed it an ONNX graph or TorchScript model, and it performs layer fusion, kernel auto-tuning, precision calibration (FP16/INT8/FP4), and memory planning. It outputs an optimized engine file tuned for a specific GPU. Think of it as a compiler for entire neural networks.

**ONNX Runtime** (currently v1.24) is a cross-platform inference engine. It loads ONNX models and dispatches them to execution providers -- CUDA, TensorRT, OpenVINO, CoreML, DirectML, QNN, or plain CPU. It's the Swiss army knife: runs everywhere, integrates with everything, optimizes reasonably well.

## Feature Comparison

| Feature | Triton | TensorRT | ONNX Runtime |
|---|---|---|---|
| **What it is** | GPU kernel DSL | Graph optimizer/runtime | Cross-platform inference engine |
| **Integration effort** | High -- write kernels | Medium -- export + optimize | Low -- export to ONNX |
| **Hardware support** | NVIDIA + AMD GPUs | NVIDIA GPUs only | CPU, NVIDIA, AMD, Intel, Qualcomm, Apple |
| **Customization** | Total control | Limited to supported ops | Medium (custom ops, EPs) |
| **Quantization** | Manual | INT8, FP16, FP8, FP4 | INT8, FP16 (via provider) |
| **Cross-platform** | No | No | Yes |
| **Typical speedup** | 2-24x (kernel-level) | 2-8x (graph-level) | 1.5-5x (vs naive PyTorch) |
| **Learning curve** | Steep -- GPU programming | Medium -- toolchain setup | Gentle -- standard APIs |
| **Model coverage** | Any op you write | Standard architectures | Broad ONNX op coverage |

## When to Use Triton

Use Triton when you need custom GPU kernels that don't exist in standard libraries.

- **Novel architectures** where standard fusions don't apply
- **Research** where you're iterating on kernel implementations
- **Kernel fusion** across operations the framework can't fuse automatically (CuteDSL's fused RMS norm + QKV projection is a good example)
- **When `torch.compile` isn't enough** and you need hand-tuned kernels

Triton's killer feature is accessibility. Writing a fused attention kernel in Triton is maybe 100 lines of Python. The equivalent CUDA is 500+ lines of C++ with manual shared memory management.

```python
@triton.jit
def fused_rms_norm_kernel(X, W, Out, stride, N, eps,
                          BLOCK: tl.constexpr):
    row = tl.program_id(0)
    cols = tl.arange(0, BLOCK)
    x = tl.load(X + row * stride + cols, mask=cols < N)
    var = tl.sum(x * x, axis=0) / N
    x_norm = x / tl.sqrt(var + eps)
    w = tl.load(W + cols, mask=cols < N)
    tl.store(Out + row * stride + cols, x_norm * w, mask=cols < N)
```

The downside: Triton is NVIDIA + AMD only, requires GPU programming knowledge, and you own the maintenance burden.

## When to Use TensorRT

Use TensorRT when you're deploying standard model architectures on NVIDIA GPUs and want maximum throughput with minimum effort.

- **Production deployment** of transformers, CNNs, detection models
- **Automatic INT8/FP16 quantization** with calibration
- **LLM serving** via TensorRT-LLM (up to 8x faster inference, 40x latency reduction with in-flight batching)
- **When you don't want to write kernels** but need near-optimal performance

TensorRT excels at standard architectures. It knows how to fuse Conv+BN+ReLU, multi-head attention, and dozens of common patterns. For a ResNet or BERT, it will get you 80-90% of the theoretical peak with a few lines of code:

```python
import tensorrt as trt

logger = trt.Logger(trt.Logger.WARNING)
builder = trt.Builder(logger)
network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
parser = trt.OnnxParser(network, logger)
parser.parse_from_file("model.onnx")

config = builder.create_builder_config()
config.set_flag(trt.BuilderFlag.FP16)
engine = builder.build_serialized_network(network, config)
```

The downside: NVIDIA-only, long build times (minutes to hours for large models), engine files are GPU-architecture-specific, and custom ops require plugins.

## When to Use ONNX Runtime

Use ONNX Runtime when you need to run inference across different hardware or want a simple deployment path.

- **Cross-platform deployment** -- same model on NVIDIA, AMD, Intel, Apple, Qualcomm, or CPU
- **Edge/mobile** -- CoreML EP on iOS, NNAPI/QNN on Android
- **CPU inference** -- surprisingly fast with graph optimizations and SIMD, up to 9x faster than naive setups
- **Multi-framework support** -- models from PyTorch, TensorFlow, JAX all go through ONNX
- **When you need "good enough" performance everywhere** rather than peak performance on one target

```python
import onnxruntime as ort

session = ort.InferenceSession("model.onnx", providers=[
    "TensorrtExecutionProvider",  # try TensorRT first
    "CUDAExecutionProvider",      # fall back to CUDA
    "CPUExecutionProvider",       # fall back to CPU
])
result = session.run(None, {"input": input_array})
```

GPU inference with ONNX Runtime is roughly 12-14x faster than CPU for typical workloads, and the TensorRT execution provider gives you TensorRT's optimizations through ONNX Runtime's API.

## Combining Them

These tools aren't mutually exclusive. The real power comes from combining them:

**ONNX Runtime + TensorRT**: Use ONNX Runtime with the TensorRT execution provider. You get TensorRT's graph optimizations with ONNX Runtime's deployment simplicity and fallback chain. Ops that TensorRT doesn't support fall back to CUDA or CPU automatically.

**Triton + torch.compile**: Write custom Triton kernels and let `torch.compile` handle the rest. This is what CuteDSL does -- hand-written Triton kernels for the hot path, torch.compile for CUDA graph capture and launch overhead elimination.

**Triton kernels as TensorRT plugins**: For production systems, you can wrap Triton-generated kernels as TensorRT custom plugins, getting the best of both worlds -- custom fused ops inside TensorRT's graph optimizer.

## Decision Flowchart

```
Need custom GPU kernels for novel ops?
  YES --> Triton
  NO  --> Is deployment NVIDIA-only?
            YES --> Is it a standard architecture (transformer, CNN)?
                      YES --> TensorRT (or TensorRT-LLM for LLMs)
                      NO  --> Triton for custom ops + TensorRT for the rest
            NO  --> Need to run on mobile/edge?
                      YES --> ONNX Runtime (CoreML/QNN/NNAPI EP)
                      NO  --> Need cross-platform (AMD/Intel/CPU)?
                                YES --> ONNX Runtime
                                NO  --> ONNX Runtime + TensorRT EP
```

For most teams: start with ONNX Runtime for its simplicity, add TensorRT EP when you need more GPU performance, and reach for Triton only when you need custom kernels that nothing else can provide.

## Final Thoughts

The inference optimization landscape is maturing. TensorRT 10.16 now supports FP4 quantization and has 1.5x faster compilation. ONNX Runtime 1.24 runs on practically every accelerator. Triton works on both NVIDIA and AMD GPUs and is the backbone of PyTorch's compiler stack.

For the CuteDSL approach -- where we wrote custom Triton kernels to fuse entire operation sequences -- the 24x speedup justified the engineering investment. But that level of optimization only makes sense when you've exhausted what TensorRT and ONNX Runtime can do automatically.

Pick the right tool for your constraint: Triton for control, TensorRT for peak NVIDIA performance, ONNX Runtime for portability.

- CuteDSL: [github.com/lee101/cutedsl](https://github.com/lee101/cutedsl)
- CuteDSL post: [Accelerating ML Inference with Fused Triton and CUDA Kernels](/2026/03/23/cutedsl-accelerated-ml-inference-triton-cuda-kernels/)
