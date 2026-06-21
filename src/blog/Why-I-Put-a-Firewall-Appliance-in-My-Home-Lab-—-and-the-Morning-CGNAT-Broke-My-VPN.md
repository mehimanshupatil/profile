---
title: "Why I Put a Firewall Appliance in My Home Lab — and the Morning CGNAT Broke My VPN"
pubDate: 2026-06-21
description: "I added an OPNsense firewall to my home lab for realistic testing — then my ISP pushed me behind CGNAT and took my inbound access. What worked as a fallback, what failed, and the real costs."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a coffee cup and notebook"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["home-lab", "networking", "dev-tools"]
---

I was mid-demo in a client call — screen share on a staging site running on a server at my desk — when the browser froze and the site disappeared. No errors from my app. My laptop still had internet. My colleagues could still reach our cloud APIs. But anything that needed a TCP connection back to my home lab was gone.

I had built that home lab like an on-call engineer builds a weekend fortress: a small PC running OPNsense for routing and VLANs, a separate switch for test subnets, and a neat ruleset so I could mimic customer network quirks. I liked the control. I could introspect packets, inject DNS responses, simulate slow links. It cost me about ₹6,000 for the used mini-PC, another ₹2,500 for a fanless case, and a ₹3,500 UPS so it survived Bangalore power blips. It felt professional.

Then my ISP quietly put me behind Carrier‑Grade NAT (CGNAT).

Why I added a firewall appliance

I don’t like “works on my machine” demos. We ship networked features; anything relying on NAT, port forwarding, or specific MTU behavior can break in production. An appliance gives me:

- real NAT tables and port-forwarding rules,
- multiple VLANs to separate payment testing, CI runners and my personal devices,
- traffic shaping so CI jobs don’t drown my Zoom calls.

I also wanted to practise runbooks. An appliance is a realistic single point of failure; it’s a good place to learn incident choreography without bringing down prod.

What I actually got

The appliance worked exactly as expected — until the ISP changed the plumbing.

For months I used dynamic DNS + port-forwarding on the ISP router to reach services on my lab. Then one morning the client couldn’t reach the demo. In the background the ISP had moved my connection behind CGNAT. My public IPv4 disappeared; the dynamic DNS entry still pointed to the old external IP. Inbound ports no longer reached me because multiple subscribers now shared a NAT address. My carefully crafted firewall rules were irrelevant — the ISP-owned NAT was the gatekeeper.

I called support. They were helpful but blunt: “We’re migrating customers to CGNAT to conserve IPv4.” Fixes they offered were expensive or slow (a “static public IPv4” add‑on, or a commercial-grade plan at a higher monthly price). For a hobby lab and occasional demos, that wasn’t acceptable.

The mistakes I made

- Assumed a stable external IP. ISPs in India (and globally) are increasingly dynamic — and CGNAT is becoming common on consumer FTTH plans, especially during scaling phases. I should've assumed inbound reachability was fragile.
- Trusted dynamic DNS + port-forwarding as my “remote access” plan. That’s brittle when the ISP can reassign NAT.
- Underestimated power and noise. The new appliance ran 24/7. My UPS lasted only about an hour under sustained load. I neglected to set expectations with family — a realistic constraint if you live in a compact Bangalore apartment.

What saved the day

I needed an out-of-band path and I wanted something low-effort. I ended up using two layers:

1) Tailscale as a control plane — I installed a Tailscale node on the lab appliance and on my laptop. Tailscale uses an outbound connection from both ends, so it ignores the ISP NAT for most traffic. It gave me remote shell and HTTP access without fiddly port-forwarding.

2) A tiny ₹300/month VPS as a relay for HTTP when I needed to show a browser-based demo. I run a reverse proxy (Caddy) on the VPS and use an SSH tunnel from my lab to that VPS. The client hits the VPS, which proxies traffic to my lab over the SSH tunnel. The VPS is cheap; the latency is fine for demos, and it’s predictable.

Both have tradeoffs. Tailscale is fantastic for ad-hoc access but I had to be careful with access ACLs — I almost exposed a test DB to a device I shouldn’t have. The VPS costs money and adds a hop, and during one weekend I forgot to restart the SSH tunnel after a home power outage. That lapse cost me a second demo.

The real tradeoffs you’ll live with

- Complexity: adding an appliance multiplies places that can break — ISP NAT, home power, the appliance OS, home switch, UPS. You’re buying realism, not simplicity.
- Cost: initial hardware (~₹10–12k if you buy decent used), plus UPS and a small monthly VPS or paid remote access service if you want reliable inbound reach.
- Visibility: you need to monitor your lab from outside. I now run a simple health check that reports to a small webhook on the VPS — if the webhook stops receiving pings, I know the tunnel is down.
- Noise & power: my lab draws more than my old travel router. If you’re in a rental apartment, factor the battery/heat/noise into negotiations with roommates.

One honest failure

I tried to avoid recurring costs by relying purely on dynamic DNS and a free tunnelling tool I scripted myself. It worked for two months. Then the script failed after a library update and the tunnel never re-established. I lost a client call. That mistake taught me to accept a small monthly cost for resilience; ₹300/month is cheaper than a lost sale.

What I walked away with

If you want a home lab that behaves like a real network, a hardware appliance is worth it. It teaches discipline and surfaces edge cases you’d never hit on a laptop. But don’t assume your ISP will give you a stable public IPv4. Plan for an outbound-controlled fallback — Tailscale + a tiny VPS or a paid static IP if you need deterministic inbound reachability. And automate reconnects and health checks; the first time an outage interrupts a demo, you’ll stop blaming the network and start paying for reliability.

I still keep the appliance. I also sleep better now with a ₹300 VPS and an always-on Tailscale node. The lab is realistic, noisy, and occasionally flaky. That last part is useful — it forces me to build fallbacks before the client notices.