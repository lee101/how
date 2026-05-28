title: Librosa vs torchaudio vs scipy.signal vs Parselmouth - Audio Processing Compared
date: 2026-03-23 13:00:00
tags: [python, audio, librosa, torchaudio, scipy, parselmouth, machine-learning]
---

If you followed our [intro to audio processing with Librosa](/2026/02/01/audio-processing/), you know Librosa is a great starting point. But it is not the only game in town. Depending on whether you need GPU acceleration, low-level DSP control, or speech science tools, a different library might serve you better.

This post compares four Python audio processing libraries: **Librosa**, **torchaudio**, **scipy.signal**, and **Parselmouth**, with concrete feature tables, performance notes, and code snippets.

<!-- more -->

## The Contenders

**Librosa** (v0.11.0) -- Pure Python built on NumPy/SciPy. The de facto standard for audio analysis in research and prototyping. Rich API for spectral features, rhythm, and pitch. CPU-only.

**torchaudio** (v2.10.0) -- PyTorch-native audio processing. First-class GPU support, batch processing, and tight integration with PyTorch training loops. Supports TorchScript compilation.

**scipy.signal** -- Part of SciPy. Low-level DSP primitives: filters, spectrograms, convolutions, window functions. No audio-specific convenience functions, but fast and dependency-light.

**Parselmouth** (v0.4.7) -- Python wrapper around Praat, the gold standard in phonetics research. Gives you Praat's battle-tested pitch tracking, formant analysis, and intensity measurements from Python.

## Feature Comparison

| Feature | Librosa | torchaudio | scipy.signal | Parselmouth |
|---|---|---|---|---|
| Mel spectrogram | Yes | Yes | Manual | No |
| MFCC | Yes | Yes | No | No |
| GPU support | No | Yes | No | No |
| Batch processing | No | Yes | No | No |
| Pitch tracking | Yes (pyin) | Yes (detect_pitch_frequency) | No | Yes (Praat algorithms) |
| Formant analysis | No | No | No | Yes |
| Tempo/beat tracking | Yes | No | No | No |
| Filter design | No | No | Yes | No |
| Arbitrary convolution | No | Yes (via PyTorch) | Yes | No |
| Real-time capable | Limited | Yes (with TorchScript) | Yes | No |
| Install size | ~20 MB | ~200 MB+ (with PyTorch) | Part of SciPy | ~15 MB |

## Performance: Batch Mel Spectrogram

The practical question: how fast can each library compute mel spectrograms across a batch of audio files?

**Librosa** processes files sequentially on CPU. It uses SciPy's FFT backend (as of v0.11.0, switched from NumPy FFT to SciPy FFT). For a single file it is fast enough, but it does not parallelize across a batch natively.

**torchaudio** on CPU is already competitive with or slightly faster than Librosa thanks to MKL-backed FFT. On GPU, the story changes dramatically. Batched mel spectrogram computation on a modern GPU (e.g., A100) can process hundreds of files in the time Librosa handles one. The key advantage is not just raw speed but native batch dimension support -- you can feed a `(batch, samples)` tensor directly.

**scipy.signal** can compute a spectrogram via `scipy.signal.spectrogram`, but building a full mel spectrogram requires you to manually construct mel filter banks and apply them. Performance of the raw STFT is competitive with Librosa since Librosa delegates to SciPy under the hood.

**Parselmouth** is not designed for spectrogram batch processing. Its strength is per-file acoustic analysis where Praat's algorithms (autocorrelation-based pitch, LPC formants) are the most accurate tools available.

Rough relative timings for 100 files of 10s audio at 22050 Hz (single machine, CPU unless noted):

| Library | Relative Time | Notes |
|---|---|---|
| Librosa | 1.0x (baseline) | Sequential, CPU |
| torchaudio (CPU) | ~0.8x | MKL FFT, batched |
| torchaudio (GPU) | ~0.05x | Batched on A100 |
| scipy.signal (manual) | ~0.9x | Raw STFT only, no mel |

## When to Use Each

### Librosa: exploration and prototyping

Use Librosa when you are exploring a dataset, building a notebook, or need quick access to a wide range of audio features (chroma, tempogram, harmonic-percussive separation). Its API is well-designed and extensively documented. If you are not training a model and just need to analyze audio, Librosa is the right default.

### torchaudio: PyTorch training pipelines

If your audio features feed into a PyTorch model, torchaudio eliminates the CPU-GPU data transfer bottleneck. Compute spectrograms on GPU, in batch, as part of your `Dataset`/`DataLoader` pipeline. It also supports on-the-fly augmentation (time stretch, frequency masking) that integrates with SpecAugment-style training.

### scipy.signal: custom DSP

When you need bandpass filters, IIR/FIR filter design, resampling with precise control, or convolution with custom kernels, scipy.signal is the right tool. It does not know what a "mel" is, but it gives you the building blocks to implement anything.

### Parselmouth: speech science

For phonetics research, voice quality analysis, or any task where you need formant frequencies, jitter, shimmer, or HNR (harmonics-to-noise ratio), Parselmouth is unmatched. It wraps Praat's algorithms exactly, so your results are directly comparable to published phonetics literature.

## Code Comparison: Mel Spectrogram

### Librosa

```python
import librosa
import numpy as np

y, sr = librosa.load("audio.wav", sr=22050)
mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, n_fft=2048, hop_length=512)
log_mel = librosa.power_to_db(mel, ref=np.max)
```

### torchaudio

```python
import torchaudio
import torchaudio.transforms as T

waveform, sr = torchaudio.load("audio.wav")
mel_transform = T.MelSpectrogram(sample_rate=sr, n_mels=128, n_fft=2048, hop_length=512)
mel = mel_transform(waveform)  # supports batched input
log_mel = T.AmplitudeToDB()(mel)
```

### scipy.signal

```python
import numpy as np
from scipy.signal import stft
from scipy.io import wavfile

sr, y = wavfile.read("audio.wav")
y = y.astype(np.float32) / 32768.0
_, _, Zxx = stft(y, fs=sr, nperseg=2048, noverlap=2048 - 512)
power = np.abs(Zxx) ** 2

# Build mel filterbank manually
def mel_filterbank(sr, n_fft, n_mels):
    fmin, fmax = 0, sr / 2
    mel_min = 2595 * np.log10(1 + fmin / 700)
    mel_max = 2595 * np.log10(1 + fmax / 700)
    mel_points = np.linspace(mel_min, mel_max, n_mels + 2)
    hz_points = 700 * (10 ** (mel_points / 2595) - 1)
    bins = np.floor((n_fft + 1) * hz_points / sr).astype(int)
    fb = np.zeros((n_mels, n_fft // 2 + 1))
    for i in range(n_mels):
        fb[i, bins[i]:bins[i+1]] = np.linspace(0, 1, bins[i+1] - bins[i])
        fb[i, bins[i+1]:bins[i+2]] = np.linspace(1, 0, bins[i+2] - bins[i+1])
    return fb

fb = mel_filterbank(sr, 2048, 128)
mel = fb @ power
log_mel = 10 * np.log10(mel + 1e-10)
```

### Parselmouth (approximation)

```python
import parselmouth
import numpy as np

snd = parselmouth.Sound("audio.wav")
spec = snd.to_spectrogram(window_length=0.093, time_step=0.023)
# Parselmouth does not natively produce mel spectrograms.
# Use it for pitch/formant analysis instead:
pitch = snd.to_pitch()
formants = snd.to_formant_burg()
f1 = [formants.get_value_at_time(1, t) for t in pitch.xs()]
```

## Final Thoughts

There is no single best library. The right pick depends on your pipeline:

- **torchaudio** if you are training a model in PyTorch and need GPU speed. It is the performance winner for batch feature extraction.
- **Librosa** if you are doing exploratory analysis, need a wide feature set, or want the best documentation and community support.
- **Parselmouth** if you are doing speech science and need Praat-grade pitch tracking, formant extraction, or voice quality metrics.
- **scipy.signal** if you need raw DSP primitives and want minimal dependencies.

For many projects, you will end up using two or more of these together. Librosa for quick exploration, torchaudio for the training pipeline, and Parselmouth when you need ground-truth pitch. They complement each other well.
