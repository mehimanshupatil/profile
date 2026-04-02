---
title: "Why I Treat a ₹3,500 4G Router as My Primary Remote‑Work Backup — and the Mess It Makes"
pubDate: 2026-04-02
description: "I keep a cheap 4G router as my instant fallback for dead broadband. Practical setup, costs (₹199/month recharges), and the exact tricks that make it usable for real dev work — plus when it fails."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden table with a notebook and a cup of coffee"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["remote-work", "infra", "tools"]
---

The call drops. Again. My video freezes on the slide where I’m explaining why we need a sane migration plan. The office Slack fills with “Can you hear me?” messages. My router upstairs shows full bars. My ISP dashboard shows zero issues. Everyone blames my setup. I unplug the fiber ONT, plug in a ₹3,500 4G router into the LAN port, and—most of the time—the meeting continues.

I didn’t buy this thing for style points. I bought it because Bengaluru (and many Indian metros) give you fast stretches and sudden blackouts of reliability. Fibre outages, power cuts at the local node, ISP maintenance windows — these are normal. My 4G router is the difference between a fifteen‑minute emergency scramble and a seamless failover. But it’s not perfect. Here’s what worked, what didn’t, and the tradeoffs I learned the hard way.

## What I actually needed (not what marketing told me)
My requirements were simple and practical:

- Keep SSH sessions alive for debugging and deploys. I can’t wait to re-authenticate every time the office broadband hiccups.
- Pass company VPN or at least keep access to internal tools like ephemeral dev servers.
- Support laptop + phone + a second tester device without juggling hotspots.
- Be cheap to buy and cheap to run monthly.

I bought a basic 4G Wi‑Fi router (₹3,000–₹4,000 range; any TP‑Link/Mi/Netgear MiFi will do). I put a separate prepaid SIM in it and use a recharge plan that matches my usage — for me that’s the ₹299 2GB/day plan (≈60GB/month), which costs less than the grief of repeated meeting restarts. Sometimes my company reimburses ₹500/month for such devices; check your policy.

Here are the practical tweaks that made the router usable for dev work:

- Use Mosh, not plain SSH. Mosh survives IP changes and high latency far better than OpenSSH. For day‑to‑day shell work, it makes the connection almost seamless when switching between home broadband and the MiFi.
- Set SSH keepalives and ServerAliveInterval for quick fallbacks. These two lines in ~/.ssh/config saved me countless reconnects:
  - ServerAliveInterval 30
  - ServerAliveCountMax 6
- Prefer split‑tunnel VPNs (if allowed). Full tunnel VPNs across mobile data kills speed and increases latency; split‑tunnel keeps only internal traffic over VPN. If your company insists on full tunnel, test the router before relying on it.
- Assign static DNS (1.1.1.1 or 8.8.8.8) on the router. ISP DNS can be slow or misbehave during carrier switches.
- Keep a cheap UPS for the router (₹1,200). Mobile hotspots die when the power goes out; a 20,000mAh battery and a micro UPS keeps the router alive through short load-shedding.

I also run Tailscale as a fallback for remote access to my home lab. Tailscale works across networks, so even when the company VPN is flaky I can SSH into my personal jumpbox and then into internal resources via port‑forwards. YMMV with corporate security policies — mine tolerate Tailscale but some companies block it.

## When it falls apart (and the limitation I didn’t respect)
It’s not a silver bullet. The biggest honest failure I had was assuming mobile data would behave like wired internet. It doesn’t.

- Latency and jitter are real. Video calls degrade first. Even with full signal, uplink jitter kills audio and screen sharing. For interviews and design reviews, I still prefer wired fiber.
- NAT and double NAT issues. Some corporate setups require reverse SSH tunnels or static IP allowlists. With carrier NAT you can’t run inbound services without a paid static IP or a VPS reverse tunnel. I wasted a day trying to run an HTTP webhook listener from my laptop before remembering this.
- Data caps and throttling. A weekend of heavy work with multiple Zoom calls chewed through 50–60GB quick. After that, Jio/Airtel throttle speeds, and your hotspot becomes a paperweight for heavy ops.
- Company compliance. My org’s security team initially forbade working on certain production tasks over personal hotspots. I had to get an exception and sign a short doc guaranteeing I’d use company‑approved MFA and audit logging. If you handle PCI/PHI or strict audit trails, this might be non‑starter.
- Power and heat. These small routers get hot and occasionally reboot. Placement matters.

I learned the hard way that the device is a "backup of last resort," not a permanent primary. Treating it as primary for days at a stretch invites throttles and flaky experiences. But as a deliberate, well‑tested fallback, it reduces meeting interruptions and incident response time by a lot.

A small, practical checklist I now follow before I rely on the MiFi for a critical session:
- Test VPN + Slack + one big repo clone.
- Start a one‑minute Zoom call and share my screen to check audio & screen quality.
- Confirm my data balance and next recharge date.
- Ensure Tailscale/Mosh can reach the necessary jumpbox.

If any of those fail, I postpone tasks that need low latency (pairing, live demos) and move to asynchronous work: code, reviews, writing tickets.

The tradeoffs matter. I gained reliability for day‑to‑day work and firefighting, but lost the guarantee for smooth video calls, and I now watch data usage like a hawk. There were evenings when I burned 40GB on a single call and had to throttle the family’s Star Sports stream to save the next day’s deploy.

Takeaway: a ₹3,500 4G router is an incredibly effective, low‑cost backup if you configure it for dev work (Mosh, keepalives, DNS, UPS) and treat it as a fallback — not a full substitute for wired broadband or a security-approved corporate network. If you want to avoid frantic Slack messages and missed deploys, get one, test it, and talk to security before you rely on it for production access.