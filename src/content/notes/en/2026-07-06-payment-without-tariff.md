---
title: "The Payment Succeeded, but the Plan Was Not Applied"
pubDate: 2026-07-06
description: "The payment flow assumed that a plan already existed: update-only logic must create the state when a concurrent trial operation has not created it yet."
tags: ["payments", "webhooks", "postgres", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

A user successfully paid for a monthly subscription but received access for only
a few days instead of the full paid period. The payment status was successful,
but the plan associated with the payment was not applied correctly.

## Context

The data showed a successful payment with no link to a user plan. The snapshot of
the plan data stored in the payment contained the correct monthly period. A short
plan had been created by a separate free-trial mechanism.

The ordering of operations mattered more than the values themselves: the payment
was created before the parallel operation committed the trial plan. The purchase
therefore observed no current plan.

## Root cause

The purchase flow first read the active plan identifier. For a new user it was
`NULL`. After a successful webhook, the handler tried to update the plan using
that identifier.

A condition such as `WHERE user_tariff_id = NULL` updates no rows. This was
particularly dangerous because the database layer treated the result as an
ordinary no-op: the paid plan was not created, and the handler did not report a
failure.

At the same time, the frontend started trial creation. This created a race: the
purchase could create the payment before the trial was committed, while the
purchase code assumed that an active plan already existed.

## Broken assumption

We assumed that every buyer already had a current plan that only needed to be
updated. Once trial creation became concurrent, that was no longer an invariant,
and the old update-only path became reachable in a normal user flow.

## Detection

The incident was found through a user report. A monitor counting successful
payments without a linked user plan could have found it within minutes.

An update affecting zero rows because of a missing identifier should also be
logged or fail explicitly instead of being treated as success.

## Fix

The payment handler now uses update-or-create: if the link is missing or the update
affects no rows, it creates a normal paid plan from the payment snapshot. A failed
creation is now reported explicitly.

In addition:

- the amount is converted to `Decimal` before insertion;
- webhook handling uses an atomic claim from `CREATED` to `SUCCEEDED`, so a
  concurrent duplicate delivery cannot apply the plan twice;
- after losing the claim, the handler re-reads the status and distinguishes an
  already completed race from an actual failure.

Unit tests were added for the payment handler flow.

## Test

The regression suite should cover at least two cases:

1. a successful payment webhook arrives before trial creation - the paid plan is
   still created with the correct period;
2. the same webhook arrives concurrently more than once - plan application runs
   exactly once.

It should also verify that an update against a missing link does not silently
  succeed and that a plan-application failure is not hidden after the payment
  status changes.

## Remaining limitation

Payment status and plan application still need to change in one consistent
transaction. Otherwise a successful status transition can leave a partially
applied result if the next step fails. This requires a separate monitor and is the
next hardening step for the payment path.

## General lesson

An operation that updates existing state stops being safe when another operation
can create that state concurrently. In critical payment paths, replace update-only
logic with upsert or create-if-absent, check affected-row counts, and make webhook
handling idempotent through an atomic state transition.
