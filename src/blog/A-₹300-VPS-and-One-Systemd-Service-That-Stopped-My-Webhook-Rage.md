---
title: "A ₹300 VPS and One Systemd Service That Stopped My Webhook Rage"
pubDate: 2026-04-25
description: "I stopped fighting flaky tunnels and paid ₹300/month for a persistent HTTPS endpoint. Here’s the minimal setup I run, why it actually helps for payment/webhook testing, and the tradeoffs I hit."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with terminal windows visible"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["devtools", "webhooks", "infra"]
---

It was 10:40pm and a Razorpay payment callback was stuck "processing" on staging. I was on a shaky Airtel hotspot, my ngrok tunnel had rotated to a different URL an hour earlier, and the webhook delivery logs showed a 404 to a domain that no longer pointed at my laptop. The client demo was at 11am next day. I’d done this dance before: restart ngrok, paste new URL into dashboard, pray the webhook endpoint accepts it. I was tired of praying.

So I stopped treating webhooks as ephemeral and spent a weekend building a tiny stable endpoint: a ₹300/month VPS, a domain, Caddy as a TLS reverse proxy on the VPS, and a single auto-ssh systemd unit on my laptop that opens a persistent reverse tunnel. Now my staging callbacks hit https://staging.example.com every time — even when I switch networks, commute, or reboot. This is what I set up, why it works in the Indian context, and the painful tradeoffs I learned the hard way.

## The setup I actually run (short and repeatable)
- VPS: ₹300/month (a low-end VPS from a provider with decent Delhi/Bengaluru peering). You only need 1 vCPU, 512–1GB RAM.
- Domain: any cheap domain (₹700–₹1,000/year). Caddy will issue TLS automatically.
- On VPS: Caddy as a reverse proxy that routes subdomains to an internal port (localhost:8080 etc.). No fancy config; route / to http://127.0.0.1:9000 for my tunneled service.
- On laptop: autossh making an SSH reverse tunnel from a stable port on the VPS to my local dev server:
  - autossh -M 0 -N -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3" -R 127.0.0.1:9000:localhost:3000 ubuntu@vps
- A systemd user service ensures the tunnel restarts on disconnect and on network change.
- Optional: a tiny healthcheck on the VPS that returns 200 for /_health so I can tell at a glance if the tunnel is up.

Why this combo? Caddy gives me trusted HTTPS for free and a real domain that never changes. The SSH reverse tunnel handles NAT and office firewalls without fiddly port forwarding. Systemd keeps it alive when my laptop sleeps or moves networks — crucial when the office Wi‑Fi sleeps interfaces aggressively.

Costs (real INR): VPS ~₹300/month, domain ~₹800/year, negligible bandwidth for normal webhook payloads. Compare that to ngrok Pro at ~₹1,200–₹1,500/month or the mental cost of swapping URLs daily.

Why this matters in India: the office NATs, ISP CGNATs, flaky power, and personal hotspot usage make inbound connections unreliable. A persistent public endpoint removes a whole class of "it worked yesterday" problems. Plus, payment platforms often prefer stable webhook URLs for debugging or whitelisting.

What I automate
- systemd user service for autossh with Restart=always and RestartSec=5.
- a small script that flips between local ports for multiple projects (tunnel 9000→3000, 9001→4000).
- a DNS subdomain per project (staging-payments.example.com) managed once — no more copy-pasting URLs into dashboards every time ngrok reauths.

## What broke (the honest constraints)
This is not a silver bullet. I learned three painful lessons quickly.

1) Tunnel disconnects still happen
Autossh + systemd fixed most disconnects, but not all. Mobile hotspots or corporate networks with aggressive idle timeouts occasionally kill the SSH control socket. The result: webhooks queue up or fail until I notice. I added a tiny uptime monitor (UptimeRobot hitting /_health) that pages me via Telegram and that solved the blind spot. If your demo window is precious, assume you’ll still babysit once in a while.

2) You're the public endpoint now — security responsibility increases
A persistent domain attracts noise. I had to lock down the VPS: fail2ban, key-only SSH, rate limits on Caddy, and stricter CORS + HMAC checks on my app. That extra ops overhead is real. If you’re not comfortable running a public host, this approach is not for you.

3) Client IPs and whitelists become weird
Some payment gateways do IP whitelisting for webhook sources or expect webhook payloads from specific IP addresses. When webhooks route through the VPS, the source IP seen by my laptop will be the VPS or the payment provider (depending on proxy headers). I had one week where Paytm's sandbox insisted on seeing an Indian IP range and blamed my endpoint for "suspicious" requests. Fixing that required adjustments on the gateway side or a different proxy pattern. Be prepared to liaise with vendor support.

The honest tradeoff: ngrok wins for ultra-fast ad-hoc demos. This VPS approach wins for repeated, reliable integrations and when you want a stable URL in dashboards, docs, and automations. On cost, I don’t find the ₹300/month significant given the time it saves when payments actually matter.

When I still use ngrok
- Live customer demos where I can’t risk a public domain and I want a disposable tunnel.
- When I need webhook replay with exact client IP emulation (ngrok has IP options).
- Quick experiments when I’m away from my regular laptop.

The week it failed me
Two months after switching, my laptop was on a three-hour call and the hotspot throttled SSH connections after long idle periods. The systemd unit kept restarting, but the SSH key agent had timed out and autossh couldn’t reauthenticate — the tunnel never recovered until I manually reconnected. I added an ssh-agent auto-restore step to my login scripts and an alert to avoid sleeping through that second lost hour. It was a human oversight; something I could have avoided by hardening the authentication flow from day one.

What I actually walked away with
If you do webhook-heavy work (payments, messaging, order updates) in India, buy the stability. A cheap VPS + Caddy + autossh is cheap relative to repeat debugging sessions and client demos that go sideways. But plan for ops: alerts, basic hardening, and a fallback (ngrok, or a staged "paste URL" process) for the one-off demos where exposing a public domain is overkill.

If you want, I can paste the exact systemd unit and Caddyfile I use — but only if you're ready to run a public endpoint and keep an eye on it.