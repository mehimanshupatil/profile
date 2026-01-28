---
title: "How I Stopped Chasing DNS and Gained Faster Local Dev with Split DNS"
pubDate: 2026-01-28
description: "Stop editing /etc/hosts and chasing flaky API endpoints—how I used a simple split DNS setup (Pi‑hole + conditional zones) to speed local development."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&h=1000&fit=crop"
  alt: "Close-up of coloured network cables plugged into a switch, lit in warm light"
  caption: "Image credit: Markus Spiske / Unsplash"
  creditUrl: "https://unsplash.com/photos/9M0G6vLkYAI"
tags: ["split DNS", "home lab", "developer productivity"]
---

A few months into a cross‑team project, my laptop started feeling like the worst kind of flaky teammate: one minute staging was reachable, the next it resolved to a public IP and timed out, and CI jobs kept failing because they hit the wrong environment. I found myself toggling /etc/hosts, VPNs, and temporary curl flags more often than shipping features.

The fix that actually stuck was embarrassingly simple: run a split DNS at home. I set up Pi‑hole (in a Docker container on a cheap NUC), defined a few conditional zones for staging and internal services, and made my router hand that DNS to every device. Suddenly staging.example.com always pointed to the internal IP I expected, feature flags loaded from local mocks, and I stopped copying host entries between machines.

What split DNS did for me
- Stable name resolution for internal services without per‑machine /etc/hosts edits.
- Faster feedback loops — no more waiting for DNS propagation or wrestling with VPN DNS overrides.
- A single, versioned place (dns records + short notes) to record which service points where during testing.
- Cleaner QA: teammates on the same Wi‑Fi see the same routing without special configs.

How my setup looks (practical, minimal)
- Hardware: a low‑power NUC I already used for home lab tasks. You can use a Raspberry Pi or a small VPS if you prefer.
- Software: Pi‑hole in Docker (pihole/pihole) as the DNS front end; dnsmasq (built into Pi‑hole) for conditional forwarding; optional Unbound for recursive DNS if you care about privacy.
- Network: configure your router’s DHCP to hand out the Pi‑hole IP as the primary DNS. For devices that require it (some phones, corporate machines), set DNS manually or use the router’s static DHCP to ensure consistent IPs.

The key idea: make Pi‑hole answer all the DNS queries, but for internal names it hands back local IPs. Everything else is forwarded upstream as usual. This is split DNS: the resolver returns internal answers for specific zones and external answers for everything else.

A tiny, real config example
- In Pi‑hole’s “Local DNS Records” or via a dnsmasq conf, add:
  - staging.example.com → 10.0.10.12
  - redis.staging → 10.0.10.20
- For an entire internal zone (if you own it), add a zone file or conditional forward so *.internal.lan resolves locally.

If you prefer the command line, adding a local zone in a dnsmasq conf looks like:
- /etc/dnsmasq.d/02-internal.conf
  - ptr-record=12.10.0.10.in-addr.arpa,staging.example.com
  - address=/staging.example.com/10.0.10.12

Hands on tips that saved me time
- Don’t fight DoH/DoT on phones: modern Android and iOS often use DNS over HTTPS. If a device is using DoH, it bypasses your Pi‑hole and your split DNS. Either disable DoH on those devices for testing or use a DNS client that supports upstream DoH while respecting conditional zones (more advanced).
- Use DHCP reservations: if staging services rely on IPs, give them static addresses from the router so your DNS records stay valid.
- Version your local DNS mappings: keep a small repo (README + zone file) for your team. A commit message explaining why staging switched IPs saves hours later.
- Add a fallback /etc/hosts for one-off experiments, but don’t make it the primary workflow. Hosts files diverge fast.
- Expose Pi‑hole admin on a nonstandard port and protect it with a VPN or SSH tunnel if you must access it remotely.

Tradeoffs and real annoyances
- Split DNS adds operational overhead. When something breaks (caching, a misconfigured router), you’ll be the person teammates call. Expect occasional surprises: stale cache entries, devices with hardcoded DNS, and flaky corporate VPN interactions.
- Mobile networks and some ISP setups bypass your home DNS entirely. If you’re walking around testing an app on a 5G hotspot, you might not get the split DNS behaviour unless you tether through your home network or VPN.
- Security nuance: if you put sensitive internal hostnames in a poorly secured Pi‑hole accessible from the internet, you’ve leaked your attack surface. Keep admin access local and use strong auth.
- Not all teams will accept a home lab as a canonical source of truth. I solved that by keeping the authoritative records in our team repo and syncing them with Pi‑hole.

Why this beats the alternatives for day‑to‑day dev
Compared to using per‑machine /etc/hosts entries or constantly toggling VPNs, split DNS gives you a single source of truth that’s visible to everyone on the same network. It’s much cleaner than running individual mocks on every laptop, and cheaper and faster than provisioning cloud DNS zones for ephemeral testing environments.

When not to use it
If your org already has a corporate split DNS controlled centrally, or if security rules forbid local DNS changes, don’t reinvent the wheel. Also, for purely remote-first teams where everyone is on different networks (and you can’t control DNS), a CI‑driven stub resolver or staged environments in the cloud might be a better fit.

If you’re curious and have 90 minutes
- Grab a spare Raspberry Pi or a small VM.
- Run Pi‑hole with Docker (there are plenty of one‑liner guides).
- Add a couple of local DNS records for internal service names.
- Point one laptop at the Pi‑hole DNS and test staging.example.com — it should resolve to your internal IP.

It’s small infrastructure, but it changes the rhythm of work. I went from constantly chasing misrouted API calls to being able to trust a name—and that saved me more than the 90 minutes it took to set up.

Give it a try on a quiet weekend. If you hit the usual pitfalls (DoH, cached records, VPN strangeness), that’s normal; each one is a teachable moment for team docs. And if you get stuck, ping me—I've had most of those headaches already.