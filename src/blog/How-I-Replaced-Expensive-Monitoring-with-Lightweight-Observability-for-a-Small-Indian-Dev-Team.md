---
title: "How I Replaced Expensive Monitoring with Lightweight Observability for a Small Indian Dev Team"
pubDate: 2026-02-04
description: "A practical playbook for replacing costly SaaS monitoring with a low-noise, low-cost observability stack that actually works for small teams in India."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1555949963-aa79dcee981d?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&h=1000&fit=crop"
  alt: "A developer looking at multiple system monitoring dashboards on a laptop and external monitor"
  caption: "Image credit: Sasha Freemind / Unsplash"
  creditUrl: "https://unsplash.com/photos/1555949963-aa79dcee981d"
tags: ["observability", "devops", "cost-optimization"]
---

Three months into a small startup's growth sprint we hit two predictable problems: our SaaS monitoring bill shot up and our on-call team started ignoring alerts. We needed observability that was cheap, actually used, and that didn't scream “enterprise” at every corner. So I built a compact stack that gives us the signals we need, keeps alert noise down, and runs for a fraction of the cost. I call it lightweight observability, and it’s tailored to what small teams in India actually need.

Why "lightweight observability" (and not "no observability")
Most hosted vendors sell completeness: every telemetry type, long retention, fancy UIs, and an SLA. For a small team that’s a mismatch. We wanted:

- Metrics for system health (latency, error rates, CPU/memory)
- Simple log access for debugging recent incidents
- Alerts that mean action (not a crying wolf)
- Predictable, low monthly cost (₹500–₹2,000 range)

That’s the essence of lightweight observability: pragmatic telemetry, concise retention, and low operational overhead.

What I actually ran (the stack)
I chose components that are mature, easy to operate, and cheap on small VMs:

- Prometheus (scrape-based metrics)
- Grafana (dashboards + alerting)
- Grafana Loki (log aggregation; lightweight and cost-friendly)
- node_exporter + app-level metrics (Prometheus client libs)
- A tiny VPS or spare cloud VM with 2–4 GB RAM, 40–80 GB disk

Total cost: depending on your VPS provider, about ₹300–₹1,500/month. We run this on a single VM in a local-region cloud zone to keep latency low and data egress minimal.

Key choices that make this work
- Metrics-first. We instrumented the top 8–10 meaningful app metrics (HTTP latency p50/p95, request rate, error rate, DB connection pool usage). Good metrics let us detect most outages before we hunt logs.
- Short retention. Prometheus stores 15–30 days; Loki keeps logs for 7–14 days. That’s enough to debug regressions without needing expensive long-term storage.
- Pre-filtered logs. Apps send structured logs and we only ingest the fields we use. Less ingested data = smaller VM, lower disk use, lower cost.
- Pragmatic alerts. We limited alerts to three categories: P0 (page immediately), P1 (team Slack), and P2 (dashboard only). Each alert must have an owner and a runbook link. This reduced alert fatigue dramatically.
- Simple dashboarding. One "health" dashboard per service and a team-wide status board. No vanity charts.

How we kept alert noise down (and why it matters)
Alerts are the real usability test. We introduced two rules:

1) No alert without a remediation step. If you can't say "do X to mitigate," it's a metric to watch, not an alert.
2) Use rate/time windows thoughtfully. For example, alert on sustained p95 latency increase over 5m rather than single spikes.

Result: fewer wakeups, faster response when it actually matters.

Tradeoffs and real constraints
This approach isn't a silver bullet.

- No distributed tracing at scale. We skipped full tracing because of complexity and cost. For complex, cross-service latency hunts you’ll feel the absence.
- Limited retention. Compliance or product analytics needs longer history—those require separate pipelines and storage (and cost).
- Single-node availability. Our lightweight stack is not highly available. If the VM crashes, we lose immediate visibility until it’s recovered. We accepted this risk for cost savings, and keep simple backups and an image to spin up quickly.
- On-call expectations. This works only if engineers accept tight, actionable alerts and maintain instrumentation discipline. It’s a cultural commitment.

Implementation notes that helped us ship fast
- Start with the critical path. Instrument endpoints, DB latency, and queue backlog first. Nothing fancy.
- Use client libraries to expose metrics with sensible buckets. Don’t over-instrument.
- Use Grafana Alerting (not Prometheus’ older Alertmanager-only flow) for unified alerts to Slack/Teams/WhatsApp bots.
- Rotate old logs into compressed archives if you occasionally need longer history—store them in a cheap object store and keep metadata in a small index.

India-specific considerations
- Pick a region close to your team and users to avoid cross-region egress charges.
- Many small VPS providers in India offer competitive prices. If your org has bank limits on foreign payouts, an Indian host simplifies billing.
- For teams with intermittent internet, keep alerting channels light (Slack + SMS fallback) and ensure runbooks are cached in a shared drive or offline PDF.

When to stop being "lightweight"
If your product handles regulated data, needs long-term audit logs, or requires high-availability SLAs, this stack will feel fragile. Also, when your telemetry volume grows (many services, heavy traces), the operational burden of running and tuning these components can exceed the cost of moving to a managed solution.

Conclusion
Lightweight observability isn’t about cutting corners—it's about prioritising signal over noise and cost over bells and whistles. For our small Indian dev team it bought three concrete things: visibility where it mattered, alerts that people trust, and a predictable bill that didn’t cripple hiring or infra spend. If you’re starting from nothing or drowning in SaaS costs, try this trimmed stack for a quarter. Instrument the hot paths, set strict alert rules, accept a few tradeoffs, and you’ll find the sweet spot between cost and control.

If you want, I can share our Prometheus scrape config, a starter Grafana dashboard JSON, and the exact alert rules we used.