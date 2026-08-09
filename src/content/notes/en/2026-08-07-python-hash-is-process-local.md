---
title: "hash() Is Stable Only Within a Single Process"
pubDate: 2026-08-07
description: "One source generated a new post_id for the same URL on every process start and bypassed deduplication."
tags: ["python", "data-quality", "reliability", "testing"]
lang: en
source: "field-note"
draft: false
---

## Symptom

Production, a news-content auto-publishing service. One web source occupied
**42% of the `parse` table** — 3.47 million rows out of 8.28 million — even though
it had only 1,575 unique URLs. The table was 22 GB; 8.8 GB of that was just the
post text from this one source.

One day's sample:

```text
source    | rows  | unique ids | unique urls | copies per url
source-x  | 16808 | 16808      | 80          | 210.1
source-a  |   791 | 791        | 791         | 1.0
source-b  |   552 | 552        | 552         | 1.0
source-c  |   513 | 513        | 513         | 1.0
source-d  |   210 | 210        | 210         | 1.0
```

Each of those 80 articles entered the database 210 times a day, every time with
a new `post_id`. None of the other web sources pull this shit.

This had accumulated for eleven months without bothering anyone while
[routing was broken](/notes/2026-08-07-insert-rowcount-is-not-a-delivery-signal/).
As soon as routing was fixed, the flow reached the queue: 601 rows in one hour,
and the AI pipeline managed to turn them into 16 posts.

## Context

The project is large, ancient, from the pre-AI era, and built ass-backwards in
many places.

The parser runner does not keep parsers in memory. On every cycle, it starts a
**new subprocess** with `scrapy crawl`, waits for it to finish, and repeats.

Posts are deduplicated by `(source_id, post_id)` — a unique index in each monthly
partition.

The affected parser derived `post_id` from the slug:

```python
numeric_id_from_hash = abs(hash(slug)) % (10 ** 10)
```

Two months earlier, the same project had already gained the correct helper in the
shared parser utilities:

```python
def stable_bigint_id(raw: str) -> int:
    """Stable positive id that fits PostgreSQL BIGINT (signed 64-bit)."""
    return int(hashlib.sha256(raw.encode()).hexdigest()[:15], 16)
```

## Root cause

[`hash()` values for Python strings have been randomized since version 3.3](https://docs.python.org/3/reference/datamodel.html#object.__hash__)
([PEP 456](https://peps.python.org/pep-0456/)). At
startup, the interpreter takes a random seed and mixes it into string and bytes
hashes as protection against hash flooding. The seed lives exactly as long as
the process.

`PYTHONHASHSEED` was not set in either the repository or the running container.
This was verified with `printenv` inside the container, where the variable was
absent, and by searching the image, Compose file, and environment files.

A new subprocess roughly every seven minutes meant a new seed and new IDs for
every article it saw.

No safeguard caught this because all of them depended on `(source_id, post_id)`.
To the database, 210 copies with different `post_id` values were 210 genuinely
different posts. The duplicate was visible only by URL, and nothing checked it.

## Broken assumption

That `hash()` returns the same identifier for the same string.

It does while the service lives inside one long-running process. As soon as it
moves to a subprocess, `hash()` stops guaranteeing determinism.

The value's type and range remain flawless, so neither the schema, the indexes,
nor code review reacts to it.

## Detection

A metric tracking the ratio of rows to unique URLs over a time window would have
caught this earlier. For a healthy source, it was 1; here it was 210. One query
can calculate it, and it catches any source of unstable IDs, not just `hash()`.

The second, rougher signal is one source's share of the total table volume. A
single news site accounting for 42% is an anomaly visible without understanding
the cause.

## Fix

I moved every parser to a deterministic SHA hash, then carefully but aggressively
removed 12 GB of garbage rows from Postgres, then vacuumed it with `VACUUM`.

## Test

The parser's unit tests contain two key cases. They calculate the ID **in two
subprocesses**, with `PYTHONHASHSEED=0` and `PYTHONHASHSEED=1`, and require the
results to match:

```python
def test_slug_id_survives_a_different_hash_seed():
    assert news_id_under_hash_seed(SLUG_URL, "0") == news_id_under_hash_seed(SLUG_URL, "1")
```

This property cannot be tested inside one interpreter. Randomization applies to
the whole process, so any ordinary assertion against `hash()` passes.

Two more tests cover the contract: the ID fits into `int8`, and a numeric URL
keeps its own ID.

As a sanity check, both seed tests fail against the pre-fix code, while the
contract tests pass against both versions.

## General lesson

An identifier derived from a process-local function is not an identifier: it
matches itself only within one run. The entire class of sources — `hash()`,
`id()`, `uuid4()`, time, or a PRNG without a fixed seed — must be prohibited
wherever the value outlives the process that created it.

The testing rule follows: a property that breaks **between** runs must be tested
between runs. A test in one interpreter will always be green and create false
confidence. If the invariant says "the same after a restart / on another machine
/ in another process," the test must start a second process.
