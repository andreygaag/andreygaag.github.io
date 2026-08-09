---
title: "Postgres, Partitions, and Missing Posts"
pubDate: 2026-08-07
description: "The data reached its partitions, but cursor.rowcount returned zero and prevented the processing pipeline from starting."
tags: ["postgresql", "reliability", "data-pipelines", "observability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

We added six new web parsers to the content factory, deployed them, and connected
their sources to two publication channels. The channels were configured, the
parsers were running, and the data was being stored, but nothing reached the
processing pipeline. Not a single error appeared in the parser service logs.

## Context

Production ran on an ancient news-content auto-publishing service. Parsers stored
posts in a table. From there, the posts were distributed to subscribed channels
through a queue table, then sent to AI processing and publication.

It turned out that nothing from the web parsers had been published for nine
months. Against the mass of other sources and the small number of channels tied
to these parsers, nobody had noticed.

Partitioning had been enabled nine months earlier to relieve Postgres under large
data volumes.

## Root cause

The processing pipeline for web-parser results started only when content storage
was followed by:

`if cursor.rowcount > 0`.

Partitioning was implemented through [`BEFORE INSERT ROW`](https://www.postgresql.org/docs/current/plpgsql-trigger.html).

The result: when inserting into the parser-results table, PostgreSQL honestly
reported `INSERT 0 0`. The named table did receive zero rows. `cursor.rowcount`
was always 0 because the posts had been stored in a partition.

## Broken assumption

The broken assumption was that the number of rows returned by `INSERT` tells us
whether a record appeared in the database.

It actually answers a question about **one specific table**, not the database.
Once redirection was placed under that table, the counter kept telling the truth
but started answering a different question from the one the caller was asking.

## Detection

Alert on the gap between intake and the queue: the share of `parse` rows with no
corresponding `postsprocessing` row, split by sources that have at least one
subscribed channel. In a healthy system, that share is close to zero. Here it
reached 100% and stayed there for nine months.

The project already had a health checker, but it watched the queue as a whole.
Traffic from another parser family kept filling it, so the silent web branch went
unnoticed. The metric must be split by source.

## Fix

I separated insertion from the actual data-existence check used by the pipeline.

## Test

Six pipeline unit tests use a fake cursor whose `rowcount` is hard-coded to 0,
matching the real table's behavior behind the trigger.

As a sanity check, four of the six tests fail against the pre-fix code.

## General lesson

An operation's return value describes the **mechanism**, not the intent. Once a
redirection layer — partitioning, a proxy, sharding, or a cache — is placed under
that mechanism, every derived signal can remain technically truthful while no
longer answering the caller's question. There will be no error. There will be a
zero.

The practical rule follows: when changing a storage or delivery mechanism,
revisit not only the calls but also every **consumer of secondary signals** — row
counts, return codes, command tags, and headers. The compiler and tests will not
find them automatically because their types and values remain valid.

And one more thing: the absence of complaints measures how many people are
watching, not whether the system works. Before treating silence as a health
signal, make sure the path has at least one live consumer.
