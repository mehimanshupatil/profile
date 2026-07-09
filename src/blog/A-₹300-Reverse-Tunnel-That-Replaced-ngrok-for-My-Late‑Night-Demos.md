---
title: "A ₹300 Reverse Tunnel That Replaced ngrok for My Late‑Night Demos"
pubDate: 2026-07-09
description: "How I stopped relying on free tunnelling services for client demos by running a tiny ₹300 VPS reverse tunnel—what I set up, the tradeoffs, and the week it nearly cost a sale."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with code visible on the screen and a cup of coffee beside it"
  caption: "Photo by Christin Hume on Unsplash"
  creditUrl: "https://unsplash.com/@christinhume"
tags: ["dev-tools", "remote-development", "india"]
---

It was 10:30 pm and the client was on a shaky Reliance Jio connection from their bedroom in Pune. I had promised a live walkthrough of a payment flow. Ten minutes in, ngrok hit its free‑tier rate limit and started giving 502s. The client kept switching tabs trying to reload. I felt every second burn away.

That night I stopped using free public tunnels for demos. I still wanted the quick UX of “open localhost, send link,” but not the unpredictability. So I put a ₹300 VPS between my laptop and the world and used an SSH reverse tunnel + a tiny reverse proxy. It has saved me more demos than I can count. It also taught me a few irritating, expensive lessons.

Why a cheap VPS, not ngrok or a paid tunnelling service
- Predictable uptime and no surprise limits. Paid ngrok is fine, but for a solo developer the recurring cost and limits on concurrent connections were annoying.
- Full control: I can rotate certs, add Basic Auth, and inspect headers if a payment gateway misbehaves.
- Rough cost: think ₹300–₹600/month depending on provider and region. I run a low‑CPU droplet — it only needs to forward TLS and proxy requests.

How I actually run it (short, practical)
1. VPS: smallest instance with a public IPv4 and ports 80/443 open. I pay ~₹300/month on a small provider.
2. Domain: subdomain on a domain I already own (dev.example.com). Cheap and reliable—no free subdomain surprises.
3. TLS + Proxy: Caddy. It handles Let's Encrypt, has small memory footprint, and built‑in reverse proxy with basic auth.
4. Tunnel: SSH reverse tunnel from my machine to the VPS. One liner from my laptop (replace ports as needed):
   ssh -N -R dev.example.com:443:localhost:3000 -o ServerAliveInterval=60 user@vps
   This makes requests to dev.example.com:443 land on my localhost:3000.
5. systemd --user service on my laptop to keep the tunnel alive, plus a small script that restarts on failures with backoff.
6. Caddy config: match dev.example.com and proxy to the local socket the SSH reverse tunnel exposes. Caddy does the TLS and optional access control.

Why SSH+reverse proxy, not a straight tunnel
A raw SSH -R can work for quick tests, but:
- Most corporate clients need a valid TLS certificate. Having Caddy on the VPS terminate TLS makes the link work behind strict corporate proxies.
- Caddy can enforce HTTP basic auth or IP allowlists for demos.
- It allows me to reuse a single VPS for multiple subdomains (multiple demos) without complex SSH port juggling.

The bits that bit me
1. Corp firewalls and "bad" IPs: One week a big client’s IT blocked our VPS IP range. They had a paranoid proxy that flagged cloud IPs. The demo was dead until I spun up a new VPS in a different region and begged their admin to whitelist. Solution: keep two cheap VPSes in different providers/regions. Annoying, but much cheaper than rescheduling multiple demos.
2. Let's Encrypt vs ephemeral domains: If you use dynamic hostnames (like my-laptop-123.vps.provider), LetsEncrypt rate limits or DNS lag can cause issuance to fail. I use my real subdomain and pre-provision certs.
3. Security tradeoffs: Exposing my local machine to the Internet is inherently risky. I run the app only when the tunnel is up, bind the app to localhost, use Basic Auth, and keep the laptop firewall strict. One time I forgot Basic Auth during a demo and had to abort mid-call. Live lesson.
4. Connection flakiness: SSH reverse tunnels can silently die (mobile on battery, flaky home Wi‑Fi). My systemd service helps, but it doesn’t fix power outages. For important demos I have a simple fallback: push a build to the VPS and run the demo there as a static deploy. It’s slower to prepare but reliable.

A real failure: the weekend that almost cost me ₹45,000
I had a weekend proof‑of‑concept with a Pune client and relied on the VPS tunnel. The VPS provider did maintenance and rebooted nodes at midnight. My crit path demo went down five minutes before the call. The client hinted they couldn't stretch the contract. I learned two things fast: (a) check your provider's maintenance windows, and (b) have a tiny staged deployment on the VPS as a last‑resort fallback. I paid for the VPS that month and the expedited apologies, but kept the contract.

Operational hygiene that actually matters
- Monitor the tunnel: a tiny Healthcheck script hitting dev.example.com every minute from a reliable external host. Alert on failures.
- Rotate keys monthly and keep the SSH user limited (forced command + no shell).
- Have a prepared "VPS demo": a one‑command deploy that drops a static snapshot on the VPS when my laptop is unreachable.
- Keep two VPS providers. When one provider’s network behaves oddly for Indian corporates, the other usually works.

When this is not worth it
If you demo once a month, ngrok or a paid tunnel provider is easier. If you can't babysit two VPSes or keep keys rotated, the security risk is non-trivial. Also, if your app needs hardware attached (an app that needs an Android device attached to your laptop), tunnelling still works but is more brittle.

What I walk away with
A cheap reverse tunnel is not glamorous, but it’s predictable. For ~₹300/month and 40 minutes of setup I stopped losing demos to third‑party rate limits or flaky free tunnels. The tradeoff is maintenance: watch your provider, keep an external healthcheck, and have a staged fallback. Oh, and never assume basic auth will be on — add it to your day‑one checklist.

If you want the exact systemd unit and Caddyfile I use, say so — I’ll paste the config.