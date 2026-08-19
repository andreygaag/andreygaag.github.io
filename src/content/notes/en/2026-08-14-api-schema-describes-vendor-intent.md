---
title: "An API Schema Describes Vendor Intent, Not Client Behavior"
pubDate: 2026-08-14
description: "A documented hash in a VK button broke mini-app navigation; comparing three links found the cause where another schema-based hypothesis did not."
tags: ["api", "integrations", "debugging", "reliability", "testing"]
lang: en
source: "field-note"
draft: false
---

## Symptom

A user clicks a bot button in a chat that should open a VK mini app. Instead of
the app, VK shows its own “Page Not Found” screen. Clicking that screen makes it
disappear, and the app opens normally. The behavior reproduced identically in
the web and mobile clients.

## Context

VK lets bots add an `open_app` button to a keyboard. According to the
[official `messages_keyboard_button_action_open_app` schema](https://github.com/VKCOM/vk-api-schema/blob/master/messages/objects.json#L1306-L1344),
the action has four required fields — `type`, `app_id`, `owner_id`, and `label`
— plus two optional fields: `payload` and `hash`. The schema shows that `hash`
becomes the fragment of a link shaped like
`vk.com/app{app_id}_{owner_id}#{hash}`. This is the intended channel through
which the button tells the app where to open.

The backend used it for exactly that: a new-conversation notification put a
`conversation=<id>` key into `hash`, while a regular bot response used the
`from_bot` marker. The frontend read the key and opened the target conversation.

A colleague investigating the frontend side reported a cause: the button was
supposedly being sent as a regular `open_link`, so it had to be replaced with
`open_app`. That claim was derived from the symptom, not measured.

## Root cause

VK was a broken mess at this boundary.

In the clients I tested, VK responded with its own “Page Not Found” screen when
an app link contained a `#fragment`. The app loaded only after the user clicked
through that error. The fragment's contents did not change the symptom.

I measured this manually by comparing three links in a browser: the app link
without a fragment opened cleanly, while both `#from_bot` and
`#conversation=<id>` produced the 404.

The observed defect was therefore on the VK side: the platform documents
`hash` as a launch-parameter mechanism, while its clients broke navigation when
that parameter was present. Our code could only work around it by dropping the
fragment.

## Broken assumption

I assumed VK's documentation was current and accurately described client
behavior. In practice, it described intent: `hash` was documented as a working
channel, which is precisely why we used it.

The same assumption produced a false diagnosis. Our button differed from the
schema in only one place: the wrapper library unconditionally wrote
`payload: null`, while the schema types `payload` as a string. That led to the
hypothesis that the client could not parse the action and fell back to the web.
We implemented and released that fix, but the symptom did not change.

Both conclusions — the diagnosis and the failed fix — came from the
specification. Neither was measured before implementation.

## Detection

Three manual openings exposed the cause: one without a fragment and two with
different fragments.

Our code cannot observe this automatically. The foreign client renders the 404,
and we receive neither a response code nor an event. Without automating those
clients, the only early signal here is a person opening the link and seeing the
result.

## Fix

I removed `hash` from the button completely.

The conversation parameter went with it across the entire chain: the keyboard
builder, the notification sender, the notifier protocol, and the call site in
the thread-materialization loop.

We lost the deep link into a specific conversation: the app now opens on the
list. Opening the target thread will require a different mechanism.

## Test

I added a unit test that compares the action's complete key set with a reference
dictionary instead of checking individual fields. The old tests checked `hash`
and `app_id` in isolation, so they caught neither an extra `payload` nor the fact
that a fragment should not be sent at all. The new test turns red on any extra
key, including a reintroduced `hash`.

That test cannot cover the defect inside VK's client itself.

## General lesson

A third-party specification describes intent; it does not guarantee behavior.
When a transition across a system boundary is broken, measure the difference
between a working and failing call instead of deriving it: find the nearest
working path and reduce the differences to one.

Two consecutive plausible hypotheses from the documentation that fail to
reproduce are a sign that the investigation is on the wrong track. After the
second one, change the method, not the hypothesis.

One more thing: a causal claim from the person investigating the problem remains
a hypothesis until they say how it was measured. Here, reading the wrapper
library's source disproved “it sends `open_link`” in a couple of minutes: it had
emitted `open_app` since its first commit.
