---
title: "How I Cut My CI Bill by Half Using Self‑Hosted Runners (and Why I Still Keep Hosted Runners)"
pubDate: 2025-01-12
description: "A practical, India-focused playbook for using self-hosted runners to cut CI costs—how I set them up, what saved money, and the hard tradeoffs to expect."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=2000&h=1000&fit=crop"
  alt: "A compact desktop computer on a developer's desk with code and terminal on the screen"
  caption: "Image credit: Andrew Neel / Unsplash"
  creditUrl: "https://unsplash.com/photos/1518770660439-4636190af475"
tags: ["self-hosted runners", "CI%2FCD", "cost optimization"]
---

Two years ago our small product team in Bengaluru hit a point many startups hit: CI costs ballooned. Every push triggered a few parallel workflows—unit tests, linting, container builds, integration tests—and the hosted CI minutes were quietly eating our runway. We tried trimming pipelines, but the real lever was infrastructure: moving predictable workloads to self-hosted machines.

If you run a small team or an indie product in India and your hosted CI bill is giving you sticker shock, self-hosted runners can cut costs dramatically. But they’re not a silver bullet. Here’s how I did it, what actually saved money, and the unexpected maintenance headaches that followed.

Why self-hosted runners (and when they make sense)
- Good fit: stable, predictable builds that need consistent compute (e.g., caching-heavy JS builds, container image builds, or tests that run on the same OS).
- Bad fit: highly variable or bursty pipelines (massive parallel matrix runs), or builds that must remain completely hermetic for security/compliance reasons.

We chose self-hosted runners because:
- Our daily build volume was steady.
- We could tolerate a little downtime during office hours.
- We already had scripts and caches that made local runs deterministic.

How I set up a cheap, reliable runner in India
1. Pick hardware with purpose
   - We repurposed an old NUC (Intel i5, 16GB RAM, NVMe) bought second‑hand for ≈₹18,000. A small mini‑PC is quiet, power‑efficient, and fast enough for most builds.
   - Tip: prioritize SSD and RAM over CPU cores for JS/Go builds; container heavy workloads like Docker benefit from more CPU.

2. Use a stable OS and containerize the runner workloads
   - Ubuntu LTS + Docker. Containerizing tests and builds keeps the host clean and reduces “it works on my machine” issues.
   - Reserve a dedicated volume for Docker layers and build caches.

3. Register with your CI provider
   - For GitHub Actions, create a runner user and register the machine using the repo or org token. For GitLab or Bitbucket, the steps are similar.
   - Name runners clearly (region-team-purpose) so you can route jobs.

4. Route the right jobs to the runner
   - We labeled the runner `self:fast` and only routed non-sensitive, cache-heavy jobs to it. Quick checks and PR-level sanity jobs stayed on hosted runners to give instant feedback and avoid exposing secrets.

5. Monitoring, updates, and backups
   - Simple Prometheus + Grafana or even a couple of shell scripts to monitor queue length, disk, and CPU.
   - Automate runner updates with a systemd service or cronjob; snapshot the disk regularly (or at least keep image and config in a repo).

The numbers that mattered (our experience in INR)
- Before: Hosted CI bill for our small team spiked to ₹18–25k/month during feature pushes.
- After: By moving 60% of build minutes to the NUC, our hosted minutes dropped 70%, and our total CI spend fell to ≈₹8–10k/month (power + internet + occasional replacement parts included).
- Break-even: About 3–6 months depending on the hardware cost and how many minutes you moved off hosted runners.

Practical tradeoffs and rough constraints
- Maintenance overhead: You’ll be the ops person. Hardware failures, OS updates, flaky network—none of these are the CI provider’s problem anymore.
- Security: Self-hosted runners expose your environment. We avoided routing jobs with secrets or external dependency downloads that we didn’t control. For sensitive workflows, keep hosted runners.
- Uptime & scaling: Hardware is finite. We saw queues during a large release and had to spin a cloud VM for temporary burst capacity. If you need infinite parallelism, hosted runners still win.
- Electricity and internet: In India, power cuts or flaky domestic broadband can bite. We put the mini‑PC on a small UPS and used a backup SIM-based link for critical pushes. That added to monthly cost but kept things predictable.

A practical hybrid policy I recommend
1. Keep hosted runners for:
   - PR checks and short feedback loops
   - Workflows that use secrets or manufacturer-provided images you don’t want to host
   - Burst capacity during big releases
2. Move stable, cacheable, and heavy jobs to self-hosted runners
3. Automate a fallback: on runner failure, jobs reroute to hosted runners (with cost alerting)

India-specific tips
- Second-hand hardware market is robust—look for refurbished NUCs or thin clients on OLX or local stores.
- Consider data caps: if your ISP has limits, offload heavy image uploads to an evening window or use a VPS for pushing images to registries.
- Power costs matter: a low‑wattage mini‑PC on a UPS is cheaper over a year than several cloud build hours.

Final word: use self-hosted runners deliberately
Self-hosted runners saved us real money and gave us faster, cache-warm builds. But they introduced ops work and failure modes we hadn’t felt with hosted CI. My stance: for small teams in India, a hybrid approach is the pragmatic win—keep hosted runners where speed, security, and scale matter, and move predictable, heavy builds to self-hosted runners you can control.

If you’re about to try this, start with one runner and two pipelines. Watch the queues, measure costs for a month, and be honest about the time you’ll spend maintaining it. You’ll probably save money—and learn a lot about your builds in the process.

That’s what happened to us. Three months later we had reliable builds, a smaller CI bill, and a slightly hairier but better-understood infrastructure. If you want, I can share the exact systemd unit file and Docker setup we used—say the word and I’ll paste it.