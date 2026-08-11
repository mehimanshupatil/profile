---
title: "Fast‑forwarding my laptop clock to catch token‑expiry bugs (and the week auth broke)"
pubDate: 2026-08-11
description: "How I started changing the system time to reproduce token expiry, scheduled‑job, and cache bugs — the simple commands, the one time it wrecked auth, and the tradeoffs I learned."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a notebook and a cup of coffee"
  caption: "Photo by Nathan Dumlao on Unsplash"
  creditUrl: "https://unsplash.com/@nate_dumlao"
tags: ["testing", "debugging", "developer-tools"]
---

The demo was five minutes in when payments started failing. Not a network hiccup or a malformed payload — the gateway kept rejecting the signature as "stale timestamp" and our sandbox logs showed requests arriving from the future.

We were in a client call in Pune. I had no idea that my local machine's clock, set ahead because I'd been testing scheduled jobs the previous evening, would show up in the HMAC signature and make Razorpay's sandbox refuse every request. The fix was simple (set the clock back), but the root problem wasn't: we were blind to a class of bugs that only show up when clocks move fast — token expiries, TTL-based caches, cron misfires, and signed requests. Since then I build time‑travel tests into every release for anything that touches expiry logic or external auth.

Why this matters more than you'd think
Token expiry and scheduled jobs are common enough. But in real systems the failures are nonlinear:
- A mobile app sending a login token with a 30‑second skew gets rejected by the backend.
- A webhook signed with a timestamp outside the gateway's window gets silently dropped.
- A cache that uses file mtimes invalidates too early when build machines have clock skew.

In India the surface area is bigger: payment gateways (Razorpay, PayU), UPI integrations, scheduled payouts governed by cutoff times, and flaky infra on shared cloud VMs where NTP is unreliable during maintenance. I learned the hard way that you can't rely on "it'll work in production" when your dev machine and CI don't exercise time boundaries.

How I actually do time‑travel testing (commands you can use)
I do three things depending on constraints: change the real clock, run isolated fake-time containers, or use libfaketime. Pick based on whether you're on a managed laptop.

1) Quick and dirty — change your system clock (Linux)
This is the fastest but invasive. Useful on personal machines.
- Stop system time sync: sudo timedatectl set-ntp false
- Set clock ahead 2 hours: sudo date -s "2 hours"
- Re-enable: sudo timedatectl set-ntp true

On macOS:
- Disable network time: sudo systemsetup -setnetworktimeserver ""
- Set date: sudo date 081408302026  (MMDDhhmmYYYY)
- Re-enable network time from System Preferences

Do not do this on company laptops where IT will scream, or where AD/domain time matters. It breaks TLS, certificate-based auth, and systemd timers.

2) Safer: docker + --cap-add SYS_TIME (isolated)
I use a small container when I can't touch the host clock.
- docker run --cap-add SYS_TIME -it --name timebox ubuntu:22.04 bash
Inside the container you can set date without affecting the host:
- apt update && apt install -y tzdata
- date -s "2026-08-11 14:00:00"

Run your service in that container (or run tests calling your dev backend from it) to simulate requests from a device with bad time. This helped me reproduce an OAuth token rejection that only happened in Android devices with wrong time.

3) Non‑root and repeatable: libfaketime
When I need repeatability in CI or can't run privileged containers:
- On Linux: apt install libfaketime
- Run a binary with a shifted time: LD_PRELOAD=/usr/lib/x86_64-linux-gnu/faketime/libfaketime.so.1 FAKETIME="+2h" node server.js
I wrap this in npm scripts for test runs. It doesn't affect system daemons and is excellent for unit tests that assert expiry logic.

One surprising gotcha: caches, builds, and signed files
I once ran a build under a fast clock to get a cron test done. The build system used file modification times to determine cache validity. When I returned the clock to normal, the incremental build system thought outputs were newer than inputs and skipped important steps. Debugging that cost me a half day and a ₹3,200 client-hour in the billable tracker because a stale artifact made it to a staging demo.

Another time I used libfaketime for a Java process that invoked native libraries. The native code ignored the env preload and used the real clock, so parts of the system showed conflicting times — an auth token considered valid by the JVM but stale for a native TLS handshake. So fat‑fingered or partial time fakes can create weird hybrid states.

A real limitation: company machines and audit noise
On managed laptops you can't touch the clock. Even containers can be disallowed. On our last client engagement, corporate policy forbade privileged containers. I had to use a small VM on a ₹300/month VPS in a private subnet and route requests through SSH tunnels. That worked, but it introduced network noise: logs now showed requests originating from an external IP, which triggered our security team's alerts.

There’s also the audit/log problem. When you simulate future time and hit production queues or external systems, you risk confusing monitoring and compliance. Never test time travel against production endpoints. Use sandbox environments and scrubbed data.

When to add a time‑travel test
I don't do it for every tiny change. I add a time test when:
- Code touches tokens, HMACs, TLS client certs, or signed webhooks.
- You change cache expiry, eviction, or queue visibility timeouts.
- You add scheduled jobs that must run near business cutoffs (e.g., payouts at 8 pm IST).

My current checklist is two lines:
- Run integration tests with clock +1 minute and +1 day.
- Run an isolated client (container/VM) with clock -2h to +2h and replay the failing flows.

The one honest failure
I once automated these tests into CI with libfaketime injections for integration jobs. It reduced token-related regressions immediately. Then we merged a change that relied on the file system's mtime semantics and CI started passing while developers hit local failures. CI was faking time; developers were not. I learned to keep at least one sanity check run in real time. The fake-time runs are great for catching boundary bugs, but they can mask filesystem or environment assumptions.

What I actually took away
Time‑travel testing caught things that code reviews and unit tests never would. The practical win: fewer surprised rejections from payment gateways and fewer "works on my machine" moments that occurred around scheduled jobs. The practical cost: you need safe boundaries—containers, sandboxes, and an operational rule: "don't touch production time." If you can’t change host time, keep a small VM or a libfaketime script in your repo. Run it before any release that deals with expiry or signatures.

I still keep a tiny shell script in every repo now:
- run-timebox.sh — starts a privileged container, sets time +1d, runs the integration smoke tests, and tears down.
It’s imperfect. It once broke an auth session in our demo. But the bugs it exposes are the ones that used to break client trust. And that's worth a 10‑minute test before shipping.