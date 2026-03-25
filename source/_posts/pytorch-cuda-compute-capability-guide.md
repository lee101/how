title: PyTorch CUDA Compute Capability - Why is_available() Isn't Enough
date: 2026-03-25 10:00:00
tags: [python, pytorch, cuda, gpu, machine-learning]
---

# PyTorch CUDA Compute Capability - Why is_available() Isn't Enough

You plug in a shiny new RTX 5090, install PyTorch, run `torch.cuda.is_available()`, get `True`, and then your training script crashes with a cryptic CUDA error. The problem: PyTorch's CUDA availability check only verifies that a CUDA driver exists. It says nothing about whether the installed PyTorch binary actually ships kernels for your GPU's architecture.

<!-- more -->

## What is Compute Capability?

Every NVIDIA GPU has a **compute capability** version, expressed as `sm_XY` (streaming multiprocessor major.minor). This version determines which instructions and features the GPU supports.

| Generation | Architecture | Compute Capability | Example GPUs |
|---|---|---|---|
| Pascal | sm_60, sm_61 | 6.x | GTX 1080, Tesla P100 |
| Volta | sm_70 | 7.0 | Tesla V100 |
| Turing | sm_75 | 7.5 | RTX 2080 |
| Ampere | sm_80, sm_86 | 8.x | RTX 3090, A100 |
| Hopper | sm_90 | 9.0 | H100 |
| Blackwell | sm_120 | 12.0 | RTX 5090, B200 |

When PyTorch is compiled, it bundles pre-compiled CUDA kernels (cubins) for a specific set of these architectures. If your GPU's `sm_` version isn't in that set, those kernels can't run on your hardware.

## Why `torch.cuda.is_available()` Lies

Here's what `torch.cuda.is_available()` actually checks:

1. Is the CUDA runtime library loadable?
2. Does the NVIDIA driver report at least one CUDA-capable device?

That's it. It does **not** check whether PyTorch was compiled with kernels matching your GPU's architecture. So you get `True` on an RTX 5090 running PyTorch 2.5 -- but the moment you try to run a CUDA kernel, it fails because PyTorch 2.5 only ships kernels up to `sm_90`.

The typical error looks something like:

```
CUDA error: no kernel image is available for execution on the device
```

Or worse, a silent fallback to incorrect behavior.

## The Proper Check

Here's a robust pattern that verifies actual architecture compatibility before committing to CUDA:

```python
device = "cpu"
if torch.cuda.is_available():
    try:
        major, minor = torch.cuda.get_device_capability(0)
        supported = [
            int(s.split("_")[1])
            for s in torch.cuda.get_arch_list()
            if s.startswith("sm_")
        ]
        if supported and (major * 10 + minor) <= max(supported):
            device = "cuda"
    except Exception:
        pass
```

What this does:

1. **`torch.cuda.get_device_capability(0)`** returns the `(major, minor)` compute capability of GPU 0. For an RTX 5090, that's `(12, 0)`.
2. **`torch.cuda.get_arch_list()`** returns the list of architectures this PyTorch build was compiled for, e.g. `['sm_50', 'sm_60', 'sm_70', 'sm_75', 'sm_80', 'sm_86', 'sm_90']`.
3. We convert the GPU's capability to a single number (`120` for sm_120) and check if it falls within the supported range.
4. If the GPU is too new (or too old) for this build, we fall back to CPU.

## `torch.cuda.get_arch_list()` -- What It Returns

This function is the key to the whole check. It returns the list of SM architectures baked into the PyTorch binary at compile time.

For PyTorch 2.8 stable with CUDA 12.6:
```python
>>> torch.cuda.get_arch_list()
['sm_50', 'sm_60', 'sm_61', 'sm_70', 'sm_75', 'sm_80', 'sm_86', 'sm_90']
```

For PyTorch nightly with CUDA 12.8 (Blackwell support):
```python
>>> torch.cuda.get_arch_list()
['sm_50', 'sm_60', 'sm_61', 'sm_70', 'sm_75', 'sm_80', 'sm_86', 'sm_90', 'sm_120']
```

If `sm_120` isn't in the list, your RTX 5090 won't work. Period.

## Common Scenarios

**New GPU, old PyTorch**: The RTX 5090 (sm_120) with PyTorch 2.5 is the textbook case. `is_available()` returns True, but no kernels exist for Blackwell. You need at minimum a PyTorch nightly built with CUDA 12.8, or wait for a stable release with sm_120 support.

**Old GPU, new PyTorch**: PyTorch periodically drops support for older architectures. Maxwell (sm_50/sm_52) support was dropped in some recent builds. If you're running a GTX 900 series, check the arch list before assuming CUDA will work.

**Mismatched CUDA toolkit**: Even if the architecture is in the list, the CUDA toolkit version matters. Blackwell requires CUDA 12.8+. Running an older toolkit against a new driver can cause subtle failures.

## How Other Frameworks Handle This

| | PyTorch | TensorFlow | JAX/XLA |
|---|---|---|---|
| **Arch check at startup** | No -- `is_available()` checks driver only | No -- similar gap | Partial -- checks compute capability |
| **PTX fallback** | No -- requires exact cubin match | Yes -- JIT compiles PTX at first run (can take 30+ min) | Uses XLA compilation |
| **New GPU support** | Needs new build with arch in compile flags | Can work via PTX JIT but with performance penalty | Requires matching jaxlib build |
| **Error quality** | Cryptic CUDA errors at kernel launch | Warning about missing cubins, then slow JIT | Clearer error about unsupported device |

**TensorFlow** takes a different approach: it ships PTX (an intermediate representation) alongside compiled cubins. When it encounters an unknown architecture, the CUDA runtime JIT-compiles the PTX to native code. This means TensorFlow often "just works" on new GPUs -- but the first run can take 30+ minutes while kernels compile, and the JIT-compiled code may not exploit new architectural features.

**JAX** via XLA compiles kernels on-the-fly for the target GPU. On CUDA 12, JAX supports sm_52 (Maxwell) and newer. On CUDA 13, the minimum is sm_75 (Turing). JAX exposes compute capability via `jax.devices()[0].compute_capability`, which is cleaner than PyTorch's approach but still requires the right jaxlib build.

PyTorch's model of shipping only pre-compiled cubins with no PTX fallback makes it the most brittle of the three when it comes to new GPU launches. The upside is predictable performance -- you never pay a surprise JIT compilation tax.

## Practical Recommendations

**1. Always check the arch list, not just availability:**

```python
def get_torch_device():
    if not torch.cuda.is_available():
        return "cpu"
    try:
        major, minor = torch.cuda.get_device_capability(0)
        supported = [
            int(s.split("_")[1])
            for s in torch.cuda.get_arch_list()
            if s.startswith("sm_")
        ]
        if supported and (major * 10 + minor) <= max(supported):
            return "cuda"
    except Exception:
        pass
    return "cpu"
```

**2. Pin PyTorch versions in production.** New releases can drop old architectures. Lock your `torch` version and test GPU compatibility in CI.

**3. Log what you detect.** When debugging GPU issues, print the capability and arch list upfront:

```python
if torch.cuda.is_available():
    cap = torch.cuda.get_device_capability(0)
    archs = torch.cuda.get_arch_list()
    print(f"GPU capability: sm_{cap[0]}{cap[1]}, supported: {archs}")
```

**4. For bleeding-edge GPUs, use nightlies.** New architectures land in PyTorch nightly builds weeks or months before stable releases. Install with:

```bash
pip install --pre torch --index-url https://download.pytorch.org/whl/nightly/cu128
```

**5. Consider TensorFlow or JAX if you frequently swap GPUs.** TensorFlow's PTX fallback and JAX's XLA compilation are more forgiving for heterogeneous GPU environments.

## Final Thoughts

`torch.cuda.is_available()` is one of the most misleading functions in the PyTorch API. It answers a question nobody is really asking ("is there a CUDA driver?") and ignores the question everyone actually cares about ("will my code run on this GPU?"). Until PyTorch improves this check upstream, the compute capability validation pattern above is essential for any code that needs to handle GPU compatibility gracefully.
