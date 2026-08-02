---
title: "An Audio Fallback Must Cover Real Decode Failures"
pubDate: 2026-06-01
description: "Audio files can play successfully while a library fails to inspect them: an ffmpeg fallback should not be limited to one assumed exception type."
tags: ["audio", "python", "reliability", "fallback"]
lang: en
source: "field-note"
draft: false
---

## Symptom

Some users' audio files could not be transcribed even though the files played
successfully. Telegram displayed their duration as `00:00`, while other `m4a`
files were processed normally.

## Context

The service first determined the audio duration with `pydub` and then sent the
file for transcription. For the problematic files, `pydub` could not read the
metadata correctly, so execution never reached transcription.

## Root cause

After a `pydub` failure, the function raised an exception instead of falling back
to `ffmpeg`. The handler covered only `IndexError`, while the library could also
raise `CouldntDecodeError`.

## Broken assumption

We assumed that a failure to determine duration in `pydub` would always produce the
same exception type. The fallback therefore covered only one known scenario and
did not run for other decode failures.

## Detection

Debugging the specific files exposed the problem: they played successfully but
reported zero duration and never reached transcription. Comparing them with
ordinary `m4a` files showed that the failure depended on file characteristics,
not only on the extension.

## Fix

The handler was extended to cover `CouldntDecodeError` and use the `ffmpeg`
fallback for errors indicating that `pydub` could not decode the file.

The fallback still has a clear boundary: if `ffmpeg` cannot read the file either,
the service returns an explicit error instead of hiding the failure.

## Test

We tested the original problematic files and ordinary audio files. The regression
set should include both classes: files that `pydub` processes successfully and
files that require the `ffmpeg` fallback.

## General lesson

When a fallback covers a real failure class, do not limit it to one assumed
exception. Cover the meaningful decode boundary while keeping an explicit error
when the fallback path fails as well.
