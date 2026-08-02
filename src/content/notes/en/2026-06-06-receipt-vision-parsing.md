---
title: "One Vision Model Is Not Enough for Reliable Receipt Parsing"
pubDate: 2026-06-06
description: "A vision model may read a receipt but still confuse prices, names, quantities, or totals; reliability requires a verifiable pipeline."
tags: ["agents", "vision", "data-quality", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

Vision-based receipt parsing was unreliable. The model confused prices, distorted
product names, misread the total, and was especially error-prone with quantity or
weight.

## Context

The receipt image was sent to the model with the expectation that it would return
structured fields directly. Several days of use on receipts from shops and cafes
showed that a plausible response was not the same as correctly extracted data.

## Root cause

A single vision-extraction step is insufficient when the final values must be
consistent with one another. Price, quantity, weight, line total, and grand total
need validation, not only visual text recognition.

## Broken assumption

I assumed that sending a receipt image to a vision model would produce a ready
structured object. That combines text recognition, field interpretation, and
arithmetic-invariant checking into one probabilistic step.

## Detection

The problem appeared after several days of use: errors recurred in prices, names,
and totals, while lines containing quantity or weight formed a separate failure
class.

## Fix

Instead of converting an image directly into a final object, a multi-stage
pipeline was defined:

- extract text and coordinates from the image;
- normalize lines and numbers;
- identify price, quantity, and weight;
- recalculate totals and check consistency;
- preserve the original region for manual review of uncertain fields.

The original note does not record a completed implementation of this pipeline, so
this section records the direction of work rather than claiming that the pipeline
was completed.

## Test

Build a receipt set with different layouts, quantities, weights, discounts, and
line wrapping. For every result, check not only text fields but also arithmetic:
line totals should agree with the grand total, and uncertain results should enter
manual review.

The original note does not record an automated test set.

## General lesson

A vision model is an extraction component, not a complete accounting system. When
data must be accurate, surround probabilistic output with normalization,
deterministic checks, and a clear manual-correction path.
