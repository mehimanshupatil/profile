---
title: "Why I Use eBPF for Production Profiling — and When It Sucks"
pubDate: 2026-03-01
description: "How eBPF profiling gave our small Indian team deep, low-overhead visibility—what worked, what broke, and when to stop using it."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=1000&w=2000"
  alt: "Rack of servers in a data centre lit with blue LEDs"
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["eBPF", "performance", "observability"]
---

We shipped a performance fix in the middle of an Indian festival week because a tiny spike in tail latency started costing customer trust. The usual suspects—DB slow queries, noisy cache keys—looked fine. Instrumentation showed nothing useful. Then a teammate suggested: try eBPF profiling on the live service for a few minutes. Within ten minutes we had a clear off-CPU flamegraph pointing at a surprising syscall-heavy code path. We fixed it the next day.

This is why I use eBPF profiling: it gives low-overhead, deep visibility into what code actually does on real hosts. But it also comes with practical headaches that make it a tool for specific problems, not a silver bullet.

What eBPF profiling actually buys you
- Kernel-level visibility without touching app code. You can see syscalls, scheduler events, network latencies, and stacks combined from kernel and userspace.
- Very low overhead for short diagnostic runs. Properly used, you can run sampling-based traces on production without breaking SLAs.
- Immediate, actionable insights when traces and metrics disagree—especially for tail latency, context switches, and unexpected blocking.

A few real examples from our stack
- A Node.js worker intermittently stalled in production. Standard metrics looked fine. eBPF profiling showed long poll() syscalls corresponding to a misconfigured file descriptor in a third‑party library.
- Our sidecar added 5–10 ms of p95 latency only under specific load. eBPF revealed packet drops handled in kernel and the sidecar’s retry logic amplifying the delay.
- A cron job blocked on DNS lookups. Off‑CPU stacks pointed straight to synchronous getaddrinfo calls in a rarely executed code path.

How to get started (pragmatic checklist)
1. Confirm kernel and distro support. For useful features you’ll want Linux 5.x or recent stable 4.14+ with CONFIG_BPF and related options enabled. Many managed VMs in India (cheap VPS, older company fleets) still run older kernels—check first.
2. Pick your tools. I use bpftrace for ad‑hoc sampling and flamegraphs, and BCC tools for quick syscall and tcp traces. For longer runs, consider OpenTelemetry integrations or eBPF-based SaaS like Pixie—if your security and budget allow.
3. Start with sampling. A simple bpftrace one-liner that samples stack traces every N microseconds will show hot paths without instrumenting code.
4. Limit scope and time. Run on a single instance or a small canary subset for 30–120 seconds. Capture PID or container ID filters to reduce noise.
5. Archive traces and correlate. Save raw stacks and correlate them with deployment tags, commit IDs, and business events. That’s how you derive repeatable fixes.

A quick command I’ll run when nothing else helps
(safe, short sampling to collect user+kernel stacks for PID 1234)
sudo bpftrace -e 'profile:hz:97 /pid == 1234/ { @[ustack(100)] = count(); }' -t  > stacks.txt
Then convert counts to a flamegraph locally. It’s boringly effective.

When eBPF profiling shines
- Sporadic, hard-to-reproduce tail-latency issues
- Problems that sit at the kernel-user boundary (syscalls, context switches, io waits)
- Investigations where adding instrumentation is hard (third-party libs, older services)

Real constraints and tradeoffs (the part nobody markets)
- Kernel compatibility and host control: If your instances are on a managed container platform, or if the kernel is old, you may be blocked. Our team ran into this with a vendor-managed Kubernetes cluster where eBPF was disallowed for security reasons.
- Security and compliance: eBPF can introspect user processes. InfoSec teams may object unless you define clear rules, RBAC, and short retention for traces.
- Human cost: eBPF output is powerful but noisy. It requires someone who can read flamegraphs and map kernel traces back to source. That expertise isn’t free in a small team.
- False confidence: eBPF is great at showing what happened on a host, not why business-level behavior led to that state. It complements but does not replace domain-specific tracing or logging.
- Edge-case overhead: while sampling is low-overhead, heavy instrumentation (kprobe for many functions, long runs) can hurt performance. We learned the hard way by running a long trace across a fleet and triggering GC spikes in Java services.
- Observability debt: without good correlation (logs, traces, deployment metadata), raw stacks are just data. It’s tempting to run traces ad hoc and lose the context needed for long-term fixes.

Practical governance that saved our skin
- A short runbook: every eBPF session must be <5 minutes on production, targeted to specific hosts, and logged in an internal runbook with purpose and owner.
- RBAC and audit: only two engineers can run ad‑hoc probes on prod. Others run a templated, read-only summarizer that pulls archived traces.
- Change process: when eBPF shows a reproducible issue, we convert it into a code fix with tests or a controlled config change—no “permanent eBPF patches.”

When to stop and use something else
If a problem is reproducible in a test environment, instrument code or add metrics. If you need long-term SLO monitoring, invest in lightweight application metrics and tracing. eBPF profiling is best as a fast, last-mile diagnostic—especially when other tools disagree.

Parting thought
In resource-conscious Indian teams (small infra budgets, mixed host control), eBPF profiling is a force-multiplier: a short burst of kernel-level truth that often points at a fix. But it’s not a replacement for good telemetry, and it brings operational and security friction. Use it for the weird, stubborn cases; treat it with the same discipline you’d apply to a hotfix in the middle of the night.

If you want, I can share the exact bpftrace snippets and a short runbook we use for canary traces—practical templates you can adapt to an Ubuntu 22.04 fleet or a small GCP project.