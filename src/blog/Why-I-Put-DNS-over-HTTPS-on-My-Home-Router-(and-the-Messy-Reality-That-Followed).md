---
title: "Why I Put DNS-over-HTTPS on My Home Router (and the Messy Reality That Followed)"
pubDate: 2026-03-06
description: "I set up DNS-over-HTTPS on my home network to block trackers and speed up browsing. Here’s what worked, what broke, and how I fixed the annoying bits."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&w=2000&q=80&auto=format&fit=crop"
  alt: "A person typing on a laptop with network gear and cables in the background"
  caption: "Image credit: Brooke Cagle / Unsplash"
  creditUrl: "https://unsplash.com/photos/1498050108023-c5249f4df085"
tags: ["DNS-over-HTTPS", "networking", "home-infra"]
---

I wanted fewer trackers, fewer ISP DNS hijinks, and slightly faster page loads. The answer I reached after a few evenings of tinkering was to run DNS-over-HTTPS at home. It sounded simple: encrypt DNS, point everything at the local resolver, feel smug.

That’s the short story. The long story involves a flaky smart TV, an Android phone that wouldn’t obey, and one small change that made my parents’ old desktop refuse to browse. If you’re an Indian developer thinking about doing this on your home network, here’s what I learned the hard way—what actually improved and the tradeoffs you’ll run into.

Why DNS-over-HTTPS mattered to me
- Privacy: My ISP’s DNS logs are noisy. Public resolvers are better, but unencrypted DNS still leaks queries. DNS-over-HTTPS eliminates that cleartext exposure from my local network.
- Fewer captive portals and ad injections: Some ISPs and cheap routers inject results or captive pages. Forwarding encrypted DNS removes many of those manipulations.
- Centralized filtering: I wanted adblocking and family-safe filters without installing browser extensions on every device.

Main keyword: DNS-over-HTTPS — I used it for encrypted lookups across devices.

What I actually set up
- A tiny VPS is optional, but I preferred a self-hosted approach: a Raspberry Pi (4) running cloudflared as a DoH client and AdGuard Home for local caching and blocking.
- Router DHCP was configured to hand out the Pi’s IP as the DNS server. For devices that support it (my newer laptops and TVs), I set DoH directly where possible.
- For mobile, Android’s Private DNS setting wasn’t ideal because it uses DoT (DNS-over-TLS). I used an app for selective routing via the Pi when I needed the extra privacy on mobile data.

The good bits (real gains)
- Cleaner results: Pages loaded without ISP DNS hints, and a lot of ad-related domains vanished thanks to AdGuard’s blocklists. That tangible reduction in tracker calls felt satisfying.
- Fewer annoying ISP redirects: No more “connection failed — login to continue” style injections during some failed lookups.
- Faster cache hits for commonly visited developer sites—once the Pi’s cache warmed up, repeat lookups were snappier than hitting an external resolver from a flaky 4G hotspot.

The messy, realistic downsides
- Device compatibility: Some smart TVs, older IoT devices, and set-top boxes don’t respect a custom DNS or hardcode Google DNS inside firmware. They either fall back to IP-only methods or fail. I had one TV that stalled at “obtaining IP” until I removed DoH and used a transparent DNS proxy instead.
- Broken captive portals: When my guests came over and tried to sign into a café-like captive Wi‑Fi (phone hotspots), the encrypted DNS prevented the portal splash from triggering. The fix is to temporarily disable DoH or add split-DNS rules—annoying when helping non-technical users.
- Latency for first lookups: DoH adds TLS overhead. My Pi handled caching, but initial cold-cache lookups were a hair slower than straight UDP to a nearby resolver. Not enough to matter for most browsing, but noticeable in latency-sensitive workflows (CI pipelines hitting new domains).
- Maintenance: The Pi needs updates, certificate renewals, and occasional restarts. The comfort of “set and forget” was overstated—there’s a small ongoing maintenance tax.

Practical tips that saved me time
- Start with a small, observable change: Run cloudflared locally and point one laptop at it. Verify with dig +short @localhost example.com and inspect the cleartext-less traffic.
- Use split-DNS for devices that break: Keep your local network using the Pi for normal devices, but add DHCP reservations that give older devices a plain resolver IP.
- Use an upstream DoH provider with an India presence (Cloudflare, Quad9, NextDNS, or a nearby Google endpoint) to keep latency usable from metros like Bengaluru or Mumbai.
- Keep a fallback: Configure your router with a secondary DNS that’s a plain UDP resolver. If your Pi dies, devices can still browse. Expect a short period of mixing encrypted and unencrypted DNS during failovers.
- Test mobile: Android’s Private DNS (DoT) is great for mobile-only privacy, but it won’t integrate with your home DoH setup. Try both approaches before rolling out to everyone.

When I’d do this differently next time
I would deploy a small HA pair (two Pis) or run the DoH client in a cheap cloud region close to me and use the Pi as a forwarder. That reduces the single-point-of-failure pain without adding too much cost—useful when you can’t babysit the home box every weekend.

Verdict (my position)
DNS-over-HTTPS on a home network is worth it if you care about privacy and clean DNS results and are willing to accept a small compatibility burden and maintenance overhead. It’s not a magic fix for all privacy problems—browser fingerprinting and tracking scripts still exist—but it’s a practical, low-cost layer that materially improves browsing quality for me.

If you’re comfortable with occasional troubleshooting (helping guests sign in, fixing a stubborn TV), go ahead and set it up. If your household hosts many legacy devices or you need a pure “set it and forget it” router, you may prefer a managed DNS filtering service instead.

Parting note: make a small README for your home network. Write down the steps to flip DoH on/off and put it on the fridge. When your mom’s phone stops opening WhatsApp Web at 10 pm, you’ll be glad you did.