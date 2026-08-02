---
title: "LLM Context Is Not a Database"
pubDate: 2026-07-04
description: "Large tool outputs turn the prompt into an accidental data store; reliable agents keep growing data external, bounded, and retrievable."
tags: ["agents", "llm", "context", "tools", "reliability"]
lang: en
draft: false
---

## The failure starts with a reasonable tool

Imagine an agent that evaluates the sentiment of public mentions collected from
the web. A subagent calls a tool, receives a list of mentions, and evaluates the
results. For a small list, the natural design works well:

1. call the tool;
2. put the result into the conversation;
3. let the model continue reasoning.

The design fails when the list grows. The conversation already contains the
system instructions, the current task, previous tool calls, retrieved memory, and
the agent's reasoning. The tool output competes with all of them for the same
context budget.

The failure may appear in the middle of an otherwise valid run. The tool loop
stops, the model cannot continue, or token usage rises sharply as the dataset gets
larger. Nothing is wrong with the individual records. The boundary between tool
execution and model context is wrong.

## Tool output is part of the prompt contract

An LLM does not receive an independent database cursor when a tool returns a
large result. Unless the harness takes special action, the result becomes part of
the next prompt.

That creates an implicit contract:

> every tool must return an output small enough to fit in the remaining context.

This contract is easy to miss because it is not written in the tool's type
signature. A function may return `list[Record]`, while its real operational
contract is closer to “return a list whose serialized form fits alongside the
entire conversation.” That hidden limit changes as the conversation grows.

The agent therefore has two different kinds of tools, even if the code initially
models them the same way.

### Inline tools

An inline tool returns a small result: a status, a single record, a short
explanation, or a bounded page. Keeping that result in the conversation is useful
because the model needs it immediately for the next decision.

### Data tools

A data tool searches, scans, or transforms a potentially large collection. Its
result can grow with the dataset or with the number of matching records. Returning
the complete result inline makes the prompt size a function of external data.

That is the wrong place to store it.

## Context is working memory, not durable storage

The context window is the agent loop's working memory. It is where the model sees
the bounded slice of state needed for the next decision. It is not a database, a
log archive, or a reliable representation of every result produced during a run.

Large conversation history has the same problem as a large tool output. Logs,
documents, search results, and retrieved memory can all grow without a useful
upper bound. Placing them into the prompt makes every subsequent step pay for
their size, even when the model no longer needs most of the content.

External storage changes the contract. The data can remain complete and durable,
while the context contains only a handle, a summary, or a bounded page.

## The safer lifecycle for tool outputs

A tool output needs an explicit lifecycle. A practical classification is:

- **inline** - small results needed immediately;
- **paginated** - collections that can be consumed in bounded pages;
- **spilled** - large results written to an external artifact or database;
- **retrievable** - data that the agent can search or request again by handle.

The model should receive a stable reference rather than an uncontrolled payload.
For example, a data tool can return a handle, the total or approximate scope, and
the first bounded page. Follow-up calls can request the next page or search within
the stored result.

This design preserves an important distinction: the model's prompt is bounded,
but the system's data does not have to be truncated merely because the model is
reasoning about it.

## Pagination is not enough by itself

Pagination controls the size of one response, but it does not automatically
control the lifetime of data already placed in the conversation. An agent can
still consume hundreds of pages and carry all of them forward in the loop.

The harness therefore needs an eviction policy as well. Once a page or a verbose
tool result is no longer needed for the next decision, it can be removed from the
active context. The durable result remains outside the prompt and can be retrieved
again through its handle.

Eviction is safe only when the removed content is recoverable. A short stub should
tell the agent what was evicted and how to retrieve it. Silent deletion changes the
meaning of the conversation and makes debugging difficult.

## The harness must enforce the boundary

It is tempting to add instructions such as “do not return too much data.” That can
help, but it is not a reliable enforcement mechanism. The model and each tool
implementation should not be responsible for calculating the remaining context
budget.

The harness can make the boundary explicit in code:

- classify tools that operate on large collections;
- require those tools to expose pagination or search;
- persist large results outside the conversation;
- return handles, stubs, or bounded pages;
- evict stale tool output during the loop;
- measure prompt size and remaining budget before continuing.

These are enforceable properties. The model can decide which page to request or
which query to run, but deterministic code must prevent an unbounded payload from
silently entering the prompt.

## What the incident changed

The sentiment tool failed once the accumulated mentions became large. The fix was
not to increase the context window or hope that the model would summarize better.
The tool contract and harness were changed together.

Tools that work with large data now use a cursor and pagination, with the data
stored in a database. The harness detects these tools and evicts unnecessary
output during the tool loop. The context contains handles, stubs, and bounded
pages; the complete result remains external.

This makes the tool's cost predictable. A large dataset may take more retrieval
steps, but it no longer expands every prompt without limit.

## A practical review checklist

When adding a tool, ask:

- Can the output grow with the size of an external collection?
- What is the maximum serialized result that may enter the prompt?
- Can the result be paginated, searched, or stored as an external artifact?
- How does the agent retrieve data that was evicted?
- What happens when the handle expires or the backing store is unavailable?
- Which metric shows context growth before the loop fails?

If the answer to the first question is yes, the tool should not be treated as a
simple inline function. Give it an external lifecycle before the first production
dataset makes the hidden prompt contract fail.

## Conclusion

LLM context is working memory for the next agent decision. It is finite,
expensive, and shared by instructions, history, memory, and tool results. It is
not a database.

Keep growing data external. Give it handles, pagination, search, and explicit
retention. Put only bounded, useful state into the prompt, and let the harness
enforce that boundary. This preserves both model reliability and the completeness
of the underlying data.
