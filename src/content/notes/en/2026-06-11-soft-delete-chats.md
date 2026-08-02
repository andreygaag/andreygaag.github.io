---
title: "User Data Should Be Soft-Deleted"
pubDate: 2026-06-11
description: "When a user deletes a chat by mistake, soft deletion with controlled recovery is safer than immediate physical deletion."
tags: ["backend", "data", "reliability", "privacy"]
lang: en
source: "field-note"
draft: false
---

## Symptom

A user accidentally deleted important chats and asked for them to be restored.

## Context

The chats were recovered by clearing `delete_at` in the database record. Recovery
worked because deletion was logical: the source data was still stored and the
record retained its deletion marker.

## Root cause

The delete operation changed the record's state without physically destroying it.
This made recovery possible without reconstructing the content from a backup.

## Broken assumption

Deletion is often treated as one irreversible action. For user data, that is not
always the best default: an accidental click or UI error should not immediately
turn into permanent content loss.

## Detection

The incident was found through a user report. Earlier detection would benefit from
recovery metrics and a periodic check that soft-deleted records are hidden from
ordinary queries but remain available through the controlled recovery path.

## Fix

Chats and other recoverable user objects used soft deletion with a field such as
`delete_at`. Ordinary queries excluded deleted records, while recovery became a
separate authorized operation with an audit log.

Physical deletion happened later according to a retention policy, after the
recovery window had ended.

This design must not contradict the user agreement: retention periods, recovery,
and permanent deletion must match the rules explicitly presented to users.

## Test

The regression scenario should verify that a deleted chat:

- disappears from ordinary results;
- remains available to the recovery operation;
- is restored with its original content;
- cannot be recovered after physical deletion.

## General lesson

User deletion should separate hiding data, recovery, and permanent destruction.
Soft deletion preserves a way to correct an accidental action, but it requires
strict access control, a retention policy, and filters that exclude deleted data
from ordinary queries.
