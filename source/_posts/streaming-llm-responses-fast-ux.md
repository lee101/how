title: Streaming LLM Responses for a Faster Feeling App
date: 2026-10-21 09:00:00
tags: [AI, LLM, Python, Tutorial, Performance]
description: Learn how to stream LLM tokens to the browser with server sent events, cache repeated prompts and measure time to first token in a small Python service.
---

Users judge an AI feature by how quickly something appears on screen. A model that takes eight seconds to finish a reply feels slow when the screen is blank, and feels quick when words start flowing after half a second. Streaming is the simplest way to get that second experience. This tutorial builds a small streaming endpoint and the browser code to read it.

## What streaming changes

A normal request waits for the whole answer and returns it in one piece. A streaming request returns tokens as the model produces them. The total time is similar, but the time to first token is what the person feels. Track both numbers in your logs so you can see improvements clearly.

## A streaming endpoint with FastAPI

Most LLM providers expose a streaming option on their chat endpoints and return chunks you can iterate over. The example below uses a generic async client, so adapt the call to the provider you use.

```python
import json, time
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()

class Ask(BaseModel):
    prompt: str

async def token_stream(prompt: str):
    start = time.perf_counter()
    first = True
    async for token in llm_client.stream(prompt):      # your provider call
        if first:
            print(f"ttft_ms={(time.perf_counter() - start) * 1000:.0f}")
            first = False
        yield f"data: {json.dumps({'t': token})}\n\n"
    yield "event: done\ndata: {}\n\n"

@app.post("/ask")
async def ask(body: Ask):
    return StreamingResponse(token_stream(body.prompt),
                             media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})
```

The format is server sent events: each message starts with `data:` and ends with a blank line. Browsers and many HTTP clients understand it out of the box.

## Reading the stream in the browser

The built in `EventSource` only supports GET requests. For a POST body, read the response stream with `fetch`.

```js
async function ask(prompt, onToken) {
  const res = await fetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const part of parts) {
      if (part.startsWith('data: ')) onToken(JSON.parse(part.slice(6)).t);
    }
  }
}
```

Append each token to the page with `textContent` so the text appears safely, and keep the scroll position pinned to the newest line only when the reader is already at the bottom.

## Keep proxies friendly

Reverse proxies sometimes buffer responses, which hides the benefit of streaming. In nginx, set `proxy_buffering off;` for the streaming route, or send the `X-Accel-Buffering: no` header from your app. If you use gzip, exclude `text/event-stream` so chunks flush immediately.

## Cache what repeats

Many prompts repeat: onboarding questions, example queries, popular characters greeting new users. Cache these by a hash of the model name, the system prompt and the user text.

- Use a short time to live for answers that depend on fresh data.
- Use a longer one for static explanations.
- Replay cached text through the same streaming path, with a tiny delay between chunks, so the interface behaves consistently.

Many providers also offer prompt caching for long, shared prefixes such as a big system prompt. Put the stable part of the prompt first and the changing user text last to take advantage of it.

## Trim the prompt

Time to first token grows with prompt length. Review what you send:

- Summarise older conversation turns instead of replaying every message.
- Keep tool descriptions to what the current screen needs.
- Retrieve only the top few relevant documents.

## Handle cancellation

When the user closes the tab or presses stop, cancel the upstream request. In FastAPI, check `await request.is_disconnected()` inside the generator, and close the provider stream. This saves cost and frees capacity for other people.

## Measure and iterate

Log these four numbers for every request: time to first token, tokens per second, total time and cache hit or miss. A simple percentile report over a day tells you where to focus. Often the biggest wins come from a smaller model for simple tasks, a trimmed prompt and a warm connection pool.

## See it in action

You can feel the difference on a live product. [Ring.nz](https://ring.nz) streams character replies and voice so conversations start quickly, and the earlier post on [building an AI voice call agent](/2026/10/19/building-an-ai-voice-call-agent/) shows how the same streaming idea extends to speech. I am Lee Penkman, and more practical AI notes live right here on How.nz.
