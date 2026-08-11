---
title: "A Stupid Mistake That Broke the Agent's Context"
pubDate: 2026-08-10
description: "A slice taken from the wrong end made a multimodal agent receive the oldest images instead of the newest ones."
tags: ["agents", "llm", "multimodal", "reliability", "testing"]
lang: en
source: "field-note"
draft: false
---

## Symptom

The user sent an LLM agent a sequence of slide screenshots and asked it to
translate the text into English. For the first N turns, it correctly translated
the slide it had just received. On turn N+1, the agent started translating an
unrelated slide: first it invented a case about a company that was not on the
slide, then, when told directly to “translate strictly what is in the
screenshot,” it responded with a translation of the very first slide in the
chat.

## Context

The multimodal agent assembles each turn's context from the message history and
chat artifacts. All vision artifacts in the chat - user uploads and generated
images - go into one list, are sorted by `uuid7`, and are sent to the model as
content parts. N is the configurable limit on the number of artifacts sent to
the model.

The planner was working correctly: steps contained a sensible prompt. There
were no errors.

## Root cause

The function that collected image paths truncated the list from the front with
`paths[:max_images]` instead of `paths[-max_images:]`. It kept the ten oldest
images and discarded the newest ones.

Claude and Codex looked it over. The developer looked it over. I looked it over.

## Broken assumption

We just plain missed it.

## Detection

A unit test that puts strictly more than `MAX_IMAGES` images into the context
and asserts which exact paths were sent to the model. That turned out to be
enough: red on the reverted code, green on the fixed code.

There was a second, independent signal: a warning was already logged on every
truncation (`Multi-image turn truncated: %d images...`), but it was not
aggregated anywhere. An alert on a rise in this warning would have shown that
truncation was regularly happening in production long before a user noticed.

## Fix

In the function that collected image paths, the slice changed from
`paths[:max_images]` to `paths[-max_images:]`; the warning text changed from
“sending first” to “sending most recent”; and a nearby comment now explains the
reason and mentions the incident. This is a real fix for the original defect,
not a workaround.

## Test

I added two unit tests for image collection:

- the limit is reduced to 3, the context contains 5 images, and the test asserts
  that exactly the last three were sent and that the truncation warning was
  emitted once;
- the limit is 2, four images are supplied out of order, and the test asserts
  that sorting by identifier restores chronology and preserves the slice
  direction.

Both were checked against the revert: red on the old code, green on the new
code. Verifying that “the test is red before the fix” is mandatory here - the
previous test for the same function was green with either slice direction.

## General lesson

You still have to read code carefully, and you have to test every limit
boundary.
