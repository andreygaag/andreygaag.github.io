---
title: "Do Not Share Local and Container Environments"
pubDate: 2026-06-17
description: "Ruff stopped launching in Zed because the local project used a Linux binary from a container virtualenv."
tags: ["python", "tooling", "containers", "developer-experience"]
lang: en
source: "field-note"
draft: false
---

## Symptom

The Ruff language server in Zed repeatedly reset its connection and failed to
start.

The error indicated that the Ruff binary could not be executed.

## Context

The same project directory was used by local tools and checks inside a Linux
container needed to run [ralphex](https://github.com/umputun/ralphex). When checks
ran in the container, a Linux Ruff binary was placed in the shared virtualenv. The
macOS editor then tried to launch it as a local command.

## Root cause

The virtualenv was platform-specific but was treated as portable between the local
macOS environment and the Linux container. Zed therefore received a binary built
for another operating system.

## Broken assumption

I assumed that a virtualenv could be safely reused between two environments as
long as they shared the same source code. The source is shared, but binary
dependencies and environment tools are not.

## Detection

The language server's stderr was the signal: the Ruff binary existed at the
expected path, but the operating system could not execute it. Checking the binary
architecture and the virtualenv owner should be part of diagnosing this class of
failure.

## Fix

I created two independent virtualenvs:

- a local environment for the editor and macOS runs;
- a container environment for ralphex and Linux checks.

Shared source code does not mean that an environment containing binary
dependencies should also be shared.

## Test

Run Ruff independently from each environment and verify that Zed uses the local
interpreter while container checks use their own. CI should also verify that a
virtualenv is not placed in a directory mounted between different operating
systems.

## General lesson

Virtualenvs and other directories containing binary dependencies belong to a
specific platform. Separate tool environments between host and container even
when the project source is shared.
