---
title: "I Ran a Coding Agent on Two Consumer GPUs. Speed Wasn't the Bottleneck."
pubDate: 2026-07-05
description: "North Mini Code crossed the usefulness threshold under supervision, but not the trust threshold, on a local two-GPU coding-agent setup."
tags: ["local LLM", "coding agent", "llama.cpp", "OpenCode", "multi-GPU"]
lang: en
draft: false
---

> Original publication: [Medium](https://medium.com/@andreygaag/i-ran-a-coding-agent-on-two-consumer-gpus-speed-wasnt-the-bottleneck-2b63c66ec56d).

The setup worked. That was not the surprising part.

I did not build a dedicated AI workstation for this experiment. I used the Ubuntu gaming and media PC my family already had: an RTX 5060 Ti, an older RTX 3060 on a PCIe riser, and 64 GB of system memory. It is the same machine my son uses to record Minecraft videos.

<figure>

![The family gaming PC used for the experiment: an RTX 5060 Ti inside the case and an RTX 3060 on a PCIe riser.](./images/hardware.png)

<figcaption>The family gaming PC used for the experiment: an RTX 5060 Ti inside the case and an RTX 3060 on a PCIe riser, literally supported by LEGO.</figcaption>
</figure>

The question was not whether a local model could autocomplete a function. That bar is too low. I wanted to know whether this machine could support the full coding-agent loop: inspect a repository, plan, use tools, edit files, recover from errors, and keep enough context to work across a real application.

I ran North Mini Code through llama.cpp and connected it to OpenCode. The stable configuration used a 65,536-token context, and decoding rarely felt limiting. One preserved log reports 51.22 tokens per second; what those tokens accomplished is the more interesting part of the story.

Then I gave the agent a cross-stack task in an existing React and Go application. It found missing backend work before touching the frontend, produced a plan, edited the repository, and responded to review feedback. It also got stuck in a repetitive loop, crossed an architectural boundary, left cleanup work unfinished, and declared success before the evidence justified it.

That combination cleared two operational thresholds, but not the third:

- **Hardware.** The model fits with a useful context at interactive speed - passed for this configuration.
- **Usefulness.** The agent contributes to a real task - passed under supervision.
- **Trust.** The agent manages progress and proves completion - not passed.

Once inference became fast enough, the harder problems moved into the system around it: state, context, progress detection, architectural constraints, validation, and the definition of done.

## What I was actually testing

Cloud coding agents make my workflow depend on a network connection, provider policies, a subscription, and permission to send repository context outside infrastructure I control. Local inference reduced exposure to a hosted model provider and made failures easier to inspect. It did not guarantee confidentiality: prompts crossed my LAN over plaintext HTTP, and I did not audit the toolchain for telemetry.

I was not trying to prove that a local model was better than Claude Code, Codex, or any hosted service. I was testing a narrower hypothesis: could this machine support a local agent that was useful for real interactive work, and where would the first practical limit appear?

This was a field report, not a benchmark suite: one configuration, one feature, one application. The three thresholds are a framework for what I observed, not a basis for ranking models or estimating failure rates.

The system under test had a simple boundary:

```text
MacBook
OpenCode + repository + tool execution
        |
        v
OpenAI-compatible API over a trusted LAN
        |
        v
Ubuntu desktop
llama.cpp + North Mini Code
RTX 5060 Ti + RTX 3060
```

The model proposed actions; OpenCode exposed tools for repository search, file editing, and shell execution. Its OpenAI-compatible provider used the server's 65,536-token context and reserved 8,192 tokens for output.

That boundary mattered: the model produced proposals, while the harness decided what to execute, record, and accept as completion. It also defined the security risk. My command exposed an unauthenticated HTTP endpoint on every interface. A safer LAN setup would restrict the address and port, configure an API key, and use TLS or a trusted tunnel outside an isolated network.

## Threshold 1 - Hardware: the configuration that fit

### The machine I already had

The two GPUs come from different generations and have different memory and compute characteristics. This is not an optimal workstation; it is what happened after I kept the older card and added a newer one.

| Component | Configuration |
| - | - |
| CPU | AMD Ryzen 7 5700G |
| System memory | 64 GB DDR4 |
| Primary GPU | NVIDIA GeForce RTX 5060 Ti, 16 GB |
| Secondary GPU | NVIDIA GeForce RTX 3060, 12 GB |
| Total nominal VRAM | 28 GB |
| Operating system | Ubuntu Linux |

Those 28 GB are not one unified pool: each GPU owns its own VRAM, and llama.cpp distributes model layers between devices. One nvtop snapshot captured 13.3 GB in use on the RTX 5060 Ti and 9.2 GiB on the RTX 3060, connected over PCIe Gen 3 x8 and x4 links respectively.

<figure>

![An nvtop snapshot during the run, with both GPUs active.](./images/nvtop-memory.png)

<figcaption>One nvtop snapshot during the run: both GPUs were active, with approximately 13.3 GiB and 9.2 GiB of VRAM in use. This is a momentary observation, not a utilization benchmark.</figcaption>
</figure>

This is a momentary observation, not a utilization benchmark.

### The memory budget, not just the model weights

The North Mini Code model card describes a sparse 30B-A3B model: about 30 billion parameters in total, 3 billion active per token, and a native 256K context window. Sparse activation helps inference speed, but the weights still need storage. I used the community-produced Unsloth GGUF:

```text
North-Mini-Code-1.0-UD-Q4_K_M.gguf
```

The GGUF repository lists the relevant variants as follows:

| Variant | Size | Decision |
| - | - | - |
| Q4_K_M | 19.2 GB | Selected; left room for runtime memory |
| Q5_K_M | 22.9 GB | Not selected; less KV-cache headroom |
| Q6_K | 25.5 GB | Not selected; little runtime headroom |

I did not benchmark the variants. I chose Q4_K_M to leave runtime headroom, not because I proved it optimal.

The first wrong mental model was simple: if the weights fit, the model fits. The runtime also needs compute buffers and a KV cache that grows with context. I did not preserve the build or complete failed command, so four server slots were part of the failed configuration, not a measured cause.

### From a 131,072-token failure to a stable 65,536-token context

My first configuration requested a 131,072-token context. The model weights loaded, but llama.cpp failed while allocating the KV cache:

```text
failed to allocate buffer for kv cache
```

The log also showed four parallel slots, while I needed one session. The successful configuration combined:

- requested GPU offload for all model layers;
- reduced the context to 65,536 tokens;
- limited the server to one parallel slot;
- quantized the K and V caches to q8_0.

The resulting command, abridged here, was:

```bash
./build/bin/llama-server \
  --model North-Mini-Code-1.0-UD-Q4_K_M.gguf \
  --jinja \
  --n-gpu-layers 99 \
  --ctx-size 65536 \
  --parallel 1 \
  --cache-type-k q8_0 \
  --cache-type-v q8_0 \
  --tensor-split 16,12
```

Current llama.cpp requires Flash Attention for a quantized V cache and leaves `--flash-attn` at `auto`. Without the pinned commit and effective startup setting, this is not a portable recipe.

Despite its name, `--tensor-split 16,12` specifies proportions, not literal gigabytes. With the default layer split, llama.cpp distributes layers and their KV-cache allocations across devices. The current multi-GPU documentation is the reference for a new deployment.

I changed context length, slot count, and cache precision together, so the result belongs to the combination - not one flag.

**Threshold result:** passed for this configuration. The server initialized with a 65,536-token context and felt interactive throughout the supervised task. That establishes one working configuration, not an optimal split or a universal recommendation.

## Threshold 2 - Usefulness: a real change in an existing codebase

### The task and the acceptance boundary

Benchmarks do not expose the accumulated decisions and inconsistencies of a living application. I used an existing financial application with a React frontend and a Go backend, where the task could not be solved by generating one isolated component.

The request was to add transaction editing without a file-by-file implementation plan. The useful signal was whether the agent could discover the flow, identify missing backend behavior, plan across the boundary, and produce work a human could validate.

This was the practical acceptance boundary:

- identify the frontend, backend, and missing API behavior;
- produce a coherent cross-stack plan before editing;
- implement the bounded feature and respond to review;
- leave enough evidence for a human acceptance decision.

The last criterion is where the system proved weakest.

### What the agent did without a file-by-file plan

The planning phase went better than I expected. The agent traced the transaction flow through frontend and backend code, then surfaced a missing backend operation before generating the form.

That was the first moment the system felt like more than autocomplete. It was building a model of how the feature moved through the application rather than matching a filename and emitting a plausible component.

After I clarified the remaining choices, the plan covered the backend operation, schemas, service integration, frontend form, submission, and error handling. OpenCode moved the model between repository search, edits, and shell commands while llama.cpp handled inference.

During implementation, the agent stopped making progress and repeated the same reasoning. I stopped the session, changed repetition settings, and restarted. Later it reported completion, but my review found obsolete imports and changes that crossed an architectural boundary.

I returned those findings to the same session. The agent removed the imports and revised the implementation. That correction cycle is evidence of supervised usefulness.

It is not benchmark-grade proof of completion. I did not preserve the diff statistics, exact validation commands, duration, turn count, or final verification needed to claim autonomous success.

**Threshold result:** passed under supervision. The agent contributed useful planning and implementation work on a real repository, but a human still made the judgment calls, recovered the run, and set the final standard of acceptance.

## Threshold 3 - Trust: failure modes in the agent loop

Usefulness asks whether the system can contribute. Trust asks whether it can manage a long-running task without quietly losing progress, violating invariants, or mistaking a plausible story for evidence. This experiment did not clear that bar.

### A repetitive loop without progress

**Symptom:** The session repeated one four-paragraph cycle: diagnose the type mismatch, propose a fix, admit “I already tried that,” and try again. The model named its own repetition and still could not leave it. I did not preserve a tool trace, so I cannot count the wasted completions.

**Impact:** The loop consumed time and context until I stopped the session. A preserved 8,192-token completion may show the same failure from the server side, but I cannot prove the two artifacts belong to one request.

**Intervention:** I stopped the run, restarted the session, increased `--repeat-penalty` to `1.15`, and set `--repeat-last-n` to `2048`.

**Proven:** The same loop did not recur during the restarted implementation.

**Not proven:** The sampling change caused the improvement. Restarting also changed accumulated context and agent state.

**System fix:** Enforce progress outside the model. The harness should compare actions, outcomes, and task postconditions; stop repeated no-op work; summarize state; and require a new plan.

### Plausible code across the wrong boundary

**Symptom:** The model produced code that was locally reasonable but moved responsibility across an existing architectural boundary.

**Impact:** The feature could appear to work while weakening the system's structure. This is harder to catch than a syntax error because each edit looks plausible.

**Intervention:** Human review identified the mismatch and returned concrete feedback to the same session. The agent revised the affected implementation.

**Proven:** Repository access was not enough to preserve an implicit boundary. The agent responded once I made the constraint explicit.

**Not proven:** North Mini Code is generally worse at architecture than another model. This was one task and one review finding.

**System fix:** Make architecture agent-legible through module responsibilities, dependency rules, examples, and automated checks.

My failed assumption was that enough repository reading would reveal why its boundaries existed. Code shows the current shape, not always the reasoning behind it. Tacit knowledge does not exist for an agent unless the harness retrieves it or a validator enforces it.

### Completion without evidence

**Symptom:** The model produced a completion report through OpenCode even though review still found obsolete imports, inconsistent structure, and unresolved concerns.

**Impact:** The report's confidence exceeded its evidence. A plausible summary hid the absence of a coherent final diff and validation bundle.

**Intervention:** I reviewed the changes, returned the findings, and required another correction cycle.

**Proven:** The claim was premature, and the workflow did not require enough evidence before presenting it.

**Not proven:** A better system prompt alone would solve the problem. Prompting may help, but the lack of evidence also reflected failures in the harness and workflow.

**System fix:** Treat done as a validated state, not a model sentence. Require a bounded reviewed diff, mandatory checks, and unresolved assumptions before accepting completion.

The agent's completion report claimed that the implementation and manual verification were complete while still acknowledging TypeScript warnings. The screenshot records the claim, not the missing evidence behind it.

Deterministic checks are external evidence. A production harness should run and record them, then reject success when mandatory checks are missing or failing.

## The shared failure: weak global-state management

The three failures look different, but they share a pattern. The model was better at answering:

> What should I do next?

than at answering:

> Have I already done this? Am I still making progress? Does this change preserve the architecture? What evidence proves that I am done?

Those questions do not belong to the model alone. The harness is the control plane that executes allowed tools, records observations, preserves state, and evaluates completion. Better prompting cannot replace missing state, validators, traces, or recovery rules.

Written as a contract, the minimum I would require from that control plane:

After every agent step, record:

```text
signature = hash(tool name + normalized arguments)
outcome = hash(normalized result + relevant state)
progress = a declared postcondition changed,
           or new evidence resolved an explicit uncertainty
```

Stop, summarize state, and require a new plan when:

- a signature repeats with no progress in between;
- five consecutive steps produce no progress.

Accept “done” only when the claim arrives with:

- a bounded diff a human has reviewed;
- formatter, linter, type-checker, and test results;
- architectural checks, where they exist;
- a list of unresolved assumptions.

The step limit is a starting value, not a measured optimum. The important part is that progress and completion are explicit, observable, and enforced outside the model.

**Threshold result:** not passed. I would not leave this configuration alone with a repository. It needs external progress detection, explicit invariants, deterministic validation, and human judgment for architecture-sensitive work.

## Performance and measurement limits

One preserved llama.cpp log reports 8,192 generated tokens in 159,931.56 ms, or 51.22 tokens per second. Only while preparing this article did I notice that 8,192 was also OpenCode's output limit. Hitting it exactly strongly suggests truncation, although I did not preserve the finish reason. I also cannot prove that this log and the loop screenshot capture the same request.

The uncomfortable possibility remains: my best speed measurement may profile the failure I most needed the harness to catch.

The decode rate survives that reading; the flattery does not. The log still shows 51-53 tokens per second as context grows toward 42,085 tokens, but throughput says nothing about usefulness. A recorded finish reason would have made that obvious immediately.

One captured generation reached exactly the configured 8,192-token output limit at 51.22 tokens per second; the finish reason was not preserved. The timing block reports only 271 prompt tokens evaluated in 320 ms because llama.cpp reused a cached prefix. It says nothing about cold prefill near the 65,536-token limit - an important omission for an agent that may need to restart a session.

Without synchronized OpenCode events, the GPU-utilization graph could not distinguish inference from tool execution. I also did not systematically compare:

- GGUF quantizations;
- tensor splits or single- versus dual-GPU execution;
- 32,768-, 65,536-, and 131,072-token contexts under identical prompts;
- cold-prefill and end-to-end agent-turn latency;
- tool-call count or total task duration.

The defensible result is narrow: decoding felt fast enough for this supervised workflow, while reliability and validation demanded more attention. Another task, build, or hardware topology could move that boundary.

## What this setup is actually good for

I would keep this stack for three roles:

1. **Locally controlled, inspectable inference.** Requests stay on machines I control, subject to the LAN and telemetry caveats, and I can inspect the server and tool outputs.
2. **An external-provider fallback.** Once the machines can communicate locally, inference does not depend on a cloud model endpoint.
3. **Supervised implementation.** The agent can explore, draft, and revise a bounded change while a human reviews the plan, diff, and architectural judgment.

I would not use this run as evidence for unattended development. The agent did not demonstrate reliable loop recovery, architecture preservation, or evidence-based completion. Those are precisely the capabilities that matter when no human is watching.

Would I replace Claude Code or Codex with this setup? No. Would I keep it running? Yes.

## Conclusion: invest in the harness, not just the GPU

The hardware threshold passed. The usefulness threshold passed under supervision. The trust threshold did not.

A mismatched pair of consumer GPUs gave a local coding agent enough memory and speed to work across an existing repository. North Mini Code could explore, plan a cross-stack change, use tools, and respond to review. It could also repeat an approach, weaken an architectural boundary, and announce completion without proof.

Once inference felt interactive, reliability depended on the system around the model: how the harness records state, detects stalled progress, exposes architectural rules, and validates completion.

Better local agents will need better models. For this system, however, the next useful investment is a better harness.

Part of that harness is buildable today. OpenCode's plugin API exposes tool hooks and shell access for action signatures, outcomes, and repository-state checks. It does not yet expose an enforceable stop hook: `session.idle` fires after the loop has stopped, so a true completion gate still needs an external wrapper or upstream support. Building the progress detector - and re-running this task with the trace this report lacks - is the next article.
