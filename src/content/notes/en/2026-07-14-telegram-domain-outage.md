---
title: "Critical Links Should Not Depend on One External Domain"
pubDate: 2026-07-14
description: "When an external Telegram domain temporarily stopped working, every link to a bot, channel, or user failed at once."
tags: ["reliability", "networking", "telegram", "operations"]
lang: en
source: "field-note"
draft: false
---

## Symptom

Links to bots, channels, and users through the `t.me` domain stopped working. The
problem affected every place where the domain had been embedded in generated
links.

## Context

The external domain became temporarily unavailable. The registrar did not
reliably confirm the reason or recovery time, but the product impact was clear:
links that should have opened Telegram resources no longer worked.

## Root cause

Critical user-facing links were generated directly with an external service
domain. The application had no redirect layer of its own that could replace the
target domain without changing every stored and generated link.

## Broken assumption

We assumed that a global service's domain was reliable enough not to disappear
without warning. Even infrastructure that appears permanent can become
temporarily unavailable when it is outside the application's control.

## Detection

The issue was found through broken links. Earlier detection requires periodic
monitoring of several critical bot, channel, and user links, checking not only the
HTTP response but also the expected redirect and target.

## Fix

We quickly switched the links to an available alternative Telegram domain. This
restored the links without changing the Telegram resources themselves.

## Test

The regression check should:

- verify that the generator uses a controlled redirect URL instead of embedding an
  external domain directly;
- periodically open several critical links;
- verify that changing the target domain does not break existing links.

## General lesson

Generate critical external links through an owned redirect or link service. The
target domain should be changeable in one controlled place; otherwise an external
registrar failure becomes a product-wide outage.
