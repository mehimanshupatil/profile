---
title: "How I use a ₹1,800 router and OpenWrt to reproduce flaky mobile‑network bugs"
pubDate: 2026-05-16
description: "I repurposed a cheap router with OpenWrt to throttle, add latency, and reproduce mobile‑network bugs I only saw on Jio/Idea networks. Setup, shortcuts, and a failure I couldn't ignore."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop at a wooden desk, with a coffee cup and a phone nearby"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["network-testing", "developer-tools", "india"]
---

I was on a call with QA when a PM shared a clip: video stalls for 10–20 seconds, then resumes. Only happened for some users on their cheap Jio dongles and certain hotel Wi‑Fi. It never happened on my home broadband. Reproducing the bug on my laptop was impossible; no amount of Chrome devtools throttling matched the real behaviour. We were shipping a Hotstar-like feature in two weeks. I needed a reproducible, local network that behaved like the messy mobile networks users actually have in India.

So I bought a ₹1,800 router and turned it into a traffic lab.

Why a cheap router (and not a cloud proxy)
- Chrome's network throttling simulates bandwidth and RTT, but it misses carrier NAT quirks, device buffering, and bursts from RTT spikes. The bugs we saw were about jitter and brief packet spikes. Cloud proxies hide the mobile-device + carrier interaction entirely.
- Mobile data in India is cheap in bulk, but costly for testing: burning multiple GBs to reproduce a flaky stream is wasteful and slow.
- An old router with OpenWrt gives you a small surface: control over queuing (SQM), tc rules, DNS, and the ability to attach a test phone via Wi‑Fi or USB tether. It runs headless, consumes little power, and sits on my desk.

What I built (30–90 minutes, ₹1,800–₹3,500)
- Hardware: a used TP‑Link WR841N for ~₹1,200–₹1,800. Any router supported by OpenWrt works; pick one with 4MB+ flash and 32MB+ RAM for basic packages.
- Firmware: OpenWrt stable build. Flash with the vendor image from openwrt.org and follow the basic setup guide.
- Packages I installed: sqm‑scripts (fq_codel), iperf3, tc, iptables. Total disk use was tiny.
- Network topology: WAN from my home modem -> OpenWrt router (acting as an intermediate AP) -> test device (phone or laptop). This lets me throttle/interleave without touching home network.
- Basic tc rules I use:
  - fq_codel with target and interval tuned for mobile-like latency.
  - htb classes to create a slow class (e.g., 500–800 kbps down, bursty) and a default faster class for background.
  - occasional packet loss and 100–300ms RTT using netem to simulate congested cell towers.
- Convenience: a tiny shell script on my workstation to push common presets over SSH (e.g., ./netprofile hotel_wifi, ./netprofile jio_edge, ./netprofile 4g_good). That way I can swap profiles between test runs quickly.

How I use it in practice
- Reproduce first, then bisect. When QA reports a failure, I try to reproduce it with the 'jio_edge' profile. If I can, I run the minimal failing script while attached to the router and record a pcap (tcpdump on OpenWrt).
- Test phones: I keep a cheap ₹2,500 Android phone tethered to the AP for real-device testing. Browser devtools don't show device buffering behaviour; the phone does.
- Regression runs: before every deployment to staging, I run a 10‑minute smoke that streams the problematic content under the 'hotel_wifi' profile. It takes 10 minutes but cuts late-night firefighting.
- Sharing: the router has SSH and a URL for the profile list. QA can switch profiles themselves without a call to me.

The tradeoffs and the week it bit me
I should've expected tradeoffs. The router approach is great at reproducing packet-level jitter and bursts, but it doesn't emulate carrier middleboxes or real IMS timeouts. Once, after three successful reproductions locally, we deployed a fix that passed our router tests and staging. In production, some users still saw the stall. The missing element was carrier TCP connection resets caused by carrier-side NAT churn under heavy load — something my home network topology couldn't simulate.

Other real annoyances:
- The cheap router sometimes reboots under load. I learned to keep a spare in a drawer. That's extra cost (₹1,200–₹2,000).
- OpenWrt upgrades occasionally break packages. I snapshot the config and keep a working image to reflash fast.
- It's another device I have to manage. When I travel, I can’t reproduce issues on the go unless I carry it.

A failure that changed how I test
The day the fix missed carrier resets I accepted I couldn't simulate everything locally. After that, I combined the router lab with two short plays:
1) A quick field test using a real SIM/Band 40 dongle for one hour on a local prepaid plan (₹249 for 30GB) to catch carrier NAT churn. Cost: one weekday evening and ₹249, but it found the bug.
2) A pcap-based approach: capture from a failing production client (with user consent) and replay it through my OpenWrt box using tcpreplay. That lets me see how the app handles packet reordering and bursts without requiring a live carrier.

Why this setup stuck
- It’s cheap: I spent about ₹1,800 and another ₹2,500 on a test phone. That’s small compared to repeatedly burning developer hours or staging credits.
- It’s fast: switching profiles is seconds; running the smoke suite takes 10 minutes.
- It shifted our mental model: we stopped assuming "if it passes my home network it’s fine." Teams began to include one low‑bandwidth smoke in pre‑staging checks.

One limitation I still live with
This setup won't catch carrier‑side state churn and some weird middlebox behaviours. For those, you need at least one real SIM test or a cloud provider that gives you a cellular gateway — both cost more. I accepted that tradeoff because the router caught 80% of the cases that used to slip to production.

Takeaway
If you regularly debug issues that only show up on flaky mobile networks in India, an OpenWrt router plus a cheap test phone is the most pragmatic next step. It's cheap, quick, and uncovers the majority of jitter/bandwidth issues you won't reproduce with browser throttling. But keep one real-SIM test in your pipeline — the router is necessary, not sufficient.