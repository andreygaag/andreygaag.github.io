---
title: "CI Should Not Depend on One Package Registry"
pubDate: 2026-06-08
description: "External PyPI timeouts can break container builds; mirrors and an owned registry turn that dependency into a manageable failure."
tags: ["ci", "containers", "python", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

CI started failing while building images because connections to `pypi.org` timed
out.

## Context

The build depended on an external package registry. When the connection became
unavailable from the build environment, neither the code nor the Dockerfile had
changed, but new images could no longer be built.

## Root cause

One external registry was the only source of Python packages for CI. The reason
for the outage could have been in the network perimeter or on the route to the
registry, but the architectural result was the same: a critical pipeline depended
on one external point.

## Broken assumption

We treated a public package registry as such a fundamental part of the ecosystem
that its availability did not need to be designed for. A service's popularity does
not make a particular network route or endpoint guaranteed to be reachable.

## Detection

The pipeline detected the problem through repeated dependency-installation
timeouts. A separate monitor should check registry availability from the same
network perimeter where CI runs, not only from a developer workstation.

## Fix

A PyPI mirror was configured as the primary source. A backup mirror and an owned
proxy/cache were also defined for the production
workflow, retaining required package versions without depending on one external
route.

## Test

The build should be tested from the CI environment with:

- the normal registry;
- the primary registry unavailable;
- a switch to the backup source;
- packages available only in a local cache or proxy.

Reproducibility through the lock file and availability of all required artifacts
in the backup source should be checked as well.

## General lesson

External package registries are part of the supply chain, not an abstractly
reliable background service. Critical CI needs mirrors, a cache or owned proxy,
and a regularly tested failover plan.
