---
title: "A Corporate Network Can Block SSE"
pubDate: 2026-06-08
description: "Working HTTP requests do not prove that a corporate network allows the long-lived SSE connection required for streaming agent responses."
tags: ["sse", "networking", "reliability", "agents"]
lang: en
source: "field-note"
draft: false
---

## Symptom

An SSE connection could not be established from a corporate customer's internal
network. The ordinary parts of the service worked, but AI responses did not appear.

## Context

The request to the SSE endpoint with `Accept: text/event-stream` waited for roughly
30 seconds and ended with browser status `0`. Timing data showed that the request
was blocked before DNS, TLS, or TCP connection establishment:

```text
status: 0
blocked: 30007 ms
dns: -1
ssl: -1
connect: -1
```

The preliminary `OPTIONS` request succeeded. Checking only host reachability or
short HTTP requests therefore did not expose the problem.

## Root cause

The corporate network security system blocked the long-lived streaming connection
to the SSE endpoint. This was a network-perimeter restriction, not a failure in
the application's AI response handling.

## Broken assumption

We assumed that a corporate firewall or proxy would allow a legitimate protocol if
ordinary HTTP requests to the same service worked. SSE also depends on connection
duration, headers, and streaming behavior.

## Detection

The signal was the combination of:

- ordinary service requests succeeding;
- `OPTIONS` succeeding;
- the `GET` request to the SSE endpoint ending with status `0` after a long wait;
- the application receiving no stream events.

This check should be part of network diagnostics separately from an ordinary HTTP
health check.

## Fix

Together with the customer's security team, we configured an exception for the
streaming connection to the SSE endpoint. Ordinary responses and AI streaming
could then pass through the corporate network.

## Test

Each supported corporate network should be tested separately for:

1. an ordinary HTTP request;
2. the preflight `OPTIONS` request;
3. a long-lived `GET` with `Accept: text/event-stream`;
4. receipt of the first event and correct stream completion.

The original note does not record an automated test for this network policy.

## General lesson

A working HTTP endpoint does not prove that the streaming transport is reachable.
For agent systems, SSE is a separate infrastructure dependency that must be tested
in real network perimeters, not only in a local environment.
