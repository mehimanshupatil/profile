---
title: "The 30‑Second Captive‑Portal Check That Saved My Demos in Bengaluru Offices"
pubDate: 2026-09-23
description: "A tiny preflight network check I run before every demo — detects captive portals, DNS hijack, and gives clear fallbacks so I don't waste client time."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a coffee mug, notebook, and office light in the background"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["dev-tools", "remote-work", "india"]
---

I walked into the client's meeting room with a slide deck, a demo link, and a confidence that comes from 30 successful internal rehearsals. The Wi‑Fi login worked. My browser showed the app. Then authentication calls started timing out. Buttons did nothing. The client’s network had a captive‑portal that only allowed HTTP after a browser login, but our app was calling out on HTTPS and to different hosts. I spent ten minutes toggling Wi‑Fi, begging IT, and finally had to switch to my phone hotspot. The demo finished, but not before someone joked about 'startup readiness'.

That was the last time I treated "network access" as an invisible checkbox.

If you demo in Indian offices or client sites — Bengaluru, Pune, Delhi, Tier‑2 towns — you'll see captive portals, local proxies, DNS redirects, and flaky firewall rules. Hotel Wi‑Fi and corporate guest networks are the usual suspects. The honest truth: you can’t rely on a network to be production‑like. So I built a 30‑second preflight check that I run before any important demo, client call, or on‑site debugging session. It’s small, fast, and saved me multiple embarrassing minutes. It also failed once in a way that taught me the limits of automation.

What the check does (and why those checks matter)
I only need to know three things in 30 seconds: is my machine truly online (no captive portal), can DNS resolve external hosts reliably, and are outbound ports open for the services my demo needs.

The captive‑portal test is the most important. Modern captive portals typically intercept HTTP and redirect you to a login page, or they return an HTML page instead of a 204 No Content. Google and Apple use a simple 204 probe for connectivity detection (for example, http://clients3.google.com/generate_204). If that URL returns anything other than 204, you probably hit a portal or a transparent proxy.

DNS checks catch one of the sneakiest problems: ISP or corporate DNS hijacks. Your app may resolve api.example.com to a local "helpful" page. Verifying a known public A record from a trusted resolver (1.1.1.1 or 8.8.8.8) is cheap and revealing.

Port checks are the final guard. A network that passes the captive portal probe may still block high‑level ports (5060, 6379, 22) that your demo depends on. A simple TCP connect is enough.

My 30‑second script
I wrapped the three checks into a tiny shell script I paste in every repo’s tools/bin/demo‑preflight. It takes 20–30 seconds on most networks.

#!/usr/bin/env bash
set -euo pipefail
echo "1) Captive portal check…"
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://clients3.google.com/generate_204 || echo 000)
if [ "$status" != "204" ]; then
  echo "⚠️ Captive portal or redirect detected (HTTP $status). Open browser and log in, or use hotspot."
  exit 2
fi
echo "OK: no captive portal."
echo "2) DNS sanity check (1.1.1.1)…"
ip=$(dig +short @1.1.1.1 example.com | head -n1 || true)
if [ -z "$ip" ]; then
  echo "⚠️ DNS failed via 1.1.1.1. Try changing DNS or use hotspot."
  exit 3
fi
echo "OK: DNS resolved to $ip."
echo "3) Port checks (https:443, ssh:22)…"
timeout 3 bash -c '</dev/tcp/google.com/443' && echo "443 OK" || { echo "443 blocked"; exit 4; }
timeout 3 bash -c '</dev/tcp/github.com/22' && echo "22 OK" || echo "22 blocked (may still be OK for HTTPS-only demos)"
echo "Preflight complete."

I keep it deliberately tiny. No dependencies beyond curl, dig, and bash. It prints actionable results and exits with error codes I can script around. I run it every time I sit down for a client demo or when I arrive at an office.

Practical fallbacks I keep ready
When the script fails, I have three non‑magical fallbacks:

1) Phone hotspot. I carry a ₹300 prepaid SIM I top up when I travel for demos. For critical days, I switch to my primary postpaid eSIM. It’s immediate and reliable. (Yes, it eats mobile data. It's cheaper than lost face.)
2) Local static demo. If the demo depends on webhooks or third‑party APIs, I keep an offline mode: a locally hosted data file + a simple mode toggle in the UI. It’s slightly less impressive but demos the UX and avoids network flakiness.
3) SSH reverse tunnel to my VPS. This requires mobile data and SSH working, but when GitHub webhooks or vendor callbacks are blocked, tunneling to a trusted VPS does the trick.

A real failure that humbled me
A month after I automated the preflight check into my demo routine, I trusted its green output blindly. The room's Wi‑Fi returned a 204 and DNS looked fine. I started the demo. Halfway through, our app’s push notifications failed. The captive portal check had worked because the network allowed the 204 probe and DNS looked normal — but the corporate firewall silently blocked outbound traffic to our notification provider’s IP range. In short: my checks gave a false sense of security.

That taught me the important limitation: the preflight is a fast, probabilistic test, not a guarantee. After that incident I added targeted port/host checks for the specific services each demo uses. Longer to run, but still under a minute.

Why this matters in India
Indian corporate guest networks and hotel Wi‑Fi are especially inconsistent. I've seen networks where HTTP works but HTTPS to non‑popular domains stalls. I've seen captive portals that only allow a single device per OTP. I've seen DNS providers injected by ISPs. It’s not paranoia. It’s experience. A ₹300 SIM and a 30‑second script are cheap insurance against wasted client time and embarrassing stalls.

One takeaway (not a mantra)
The preflight check saved me from awkward starts more times than not. It also reminded me to design demos that can degrade gracefully. Networks fail in ways machines won’t explain to you. If you have one thing to take away: check the network, and have a non‑network fallback ready. That small habit has kept more demos from collapsing than any last‑minute feature polish.