---
title: "When My App's TLS Broke on Indian ISPs — The Transparent Proxy That Hid in Plain Sight"
pubDate: 2026-05-21
description: "How I hunted a mysterious TLS failure that only happened on some Indian networks, the packet trick that exposed a transparent proxy, and the ugly fix that actually worked."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk showing code on the screen, with an ethernet cable nearby"
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["networking", "debugging", "infrastructure"]
---

It started with one angry support ticket: "Payments failing on JioFiber and Airtel mobile hotspot, works on office Wi‑Fi." Then two more. All Android, all intermittent, all around 7–9 PM. The stack traces were useless — TLS handshake errors that disappeared when the user switched to mobile data or tethered to a different ISP. My first instinct was to blame our load balancer or a recent TLS change. I was wrong, and the wrong path cost me a frantic Saturday.

What I needed was a way to stop guessing and see what the network was actually doing between the client and my server.

Where the problem showed up (and where it didn't)
I reproduced the issue on my phone by switching networks: home JioFiber (failing), Airtel hotspot (failing), Airtel office Wi‑Fi (working), Vodafone prepaid hotspot (working). That pattern told me it wasn’t the phone or the app code. It was the network path.

Two cheap pieces of kit I used that week (both worth their INR):
- A ₹2,500 spare Android phone with a clean profile for testing. Cheap, and saved me dariing to use my primary device for isolating UPI/Bank apps.
- ₹250 prepaid data packs across providers so I could force tests from different network operators without burning my main number.

The packet trick that blew the mystery open
I opened a shell and ran these on my laptop and on a small VM I control (to compare):

1) Basic TLS client test:
openssl s_client -connect api.example.com:443 -servername api.example.com

2) Forcing TLS1.2 and checking server cert chain:
openssl s_client -connect api.example.com:443 -servername api.example.com -tls1_2 -showcerts

3) Curl with resolve to bypass DNS and force the same IP:
curl -v --resolve api.example.com:443:203.0.113.10 https://api.example.com/

4) Raw capture during the failing network:
sudo tcpdump -i any host api.example.com and port 443 -w fail.pcap

What I expected: identical client hello from both networks and the server responding with the same certificate chain. What I saw: on the "failing" networks, the TCP SYN/ACK landed at a different intermediate IP (owned by the ISP), and the TLS server certificate chain returned by that endpoint didn’t match what our origin served. In short: our TLS session was being terminated by a transparent proxy.

Two concrete observations in the captures:
- The SNI being received by the upstream endpoint was slightly different (our hostname vs an internal-hostname). That explained why the certificate returned didn't match.
- The ciphers and TLS versions offered by the proxy were older — the proxy downgraded to RSA‑signed certs and TLS1.0/TLS1.2 handshakes with limited ciphers. Newer features (ECDSA-only chains or TLS1.3) sometimes failed.

Why this happens in India: many ISPs and enterprise middleboxes run transparent HTTP/TLS proxies for caching, parental controls, or traffic inspection. They intercept at the edge and re‑encrypt, and because they’re not a browser’s trusted root or because they rewrite SNI, they can break certain client expectations. This is especially common on consumer-grade ISP stacks during busy hours.

The fixes I tried (and the one I deployed)
I tried three things in sequence.

1) Blame and rollback (failure)
I first convinced myself the problem was our TLS config change rolling out the week before (we'd flipped to ECDSA-only certs on our CDN to get perf gains). So I rolled back. No consistent improvement. That wasted 6 hours and a few apologetic messages to the on‑call Slack channel.

Lesson: don’t assume correlation is causation. You need the packet-level evidence.

2) Port-hopping and ALPN tricks (partial, temporary)
I tried serving on an alternate port (8443) and forcing clients to that port via app updates. That avoided the ISP proxy in some cases because the proxy only watched 443. It fixed a subset of users immediately, but it’s a maintenance headache (apps, firewalls, proxies, banking ecosystems assume 443). Not a long-term fix.

3) Dual certs: the pragmatic fix we shipped
We settled on serving both ECDSA and RSA certificate chains simultaneously (via our CDN / load balancer). That meant:
- Clients that prefer ECDSA still get it.
- Clients that get intercepted by a proxy expecting RSA chains succeed too.
- We added a small health probe that checks handshake success from sample IPs of major ISPs nightly.

Tradeoffs: CPU use went up a little (RSA signs are more expensive on our TLS termination nodes), and this increases certificate management complexity. But it fixed ~92% of the failures overnight. For the remaining 8%, we provide a fallback in the app to suggest switching to mobile data or toggling Wi‑Fi when a critical payment fails.

The honest failure I lived with
About a week after deploying dual certs, we saw a new class of failures: some banking apps had custom certificate pinning or strict SNI checks and started failing outright when the proxy altered SNI to an internal hostname. There’s no clean server-side fix for that; the only real fix is to work with the ISP or ask users to avoid that network. We opened tickets with two ISPs; one acknowledged the issue and promised a cursory fix in their next regional rollout (read: it may arrive in 6–8 weeks). That delay reminded me that some network problems have human, not technical, resolution paths.

What I actually walked away with
If TLS fails only on certain ISPs, don’t waste time on application code. Capture packets, compare client hellos, and look for a change in the TCP/IP path or SNI. The most pragmatic mitigation for consumer-facing services in India was to serve a compatibility path (dual certs or alternate ports) while nudging ISPs to fix harmful interception. That’s messy. It costs CPU and complexity. But it stopped waking me up at 2 AM.

Open question I haven’t fully solved: how do you handle users behind middleboxes that rewrite SNI and also pin certificates? There’s no perfect engineering fix — only product decisions about UX and which compromises we accept for reach.