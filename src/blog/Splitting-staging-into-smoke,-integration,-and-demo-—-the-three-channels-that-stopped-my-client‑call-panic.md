---
title: "Splitting staging into smoke, integration, and demo — the three channels that stopped my client‑call panic"
pubDate: 2026-08-16
description: "I moved from one monolithic staging to three purpose-built channels (smoke, integration, demo). How I set them up cheaply, the tradeoffs I accepted, and the one weekend it saved."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop with code visible on the screen and a coffee cup beside it"
  caption: "Photo by Tim Gouw on Unsplash"
  creditUrl: "https://unsplash.com/@timgouw"
tags: ["devops", "staging", "developer-experience"]
---

It was 10:45 pm on a Tuesday, and I was watching our single staging environment die from a payment gateway timeout while a client waited on Zoom. The demo had worked locally, on my machine, and in "staging" earlier that day. Now the button that should create a customer hung for two minutes, then returned a 502 from the third‑party. The call ended politely. The client went quiet. My manager asked me in the Slack thread whether we "ever test these flows."

We had one staging. Everyone pushed fixes there. It had production‑like data, but it was also our integration playground, a place where engineers ran risky migrations, QA ran end‑to‑end tests that changed real rows, and sales borrowed real accounts for last‑minute demos. That one environment tried to be everything and failed at the one thing we needed it for: reliable demos.

I split staging into three channels. It sounds like over‑engineering until you are sprinting to explain why a demo failed at 11 pm in Bengaluru. The change cost time and a small monthly bill, but it bought predictable client calls and fewer fire drills. Here’s what I actually did, the failures I hit, and the tradeoffs I accepted.

## What each channel is for (and why it matters)

Smoke is tiny and strict. It runs the minimal health checks and critical migrations. If smoke fails, nothing else goes to prod. It uses a trimmed dataset: the most essential tables, a single app instance, and a short CI pipeline that runs in under ten minutes. The point is immediate feedback on deployability.

Integration is where we run broader tests: background jobs, queues, and realistic third‑party interactions. It’s reset nightly with a scrubbed production snapshot and uses real-ish external keys (test keys from Razorpay, Stripe, or the SMS provider). Integration is where flaky third‑party timeouts reveal themselves under normal background load.

Demo is a hardened, deterministic environment for customer-facing sessions. It contains curated accounts, deterministic data, and feature flags turned on/off exactly as the product manager wants for a pitch. The demo environment is protected behind basic auth and a single Git branch deploy. We deploy to demo only from merge commits on that branch, never from nightly CI artifacts.

Why the split works: demos no longer contend with integration jobs mutating the same rows or with a QA engineer running a destructive migration right before a call. Sales can click through predictable flows. Engineers still get integration coverage. Smoke keeps deploys honest.

## How I implemented it without blowing the budget

We run on a modest k8s cluster with a ₹3,000/month VPS for CI runners and small test apps. I didn’t add expensive infra. I changed how we deploy.

First, namespaces and Helm values. Each channel is a namespace with its own Helm values file: values-smoke.yaml, values-integration.yaml, values-demo.yaml. Same charts, tiny differences: replica counts, feature flags, and environment variables.

Second, separate databases. Integration and smoke use separate Postgres instances (managed on small instances or a single instance with schemas and strong tenant isolation). Demo uses a read‑only snapshot that we refresh weekly. The refresh process is a small script that scrubs PII — replaced emails with demo@company.local, replaced payment IDs with sandbox tokens — and runs inside a cheap ₹300 VPS to keep data handling off developer machines.

Third, controlled deploy paths. GitHub Actions handles deployments. Merge to main triggers smoke; successful smoke promotes a release artifact to integration on a nightly schedule; only a signed merge to the demo branch deploys to demo. That last rule stopped 3AM feature branches from landing in demo.

Fourth, simulate third‑party failures in integration. We inject latency and 5xx responses in a testing proxy for the payment gateway so integration reflects flaky Indian mobile networks and intermittent bank APIs. We used a tiny sidecar proxy (envoy filter + a simple chaos rule) instead of commercial chaos tooling.

Cost: about ₹3,500–4,000/month extra for the second Postgres and the VPS that handles scrub+deploy triggers. Don’t pretend this is free — someone on payroll has to own the maintenance.

## The failure I didn't expect (and the tradeoff I learned to live with)

The demo environment made demos reliable. Then, two months after launch, a memory leak hit production during a large client onboarding run. It never showed up in demo or integration because our demo data is deterministic and small; integration runs at a lower concurrency than real client traffic. We had implicitly optimized for demo determinism over realistic load.

I failed to keep a load‑testing step in integration that mimicked the concurrency profile of real onboards. The fix was twofold: add a scheduled load test to integration that runs with scrubbed payment flows (Razorpay test keys) and ensure smoke includes a fast leak detector (simple pprof heap sampling during deploy). Doing that added 60 minutes to integration runs and required a one‑weekend refactor to make our tests idempotent.

There’s a tradeoff here. Demo needs to be stable and deterministic. Integration needs to be messy and close to production. That mess costs time and sometimes money. We accepted that demos would be insulated and that we would pay for extra checks elsewhere.

A practical limitation: we still can’t perfectly simulate bank-side rate limits or momentary ISP routing failures in India. Those failures sometimes only appear at scale, in production. The three channels reduce surprise, but they do not eliminate it.

What I walk away with

Three purpose-built staging channels removed last‑minute demo stress. I now sleep better before client calls. But the split forced us to be intentional: clear deploy rules, regular scrub jobs, and a dedicated owner for the integration load tests. The honest lesson is this — investing a little time to design environments that match their purpose reduces emergency fixes, but you must accept the overhead. If you want reliable demos, make a demo environment that's sacrosanct. If you want realistic failure discovery, spend time making integration genuinely chaotic.

I still get occasional production surprises. But now those surprises are usually the kind you can plan for, not the kind that derail a live demo with a client in Bengaluru at 11 pm.