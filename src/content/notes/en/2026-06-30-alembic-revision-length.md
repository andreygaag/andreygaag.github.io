---
title: "Keep Alembic revision ids under 32 characters"
pubDate: 2026-06-30
description: "Alembic stores the current revision in a VARCHAR(32) column, so long human-authored revision ids overflow and break migrations."
tags: ["postgres", "alembic", "migrations"]
lang: en
source: "field-note"
draft: false
---

## Symptom

Running `alembic upgrade head` fails at the point of stamping the new revision:

```
sqlalchemy.exc.DataError: (psycopg2.errors.StringDataRightTruncation)
value too long for type character varying(32)
```

The migration's own DDL succeeds; the failure happens when Alembic writes the revision id back into its bookkeeping table.

## Context

Alembic tracks the current schema version in a table called `alembic_version`, in a single column `version_num`. By default that column is `VARCHAR(32)`. Revision ids are normally the random 12-character hashes Alembic generates, so the limit is invisible. It only surfaces once you start hand-authoring descriptive revision ids (for example, passing `--rev-id` or renaming files to readable slugs).

## Root cause

A revision id longer than 32 characters cannot fit in `alembic_version.version_num`. Postgres rejects the `INSERT`/`UPDATE` with `StringDataRightTruncation` rather than silently truncating, so the whole upgrade transaction rolls back.

## Broken assumption

The assumption was that a revision id is just a label and can be as descriptive as you like. In reality it is a primary-key-like value that is persisted to a fixed-width column, so its length is a hard schema constraint, not a cosmetic choice.

## Fix

The fix had two variants. Revision ids were kept at or under 32 characters, with
the description placed in the migration message or filename. When long ids were
genuinely required, the column was widened once through a migration:

```python
op.alter_column(
    "alembic_version",
    "version_num",
    type_=sa.String(length=64),
)
```

Widening trades portability for freedom; the 32-character default exists so the table works identically across every backend Alembic supports.

## General lesson

Any identifier that gets written to a fixed-width column is length-constrained by that column, no matter how "free-form" it looks in your source. When a tool persists your labels, treat their length as part of its contract and check the storage definition before inventing a naming scheme.
