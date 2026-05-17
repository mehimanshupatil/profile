---
title: "Why I put my home lab to sleep (and the week my cluster refused to wake)"
pubDate: 2026-05-17
description: "How I cut my home lab's monthly electricity draw by roughly half with a schedule + a cheap always‑on relay — and the real failure that taught me where this setup breaks."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=800&fit=crop&auto=format"
  alt: "A small desk with a Raspberry Pi, cables, and a laptop showing terminal output"
  caption: "Photo by Franck V. on Unsplash"
  creditUrl: "https://unsplash.com/@franckv"
tags: ["home-lab", "infrastructure", "power-savings"]
---

It was the first Bengaluru summer after we moved into a flat with real electricity bills. My home lab — an old desktop I use for CI, a NAS, and a router — was on 24/7. I started getting more worried when my partner showed me the last electricity bill: an extra ₹700–₹900 for "computer and other equipment." I stared at my rack of blinking LEDs and realised I was trading a quiet conscience for convenience.

I don't need my entire lab always on. I do need one small machine I can reach from outside when required. The compromise I landed on was simple: keep a tiny, always‑on relay (a Raspberry Pi on a small UPS), and put the power‑hungry machines to sleep on a schedule. They wake only when I actually need them — on weekdays evenings for development, and occasionally for remote CI. The result: roughly half the electricity bill for the lab. The week it failed, though, taught me the limits of "powering stuff off to save money."

What I built (hardware + cost)
- Raspberry Pi (always on): ₹2,500 — runs the scheduler and handles wake requests.
- Smart plug (Wi‑Fi or Tuya): ₹1,200 — cuts power to the desktop/NAS when sleeping.
- Small UPS (for the Pi): ₹4,500 — keeps the Pi alive during short outages so it can wake devices and avoid bricked state.
- Existing machines: my desktop (draws ~150–200W when active) and a NAS (~20–30W).
Initial outlay ~₹8,200. Payback: ~2–3 months depending on usage.

How it works (practical, not theoretical)
- The Pi is always on and reachable via Tailscale (or OpenSSH on your home IP).
- A cron job (or systemd timer) on the Pi controls the smart plug: on at 7am, off at midnight (I tuned times to match my working hours and the flat's peak tariffs).
- When I need the machines outside schedule — e.g., to run a CI job or test a deployment — I SSH to the Pi and issue a "wake" command. The Pi switches the smart plug on, waits for the machine to power, and then sends Wake‑on‑LAN packets to the desktop/NAS NIC.
- A small healthcheck script verifies services (SSH, Docker) and sends me a Telegram/Matrix message when the cluster is ready.

Why this saves real money
My rough math: the desktop idles at ~40W but pulls 150W+ under load. Running 24/7 it was ~120–150 kWh/month at ₹7–₹8/kWh = ₹900–₹1,200. After scheduling it to be off 16 hours/day, the monthly energy use dropped to ~40–50 kWh and the bill to ~₹300–₹400. Add the NAS and router, and I saved about ₹500–₹700/month. For me the setup paid for itself in 2–3 months; your numbers will vary, but the pattern holds: long idle times + high wattage = easy wins.

The week it failed and what I learned
A few weeks after I switched to this setup, an overnight CI run from a remote colleague failed because the machines never came back online. For 12 hours they were dark despite repeated wake attempts. Stressful, and embarrassing when a deadline was involved.

Root cause 1: the smart plug cuts mains; Wake‑on‑LAN doesn't help with a dead NIC. Some devices' NICs don't get standby power when the whole PSU loses mains. Wake packets sent after the plug turned on were visible on the network, but the NICs were still initializing and ignored the packets.

Root cause 2: the Pi was on the same local UPS but got moved during a power outage. When mains returned the plug rebooted the NAS/desktop, but one machine's BIOS had a long POST because of a flaky controller, so service checks timed out and my automation retried poorly — eventually tripping a watchdog that I hadn't planned for.

Fixes I actually shipped
- Always‑on relay: I moved the Pi to a mini UPS that can keep it alive for at least 10–15 minutes of outage. If mains die, the Pi can still receive a remote wake request and sequence the power back properly.
- Two‑step power: For machines that refusing WOL after a full power cut, I added a small delay (60–90s) between power on and sending WOL. It was sloppy but effective.
- Health idempotency: made my scripts resilient to long boots (retry longer, back off), and added a manual "force‑cycle" command for remote reboots if needed.
- Failover plan: CI now has a secondary runner in the cloud for time‑sensitive builds; the home lab runner is for normal development only.

Tradeoffs I accepted
- Boot latency: waking everything takes 2–8 minutes depending on services. I stopped using the lab for instant tasks like quick remote debugging at 3am.
- No always‑on background tasks: long‑running non‑CI jobs (e.g., backups or heavy builds scheduled at night) need to be moved to the cloud or scheduled for daytime windows.
- Maintenance surface: more moving parts (smart plug, Pi UPS, scripts) means more things to debug. That was always true; I just moved the failure mode from money to reliability.

A few practical tips if you try this
- Test every machine: not all NICs support WOL when mains are cut. Find out before you commit.
- Keep a small always‑on unit on a cheap UPS (₹3–5k). It’s the single most important thing that made this reliable for me.
- Use Tailscale/Cloudflare/SSH and an alert channel so you know when the lab is up without logging in repeatedly.
- Start conservative: schedule only nights or long inactivity windows first. Expand later.

One honest constraint
This won't work if you need instant, always‑reachable services (self‑hosted email, always‑on CI). I accepted that tradeoff. There were days I wished for instant access — and those are the days I used cloud runners. If your work depends on a home server being instantly available at any hour, don't do this.

What I walked away with
A small always‑on controller + scheduled sleep gave me a measurable, repeatable reduction in my home lab's power use without changing how I work most days. The real lesson was operational: if you're going to cut power to save money, design for the failure modes upfront — keep one tiny brain alive on a UPS, make your wake procedure forgiving, and accept the latency tradeoff. That one extra always‑on Pi is the difference between saving ₹700 a month and spending a stressful midnight troubleshooting session.