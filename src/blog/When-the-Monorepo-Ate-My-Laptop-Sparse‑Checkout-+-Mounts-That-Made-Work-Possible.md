---
title: "When the Monorepo Ate My Laptop: Sparse‑Checkout + Mounts That Made Work Possible"
pubDate: 2026-04-09
description: "How I stopped syncing a 20GB monorepo to my laptop by using git sparse-checkout and bind mounts into my dev containers — the wins, the setup, and the mistakes."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a desk with code visible on the screen, a notebook and coffee beside it"
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["developer-tools", "monorepo", "local-development"]
---

It was a Tuesday. My laptop fan sounded like a jet engine and Finder showed 8GB free out of 256GB. I needed to test a small change in a payments microservice, but the monorepo insisted I had to fetch everything: frontend, mobile, three services I hadn't touched in months, and a node_modules folder that remembered the early days of npm.

Pulling the full repo over my flaky home broadband took 20 minutes. Building the container? Another 12. My iteration time — make a change, rebuild, test — was five slow, dispiriting loops. I kept deferring the task. That’s productivity theft.

So I stopped pretending my laptop should host the whole codebase and moved to a simple constraint-driven workflow: check out only what I need, and mount that into dev containers. Sparse-checkout + bind mounts. The idea is dumb-simple and effective. Here’s how I did it, what actually improved, and the screw-ups that saved me time later.

Why sparse-checkout in 2026
- The repo is 20–30GB with many packages. I touch one or two services at a time.
- My SSD is 256GB. I reserve space for VMs, Docker images, and my music.
- Office network can be slow; relying on a full fresh clone every switch kills flow.

Sparse-checkout lets me have the repo metadata and the folders I actively work on, without pulling every nonessential file. That alone cut the checkout time from 20 minutes to ~90 seconds for me.

The pattern I settled on
1) Keep a small "bootstrap" clone on my laptop using sparse-checkout (git sparse-checkout set ...)
2) Run the heavyweight stuff — full builds, integration tests, npm installs — in a local container or small Raspberry Pi/home server that has the full repo and caches
3) Bind-mount the sparse files I edit into that container so the container sees live edits and rebuilds rapidly

My working commands (fares well for Linux; I use WSL2 sometimes):

- Create a shallow clone with minimal history:
  git clone --no-checkout --filter=blob:none <repo> project
  cd project
  git sparse-checkout init --cone
  git sparse-checkout set services/payments packages/shared
  git checkout main

- On the build host (local container or home server) I keep a full clone and run the dev image:
  docker run -v /home/me/full-repo:/src/full-repo -v /home/me/edited:/src/edited ... my-dev-image

- On my laptop, I bind the sparse checkout into the container path:
  ssh -R or use docker bind-mount: docker run -v $(pwd):/src/edited ...

Why this beats just editing locally
- No full node_modules on the laptop. The container/home-server deals with heavy installs and caches.
- Files edit locally; the container picks up changes instantly if you mount the working dirs.
- Switching tasks (from payments to gateway) is a "git sparse-checkout set ..." away — a few seconds to modify what’s present, not minutes to clone the whole world.

Real wins I saw
- Iteration time for small backend changes went from 12 minutes to 2–3 minutes.
- Disk usage dropped by ~15GB on my laptop — enough to avoid frantic file deletion before a client demo.
- CI runs less often because I can run the same build image locally (same OS, same toolchain) and reproduce failures faster.

The parts I misjudged (my failures)
- macOS performance pain. Initially I tried the same plan on my MacBook. Docker for Mac treats bind mounts badly; file watching stutters, and rebuilding inside the container becomes slower than local. I wasted a week trying to optimize inotify limits before admitting defeat. Fix: either use a Linux dev VM (WSL2 on Windows or a Linux laptop) or use a remote Linux host (home server, cloud dev box) with SSHFS/rsync as the sync layer instead of bind mounts.
- Permissions and UID/GID. My container ran as root and my laptop edits were by my user; occasional file permission mismatches and npm package scripts failed. Fix: run containers with --user $(id -u):$(id -g) or adjust the container entrypoint to chown on startup (ugly but practical).
- Not a silver bullet for frontend monoliths. When I needed to run the whole Webpack dev server for end-to-end visuals, the split-repo approach created surprises — missing packages and CSS builds that assumed the full repo. For those tasks I still keep a full clone on a more capable machine.

Tradeoffs I accepted
- Complexity over simplicity. There's an initial setup cost: scripts to mount, a little SSH / docker-compose work, and an extra repo that behaves as the canonical full clone.
- Slightly different "real" environment. My container image and the CI runner must be kept in sync; otherwise "works on my laptop" returns. I invested time to pin images and share them via a small Nexus/registry we run at home (₹300/month VPS) — overkill for some, vital for us.

A few tiny scripts that saved my sanity
- quick-switch: run sparse-checkout set and restart the local mount.
- sync-loop: rsync from laptop -> server for those on macOS where bind mounts were flaky.
- dev-rebuild: run only the microservice's build steps inside the container (no full workspace rebuild).

When to try this
- Your monorepo is >5–10GB and you only touch small parts frequently.
- Your laptop SSD is precious.
- You iterate on backend services where the heavy build can be offloaded.
- You can run a Linux helper (small home server, cloud dev VM, or WSL2).

When not to
- Doing heavy frontend visual work that needs the full monorepo live.
- You can’t tolerate any extra setup complexity (e.g., short temp contracts).

What I actually walked away with
Sparse-checkout + mounts didn’t make my repo smaller. It forced me to acknowledge a constraint — my laptop cannot be everything. By accepting that, I got two real things back: faster iterations for the work I do most, and a quieter laptop that doesn't sound like a blender. The tradeoff is more orchestration (scripts, a small host), but for me that orchestration is a one-time tax that pays off every time I avoid a 20-minute clone.

I still sometimes pull the full repo on my home server and watch it silently chug npm installs at 2am. It feels luxurious. My open question: if you work mainly on frontend UIs in a large mono, how have you handled live visual feedback without cloning everything? I’m still experimenting.