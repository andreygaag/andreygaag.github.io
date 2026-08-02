---
title: "Delayed Execution Should Be a Separate Tool"
pubDate: 2026-07-09
description: "When scheduling is embedded in every tool, new channels inflate the codebase; a shared scheduling tool keeps that logic in one place."
tags: ["agents", "tools", "architecture", "planning"]
lang: en
source: "field-note"
draft: false
---

## Symptom

Every new requirement for delayed actions required another specialized
implementation. The code kept growing, and the same scheduling mechanism started
living inside different tools.

## Context

We first implemented delayed message delivery inside the Telegram tool. We then
used the same approach for VK. When delayed email delivery became necessary, it
was clear that adding another copy of the mechanism would only increase coupling
and the cost of change.

## Root cause

Delayed execution had not been separated from the tools' own logic. Each tool was
responsible for two different concerns:

1. performing its domain operation;
2. deciding when that operation should run.

As a result, supporting a new channel required changing not only its delivery
logic, but also another variant of the scheduler.

## Broken assumption

Delayed execution was treated as a special, infrequent case that could live next
to a specific tool. While there was only one such tool, this looked cheaper than a
separate layer. Repeating the requirement for another channel showed that this was
not a channel property, but an independent architectural capability.

## Detection

The signal was repeated implementation: Telegram and VK each acquired their own
delayed-delivery mechanism, and email would have required a third one. This growth
in duplication can be detected during architectural requirements analysis, before
implementing the new channel.

## Fix

I moved delayed execution into a separate tool that can schedule a call to another
tool. Scheduling no longer depends on the channel or domain operation, and the
agent can delay the execution of any supported tool.

Tools now perform their own operations, while a separate layer controls when they
run. This reduces duplication and allows new channels to be added without copying
the scheduling mechanism.

## Test

The minimum regression scenario should exercise the same scheduler with several
different tools:

- schedule a call to a message-delivery tool;
- schedule a call to an email-delivery tool;
- verify that both calls run at the requested time and receive their original
  arguments;
- verify that cancelling or failing one scheduled call does not change the
  behavior of the others.

The original note does not record an automated test or monitor for this contract.
It should be added so that a new requirement does not move scheduling logic back
into individual tools.

## General lesson

Scheduling is a separate architectural responsibility, not a special property of
one function. When the same scenario appears in several tools, move it into a
shared model and enforce it with one contract.
