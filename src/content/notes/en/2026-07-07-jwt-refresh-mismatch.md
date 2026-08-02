---
title: "JWT Refresh Broke After a Service Migration"
pubDate: 2026-07-07
description: "After a service move, users were logged out because access and refresh tokens became unsynchronized and configuration silently fell back to defaults."
tags: ["authentication", "jwt", "configuration", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

After an older service was moved to a separate domain and database, users began to
be logged out intermittently.

## Context

The service was separated from shared infrastructure, so its domain, database, and
CI environment variables changed at the same time. The user interface continued
working until the access token expired, but it could not always obtain a new token
pair afterward.

## Root cause

The frontend token-refresh logic replaced the `access_token` but not the
`refresh_token`. The next refresh cycle used the old refresh token and failed.

Two configuration errors made the problem worse: the variable names in CI did not
match the names read by the backend, and a missing value silently fell back to a
short default refresh-token lifetime. Behavior therefore depended on the
environment and appeared as a random logout.

## Broken assumption

We assumed that the frontend JWT refresh flow was already correct and that an
environment-variable problem would either not occur or become immediately
obvious. Neither assumption was protected by a contract check across the client,
backend, and CI.

## Detection

User reports after the migration were the first signal. Two automated signals could
have found the problem earlier:

- an integration check for the complete access/refresh token rotation cycle;
- starting the backend without a required environment variable and expecting an
  explicit failure instead of a default.

## Fix

We fixed the frontend handler so that it stores both tokens after a refresh and
removed defaults for required JWT environment variables. The mismatch between CI
variable names and backend names was also corrected.

Missing critical configuration should now fail during service startup instead of
appearing as a random user logout later.

## Test

The regression test should:

1. issue a token pair;
2. refresh it after the access token expires;
3. verify that the client stores both the new `access_token` and the new
   `refresh_token`;
4. refresh again using the new pair.

A separate configuration check should start the backend without a required JWT
  variable and expect an explicit startup error. The original note does not record
  an automated test for this scenario.

## General lesson

Secrets and security parameters should not have silent defaults. Token refresh
needs to be tested as one protocol: the client must store every updated value, the
backend must issue a consistent pair, and CI must provide the exact variables the
application reads.
