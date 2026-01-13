---
title: "When a 10% CPU Spike Felt Like a Mystery — How Flamegraphs Solved It"
pubDate: 2026-01-13
description: "How I used flamegraphs to find a sneaky CPU hotspot in production, with practical commands, tool choices, and real tradeoffs for Indian teams."
author: "Rohan Deshpande"
image:
  url: "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&h=1000&w=2000"
  alt: "Developer typing on a laptop showing terminal windows with code and profiling output."
  caption: "Image credit: Pexels / fauxels"
  creditUrl: "https://www.pexels.com/photo/1181675/"
tags: ["flamegraphs", "performance", "devops"]
---

A few months ago our payments service started showing a 10% CPU increase on the busiest node. Logs were clean, traces were noisy but inconclusive, and the pager was politely persistent. We tried increasing instance size, sampling traces, and adding caching — none fixed the root cause. What did work was embarrassingly simple: a 30‑second flamegraph.

If you haven’t used flamegraphs much, they feel like a detective’s magnifying glass for CPU and latency hotspots. You get a single interactive SVG that shows where time is spent, grouped and prioritized visually. For teams in India — small budgets, conservative production access, and tight SLAs — flamegraphs are a low-cost, high-signal tool you should learn to run cautiously and quickly.

Why flamegraphs first (and not flame-retina-blah)
- They surface hotspots across stacks (C, Java, Python, Node) without chasing log noise.
- The output is sharable: an SVG you can drop in Slack or a PR and everyone understands.
- They’re sampling-based, so overhead is small and the data is statistically meaningful.

A quick, practical pipeline (Linux perf + Brendan Gregg’s scripts)
- Clone the scripts locally:
  git clone https://github.com/brendangregg/FlameGraph.git
- Sample a running process (30 seconds, 99Hz sampling):
  sudo perf record -F 99 -p <PID> -g -- sleep 30
- Convert to folded stacks and generate an SVG:
  sudo perf script | ./FlameGraph/stackcollapse-perf.pl > out.folded
  ./FlameGraph/flamegraph.pl out.folded > flame.svg
Open flame.svg in a browser. Tall, wide boxes mean "this path eats CPU." Look for unexpectedly large user-level frames (your app code), not just library noise.

Language-specific helpers that save time
- Java: async-profiler (produces an SVG directly and handles JIT better)
  ./profiler.sh -d 30 -f cpu.svg <PID>
- Python: py-spy (non-root attach for same‑user processes)
  py-spy record -o profile.svg --pid <PID> --duration 30
- Node: 0x or Clinic.js for V8-flavored profiles

When flamegraphs are the wrong tool
- They won’t show why latency spikes happen when you're waiting on external I/O (DB/network) — use distributed traces or tcpdump for that.
- For memory leaks, heap profilers are better; flamegraphs focus on CPU (though allocation flamegraphs exist).
- Very short-lived, rare spikes can be missed by sampling unless you increase duration or frequency.

Real constraints and tradeoffs (what we learned)
- Permissions: perf and many eBPF tools need elevated privileges. In many Indian startups, developers can’t sudo on prod. Mitigation: run brief captures on staging or ask SRE for a narrow maintenance window. For same-user processes, tools like py-spy help.
- Overhead: sampling is light (a few percent typically), but on small instances (t2.micro / t3.small common in cost-conscious infra) even small overhead can matter. Always test on a staging clone or off-peak.
- Symbol clarity: stripped binaries or missing debug symbols give unreadable frames. For Java, native frames can dominate unless async-profiler is used; for C/C++ you may need debug symbols. Shipping debug symbols to dev builds in staging is a good habit.
- JIT and inlining: JITted frames can be confusing. Use language-aware profilers where possible (async-profiler, perftools) to get clearer results.
- Human coordination: a 30s capture during business hours may still affect customers. Getting quick SRE buy-in is part of the cost.

How I used the flamegraph
In our case the flamegraph quickly showed a large block inside a JSON marshaller path — not the DB or network as we’d suspected. A recent change had enabled a legacy logger to marshall entire payloads on every request. We reverted the logger change and the CPU normalized. The flamegraph saved us from an expensive horizontal scale-up and many noisy hypotheses.

Communicating results
One underrated advantage: flamegraphs are persuasion-ready. Instead of "I think the marshaller is slow", you can paste an SVG into the incident chat and show a colleague exactly which call path dominates CPU. That helped us get quick approval for the rollback.

A small checklist before you run one in production
- Confirm a maintenance window or off-peak test.
- Prefer staging if the bug is reproducible there.
- Use short durations (10–60s) first; increase only if you need better signal.
- Capture distribution: run a couple of samples at different times.
- Save raw folded stacks — they’re useful for diffs later.

Takeaway (my position)
Flamegraphs aren’t a silver bullet, but they ought to be your default first instrument for mysterious CPU or latency hotspots. They’re cheap to run, produce a single actionable artifact, and force you to look at where time is actually spent. The downside is coordination and a tiny runtime cost — but compared to hours of blind guessing or a needless scale-up, they pay for themselves fast.

If you haven't used them in a production incident, try this tonight on a staging replica: clone the FlameGraph repo, run a 30s profile, and open the SVG. The first time you see the actual hotspot laid out visually, you'll understand why I keep one in my incident toolkit.