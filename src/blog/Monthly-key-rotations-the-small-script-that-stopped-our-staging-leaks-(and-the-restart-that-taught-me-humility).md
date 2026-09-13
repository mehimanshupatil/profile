---
title: "Monthly key rotations: the small script that stopped our staging leaks (and the restart that taught me humility)"
pubDate: 2026-09-13
description: "I automated monthly rotation of staging API keys. It stopped accidental long-lived leaks—until a rotation restarted a worker and crashed a pipeline. Here's what I actually built and why."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with code visible on the screen"
  caption: "Photo by Sincerely Media on Unsplash"
  creditUrl: "https://unsplash.com/@sincerelymedia"
tags: ["secrets", "ops", "devtools"]
---

It was a Tuesday, and a junior dev pinged our on-call channel: "Hey — found a secret in a public gist. Possibly ours?" I remember the small, helpless feeling — the token belonged to our staging Razorpay account and had been valid for three months. Nobody knew how it got out. The gist had seen a few forks and a PR; one click and an attacker could replay webhooks for fun or profit.

We were lucky: it hit staging, not production. But luck is not a strategy.

We already used a secret manager for production. Staging was messy: long‑lived API keys copied into config files, a couple of deploy scripts that still read plain files, and a few developers who occasionally pasted keys into temporary scripts. I decided to stop treating staging like a sandbox and make it a little more hostile to leaks.

What I built (short version)
- A tiny rotation runner: a 120‑line Python script that (a) requests new API keys from the provider if supported, or (b) creates a new key in our internal secrets store, (c) updates Vault/Secrets Manager, (d) triggers a controlled reload of services that accept rotated keys.
- A monthly GitHub Action that runs the runner on the 1st of every month, but with a manual approval button for keys that require provider involvement.
- A small "grace" mechanism: workers check for failure on using the token and fall back to a short‑lived cached token for 5 minutes while reloading.

Why monthly, not daily
Daily rotation is ideal in theory, terrible in practice. Providers rate‑limit key creation. Long‑running jobs or third‑party SDKs sometimes cache tokens aggressively. For our team (a 20‑person startup in Bengaluru with a tight infra budget), monthly rotation reduced blast radius significantly while keeping operational complexity low. It was cheap security — literally ₹0 in service fees, a few hours to build, and a ₹300 VPS runner we already used for CI jobs.

Implementation details that actually matter
- Always treat rotations as stateful ops. My script doesn't just "replace a value"; it writes the new key next to the old one with metadata: created_at, expires_at, rotated_by, and a small rollback token.
- Use a rolling reload approach. For stateless web processes we use systemd user services and a graceful reload. For long‑running workers, I built a socket activation / token hot-reload hook so the worker can pick up the new token without a full process restart.
- Force a short, post‑rotation health check. The runner runs a smoke test that does a minimal API call with the new key. If the smoke test fails, it rolls back automatically and alerts the team.
- Audit everything. Rotation logs go to a private S3 bucket (encrypted) and to our Slack channel with one‑line human‑readable notes. No mystery.

The failure that mattered
Three weeks after we rolled it out, a monthly rotation triggered an outage. Our long‑running payment reconciliation worker used a third‑party SDK that cached API credentials for the lifetime of the process. The rotation replaced the key in Vault and the web processes reloaded fine. The worker did not. It kept retrying with invalid credentials, and the backlog exploded until the queue filled.

We had assumptions baked into the script:
- assumption: "workers will reload on SIGHUP"
- reality: the SDK swallowed the signal, kept the old key in memory, and then crashed on its first authenticated call.

Fixes I had to make (and why I felt foolish)
- Add a worker-specific pre‑rotation hook: the runner now calls an endpoint on each worker which triggers a graceful restart (i.e., drain work, finish current job, then exit) instead of relying on reload signals.
- Implement a short dual-key window: new keys are activated but old keys remain valid for 10 minutes, giving workers time to restart. It felt like a hack, but it prevented a real outage.
- Expand smoke tests to include at least one worker path, not just the web endpoint.

Tradeoffs I accepted
- Monthly rotations mean keys live longer than short‑lived tokens. We balanced that with better auditing and a smaller blast radius.
- Keeping the old key live for a short period is technically a temporary increase in risk. But we documented it and restricted the window to 10 minutes.
- The whole system added a small operational surface. Someone still has to approve rotations that need provider involvement; automation cannot touch providers that don't offer programmatic key creation.

What this changed
- Accidental leaks stopped being "oh no" moments. Rotations invalidate leaked keys automatically on a predictable schedule.
- Developers stopped pasting live keys into throwaway scripts. The rotation policy raised the cognitive cost of bad habits.
- We still had a leak after this (human error never goes away), but the key had a 25‑day lifetime instead of months. The attacker window was much smaller.

A real limitation
If your third‑party provider refuses programmatic rotations or rate‑limits key creation heavily, you either need a more manual flow or to negotiate better developer APIs. We hit that with one bank's test keys; rotations had to wait for the bank's support. For those providers, our runner marks the key as "rotation due" and requires a human to complete the step — better than nothing, but inelegant.

The takeaway I actually walked away with
Automated rotations for non‑production environments buy you time and shame the shortcuts out of your workflow. But they force you to treat staging like a real environment: design workers to handle token changes, add smoke tests that exercise long‑running paths, and accept a small rollback window. Security works best when it's boring and predictable, not heroic.

I still don’t know the "right" rotation frequency for every team. Monthly works for us; your constraints (provider APIs, worker behaviour, developer bandwidth) will determine the sweet spot. If you don't have any rotation today, pick a cadence, script it, and get the pain of rotation into predictable ops — you'll sleep better on Tuesdays.