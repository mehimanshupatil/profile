---
title: "A tiny local logs server that found the race I couldn't reproduce"
pubDate: 2026-08-27
description: "How I set up a small Loki+Promtail server (₹300 VPS / Pi) to aggregate dev logs locally — the bug it found, the privacy snafu it caused, and the tradeoffs I learned."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&h=800&fit=crop&auto=format"
  alt: "A developer's desk with a laptop, notebook, and coffee cup, dimly lit"
  caption: "Photo by Blake Wisz on Unsplash"
  creditUrl: "https://unsplash.com/@blakewisz"
tags: ["observability", "developer-tools", "logging"]
---

It was 9:30am. I had a client demo and a flaky feature that only failed on certain laptops. The app would hang for a few seconds, then resume. Remote tracing in prod showed nothing. The user's machine logs were scattered: browser console, app logs, systemd journal, and an Electron crash dump. By the time I asked for logs, the user had restarted, lost the transient traces, and the bug vanished.

That was the third time this month. Enough to stop doing the usual “please send the logs” dance. I needed a way to collect everything a developer machine produced during a session, reliably and without burning mobile data or my time. So I built a tiny local logs server: Promtail on each dev machine shipping to a Loki instance I run on a cheap VPS (₹300/month) or an old Raspberry Pi (₹3,500). It’s small, fast, and caught the race condition that had been ghosting me.

Why local logs, not remote observability
- Remote logging is great for production, but for demos and local repros it’s brittle. Network flaky? You lose packets. Users reluctant to upload large files over mobile tethering. And in many Indian offices our uplink is a single NAT’d 10Mbps with unpredictable packet loss during lunch.
- I wanted something that collects everything locally (journal, app logs, browser console via an extension, and ephemeral files), stores them for a day or two, and makes searching easy. Loki + Promtail fit that model: index by labels, search by lines, and cheap storage.

What I actually built (and why it’s small)
- Components: Loki (single binary), Promtail on the dev machine, a tiny nginx in front for basic auth when I use a VPS.
- Hosting: a ₹300/month VPS (Vultr/Hetzner India mirror) with 2GB RAM. For quieter setups I use a Pi 4 at home. Loki’s single-process mode is light if you keep retention short.
- Ingest: Promtail tails journalctl, a couple of app log files, and a small node script that forwards browser console logs (I use a tiny Chrome extension that POSTs console lines to localhost). Promtail adds labels: host, user, git-branch, demo-id.
- UI: Grafana for exploring logs. I keep a 48-hour retention and compress old chunks. That’s enough for demos and the next-day debugging.

The bug it found
During a Wednesday demo, the app hung for ≈3s and resumed. Promtail had been running. I opened Grafana, filtered by demo-id and branch, and saw a burst of lines: the app tried to acquire a file lock, blocked on an NFS mount that had timed out, and then retried. The NFS mount was from a developer’s VM they’d shared; it was slow during lunch when our office NAS kicked in. Without a log timeline that combined systemd and app logs, I wouldn’t have connected the dot between the lock wait and the NFS latency spike. Fix: remove blocking locks and add a 200ms backoff.

The messy tradeoffs and one painful failure
This is where I get honest: it’s not all wins.

1) I once missed the event I needed because Promtail started after the process crashed.
We relied on a systemd unit to start promtail on boot. One developer's machine crashed and rebooted; their app never auto-started, but promtail did. The crucial short-lived crash log lived only in a rotated /var/log and the rotation happened mid-boot. Promtail's journal reader didn't pick up the rotated file and the crash trace was gone. I added a tiny cron that pushes rotated logs on reboot; kludgey, but reliable.

2) Privacy and PII:
I forgot to scrub stack traces for user data. A developer pushed demo logs to the VPS and they contained a screenshot filename with a customer's phone number. The client understandably complained. I immediately added a regex-based scrubber in Promtail pipeline stages and made the VPS accept uploads only from known local IPs or via a short-lived token. Lesson: assume logs contain PII. Scrub early.

3) Disk and cost:
On a Pi or small VPS, disk fills up fast if you ingest verbose browser logs. I set a 48-hour retention, compressed chunks, and a per-host ingestion cap (100MB/day). That works for demos, but if you expect full fidelity for long-term debugging, this setup is not for you.

Why this scale fits small teams and solo devs
- Cheap: ₹300/month or a one-time ₹3,500 Pi. Minimal maintenance.
- Fast turnaround: previously I spent hours asking for logs; now I pull timelines in minutes.
- Works offline: with a Pi on the LAN, you can collect everything without hitting the internet — handy for client sites with strict egress or poor connectivity.

How I use it in practice (practical rules)
- Demo-id label: Every demo creates a random 8-char id. I run the app with DEMO_ID=abc123 and instruct colleagues to include it. Filters work.
- Short retention: 48 hours. That’s enough for post-demo troubleshooting and avoids legal grief or disk overruns.
- Scrub pipelines: regex rules to redact emails, phone numbers, and base64-encoded blobs.
- Minimal alerts: I don’t alert on logs; Loki is a debugging aid, not an SRE pager.
- Backup plan: if I need to share full logs with a client, I create a tarball, scrub, and upload. No automatic uploads.

The limitations I accepted
- This is not production observability. No long-term retention, no distributed tracing across microservices, and limited query speed.
- It’s an engineering convenience, not compliance-grade. If your company needs audited logs, keep sending to your centralized stack.
- You need discipline: labels, demo-ids, and the scrubber. Without them, it’s noisy.

What I walked away with
Local aggregation reduced a recurring, stupidly common friction: "I can't reproduce; send logs". The combination of labels + short retention + a cheap host gives a practical middle ground between ad-hoc file dumps and enterprise observability. But it forced me to treat logs as sensitive data — and to engineer safeguards before I trusted them.

If you do this, start small: one host, 48-hour retention, a scrubber, and a demo-id. If you want, borrow my tiny Promtail pipeline (I keep a gist with the regex rules I use) — but don’t forget the rotating-log edge case. It will bite you exactly once, and exactly during a client demo.