---
title: "The LD_PRELOAD trick that made our out‑of‑memory bug reproducible (and the demo it still crashed)"
pubDate: 2026-10-05
description: "How I used a tiny LD_PRELOAD malloc-failer to reproduce OOM paths locally, the leak it revealed, and the one time I accidentally shipped the shim into CI."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A developer laptop on a wooden desk showing a terminal with code and a cup of coffee beside it"
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["devtools", "debugging", "infra"]
---

I was twenty minutes into a client demo at 11pm when the payment microservice went angry: heap exhaustion, followed by a cascade of failed requests and a single, terrible line in logs — “unable to allocate memory”. In production, systemd restarted the service and we carried on. Back at my desk, reproducing that exact failure felt impossible. My laptop had 16GB and a relaxed GC; the service never choked the way it did on the staging box.

I needed a way to force the process into an OOM-like state locally — reliably, cheaply, and without spinning up a fleet of expensive cloud VMs. What I landed on was ugly, surgical, and effective: an LD_PRELOAD library that makes malloc start failing after a threshold. It exposed the exact error path that leaked buffers, let me write a fix, and — full disclosure — once I forgot to remove the shim from a CI job and spent a frantic half-hour undoing a cascade of red builds.

Why normal load tests missed it

We did the usual: load tests, heap profilers, and a daily stress job on a t3a.medium-like instance. Those tests raised average memory use and caught a few allocations, but not the exact interaction that blew up in the demo.

Two reasons:

- The production allocator and runtime behaviour were slightly different (jemalloc + patched glibc vs my laptop).
- The bug wasn’t a steady leak. It was a rare error path that allocated a series of buffers and didn’t free them when an intermittent network call returned a 5xx. You only hit it when X and Y aligned. Simulated load didn’t recreate the alignment.

I needed deterministic failures of allocations, not probabilistic memory pressure.

The tool: a tiny LD_PRELOAD malloc-failer

LD_PRELOAD lets you slip a shared lib in front of libc functions. I wrote a 60‑line C shim that overrides malloc/calloc/realloc/free and makes malloc start returning NULL after N bytes (configurable via an env var). Compile it once and you can inject it into any native binary. It’s quick to build, costs ₹0, and runs on Linux — ideal when CI credits are tight and office internet is flaky.

Here’s the idea (paraphrased, not copy-paste):

- Track total bytes handed out by your malloc wrapper.
- When total >= MALLOC_FAIL_AFTER (in bytes), make subsequent malloc/calloc/realloc return NULL.
- Let free call through to real free so the app still tries to clean up.

Build:
gcc -shared -fPIC -O2 -o liboom.so oom_shim.c -ldl

Run:
MALLOC_FAIL_AFTER=50000000 LD_PRELOAD=./liboom.so ./my-server-binary

Tips that saved me time
- Start with a small threshold (10–50MB) to trigger failures quickly.
- Run one worker thread/process at a time to keep results deterministic.
- Use it in a container with the same base image as staging. Mount the shim into the container and set LD_PRELOAD in the entrypoint.
- If your service uses jemalloc, override malloc symbols for jemalloc too or use jemalloc’s test hooks — otherwise you’ll get a false negative.

What it found (and why it mattered)
The shim made allocations fail predictably on a test branch. The server hit the failing path, logged a clear chain of errors, and I saw a nontrivial chunk of memory never being freed after an early return in an error handler. The fix was a one‑line free in the error path and a small defensive check.

That alone saved us the cost of a full staging rerun (I estimated at least ₹6,000 of cloud time avoided) and, more importantly, a rerun of a late-night demo. The lean, local reproduction let me iterate quickly.

One hard lesson: the time it crashed CI

I’m not proud of this. A colleague and I templated a docker image for quick mem‑failure testing and accidentally left LD_PRELOAD enabled in a debug stage that our master branch CI pulled in occasionally. Overnight we woke up to dozens of red builds for unrelated repos.

Why it happened: the shim returns failure codes that look a lot like genuine test failures. Our pipelines didn’t separate “expected debug failures” from real ones.

What I changed:
- Never leak LD_PRELOAD into CI YAML. Use a local-only script that wraps docker run and injects the shim.
- Add a clear env guard: if CI==true exit early.
- Add a tiny acceptance test that ensures CI pipelines don’t run with MALLOC_FAIL_AFTER set.

Limitations and tradeoffs
This trick is surgical, not universal.

- It only simulates allocation failure via malloc. If your language runtime uses mmap heavily, or a custom allocator, you may miss the real behaviour.
- It can generate false positives: code paths that handle allocation failures gracefully might look broken under the shim but are fine under normal pressure.
- It’s invasive; you must treat the shim like a scalpel, not a crutch. I use it as a focused instrument to target error handling and rarely run it in broad system tests.
- It won’t reproduce kernel-level OOM (the oom-killer). For those, you still need a constrained VM/container.

Where it fits in a small Indian team
For teams in startups or small companies in India — where CI credits, cloud spend, and time are limited — the LD_PRELOAD approach is a high signal-to-cost test. It’s free, runs on your dev machine or a cheap ₹300 VPS, and finds the kinds of edge-case error paths that only show up in production-like interplay.

But treat it with respect. Guard your scripts, document when and why to use it, and add an explicit “this is destructive” check before you run it in shared environments.

One takeaway (that I actually kept)
Force failures where the code tries to do the work and handle the error. You don’t need a hundred machines. You need reproducibility. LD_PRELOAD gives you deterministic allocation failures so you can exercise cleanup and error paths. Use it for targeted, quick experiments — and never, ever forget to turn it off before pushing to CI.