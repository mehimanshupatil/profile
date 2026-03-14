---
title: "How I Built a ₹300 Personal CDN to Speed Asset Delivery for Indian Clients"
pubDate: 2026-03-14
description: "A practical, low-cost guide to building a personal CDN on a cheap VPS to reduce latency and mobile data for Indian users."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=1000&w=2000"
  alt: "A developer laptop with terminal open, sitting beside a notebook and a coffee cup on a wooden desk."
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["personal CDN", "devops", "india"]
---

I run websites for a few Indian small businesses and side projects. Delivering images and JS from a crowded, far-away S3 bucket or a global CDN felt expensive for smaller clients and often wasted mobile data for users in tier-2/3 cities. So I built a tiny, pragmatic personal CDN on a ₹300/month VPS. It’s not a replacement for Akamai or CloudFront at scale, but in practice it cut page load times and mobile data for my users — with clear tradeoffs.

Why build a personal CDN?
- Cloud CDNs cost money and can be overkill for low-traffic sites. For small Indian audiences, a nearby VPS (Mumbai, Chennai) does half the job.
- A simple cache at the edge reduces origin hits and saves bandwidth on my origin storage.
- It gives control: custom cache rules, quick debug, and cheaper experiments (image optimization, Brotli, different TTLs).

What I actually set up
- A ₹300/month VPS in Mumbai (many providers have plans around this price).
- nginx as a reverse proxy + cache.
- Let's Encrypt TLS for HTTPS.
- Gzip/Brotli, cache-control headers, and simple cache-busting via file hashes.

Core nginx config (conceptual)
- proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=pcache:100m inactive=7d max_size=2g;
- server listens on 443 with TLS certs.
- location /assets/ {
    proxy_pass https://origin.example.com;
    proxy_set_header Host origin.example.com;
    proxy_cache pcache;
    proxy_cache_valid 200 302 7d;
    proxy_cache_valid 404 1m;
    add_header X-Cache-Status $upstream_cache_status;
  }

I keep the asset URLs as mysite.com/assets/<hash>.ext (build step injects hashed filenames). That avoids tricky invalidation and keeps the nginx cache happy — if an asset changes, the URL changes.

Why this works for Indian users
- Latency: a Mumbai VPS typically routes faster to users in India than a default S3 endpoint in Singapore/US. For static assets, even 50–100ms of RTT matters.
- Mobile data: serving compressed, cached assets from the VPS avoids repeated downloads from origin and cuts egress on paid storage.
- Predictability: you control TTLs and can make tradeoffs between staleness and bandwidth.

Measurements that convinced me
- Lighthouse tests before/after showed 15–40% improvement in first-contentful-paint on mobile emulation for pages heavy on images and scripts.
- Server logs showed origin egress drop by ~70% after cache warmed.
- Page repeat views loaded 80–90% of assets from the VPS cache (X-Cache-Status: HIT).

Real constraints and tradeoffs
- Single point of failure: that ₹300 VPS is just one node. If it dies, assets fall back to origin, which is fine for availability but can spike origin egress and latency. I added a simple health-check script that updates DNS to origin if nginx is down for 2 minutes.
- TLS and certificates: Let's Encrypt works, but renewals and ACME automation add operational overhead.
- Invalidations: purging cached objects on nginx is clunkier than CloudFront’s API. Hash-based filenames solved 90% of my needs. For emergency purges I scripted cache-manager endpoints protected by a simple token.
- Bandwidth costs and TOS: check your VPS provider’s bandwidth limits and fair-use policies. If your site suddenly gets popular, you’ll either pay more or need a real CDN.

Practical tips that saved time
- Put the VPS in the region closest to your users. For India, Mumbai is usually best.
- Use gzip and Brotli; enable set_header Vary Accept-Encoding so caches behave correctly.
- Keep HTTPS front and center — mobile browsers penalize mixed content and insecure resources.
- Monitor cache hit ratio from nginx logs. A 70–80% hit ratio is healthy for small sites.
- Automate SSL renewals with certbot and reload nginx gracefully.
- Use build tooling (webpack, gulp, or a simple hash script) to emit content-hashed filenames. This eliminates most invalidation headaches.

When to stop using a personal CDN
- When traffic grows unpredictably. A viral spike can blow past your VPS bandwidth cap and violate provider TOS.
- When you need multi-region redundancy and global POPs for a distributed user base.
- When you require advanced features like automatic image resizing at the edge or advanced bot mitigation.

Final notes — what I actually learned
The personal CDN is not a magic speed bullet; it’s a pragmatic step between “origin-only” hosting and a paid global CDN. For low-traffic Indian audiences, the latency and data improvements are real and the cost-to-benefit ratio is excellent. You trade off redundancy and some convenience (invalidation, autoscaling) for control and cost savings.

If you run small client sites or side projects aimed primarily at Indian users, try this as a staged step: a cheap VPS, nginx cache, TLS, and hashed assets. Expect maintenance — certificate renewals, occasional cache tweaking, and a plan for fallback if the VPS dies — but you’ll also get predictable improvements in speed and data use that clients actually notice.

Go try it, measure the difference for your users, and if you outgrow it, you’ll know exactly what you need from a managed CDN next.