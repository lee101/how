---
title: DictatorFlow - Cross-Platform Voice-to-Text in Zig
date: 2026-03-23 11:00:00
tags: [Zig, Voice, STT, ONNX, GPU, Cross-Platform]
---

# DictatorFlow - Cross-Platform Voice-to-Text in Zig

[DictatorFlow](https://dictatorflow.com) is a voice-to-text platform that ships as a single 23MB native binary for Linux, Windows, and macOS. It evolved from VoiceType, a Go-based Linux-only CLI tool, into a full cross-platform application rewritten in Zig with local GPU inference, multi-provider cloud fallback, and a web demo.

## The Original: VoiceType (Go)

VoiceType was a Linux voice-to-text tool built in Go with a Python VAD (Voice Activity Detection) chunking layer. About 5137 lines total across Go and Python. You pressed Ctrl+Super+H, spoke, and it transcribed via a multi-provider fallback chain -- trying several cloud APIs in sequence until one returned a result.

It worked well but had limitations: Linux-only, required a Python runtime for VAD, and the Go+Python split made deployment awkward. The GC pauses in Go also introduced occasional latency spikes during real-time audio processing.

## Why Zig

Zig solves every pain point from the Go version:

- **No GC** -- deterministic memory management, no pause spikes during audio capture
- **Cross-platform from one codebase** -- Linux, Windows, macOS from the same source
- **Direct C interop** -- call ONNX Runtime and Raylib C APIs without bindings overhead
- **Single binary deployment** -- one 23MB file, no runtime dependencies
- **Comptime** -- compile-time code generation for platform-specific audio backends

## The Zig Rewrite

6358 lines of Zig across 21 source files. The major components:

- **Raylib GUI overlay** -- translucent recording indicator, mode display, transcript history
- **Cross-platform audio capture** -- ALSA on Linux, CoreAudio on macOS, WASAPI on Windows
- **Platform-specific hotkeys** -- X11 key grabbing on Linux, RegisterHotKey on Windows
- **VAD in Zig** -- no more Python dependency, Silero VAD via ONNX Runtime

## Local GPU Inference

DictatorFlow runs NVIDIA's Parakeet CTC 0.6B model locally via ONNX Runtime with CUDA acceleration. Build with `-Dgpu` to enable NVIDIA support.

```bash
zig build -Dgpu -Doptimize=ReleaseFast
```

This gives you fully private, offline transcription with no API calls. The ONNX Runtime CUDA execution provider handles GPU memory management and kernel dispatch.

## Multi-Provider Cloud Fallback

When cloud is available, DictatorFlow uses a ranked fallback chain:

```
Gemini (quality) -> Groq (speed) -> Fal -> Local ONNX
```

The provider ranking is dynamic. Each utterance gets bucketed by audio length, and the system tracks per-bucket latency statistics. Short utterances might prefer Groq for speed while longer ones route to Gemini for accuracy. If a provider fails or times out, the next in the chain fires immediately.

## WER Optimization

Starting from a baseline Word Error Rate of 1.614, DictatorFlow reached 0.041 -- a 98% improvement. The key techniques:

- **Spectral normalization** -- audio preprocessing that normalizes frequency energy distribution before inference
- **VAD chunking** -- tuned silence thresholds to split audio at natural phrase boundaries
- **Auto-learning** -- continuous WER-driven parameter optimization that adjusts preprocessing and chunking parameters based on measured accuracy

The auto-learning loop evaluates transcription accuracy against ground truth samples and tunes parameters like silence threshold duration, spectral normalization strength, and chunk overlap.

## Voice Modes

Four distinct modes, each with its own hotkey:

| Mode | Hotkey | Behavior |
|---|---|---|
| **Transcribe** | Ctrl+Shift+D | Record, transcribe, paste at cursor |
| **Command** | Ctrl+Alt+J | Voice command execution |
| **Research** | Ctrl+Alt+R | Deep research queries via Codex/Claude |
| **History** | Ctrl+Shift+Alt+H | Transcript clipboard with audio replay |

Transcribe mode is the daily driver -- press the hotkey, speak, release, and the text appears at your cursor. Command mode interprets speech as system commands. Research mode sends queries to AI research backends for longer-form answers.

## Voice Activation

DictatorFlow supports always-on listening with local VAD. Configure wake words like "flow", "hey", "command", or "research" to trigger specific modes without touching the keyboard. All activation detection runs locally -- no cloud calls until actual transcription begins.

## Architecture

```
Desktop Client (Zig) -> Cloud API (Go) -> Providers (Gemini/Groq/Fal)
                    \-> Local ONNX (Parakeet CTC 0.6B)
Web App (React) -----> Cloud API (Go)
```

The cloud API is a Go service that handles provider routing, rate limiting, and the web demo. The React web app at [dictatorflow.com](https://dictatorflow.com) lets you try transcription in the browser via `POST /demo/transcribe`. The desktop client can operate fully offline with local ONNX or connect to the cloud API for the multi-provider fallback chain.

## Try It

The web demo at [dictatorflow.com](https://dictatorflow.com) runs in any modern browser. For the full desktop experience with hotkeys, voice activation, and local GPU inference, grab the Zig binary from the releases page.
