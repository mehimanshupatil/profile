---
title: "The ₹3,800 time server that stopped our flaky auth errors"
pubDate: 2026-06-09
description: "I set up a cheap local NTP server (Raspberry Pi + chrony) to stop intermittent 'expired' tokens and flaky tests. What worked, what broke, and the real cost."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop open on a wooden desk with code on screen and a blurred office background"
  caption: "Photo by Claudio Schwarz on Unsplash"
  creditUrl: "https://unsplash.com/@purzlbaum"
tags: ["infra", "devops", "india"]
---

It was 2:17 AM. The on-call Slack had three threads: a few users seeing failed logins, an alert in PagerDuty for CI job failures with "signature expired", and a frantic message from QA about UPI payments timing out at checkout. The stack traces all pointed to the same weird thing — token timestamps out of sync. But which clock?

We traced logs, checked TLS cert validity, re-ran the job locally. The CI runner’s VM showed the right time. A developer's laptop was two minutes slow. One of our staging containers, restored from a snapshot that morning, was 90 seconds ahead. The outage wasn’t caused by a single server — it was a barn-door-sized class of bugs cascading from clock skew.

Why clock drift keeps winning

I’d always treated time as plumbing: servers sync to pool.ntp.org and the rest is magic. That week I learned the plumbing is porous.

A few common things were conspiring:

- VM snapshots and container snapshots restore without NTP correction; services start before chrony/ntpd corrects the clock.
- Cloud VMs can resume from suspend states or have BIOS time drift; ephemeral runners are spun from old images.
- Developers' laptops on metered mobile hotspots or flaky office Wi‑Fi sometimes don't get timely NTP updates.
- Our auth system used short TTL tokens (good) and strict timestamp validation (also good), so even small skews broke everything.
- In India, intermittent broadband and heavy NAT at home/office meant some devices could not reliably reach public NTP pools.

I could have made the tokens more lenient. I could have added bigger buffers in validation. I did neither. Those are bandaids. The real fix would be to make our environment agree on time.

What I actually built (and how much it cost)

I wanted something low-friction that solved the immediate problem for people and CI in our local network. I put together a tiny, local NTP server on a Raspberry Pi and told the team to use it as the primary time source.

What I bought:
- Raspberry Pi 3B (used) — ₹2,500
- 16GB SD card — ₹400
- Case + small heatsink — ₹300
Total: ~₹3,200 (I rounded to ₹3,800 after a power cable and a cheap USB GPS hat trialed then discarded)

The setup in brief:
- Installed Debian Lite and chrony. Chrony is better for machines that suspend/snapshots and need fast correction.
- Configured chrony to query multiple upstream pools (pool.ntp.org), but serve as the LAN's primary NTP server (bind on the LAN IP).
- Configured DHCP (my OpenWrt home router and our office DHCP) to advertise the Pi's IP as the NTP server.
- Added a tiny firewall rule to allow UDP/123 within the LAN, block it from WAN.
- For CI runners (GitLab/Github Actions self-hosted), I configured the host's NTP to prefer the Pi and added a quick chrony client healthcheck in the job prelude to fail fast if skew > 500ms.

Why chrony: it corrects large offsets faster and handles intermittent connectivity better than classic ntpd. It also has built-in tracking to avoid sudden time jumps that can break logs.

The result was visible within days. The number of auth-related failures dropped from a few per week to near zero. The "signature expired" CI flakes went away because the VMs and runners were now syncing to the same local reference immediately at boot. Developers stopped seeing sporadic payment failures on devices tethered to the office Wi‑Fi.

The failure I didn't expect (and the tradeoff I accepted)

This is where I admit the thing that bit me.

A month in, a prolonged power cut hit my house (Bengaluru monsoon season). The Pi’s SD got corrupted — the cheap SD card I used was the weakest link. The NTP server died cleanly but unexpectedly. Because we’d made the Pi the primary time source in DHCP, some devices that had no other reliable upstream NTP drifted until they could reach pool.ntp.org directly. For a few minutes we saw a handful of flaky tests again.

The lessons:
- SD cards are the real Achilles' heel on hobby hardware. Use a read-only root, or better, an eMMC/SSD or just inexpensive UPS (I bought a ₹2,200 UPS later).
- A single on-prem device is useful but not sufficient. I now run a fallback: chrony configured with both the Pi and public pools, with the Pi preferred but not required.
- This doesn't solve mobile devices off the LAN or remote clients — if you have customers in vastly different networks, you still need resilient validation in your auth flow (grace windows, drift-aware logs, and careful TTLs).

Costs vs benefit in our setting

Total spend including UPS and a better SD card came to about ₹6,000. For a small team repeatedly debugging late-night auth flakiness, that’s cheap insurance. It buys two things that matter more than uptime numbers: deterministic debugging and fewer noisy, misleading failure modes.

If you run short-lived tokens, care about TOTP/OTP, or maintain CI jobs that boot from snapshots, local time consistency is an underrated dependency. Your logs become trustworthy again, temporal race conditions stop being ghosts, and you stop chasing timestamps in ten different places.

Takeaway

If intermittent "expired" tokens or snapshot-startup flakes have cost you late nights, set up a small local NTP server and make it the preferred source on your LAN and CI hosts. It won’t fix every clock-related problem — power, redundancy, and SD reliability matter — but it narrows the blast radius fast. My real lesson: fix the environment before loosening your security rules.