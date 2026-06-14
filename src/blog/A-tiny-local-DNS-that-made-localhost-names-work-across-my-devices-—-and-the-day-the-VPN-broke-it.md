---
title: "A tiny local DNS that made localhost names work across my devices — and the day the VPN broke it"
pubDate: 2026-06-14
description: "How I stopped fighting /etc/hosts, stopped typing IPs, and made dev services reachable from phones and other machines using dnsmasq — plus the VPN outage that taught me the limits."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop with code editor visible on the screen on a wooden desk"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["developer-tools", "dns", "dev-environment"]
---

It was 11:30pm, I had demoed a new payment flow to a client over Meet, and the final step required a quick test from my phone because UPI redirects behave differently on WebView. I opened my phone's browser, typed my laptop's IP, and watched the redirect go to the wrong domain — cookies rejected, CORS errors everywhere. My laptop worked. My phone didn't. My colleague on the network couldn't even resolve the hostname I was shouting across Slack.

I'd been lazily juggling /etc/hosts entries for years — one on my laptop, one on the office machine, one on a VM. It worked until it didn't. Every time I switched networks, cloned a new service, or handed my laptop to someone for a quick test, I rewrote IPs and cursed. I wanted predictable, human names like payments.local.dev to mean the same machine from any device on my desk. I wanted SSL certs that didn't feel like a circus. I wanted to stop asking people "Did you add 192.168.1.13 to your hosts file?"

So I set up a tiny local DNS using dnsmasq. It solved almost everything. Until the day the VPN broke it.

Why local DNS instead of mDNS or exposing a tunnel
I tried mDNS/Bonjour first. It sort-of works for Macs, breaks for many Android browsers, and bleeds into weird name collisions when someone else in the office runs a machine advertising "mypc.local". Exposing a public tunnel (ngrok, expose) is great for sharing, but I don't want ephemeral public endpoints for every internal service, and mobile UPI flows sometimes refuse tunnels.

A tiny DNS gives predictable names, works for every device that can set DNS (phones, other laptops, routers), and plays well with local TLS when paired with a dev CA.

How I actually run it (the short, practical version)
I run dnsmasq on my primary dev box. On Linux that meant:

- Install dnsmasq (apt/yum).
- Tell dnsmasq to answer a specific domain (I use .dev-local) and forward everything else upstream.
  - Example: add "address=/dev-local/192.168.1.13" lines or use a conf that maps *.dev-local to my laptop's IP.
- Configure my router's DHCP to hand out my laptop's IP as the DNS server for connected devices, or manually configure devices to use my laptop as DNS.
- Add a small cert authority and generate certs for *.dev-local so browsers on devices accept TLS for my local names.

On macOS I run dnsmasq through Homebrew and use /etc/resolver to point .dev-local to 127.0.0.1: it means my Mac resolves the names locally, and I then set the router to give my Mac's LAN IP as DNS to other devices.

Why it stuck
- No hosts file juggling. I create service names like payments.dev-local and the name resolves on my phone, on my colleague's laptop, and inside containers.
- SSL is simple. I mint a cert for *.dev-local and add the CA to my phone (workshops, onboarding doc included).
- Less mental context. I can say "open payments.dev-local" in a review and everyone knows what I mean.

The failure: VPN, resolv.conf, and a headless CI job
Two months in we had a late-night deploy. I had a quick smoke test script that hit several local staging endpoints; it ran on my laptop because I use the same machine for quick checks. At 2am I reconnected to the company VPN (we use a corporate split-tunnel policy). The VPN's DNS push replaced my DNS server. Suddenly payments.dev-local resolved to something else — or not at all. My smoke test hit a corporate proxy that returned HTML instead of JSON. The deployment failed the test. I had to dig through /etc/resolv.conf, restore the dnsmasq entry, and then re-run.

That taught me two hard lessons:
1) dnsmasq works until another network entity (VPN, corporate DHCP) overwrites your DNS. If you don't detect that, your tests silently fail.
2) Running dnsmasq on your laptop ties development to that machine. If you want shared availability when the laptop sleeps, you need a router or tiny always-on box (Raspberry Pi, a ₹3,000 router that supports custom DNS) as the authoritative resolver.

The pragmatic fixes I adopted
- Fail fast DNS check: before any CI-local smoke script, I run a 2-second check that verifies payments.dev-local resolves to the expected IP. If not, abort and print the current resolv.conf. Simple. Saved me twice.
- Move authoritative DNS off the laptop if I needed always-on: a cheap Raspberry Pi in my flat runs dnsmasq and my router gives it as DNS. It cost me about ₹3,000 and some late-night soldering — worth it when the laptop sleeps or I switch networks.
- For VPN-heavy workflows, I prefixed dev names with a domain that the VPN won't hijack and taught our local DNS to ignore upstream answers for that domain (dnsmasq's "no-resolv" + "server=/dev-local/"). That way the VPN can push corporate DNS for everything else but not my dev zone.
- Document onboarding: a 5-minute guide for new hires to trust a dev CA and use the Pi's DNS. Yes, some people won't do it. Fine. But the teammates who test UPI flows will.

Tradeoffs and annoyances (the things no one tells you)
- You need admin access on devices you want to reach. Android phones without easy DNS settings are annoying; you either change Wi‑Fi DNS on your phone or use the router to hand out the Pi's DNS.
- Corporate VPNs will always be a wild card. Some companies force their DNS everywhere. If you're on that network, you can't rely on local names unless you have routing and DNS split properly handled.
- It's maintenance. When I changed my laptop's IP, I had to update dnsmasq or make the mapping dynamic. I now use a small script to publish my current IP in dnsmasq via a file update — five lines, stable.
- Security: exposing a DNS server, even on LAN, has risk. I limit responses to my subnet and don't expose it publicly.

What I actually walked away with
Local DNS (dnsmasq) turned ad-hoc, error-prone testing into predictable, name-driven workflows. It made phone testing less painful, SSL less fiddly, and demos less embarrassing. But it also reminded me that "local" tools are brittle when network policies change. The real win wasn't the tool itself — it was adding tiny safety rails: a quick DNS check in scripts and a decision point (laptop DNS for personal convenience, Pi/router DNS for shared reliability).

So if you demo UPI redirects from your phone, or if you get sick of telling teammates to edit hosts files: try a small dnsmasq setup. But add the two-second resolver check before anything critical. It saved me more time than switching to any single fancy tool ever did.