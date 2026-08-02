---
title: "Not Every Good Idea Deserves Automation"
pubDate: 2026-06-01
description: "An idea suggested by a model and phrased conveniently is not automatically a useful change: validate its value and success criteria first."
tags: ["agents", "automation", "engineering-practice", "decision-making"]
lang: en
source: "field-note"
draft: false
---

## Symptom

I spent about an hour changing the filename format for field notes even though
the change did not solve a real problem.

## Context

The model suggested storing notes with a date and slug instead of only a date in
the filename. The idea sounded convenient, so I started implementing it
immediately. During the work it became clear that the new format did not provide
meaningful value for the current workflow.

## Root cause

I accepted a proposal for implementation before defining the problem, expected
benefit, and success criterion. The idea passed the test of sounding reasonable,
but not the test of being necessary.

## Broken assumption

I trusted the model. It can produce a plausible optimization whose implementation
and maintenance cost are
not worth the benefit.

## Detection

The signal was the lack of a concrete result after a noticeable amount of work:
the new filename format did not speed up discovery, improve publishing, or remove
an observed problem.

## Fix

I stopped the change and returned to the existing format. For subsequent decisions,
I recorded the need to check the problem, expected benefit, and measurement method
separately.

## Test

Before implementing a proposal, record a short decision note with:

- the original problem;
- the expected effect;
- the success criterion;
- the cost of the change and rollback.

If these points cannot be stated, the change is still a hypothesis rather than an
implementation task.

## General lesson

Distinguish “I like the idea” from “the idea benefits the system.” Regular field
note reviews help turn observations into decisions instead of automatically
increasing the number of changes.
