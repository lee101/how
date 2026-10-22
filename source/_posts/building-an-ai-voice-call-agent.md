title: Building an AI Voice Call Agent, Step by Step
date: 2026-10-20 09:00:00
tags: [AI, Voice, Tutorial, Speech, LLM]
description: A practical tutorial on how an AI voice call works, from microphone to speech to model to voice, with latency tips and a Python loop you can adapt.
---

Talking to an AI character out loud feels very different from typing. The pause between turns, the way it handles interruptions and the tone of the voice all matter more than the cleverness of the answer. This tutorial walks through the moving parts of a voice call agent so you can build a small one yourself, or understand what happens when you press call on [Ring.nz](https://ring.nz).

## The pipeline in four parts

Every voice call agent is a loop built from the same four pieces.

1. **Capture.** The browser or phone streams microphone audio in small chunks, usually 20 to 100 milliseconds each.
2. **Speech to text.** A transcription model turns those chunks into words as they arrive.
3. **Language model.** The transcript, plus a character prompt and the recent conversation, goes to an LLM that writes the reply.
4. **Text to speech.** A voice model turns the reply into audio that streams back to the speaker.

The best experience comes from streaming every stage. Waiting for a full transcript, then a full reply, then a full audio file adds seconds. Streaming lets the first words of speech start while the model is still writing the rest of the sentence.

## Know when the person has finished talking

Voice activity detection (VAD) decides when a turn begins and ends. A simple energy threshold works for a first prototype, and a small neural VAD model gives better results in noisy rooms. Two settings matter most:

- **Silence window.** How long a pause counts as the end of a turn. Around 500 to 800 milliseconds feels natural for most conversations. Shorter values feel snappy but can cut people off mid thought.
- **Minimum speech length.** Ignoring very short blips keeps coughs and key clicks from triggering a reply.

## A minimal turn loop in Python

This sketch shows the shape of the loop. Swap the placeholder functions for the speech, model and voice providers you prefer.

```python
import asyncio

SYSTEM = "You are Sam, a friendly guide. Reply in one or two short spoken sentences."

async def call_loop(mic, speaker, stt, llm, tts):
    history = [{"role": "system", "content": SYSTEM}]
    async for utterance in stt.turns(mic):          # yields text when the caller pauses
        history.append({"role": "user", "content": utterance})
        reply = []
        async for token in llm.stream(history):     # tokens arrive as they are written
            reply.append(token)
            sentence = take_sentence(reply)
            if sentence:
                await speaker.play(tts.stream(sentence))
        history.append({"role": "assistant", "content": "".join(reply)})
```

The key idea is `take_sentence`. As soon as the model has produced a full sentence, send it to text to speech and start playing it. The caller hears the first sentence while the second is still being generated.

## Write prompts for the ear

Text replies read well with lists and long paragraphs. Spoken replies work best when they are short and plain. Add these lines to your character prompt:

- Reply in one to three sentences unless asked for more.
- Use everyday words and contractions, as in a phone call.
- End with a short question or a clear pause point so the caller knows it is their turn.
- Spell out numbers and dates the way a person would say them.

## Handle interruptions gracefully

People talk over each other on calls, and a good agent expects it. Keep listening while the agent speaks. When the VAD hears the caller start, stop the audio playback right away, cancel the pending model request and add only the part of the reply that was actually spoken to the history. This is called barge in, and it is the single biggest step toward a call that feels human.

## Budget your latency

Measure each stage separately and set a target for the time from the caller finishing a sentence to the first audio coming back. A useful breakdown to track:

- End of speech detection, which is your silence window.
- Transcription finalisation.
- Time to first token from the model.
- Time to first audio chunk from text to speech.
- Network transit to and from the caller.

Smaller, faster models often win for calls because a quick, short answer beats a perfect, slow one. Keep the conversation history trimmed so the model sees recent turns and a compact summary of older ones.

## Test with real rooms

Try your agent with a laptop microphone, a phone, headphones and a speaker in a quiet room. Echo from speakers into the microphone is a common surprise, and headphones are the easiest way to test the rest of the pipeline cleanly. Browser echo cancellation settings help a lot when you capture audio with `getUserMedia`.

## Try it live

If you would like to hear a finished version of this loop, open [Ring.nz](https://ring.nz), pick a character and press call. You can speak naturally, interrupt, and compare how different characters and voices change the feel of the conversation. For more hands on audio work, the earlier post on [audio processing with Librosa](/2026/01/31/audio-processing/) covers feature extraction you can use to analyse voices.

I am Lee Penkman, and I write about shipping practical AI products here on How.nz. If you build a voice agent of your own, I would love to hear what you learned.
