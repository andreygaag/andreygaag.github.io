---
title: "A Dynamic Tail in the System Prompt Disables the Provider Cache"
pubDate: 2026-08-14
description: "A timestamp and memory near the start of a 92K-token agent request made every call cold; a stable prefix and cached-token metric made the defect testable."
tags: ["agents", "llm", "prompt-caching", "observability", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

The LLM provider's bills for an agent service looked as if prompt caching did
not exist: every call was billed as cold.

Nothing inside the system confirmed this — no metric, log, or trace field. The
external provider's bill was the only signal. The feedback loop took a month.

## Context

The agent used a model with implicit caching: a 4,096-token caching threshold,
a TTL of roughly 3–5 minutes, and cache reads priced at one tenth of regular
input tokens.

Each request contained a system message, conversation history reconstructed
from an event log, and an array of tool declarations — 132 schemas and about
92,000 tokens per call.

Within a single turn, the agent ran a tool loop. Every iteration rebuilt the
messages from the event log and sent the entire prefix to the provider again.
Prefix cacheability was therefore not a half-percent optimization. It was the
main cost driver.

The system message was assembled by concatenating:

1. a static role prompt;
2. the current ISO timestamp with microsecond precision;
3. five memory blocks: core blocks, user preferences, vector retrieval for the
   request text, recent context, and “lessons.”

The problem was invisible internally in three different places:

- the token-accounting structure knew only about input and output tokens; it
  had no fields for cached tokens;
- the provider adapter read only two counters out of roughly ten available in
  the response;
- the usage breakdown reached the tracing system under custom key names that
  did not exactly match the model's pricing line items, so it calculated no
  cost at all.

## Root cause

The provider cache reused a common request prefix. Once one token changed, the
KV cache for every following token could no longer continue that same prefix.

The microsecond timestamp changed the system message on every assembly. Memory,
history, and tool declarations followed it, so a dynamic fragment near the
front invalidated almost the entire 92,000-token request regardless of the
fragment's own size.

## Broken assumption

We assumed that sending usage to the tracing system made cost visible there. In
reality, usage-breakdown keys were matched to pricing line-item names by exact
string equality. The data arrived under our custom names, but the cost metric
was never calculated.

## Detection

The required metric is cached tokens as a share of input tokens on every model
call. The provider returned this counter in the response without another
request. Zero on repeated calls with a prefix above the caching threshold is a
signal that the invariant is broken.

A deterministic builder test provides a second signal. It assembles the same
turn twice with different values for “now” and different retrieval results,
then requires the system message to be byte-for-byte identical. Concatenating
the time makes that test turn red without any provider access.

## Fix

The system message became byte-for-byte static: only the role prompt remained.
Everything volatile — the time and all five memory blocks — is assembled into
one user-role block immediately before the final user message, at the tail of
the request.

The time and core memory blocks are captured once when the turn starts and
passed down. The message builder runs on every tool-loop iteration; reading
“now” during each assembly would make the volatile block change again within a
single turn.

Across turns, the common prefix ends at the previous turn's volatile block. The
previous turn's tool traffic is therefore billed as regular input again on the
next turn. Eliminating that requires moving retrieval into a tool so its results
become regular history messages. That is a separate task.

There is another trade-off. User preferences and agent “lessons” — behavioral
instructions — moved into the user role, where they have lower priority than
system instructions. The block is explicitly delimited, and the static system
prompt says that it is trusted context for the current request. But that does
not restore system-message authority.

## Test

I added two network-free guardrail tests:

1. Assemble the messages twice with different times and retrieval results; the
   system message must remain byte-for-byte identical.
2. Enforce append-only construction within a turn: iteration N's message list
   must be an exact prefix of iteration N+1's list. The test turns red if
   dynamic content is inserted into the middle again.

A separate token-accounting test establishes that cached tokens are a subset
of input tokens and are never added to them.

## General lesson

In a prefix cache, a dynamic fragment's position matters more than its size.
Dynamic content appended to a static block costs not just its own tokens, but
the entire remainder of the request. Volatile content belongs at the tail. That
is an invariant, not an optimization.

The invariant needs a test. Anyone can put a timestamp back into the system
prompt: the change looks harmless, and the bill silently returns to 92,000
tokens per call.

Before fixing cost, instrument it. Otherwise both the defect and its repair take
a month to notice.
