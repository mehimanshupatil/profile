---
title: "How I Trimmed Bundle Size on a Legacy Web App — Without Rewriting It"
pubDate: 2026-01-01
description: "Practical steps I used to trim bundle size on a legacy web app, improve load times for users on budget phones, and avoid a full rewrite."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=2000&h=1000&q=80"
  alt: "A developer's laptop showing code on screen with a cup of coffee, photographed from above"
  caption: "Image credit: Jeremy Yap / Unsplash"
  creditUrl: "https://unsplash.com/photos/1509223197845-458d87318791"
tags: ["bundle size", "frontend", "performance"]
---

We shipped a new feature and the complaints started coming fast: “site takes forever on my phone,” “can't open on 2G,” “mobile data drains.” Our app was a decade-old single-page app with polite architecture but heavy habits: big vendor bundles, polyfills for everything, and a tendency to pack images and fonts into the main payload.

We considered a rewrite. Then we measured. Rewrites are seductive—but expensive, risky, and slow. Instead, we focused on a different bet: trim bundle size incrementally and get results in weeks, not months. Here’s the playbook that worked for us, the tradeoffs we learned, and how to avoid common pitfalls.

Start with numbers, not opinions
- Run a production build and inspect the artifacts. We used webpack-bundle-analyzer and source-map-explorer to find the big offenders. One command showed our main bundle at 1.8 MB gzipped — a red flag for many users in India on limited data plans.
- Capture real user metrics. Lighthouse on a mid-tier Pixel and Field Data (CrUX) gave us baseline FCP and TTI numbers. Measuring before changes made the ROI obvious.

Find the low-hanging fruit
- Replace whole-package imports with cherry-picks. lodash import 'lodash' -> import debounce from 'lodash/debounce'. That alone cut hundreds of KBs in our case.
- Remove legacy polyfills. We were shipping core-js polyfills for ancient browsers. Updating browserslist (and accepting that IE11 users would get a degraded but functional experience) removed most polyfills from the main bundle.
- Swap heavy libs for lighter ones. Moment.js -> date-fns saved ~80 KB. Full-featured carousel components were swapped for tiny in-house code on pages that needed only basic functionality.
- Kill duplicates. Duplicate dependency trees were resolved by aligning versions in package.json and using npm dedupe/yarn resolutions.

Code-splitting, the practical way
- Route-based splitting: We lazily loaded route bundles with dynamic import() so users only downloaded code for the screen they visited.
- Component-level lazy-load for rarely used widgets (admin panels, analytics UI).
- Beware: code-splitting increases the number of requests and adds complexity to error handling (loading states, fallback UIs). We added simple skeletons and retry logic; nothing dramatic, but it was necessary.

Assets, fonts, and images matter
- Serve images as WebP/AVIF with on-the-fly conversion at the CDN. That reduced image bytes by 60–80% on many pages.
- Subset fonts and preload only the critical ones. A full variable font we were shipping unconditionally went away; instead we shipped a small system-font stack for low-bandwidth clients.
- Inline only the critical CSS; defer non-critical styles. This sped up First Contentful Paint considerably.

Leverage modern build features
- Enable tree-shaking and sideEffects in package.json. Make sure libraries are ES-module friendly; otherwise tree-shaking won't help.
- Use Brotli compression in production and serve pre-compressed assets when possible.
- Use long-term caching + unique filenames so big vendor chunks aren't re-downloaded frequently.

Real tradeoffs and constraints
- Developer friction: Adding lazy-loading increases surface area for bugs (missing assets, edge-case race conditions). Expect to invest time in error handling and tests.
- SEO and crawlers: Some search engines still struggle with heavy client-side rendering. We kept critical landing pages server-side rendered and lazy-loaded the rest.
- Build complexity: Introducing image pipelines, font subsetting, and CDNs adds operational overhead. For smaller teams this can be a maintenance burden.
- Not a silver bullet: Some legacy libraries can’t be easily swapped. In those cases we accepted localized bloat or wrote small shims.

Measure the wins
After three sprints of focused work (not a full rewrite), our concrete results:
- Main bundle reduced from 1.8 MB gzipped to ~380 KB gzipped.
- First Contentful Paint improved by ~1.6 seconds on a mid-range device.
- Mobile bounce rate down by ~12% for users on slower networks.
Those numbers were compelling to product and leadership — and cheaper than a full rewrite.

A few tactical commands and tools we found indispensable
- webpack-bundle-analyzer for visual breakdowns.
- source-map-explorer build/static/js/*.js to inspect what contributes to each bundle.
- bundlephobia to check package size before adding new deps.
- Lighthouse (CLI or DevTools) for performance snapshots.
- A CDN that supports format negotiation (WebP/AVIF) and Brotli.

Final position: don't rewrite first
If your app is slow on real users, a rewrite is rarely the fastest path to better user experience. Focus first on measuring, trimming, and tactical upgrades. A pragmatic campaign to trim bundle size gives immediate user benefits and often buys you the time to plan a more ambitious re-architecture, if you still need it.

If you’re starting, my recommendation is simple: measure, remove, and lazy-load. Expect some developer cost and a bit more build complexity, but the payoff is often worth it — especially if many of your users are on budget phones or constrained data plans in India.

We stopped a rewrite, shipped faster experiences, and learned where our real technical debt lives. That felt like a win worth more than a perfect codebase.