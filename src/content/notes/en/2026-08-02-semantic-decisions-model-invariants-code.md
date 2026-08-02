---
title: "Semantic Decisions Belong to the Model; Critical Invariants to Code"
pubDate: 2026-08-02
description: "In an agent system, the model should interpret requests and choose actions while code preserves guarantees, safety, and irreversible invariants."
tags: ["agents", "architecture", "llm", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

While implementing a multi-step, highly parameterized content-planning system,
complexity began growing disproportionately. Every change required more branches
and special rules, and the agent flow gradually turned from a flexible assistant
into a conventional program.

## Context

After several iterations of improvements and fixes, the codebase, logic, and set
of gates had grown substantially. The agent began encountering user requests that
the workflow had not anticipated. The model could not handle some of them
flexibly, stalled, and repeated attempts.

The deterministic post-planning and publishing pipeline itself worked reliably.
The problem was not the need for publishing guarantees, but that the code started
encoding too many possible interpretations of user intent in advance.

## Root cause

The orchestration layer contained too much deterministic logic where the decision
depended on the meaning of the request and could be made by an LLM. More than a
decade of deterministic programming had formed a habit of turning every observed
behavior branch into code.

This does not mean that deterministic code should be removed in general. The
boundary was misplaced: code modeled the semantics of the user's request instead
of only enforcing verifiable invariants.

## Broken assumption

I had assumed that everything that could be covered explicitly by deterministic
code should be covered that way, leaving the LLM and agent loop only the minimum
set of tools needed for interaction.

As a result, the model had too little room to interpret, plan, and choose the next
action, while the code accumulated exceptions to the predefined workflow.

## Detection

A thoughtful person suggested considering whether part of the deterministic logic
could be replaced with model-driven work.

The early signal was the cost of change: every new exception required another
branch, gate, or state. Repeated agent-loop attempts on requests that were unknown
when the workflow was designed were another signal.

This could have been detected earlier with workflow-complexity metrics: the number
of special branches per user scenario, the retry rate, and the number of requests
that ended without a selected action.

## Fix

I replaced a significant part of the predefined orchestration logic with tools for
working with entities. The model became responsible for interpreting the request
and choosing a sequence of actions, rather than directly performing operations
that require guarantees.

The code retained HITL, explicit state-machine transitions, authorization,
validation, transactions, idempotency, limits, and other critical checks. Tools
can expose CRUD operations to the model, but the operations themselves still run
in deterministic code with permission and invariant checks.

## Test

The regression suite should include requests that were unknown when the workflow
was designed. For each scenario, it should verify that:

- the model chooses the correct tools and arguments;
- code rejects invalid arguments and actions;
- the state machine rejects impossible transitions;
- duplicate delivery does not repeat an irreversible action;
- HITL actually stops execution until confirmation.

The original note did not record this test and measurement set. Flexibility should
therefore be validated not only by reduced code, but also by preserved safety,
correctness, and observability.

## General lesson

The architectural boundary is between semantic decisions and guarantees. The model
should interpret requests, choose tools, and adapt the plan. Deterministic code
should enforce permissions, schemas, state, idempotency, limits, and confirmation
of irreversible actions.

The goal is not to replace code with a model. It is to avoid hard-coding semantics
that the model can handle flexibly and whose execution can be verified through
tools and postconditions.
