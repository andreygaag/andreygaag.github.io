---
title: "Why an Agent Should Not Choose the Architecture for an Unfamiliar Task"
pubDate: 2026-06-06
description: "Asking an agent to clone a voice without prior research turned into endless trial and error: define the architecture and evaluation criteria first."
tags: ["agents", "planning", "evaluation", "human-agent-interaction"]
lang: en
source: "field-note"
draft: false
---

## Symptom

An agent spent almost two days trying to solve a voice-cloning task for a
well-known character without reaching a verifiable result.

## Context

I was experimenting with Hermes by trying to clone a voice. The agent tried
several frameworks and architectures and eventually started training another
approach. I did not have a clear answer for what should be
produced at each stage or how to distinguish a working solution from another
failed attempt.

## Root cause

We gave the agent an unfamiliar domain together with the responsibility for
architecture selection and result evaluation. It lacked enough expertise and
evaluation criteria to choose a sound approach, recognize a dead end, and stop.

## Broken assumption

I assumed that the agent would choose the right method, evaluate its quality, and
finish the task. An agent may implement a well-defined plan effectively, but that
does not mean it can reliably research an unfamiliar domain and validate the
result without external guidance.

## Detection

Repeating the same undefined approach produced no new information. If the agent
cannot explain which experiment tests a hypothesis and what outcome counts as
success, additional iterations are trial and error rather than research.

This is an early signal to stop and rethink the task, not simply increase the
number of attempts.

## Fix

As the next step, I outlined high-level research and defined:

- the selected architecture and the reasons for choosing it;
- the sequence of stages;
- the inputs and expected artifacts for each stage;
- quality criteria and how the result will be evaluated;
- conditions for stopping or changing direction.

The agent then received individual stages with a bounded number of
architectural decisions, while a human retains control of direction and
evaluation.

## Test

The regression scenario for this process should require the agent to state a plan,
success criterion, and next falsifiable experiment before implementation. After
each stage, compare the result with that criterion instead of checking only that
the commands completed without an error.

The original note does not record an automated check for this process.

## General lesson

Implementation can be delegated to an agent, but research in an unfamiliar domain,
architecture selection, and quality evaluation should not be delegated implicitly.
First define the solution map and observable criteria; then let the agent move
faster along it.
