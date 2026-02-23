---
title: "How I Use Serverless Web Scraping for Cheap, Reliable Data — and When It Breaks"
pubDate: 2026-02-23
description: "A practical playbook for using serverless web scraping to collect scheduled data cheaply, with tradeoffs, IP strategies, and India‑specific pitfalls."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=1000&w=2000&q=80"
  alt: "Person coding on a laptop with code visible on the screen, workspace in soft light"
  caption: "Image credit: Christin Hume on Unsplash"
  creditUrl: "https://unsplash.com/photos/x1i1m3nY1YY"
tags: ["serverless", "web scraping", "engineering"]
---

I needed a reliable daily snapshot of a handful of Indian websites — price lists, public tender entries, a competitor’s mobile plan page — without running a 24/7 server or paying for a big proxy farm. The solution that stuck was simple: schedule tiny serverless functions to spin up a headless browser, fetch the page, save HTML to object storage, and parse later.

If you care about cost, simplicity, and low ops overhead, serverless web scraping is a surprisingly practical pattern. It’s not a magic wand — it has a handful of real limits — but for many use cases it’s the best tradeoff between money, reliability, and maintenance.

What I run (the architecture)
- Scheduler: Cloud scheduler (CloudWatch Events / Cloud Scheduler) triggers jobs.
- Execution: A small compute unit (Lambda / Cloud Run / Azure Functions). For headless browsing I prefer a lightweight container image with Chromium bundled or a Lambda Layer with a trimmed Chromium build.
- Storage: Raw HTML and screenshots go to S3/GCS. Parsed results land in a small Postgres or BigQuery table.
- Parsing: Lightweight extractors (Cheerio / BeautifulSoup) run in a follow-up function or a batch worker.
- Observability: Each run logs metadata (status, duration, HTTP code) and a hash of the HTML to avoid re-parsing identical content.

Why this works for me
- Cost: You pay only for runs. For small jobs (a few hundred runs/month, each 1–5s of CPU), the monthly bill is tiny — often under a few thousand rupees. No idle VM costs.
- Simplicity: No patching a server, no process restarts. Deploy a container or function and schedule.
- Scalability: Need to spike? Parallel invocations are straightforward.
- Locality: Need to fetch Indian‑region pages and see the same content users in India see? Choose a cloud region close to your users or use an India‑based residential proxy when necessary.

Three practical patterns I use
1) Small, frequent snapshots
   - Best when you track small changes (price, availability).
   - Keep runs short: request, wait for a specific DOM element, dump HTML, quit.
   - Save screenshots only on change to cut storage costs.

2) Render‑then‑parse
   - Use Puppeteer/Playwright to render JavaScript-heavy pages, then hand the HTML to a parser.
   - Split rendering and parsing: a cheap renderer function writes HTML to storage; a cheaper parser reads and extracts. This keeps retry logic isolated and cheaper.

3) Containerized headless browsers
   - Lambda cold starts and binary size issues push me to use Cloud Run or small containers when pages need a full browser.
   - Container images let me bake in fonts, locales, and binary tweaks so the render matches what users see in India.

Real constraints and tradeoffs
- Cold starts and binary size: Deploying a full Chromium to a tiny serverless function worsens cold starts and increases deployment size. Lambda Layers help, but you still trade milliseconds for simpler ops.
- CAPTCHAs and bot detection: Many Indian sites run aggressive rate limiting or CAPTCHA. Serverless doesn't hide you — you still need rotating IPs, realistic headers, and human-like timing. For serious scale, you’ll need paid residential proxies (expensive) or a headless browser with stealth measures (fragile).
- Hidden costs: Frequent runs are cheap per-run, but 10,000 runs a month add up. Also watch egress and storage charges — fetching lots of images or frequent screenshots can surprise your bill.
- Legal and ethical limits: Not every site wants to be scraped. Government portals or sites with explicit anti‑scrape terms require extra care. I avoid scraping anything behind a login unless I have explicit permission.

India‑specific notes
- Regional content: Many Indian websites serve different content by IP. If you need the India view, deploy your functions in an India region or use an India‑based proxy. Some CDNs prioritize local ISP traffic and respond differently to cloud IPs.
- Data costs: If you plan to transfer large files (images, PDFs), check your cloud provider’s egress pricing to India‑based storage or your own office — it can dominate a bill.
- Captcha prevalence: A lot of Indian e‑commerce and government portals use aggressive bot protection; plan for a fallback — email alerts on failure, human review flows, or a reduced polling cadence.

Operational tips that saved me time
- Always store raw HTML with a checksum. When a page changes layout, you can diff previous runs and decide if your extractor needs an update.
- Use a backoff + jitter policy and exponential retries rather than hammering on failure.
- Treat render jobs as immutable: if a run fails halfway, save partial artifacts and retry a full run. Idempotency matters when you have parallel scheduled runs.
- Monitor not just failures but "unchanged runs" — a long streak of identical HTML often means a block or a cached mirror.

When to avoid serverless web scraping
- High‑volume, low-latency crawling (thousands of pages a minute). Serverless becomes expensive and fragile here — dedicated crawlers or a Kubernetes fleet with stable IPs is better.
- Interactions requiring long sessions, complex JavaScript workflows, or heavy uploads. Stateful flows don’t map well to short-lived functions.

Final thought
Serverless web scraping isn’t a one-size solution, but it is a pragmatic, low‑ops way to collect small to moderate amounts of web data reliably and cheaply — especially if you need a handful of regionally accurate snapshots for analytics, monitoring, or small automation tasks. The pattern forces you to design for idempotency, logging, and graceful degradation — which pays dividends later.

If you want, I can share my Cloud Run container Dockerfile and a tiny Puppeteer starter job (the version I use to fetch a retail price page and save a screenshot). It’s a handy starting point if you want to test this pattern without committing to a VM.