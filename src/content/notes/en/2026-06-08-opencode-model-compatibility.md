---
title: "Qwen3.5:32B and OpenCode Compatibility Is a Contract"
pubDate: 2026-06-08
description: "A local coding-agent session can stop because of an incompatible reasoning format even after the model loads and changes files successfully."
tags: ["agents", "llm", "compatibility", "local-inference"]
lang: en
source: "field-note"
draft: false
---

## Symptom

An OpenCode session using Qwen3.5:32B started a task, loaded the model, and worked
for a while, but the agent loop suddenly stopped in the middle of the response.

## Context

Qwen3.5:32B started inference and even changed files. After particular reasoning
blocks appeared, the OpenCode harness could no longer continue processing the
response.

## Root cause

The reasoning format returned by the model did not match the format understood by
the OpenCode version in use. Unknown response blocks were treated as a protocol
error even though the model and local inference were still running.

## Broken assumption

I assumed that the agent harness automatically supported formats from new
models. Compatibility covers more than an API endpoint and JSON schema: it also
includes reasoning blocks, tool calls, streaming, and error handling.

## Detection

The issue reproduced with a specific OpenCode and local-model combination: the
model loaded, files changed, and the session stopped after an unknown reasoning
format appeared.

## Fix

I restored compatibility by updating OpenCode to a version that handled the
format and updating the model to a compatible version.

After the incident, I started updating agent-harness and model versions as a
compatible pair rather than independently.

## Test

The compatibility matrix should run a short task covering:

- an ordinary text response;
- reasoning and streaming;
- a tool call;
- continuation of the loop after a file change.

The check should fail on an unknown response block before a new version reaches
the working workflow.

## General lesson

A model and an agent harness form a protocol, not two independent dependencies.
Pin compatible versions, test the actual response formats, and do not treat a
successful model load as proof that the complete agent loop is compatible.
