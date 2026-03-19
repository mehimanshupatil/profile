---
title: "Why I Ship Internal Tools as Progressive Web Apps (and How I Ship One Quickly)"
pubDate: 2026-03-19
description: "A practical playbook for building lightweight, offline-friendly progressive web apps for internal tools that save data, install easily, and fit Indian work realities."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&h=1000&fit=crop"
  alt: "Person working on a laptop with code on screen, coffee nearby"
  caption: "Image credit: Photo by Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["progressive web app", "web development", "developer workflows"]
---

At my last startup, we had three tiny internal tools: an approvals dashboard, a delivery tracker, and a little expenses scanner. Each was getting used on phones and laptops, often on shaky cafe Wi‑Fi or employees’ limited mobile data. Instead of shipping three native apps or forcing everyone through a web login every time, I switched them to progressive web apps (PWAs). The payoff was immediate: faster access, smaller installs, and fewer “I can’t open this on my boss’s phone” support tickets.

If you’re building internal tools for teams in India — where low data caps, older Android devices, and flaky networks are still common — progressive web apps deserve a serious look. Here’s a practical, honest playbook for shipping one quickly, what to expect, and the tradeoffs you’ll live with.

Why progressive web apps fit this audience
- Installable but light: PWAs are just a URL + manifest + service worker. Users “install” them to the home screen without visiting an app store, and the footprint is tiny compared with native APKs.
- Offline-first capabilities: Service workers let you cache the shell and essential API responses so a dashboard can show recent data even when a network hiccup happens.
- One codebase: Maintain web UI and behavior once; it works on desktops, tablets, and phones, which matters for small teams without a mobile engineer.
- Saves data for users: With smart caching you can avoid re-downloading large assets for repeated use — a real benefit in India where many users watch their MBs.

Main keyword: progressive web app (use 3–6 times) — sprinkled through the rest of the article.

A quick, pragmatic build plan
1. Start with the shell
   - Create a simple single‑page app (React/Vue/Svelte or plain HTML/JS). Focus on the minimum: authentication, a dashboard list, a detail view.
   - Add a web app manifest (name, icons, theme_color) so the browser offers install prompts and the app looks native on the home screen.

2. Add a service worker for the core experience
   - Cache the shell (HTML/CSS/JS) with a cache-first strategy so the app opens instantly once installed.
   - Use stale-while-revalidate for API results the UI can tolerate being a little old (lists, statuses). Use network-first for critical write operations so the user sees errors appropriately.

3. Keep the initial payload tiny
   - Aim for <1MB initial load on mobile. Lazy-load heavy charts or images.
   - Minify, serve compressed assets, and use a small image format. This respects data-conscious users.

4. Use tooling that speeds you up
   - Workbox for service worker generation and common caching patterns.
   - Lighthouse to audit PWA basics (manifest, HTTPS, service worker) and PWA performance score.
   - Simple hosting (Netlify, Vercel, or a ₹200–₹500/month VPS + nginx) is fine.

5. Make install and discoverability obvious
   - Add a small “Add to Home screen” CTA with instructions for Android; include an inline help note for iOS users (they still need the Share → Add to Home Screen flow).

Real constraints and tradeoffs (don’t let the marketing fool you)
- iOS limitations: Safari on iPhones still limits background sync and (as of now) does not support push notifications reliably. If your workflow depends on push to wake users, PWAs can’t replace native apps on iOS.
- Fragmentation and old WebViews: Some older Android devices use old WebView implementations with quirks (storage limits, service worker bugs). Test on the low-end models your team uses.
- Update UX: Service worker caching can lead to stale UI if you don’t design update flow carefully. You’ll need an in-app “New version available — reload” banner and a safe cache-busting strategy.
- Push and background work: If you require guaranteed background processing (e.g., frequent location tracking, low-latency background jobs), native remains necessary.

Operational tips for Indian teams
- Keep offline tolerance explicit: Design UIs that show “Last updated X mins ago” and allow users to retry writes. People understand and tolerate eventual consistency if it’s visible.
- Optimize for data, not just speed: Many users are on 1–2GB/month plans. Mention the app size in onboarding so they aren’t surprised.
- Use HTTPS and a CDN: PWAs require HTTPS and you'll want a CDN at low cost. A single small origin on Cloudflare + a cheap VPS origin is both inexpensive and reliable.
- Monitor real devices: Use a tiny device pool (₹5k–₹10k per device) with the low-end models common in your org for smoke testing. Emulators hide many WebView quirks.

When progressive web apps are the wrong tool
If your product requires complex native integrations (Bluetooth, continuous background location, high-frequency notifications) or must appear in app stores for marketing reach, don’t force a PWA. It’s a pragmatic choice — not a one-size-fits-all solution.

Final thought
Progressive web apps let small teams ship fast, keep costs low, and respect users’ data and device constraints — a practical match for many internal tools in India. But they come with real limits: iOS feature gaps, caching complexity, and device fragmentation. Build with those tradeoffs in mind, keep the install experience explicit, and you’ll turn a sluggish, web-only workflow into a nearly-native, low-data tool that your team will actually use.

If you want, I can sketch a minimal service worker + manifest example tuned for data-constrained users and show a practical caching policy that worked for our approvals dashboard.