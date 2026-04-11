---
title: "The tablet that saved my on‑call nights (and the things that still break)"
pubDate: 2026-04-11
description: "How I turned an old Android tablet into a wall-mounted on‑call console with Grafana, Uptime Kuma, Tailscale and a local runbook — and the real tradeoffs I ran into."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A workspace with a tablet and a laptop on a wooden desk"
  caption: "Photo by Christopher Gower on Unsplash"
  creditUrl: "https://unsplash.com/@christophergower"
tags: ["on-call", "monitoring", "hardware"]
---

It was 3:07 a.m. The pager buzzed. My laptop was asleep under a charging cable. The router had blinked out once earlier in the night during load‑shedding. I fumbled for my phone, opened the VPN app, logged in, then waited for a dashboard to load over my flaky home 4G hotspot. Ten minutes later the alert was acknowledged, but the database was still degraded and I’d already lost a chunk of sleep.

That morning I decided to stop depending on a single, personal device for on‑call. I dug out a Redmi tablet I’d bought second‑hand for ₹3,200, wall‑mounted it next to my desk, and made it a one‑job device: status, metrics, runbooks.

This is what I built, why it works in India, and the small failures you should expect.

## What I actually put on the wall (hardware + software, with costs)
- Tablet: ₹3,200 (second‑hand 8" Android). You can use a newer cheap tablet — I’ve seen ₹6,000 options that work fine.
- Wall mount and USB cable: ₹450.
- Power: standard USB charger (5W). If you want battery backup add a ₹1,200 10,000 mAh powerbank.
- Software:
  - Fully Kiosk Browser (free tier) to lock the device into a URL and keep the screen awake.
  - Grafana hosted on a small VPS (my monitoring stack sits on a ₹300/month VPS).
  - Uptime Kuma for ping checks (self‑hosted).
  - Tailscale on the server and Android to avoid exposing dashboards publicly.
  - A tiny local static HTML runbook stored in Fully’s local web content (quick checklists and SSH jump host addresses).

Total outlay: under ₹4,000 if you re‑use an old tablet. Monthly add-on: the VPS ~₹300.

Why this combo? Fully Kiosk locks the tablet to the dashboard, keeps the screen on, and supports a whitelist of local contents. Tailscale avoids hair‑pulling NAT/sketchy exposed ports. Grafana gives me visual state. Uptime Kuma gives me immediate ping status and can be configured to open the runbook URL.

## Why this is actually useful in an Indian setup
- Power cuts are routine. A wall‑mounted tablet on an always‑on UPS or a small powerbank survives short outages that take my laptop offline.
- Mobile data is expensive and slow. Tailscale + small VPS means the tablet doesn’t re‑download large assets; it just renders lightweight dashboards and runs a local cached fallback.
- Office/home internet flakiness: when Wi‑Fi drops, the tablet can still show the last successful snapshot of metrics and a cached runbook to follow step‑by‑step.
- Visibility: family members (and sometimes roommates) see that I’m on‑call and avoid unplugging things. That small social win matters.

I can acknowledge a pager from my phone, but I don’t need to faff with the laptop to run the first checks. I can read CPU heatmaps, check error rates, and follow the exact runbook for common failures — without logging into anything.

## The honest failures and tradeoffs
This isn’t magic. I ran into a few ugly realities.

- Push notifications are unreliable on a kiosk device. Android aggressive battery killing and Doze mode meant I sometimes didn’t get an alert if the device wasn’t actively rendering. Fully keeps the screen awake, which mitigates this, but it also burns power and shortens tablet life. I ended up relying on Uptime Kuma’s loud alarms (hosted on the VPS) rather than Android push.
- Screen on = burn‑in risk and shorter hardware life. The cheap tablet’s backlight will dim after a year of always‑on use. I disabled high‑brightness night mode and used a screen saver that shows an animated logo to minimise static content.
- Physical mounting failed once. The Command strip I used came off after a humid week and the tablet fell. The glass survived, software didn’t. I now use a cheap screw mount and a micro‑USB cable anchor. Safe mounting costs another ₹200 but is worth it.
- Offline troubleshooting is still hard. The tablet can host a runbook and SSH jump addresses, but I still need a full keyboard and terminal for deep fixes. The tablet is a triage console, not a replacement laptop.
- When the VPS I used for dashboards went down (my bad — I’d co‑hosted monitoring and a small test webapp together), the tablet showed nothing useful. I introduced redundancy: small backups, a second uptime ping from a different region, and a static cached page that lists emergency contacts and a minimal checklist.

One constraint that genuinely changed how I use the device: I stopped treating it as a source of live logs. Instead I design dashboards around what I can do with just the tablet — service health, top 3 incident causes, and links to precise runbook steps. Anything requiring logs or rebuilds, I leave for the laptop.

## Day‑to‑day habits that made it reliable
- Keep a local cached runbook HTML in Fully Kiosk. If the network is gone I can still follow steps.
- Use short auto‑refresh intervals (30–60s) for Grafana panels, and a small nginx cache on the VPS to reduce payload.
- Automate a loud alarm in Uptime Kuma that calls my phone via HTTP → third‑party call service; it’s louder and harder to ignore than a push.
- Rotate the tablet weekly: quick reboot and visual inspection. Cheap hardware accumulates quirks.
- Put a sticky label with SSH jumphost and my Tailscale key name on the mount. Old school, but it saved me twice.

What I walked away with: a wall tablet doesn’t replace your laptop — it reduces the number of times you need to fire up a laptop at 3 a.m. It makes the first 10 minutes of an incident structured and calmer, and that alone preserves sleep and judgment. The tradeoffs are physical: battery life, occasional mounting drama, and handling Android’s background quirks. If you want fewer late‑night panics and you can spare a ₹3–6k tablet, it’s a tiny investment with outsized returns.

I still don’t get every alert on the tablet. I still log into my laptop for hard fixes. But I no longer waste ten minutes getting attached to a flaky network before I start triaging. That small friction removed has saved me more sleep than any monitoring dashboard ever promised.