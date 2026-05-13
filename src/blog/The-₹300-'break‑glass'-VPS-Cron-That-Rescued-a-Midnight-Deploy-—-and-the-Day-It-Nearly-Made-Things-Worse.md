---
title: "The ₹300 'break‑glass' VPS Cron That Rescued a Midnight Deploy — and the Day It Nearly Made Things Worse"
pubDate: 2026-05-13
description: "I keep a tiny ₹300 VPS with a single cron script that can flip a maintenance page, restart services, and ship a DB dump — it saved a midnight rollback, and also taught me hard limits."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of a laptop keyboard and hands typing code with a coffee cup nearby"
  caption: "Photo by Prateek Tatariya on Unsplash"
  creditUrl: "https://unsplash.com/@prateekt"
tags: ["devops", "on-call", "small-team"]
---

It was 2:17 AM when I got the call. A release rolled out and stalled halfway: web app UI returned 502s, customers poured in error reports over the support channel, and the pager that normally blinks quietly was screaming. Our staging had passed. Production hadn't.

I could have spent the night SSHing through half-broken services, but instead I hit a URL I keep in a password manager, ran one command from my phone, and the site showed the maintenance page in under a minute. Then I watched logs stream to a backup server and the team had a clean DB dump to investigate. We rolled back the release in 18 minutes and no data was lost.

That tiny rescue came from a ₹300-a-month VPS I bought years ago and mostly forgot about. It runs a single cron job and a handful of scripts. It's crude. It has saved me more times than my tall list of paid monitoring tools. It also nearly caused the worst outage I’ve seen. Here’s how I set it up, why it works for small teams in India, and the tradeoffs I learned the hard way.

Why I didn't trust "only monitoring"

Our primary monitoring alerts were fine for metrics. They tell us when CPU is high, or when SLOs slip. They don't give you a simple, auditable escape hatch. In a midnight incident, what I want is:

- a quick, auditable way to put the site into maintenance mode,
- a safe restart of a failing service,
- a minimal backup to work from if rollback is needed.

Cloud consoles take time to log into (OTP, slow MFA, flaky office internet). Our on-call laptop was dead once. Mobile network was patchy. A cheap, static endpoint I control was the fallback that avoided those problems.

What lives on the ₹300 VPS

I run this on a tiny VPS (I pay roughly ₹300–₹500/month depending on provider promos). The whole point is low cost and simplicity.

- One Debian container with a checked-in deploy key and a tiny service user.
- A handful of scripts in a git repo. Nothing fancy.
  - maintenance.sh — toggles a maintenance page by updating an S3 bucket + Cloudflare cache purge (or swaps an Nginx upstream depending on setup).
  - restart.sh — safely restarts only non-stateful services (web, workers). It never restarts DBs.
  - backup.sh — runs a short, compressed pg_dump of critical tables and uploads to a private S3 bucket.
  - healthcheck.sh — hits health endpoints and writes a status JSON.
- A cron that runs healthcheck.sh every 3 minutes and, if serious failure is detected, flips a "ready" flag and sends a short alert to the on-call Slack via webhook.
- An authenticated, single-use webhook endpoint guarded by a long random token (I store tokens in my password manager), used to trigger maintenance.sh / backup.sh / restart.sh manually.

The shorthand: automated checks plus a human-in-the-loop "big red button" I can press from my phone.

Why it works in India (and in small teams)

- Low friction: SSH + MFA via corporate SSO at 2 AM on mobile is messy. Hitting a single webhook or running a 2‑line curl from my phone is fast.
- Cheap redundancy: For ₹300/month I get a public IP and a box I control that isn't tied to corporate access policies.
- Predictable latency: Our office internet is flaky; a small VPS on a stable provider in a good region is more reliable than our office Wi‑Fi for outbound webhooks.
- Focused scope: It does three things well, not twenty. That makes it testable and easy to audit.

The failure that taught me constraints

Three months after the midnight rescue, the cron almost made things worse.

We were migrating an index on production during low traffic. The migration made the DB slow, and some web requests started timing out. The VPS healthcheck saw the timeouts and decided the app was "down" and—because of a bad configuration I had forgotten to tighten—ran restart.sh which restarted the front-end containers aggressively. That pile-on of restarts made the DB queue worse and caused a longer outage. We recovered, but not before we had painful customer calls.

Lessons from that mistake:

- Never auto-restart stateful services. I had already kept DBs out of restart.sh, but the final straw was an overly aggressive restart policy for web processes. I changed restart.sh to only cycle one instance at a time and to back off.
- Make the cron conservative. Healthchecks now require 2 consecutive failures across two different endpoints and a manual confirmation for severe actions.
- Test the scripts on a cloned prod snapshot. I had never run restart.sh against a staging snapshot that mimicked a slow DB, and the behavior surprised me.
- Audit trail matters. Every use of the webhook writes an append-only log with who triggered it, why, and the diff of what changed. That log saved us during postmortem.

The real tradeoff

If you keep an external "break-glass" tool, it becomes tempting to rely on it. I saw teammates delay proper fixes because the VPS could "save" incidents. That’s the real cost: you trade a little bit of long-term robustness for immediate reliability.

So I set strict policies: the endpoint is a last resort. Our on-call runbook has explicit steps to try before flipping the maintenance page. The VPS is an emergency tool, not a lazy patch.

How I keep it clean

- Keep the code small, reviewed, and stored in the same repo as runbooks.
- Use short-lived tokens and rotate them quarterly (stored in Bitwarden).
- Have a read-only copy of the backup bucket for the team to inspect, and a separate encrypted archive for legal/compliance.
- Practice. We run a monthly "lights-on" drill where the on-call performs a maintenance flip in a simulated outage.

A small, cheap tool with clear boundaries

Takeaway: the simplest safety net that actually works for small Indian teams is not a dashboard or expensive pager; it's a tiny, well-tested script on a cheap VPS that gives you one clear, auditable way out. It doesn't replace root-cause fixes or SLOs. It does reduce panic, keeps data safe, and buys time when things break at 2 AM.

If you try this: make the scripts conservative, log everything, and accept that a cheap rescue can create complacency. The best part is how little mental overhead it adds when you're the person awake at night — and how quickly it can turn a 2 AM fire into a manageable incident.