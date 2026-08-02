---
title: "The Canon Has Not Yet Formed"
pubDate: 2026-06-09
description: "The engineering discipline of agentic systems is taking shape before our eyes: core computer science principles remain, but the canon of agent engineering does not yet exist."
tags: ["agents", "llm", "architecture"]
lang: en
draft: false
---

## The industry is very young

In many fields of human activity, practices and standards have been refined for
centuries or even millennia. Software development has existed for less than a
century. Only eight decades have passed since it emerged in the 1940s, and the
industry has already undergone several shifts that changed both its practices
and its standards:

- the 1950s and 1960s - the transition from machine code to high-level
  languages such as FORTRAN, COBOL, and LISP;
- the 1960s and 1970s - Unix shifted the focus from programming for specific
  hardware to programming for an operating system;
- the 1970s - structured programming, testing, and modularity;
- the 1980s and 1990s - personal computers, the consumer market, and GUIs;
- the 1990s - the internet, the web, and distributed systems;
- the 2000s - enterprise standardization, Java, the JVM, and .NET;
- from 2007 onward - smartphones put a capable miniature computer in almost
  every pocket;
- the 2010s - big data and machine learning;
- from around 2015 - containerization, Docker, CI/CD, cattle-not-pets,
  scaling, and SRE;
- from around 2022 - LLMs and agentic systems;
- 2025-2026 - a qualitative leap in both LLMs and agentic systems.

## Fundamental shifts are accelerating

Our industry has always been turbulent. But fundamental changes that once took
decades now fit into a few years, and the pace does not appear to be slowing.

## The principles do not change

The fundamental principles and problems remain with us. Managing complexity -
the challenge Uncle Bob taught us to confront - was, is, and will remain the
central task from assembly language to LLM agents. Abstractions save us, yet
they still leak: hidden details slip into other layers or protrude through their
boundaries regardless of the stack, target device, or AI-first label in a
product description.

Data persistence and consistency have not disappeared either. Our beloved ACID
still matters: data is everything, and without it a program loses its purpose.
Networks remain unreliable whether an AWS outage cuts off an LLM or a website
becomes unreachable in the 1990s. Coordination under concurrency has not gone
away: just as two processes need synchronization when sharing memory, two
subagents need coordination when editing the same file. We could name a dozen
more examples, but the point would remain the same.

Tools change speed, not the physics of complexity.

Each new era has moved and encapsulated complexity rather than eliminating it,
building new abstractions along the way. Despite the marketing and panic around
the technology, LLMs do not invalidate computer science. They turn part of
deterministic engineering into probabilistic engineering.

## Peak turbulence

In production-grade LLM agents, all this turbulence reaches maximum intensity:
tooling and conceptual shifts happen within a few months. Fundamental principles
and established methods help to a degree, and the industry is gradually
crystallizing new practices, but in the most interesting areas we still have to
feel our way through the dark.

Anthropic may describe some of its hard-won lessons on its blog, but it will not
give away durable practices that create a competitive advantage. Google
engineers published _Agentic Design Patterns_, but without testing complex
combinations of those patterns in practice, the book is less useful than it
could be. Humanity already has some working knowledge, but it is scattered
across the minds of individual engineers and teams. Chip Huyen confirms this in
her book: she had to gather information piece by piece through private
conversations with engineers.

## We are helping form the canon

The engineering discipline of agentic systems is taking shape right now.
Today's experiments and mistakes will become tomorrow's standards, and we are
participants in that process. There is no canon yet, nor are there stable
frameworks proven over years and millions of user scenarios.

We must keep watching the industry, learn from the best, absorb the rare pieces
of systematic work we can find, and, above all, practice: try new models and
architectures, build agents, and test ideas against reality.

We live in a remarkable time - a time of discovery, change, and opportunity.
This new engineering discipline is forming before our eyes, shaped not only by
technology giants but also by small teams and even individuals. It is all in
our hands and minds.
