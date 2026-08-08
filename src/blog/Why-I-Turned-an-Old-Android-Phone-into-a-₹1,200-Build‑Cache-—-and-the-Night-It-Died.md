---
title: "Why I Turned an Old Android Phone into a ₹1,200 Build‑Cache — and the Night It Died"
pubDate: 2026-08-08
description: "I explain how I repurposed an old Android phone (₹1,200) as a local build cache to save mobile data and CI minutes, the exact setup I run, and the failure mode that taught me what not to trust."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A smartphone connected to a laptop on a wooden desk with charging cable and a notebook nearby"
  caption: "Photo by Sonia Vesper on Unsplash"
  creditUrl: "https://unsplash.com/@soniavesper"
tags: ["developer-tools", "infra", "india"]
---

It was 2:11 AM and my CI had just started pulling 300 MB of Gradle caches over my office's metered hotspot. I sat on my balcony with two bars of 4G and a phone draining ₹200 worth of data in minutes because the remote cache in my company's cloud was cold. I remembered the cheap Redmi I’d kept in a drawer "for emergencies." I pulled it out, plugged it into my laptop, and three minutes later my local build finished with bytes that never touched my data pack.

That night I realised two things: (1) a phone can be an embarrassingly effective build cache for a single developer, and (2) it's fragile — in a way you need to design around.

Why I bothered
Office internet in my team is fine most days, but when it isn’t, or when I'm working from a metro train with a 1 GB plan left, every download hurts my wallet and patience. CI minutes on hosted runners are also non‑trivial for side projects. I needed a small, cheap, always‑on cache that lived physically near me, that I could plug in to my laptop or expose to the home LAN when I needed it.

Cost: I bought the phone second‑hand for ₹900 and spent ₹300 on a good USB‑A to USB‑C cable and a cheap microSD (32 GB). Total ₹1,200. No rack, no extra power outlet. If you have a spare Android, it's basically free.

What I run on the phone
I keep the setup minimal so it behaves like a network cache — not a full server.

- Termux (yes, it still works) as the runtime.
- Node + Verdaccio for npm/yarn caches (lightweight, single binary install).
- ccache for C/C++/Rust object caching (I sync the cache directory).
- A tiny Python HTTP server for ad‑hoc file serving (simple PUT/GET).
- Rsync over USB (adb reverse + ssh) for one‑way sync of cache artifacts from my laptop.

How it helps in real work
Concrete example: React Native app with native modules and big npm node_modules. On a fresh checkout I used to download ~200–300 MB of packages and gradle artifacts. With the phone:

- I run a script that rsyncs my ~/.gradle/caches and ~/.npm/_cacache to the phone over the USB connection. It takes 30–60 seconds for subsequent syncs because most files are already present.
- Verdaccio answers npm install requests. Gradle looks up local artifacts first (I use a tiny gradle init script to point to the phone’s HTTP server).
- If I'm on a flaky 4G hotspot, I route requests through the phone via USB tethering to the laptop; it’s faster than the network for local files.

Result: typical local cold builds drop from 6–8 minutes to 90–120 seconds. Mobile data saved. Fewer CI cold runs. Better afternoons.

The exact little plumbing (so you can copy it)
- Termux: apt update && apt install openssh nodejs rsync python
- Verdaccio: npm i -g verdaccio && run on port 4873 with storage on /sdcard/verdaccio
- ccache: install on laptop; rsync ~/.ccache to /sdcard/ccache on phone after big builds
- adb reverse tcp:4873 tcp:4873 (so phone’s Verdaccio is available to the laptop at localhost:4873)
- A small script that checks timestamps and rsyncs only deltas. I schedule it as a manual 10–20 second command before I start work.

Why this beats other cheap options for me
- Compared to a VPS: no monthly fee, no public data transfer. My VPS at ₹300/month has less predictable latency and burns my uplink cap.
- Compared to a Raspberry Pi: I had a phone, and phones have decent Wi‑Fi, good storage via microSD, and battery backup if mains dies.
- Compared to hosted caches: immediate physical control and no corporate firewall gymnastics when I'm at home.

The failure mode I didn't expect
Exactly two weeks in, during a client demo, my phone overheated and rebooted mid‑build sync. The script had been pushing a partial gradle cache when the phone killed the process. My laptop, trusting the server, continued the build and treated the incomplete artifact as valid. Build failed in CI the next morning because the corrupt artifact had been pushed upstream.

That night I learned three hard lessons:
1. Always checksum and validate artifacts before accepting them into the local cache.
2. Android will kill background processes unpredictably under thermal pressure — don't rely on long background jobs.
3. Have a "read‑only" fallback mode for the cache: if integrity checks fail, treat the phone as read‑only and rebuild from network.

So I added a tiny atomic-publish flow: upload to a temp folder, verify checksums, then move into the production storage with an fsync‑style rename. I also added a small fan and moved the phone off the laptop body (heat matters).

Tradeoffs and real limitations
- Throughput: USB 2.0 limits: copying large caches can still be slow (tens of MB/s). It’s good for small frequent deltas, not massive initial syncs.
- Reliability: Android kills services. Termux processes occasionally get killed after OS updates or aggressive battery optimisers (I whitelist Termux, but Samsung's One UI still played naughty).
- Security: the phone is a potential vector. I run SSH with key auth only, disable unnecessary ports, and keep the phone on a separate LAN when possible.
- Storage: microSDs wear out; backups are essential. I keep periodic rsync snapshots to a cloud bucket.

When I still use the cloud cache
I don't rely on this setup for CI or multiple engineers. For team builds and reproducible CI, we still use our cloud remote cache (sane replication, ACLs). The phone is for personal dev velocity and for moments when the office internet or my mobile data is the bottleneck.

Final takeaway
You don’t need a fancy machine to save time and money — sometimes a drawer phone and ₹1,200 of cables do the trick. But treat it like an unreliable helper, not a primary. Add checksums, keep a read‑only fallback, and expect weird phone quirks. If you want immediate local wins without spending much, build a small, atomic cache workflow first, then attach whatever spare device you already have.

One open question I still have: is the sweet spot a cheap single‑board computer (Raspberry Pi-like) for stability, or the convenience of a phone with built‑in battery? I haven't fully switched — because the phone still wins for me on portability and zero monthly cost.