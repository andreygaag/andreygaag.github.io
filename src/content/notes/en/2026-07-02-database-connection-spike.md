---
title: "A Client Loop Caused a Threefold Database Connection Spike"
pubDate: 2026-07-02
description: "Even successful repeated requests can exhaust a connection pool: the server needs rate limits, and the client needs a guard against loops after streaming failures."
tags: ["backend", "postgres", "sse", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

One service's database connections suddenly grew to roughly three times their
normal level in the morning. The application logs contained no errors, and users
did not see an obvious service outage.

## Context

The investigation found thousands of identical requests for the history of one
chat. Every request returned `200`, so ordinary error monitoring did not fire.
After roughly fifteen minutes, the connection pool was released and the load
returned to normal.

Shortly before the spike, a user had reported that neural-network responses did
not appear in one browser, while switching browsers made the problem disappear.
The repeated requests during the spike came from the same scenario.

## Root cause

The observed source of the load was a client loop repeatedly requesting the same
chat history. The most likely trigger was a failed or incomplete SSE finalization:
the client did not receive the expected end of the response and continued trying
to synchronize.

The exact set of factors that started the loop in that browser was not proven. It
could have involved network handling, device sleep, or connection recovery. The
server did not have a limit that could stop this request pattern.

## Broken assumption

We assumed that if the flow was stable in one browser, it would be stable in the
others. The successful `200` status of each individual request also created a
false sense that the system was healthy.

## Detection

An early signal should not be limited to the error rate. It should also include
the intensity of identical requests: one user or client repeatedly requests the
same resource within a short interval.

This requires request metrics by resource and client, plus an alert for a spike in
repeated requests without a corresponding user action.

## Fix

The fix covered both boundaries:

- the backend received a rate limit for repeated requests;
- the frontend received a guard that stops the synchronization loop and does not
  issue another request until the previous flow has completed correctly.

The rate limit protects the database even when a client is broken, while the guard
removes the source of unnecessary requests. Either layer alone is insufficient:
the client can break again, and the server must not allow that failure to become
unbounded load.

## Test

The minimum regression check should simulate an incomplete SSE response and verify
that the client does not start an endless history-loading loop. Separately, the
server-side rate limit should be tested: after the configured number of identical
requests, the server must limit further calls without acquiring a new database
resource for every retry.

The original note does not record an automated test for this scenario.

## General lesson

The absence of errors does not mean the absence of dangerous load. Reliability
must also be measured through request behavior: repetition, frequency, and
duration can be more harmful than a single failed response. Client-side streaming
flows need protection at both the client and server boundaries.
