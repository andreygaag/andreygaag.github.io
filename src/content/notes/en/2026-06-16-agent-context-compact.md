---
title: "Unbounded Conversation History Can Exceed the Context Window"
pubDate: 2026-06-16
description: "The harness capped retrieved memory but left active conversation history unbounded; recovery after a restart suggested, but did not prove, context overflow."
tags: []
lang: en
source: "field-note"
draft: false
---

## Symptom

During testing, the agent suddenly began failing every request with
`LLMResponseError: No choices in OpenRouter response`.

## Context

We added logging to understand the failure and restarted the process as part of
that change. After the restart, the agent worked again. Logging could not have fixed
the responses from OpenRouter, but the restart had cleared the state held only
in process memory: the current conversation history. Keeping that history in
memory was intentional, not a bug by itself.

Because clearing the conversation coincided with recovery, exceeding the model's
context window became the leading hypothesis. A restart-based recovery is a
strong clue, but it does not prove the diagnosis on its own.

## Likely cause

The base harness only partially controlled the context window. It limited what
was retrieved from memory, but the active conversation history could grow
without bound. That gap was consistent with the observed recovery after the
history was cleared.

## Broken assumption

We assumed that the borrowed harness already handled this fundamental
constraint. In a previous product we had designed context management from the
start, but this harness did not account for long conversations.

## Fix

We added a final context limit and a rolling summary for older conversation
turns. The goal was to keep long dialogues within the model's window without
losing the gist of the earlier exchange.

## General lesson

A limit applied only to retrieved memory is not a limit on the complete model
request. Context budgeting must include the active conversation history as well.
