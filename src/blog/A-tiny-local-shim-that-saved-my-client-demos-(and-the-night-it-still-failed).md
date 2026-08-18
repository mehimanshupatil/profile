---
title: "A tiny local shim that saved my client demos (and the night it still failed)"
pubDate: 2026-08-18
description: "How I stopped third‑party scripts from breaking client demos by running a tiny local shim and hosts redirect—what I build, the tradeoffs, and the one real failure."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a desk with code editor visible and a mug beside it"
  caption: "Photo by Prateek Katyal on Unsplash"
  creditUrl: "https://unsplash.com/@prateekkatyal"
tags: ["developer-tools", "demos", "infra"]
---

The client is two floors up, the meeting room has patchy AC and worse Wi‑Fi, and my demo stalls on "loading payment widget..." for a full minute. The laptop beachball spins, the PM fidgets, and I watch a script from a third‑party CDN sit in the network tab as stalled. I’d rehearsed the user flow a dozen times at home — on fibre — but here, with an ISP that rewrites TLS and a captive portal, a 3rd‑party analytics SDK had become a bullet in my head.

This kept happening. Indian client sites, small product demos, and flaky networks were exposing one hard truth: demos die on slow or blocked third‑party assets. Browsers block, CDNs fail, and your entire UI waits. So I solved it the simple way I use for other flaky external things — I faked them, locally.

Why third‑party scripts were the single point of failure
Third‑party scripts are both heavy and unpredictable:

- They add blocking network requests and main‑thread work. On a ₹10,000 office router or a 4G hotspot, a single 200ms request can become 3–4s.
- Corporate proxies and some Indian ISPs rewrite or block certain CDNs. I’ve seen ad networks and measurement SDK hosts (yes, the ones you didn't expect to be critical) return 403s.
- Your app often branches on presence/version of those scripts. If a script never calls its init callback, your flow sits in "waiting" indefinitely.

I had tried every lightweight fix: preloading, local bundling, even offline fallbacks. Those helped in controlled stalls, but not when the host simply refused connections or a browser extension blocked the domain. I needed a demo setup that guaranteed the presence and behaviour of these external endpoints — fast.

What I actually built (and why it's stupidly small)
The solution is a tiny Node.js shim and a hosts redirect. That’s it. No heavy proxies, no VPNs.

How it works, in practice:
- A single-file Express server (≈ 80 lines) that serves stubbed JS at the exact paths the real SDK would use. The stub is intentionally minimal: it sets window.SomeSDK = { init: () => setTimeout(cb, 0), version: "shim-1" } and exposes the small API my app checks.
- Static JSON endpoints for any server callbacks the SDK would have hit (webhooks, config endpoints).
- On my laptop, I edit /etc/hosts (or use dnsmasq for convenience) to point thirdparty-cdn.example.com → 127.0.0.1 during demos. On company machines where I can't touch hosts, I run dnsmasq on a cheap home router (₹3,500 router with OpenWrt) so my phone tether and laptop both resolve to the shim.
- The shim runs as a systemd --user service so I can “demo-ready start” it. For remote demos where clients join from various networks, I keep a tiny ₹300/month VPS as a fallback and point the host there.

Why this works for me:
- The browser loads the 3rd‑party URL immediately and gets a fast 200 response. No blocking wait, no CSP surprises.
- The app sees the SDK API it expects and proceeds. The rest of the UI — the real product code — is exercised without waiting on an external partner.
- I control the shim. When the real SDK adds a callback check, I mimic it. The shim remains intentionally simple; I only implement the calls my app relies on.

The real failure and the tradeoffs I accepted
This approach is not faithful emulation. It’s a pragmatic stub. That cost me once.

During a high‑stakes client demo in Bengaluru, my shim returned a successful init and the app advanced. Ten minutes in, when we hit the live payment sandbox, the real SDK (which our app loaded from the real CDN for the live payment flow) sent a different event sequence than my shim. My demo assumed the payment widget was ready and attempted a final confirmation. The real SDK rejected it, and the demo showed "payment failed" while the client watched. I had to explain the shim mid‑demo and then run the demo again with the real CDN — and we lost momentum.

Lessons from that failure:
- Stubs must preserve the event contract, not just presence. If your app branches on event order, mirror that order.
- Keep the shim switch obvious and reversible: a single env var or a browser cookie that toggles real vs shim. I now expose an on‑page “Use real SDK” button so I can flip mid‑demo without restarting anything.
- Security hygiene: never point production clients at your shim. Hosts edits and a local shim are demo-only. I put a clear banner in the shim responses and a check that only allows known demo origins.

Other tradeoffs I accepted:
- Maintenance: when partners change their SDK, the shim breaks. I only implement what my product needs, and I keep a one‑line test verifying the stubbed APIs before every client meeting.
- Not a replacement for integration tests. The shim is for demos and quick manual testing, not QA. We still run real CI against the actual SDK in our staging environment.
- CORS and cookies can bite. I learned to return permissive CORS headers on shim endpoints and to stub any cookie flows my app checks.

What I actually walk away with
If a third‑party asset can block your happy path in a demo, stop pretending you can make the network behave. Give your app the fast, predictable answers it needs to show value.

Practical takeaway: build the smallest shim that reproduces the app‑facing contract, run it locally with a hosts redirect, and expose a clear toggle to fall back to the real service mid‑demo. It costs almost nothing (a few hours to write, ₹300/month if you want a remote fallback) and saves most of my client nights.

Open question I still wrestle with: how much fidelity is "enough"? I aim for the minimum that keeps the user flow honest; enough to show features, not to validate partners. If you’ve built shims that also stress‑test complex SDKs, I want to know how far you go before it becomes a maintenance trap.