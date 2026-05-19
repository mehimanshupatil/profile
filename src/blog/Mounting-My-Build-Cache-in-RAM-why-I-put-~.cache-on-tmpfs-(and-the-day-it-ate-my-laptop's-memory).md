---
title: "Mounting My Build Cache in RAM: why I put ~/.cache on tmpfs (and the day it ate my laptop's memory)"
pubDate: 2026-05-19
description: "I moved heavy build caches (npm, cargo, pip) into tmpfs to shave minutes off iterative builds. What worked, what broke, and the small rules I still follow."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of hands typing on a laptop keyboard with code visible on the screen"
  caption: "Photo by Christopher Gower on Unsplash"
  creditUrl: "https://unsplash.com/@christophergower"
tags: ["developer-tools", "linux", "performance"]
---

It was 9:10am, my train had 12 minutes left before drop‑off, and my laptop was still installing dependencies. Again. The office Wi‑Fi in Bengaluru was a fair-weather friend: fast until someone joins a Zoom call, then it turns into molasses. I lost half an hour waiting for npm and pip to finish fetching packages. That afternoon, I stopped pretending fetching from disk and network was “normal.”

I needed iteration time back. Not by upgrading my ISP or buying an M2 Mac. By moving the noisy, churny parts of development out of my slow SSD and onto RAM.

Why it felt worth trying
- Local caches (npm, pip, cargo, clangd, ccache) are read‑heavy and often rewritten during builds.
- My laptop's SATA SSD was old; installs and cache writes queued up behind I/O.
- Office and home networks are occasionally slow; a warmed RAM cache avoids repeated downloads.

The idea is simple: put ~/.cache (or specific caches) on tmpfs. RAM is fast. tmpfs clears on reboot, which is fine for caches that are cheap to rehydrate. The real work is deciding what to keep in RAM, how to size it, and how to survive when it hits the limits.

What I actually mounted (and why)
I experimented with two approaches: full ~/.cache → tmpfs, and selective mounts for heavy caches.

My final setup (what I still use):

- tmpfs mounted at /run/user/1000/cache-tmp with size=6G (on my 16GB machine).
- Bind mounts:
  - mv ~/.cache/npm -> /run/user/1000/cache-tmp/npm && mount --bind /run/user/1000/cache-tmp/npm ~/.cache/npm
  - same for ~/.cache/pip, ~/.cache/cargo, ~/.cache/ccache
- A tiny systemd user unit that rsyncs the tmpfs to disk every night at 2am and on shutdown.

Why selective mounts? Because some cache paths are tiny or need persistence (git, ssh, dotfiles), and I don't want random apps to starve RAM. npm and pip stores easily grow to multiple GB and are perfect candidates.

Commands I used (shortened):
- Create tmpfs: sudo mount -t tmpfs -o size=6G tmpfs /run/user/1000/cache-tmp
- Move and bind:
  - mkdir -p /run/user/1000/cache-tmp/npm
  - mv ~/.cache/npm/* /run/user/1000/cache-tmp/npm/
  - mount --bind /run/user/1000/cache-tmp/npm ~/.cache/npm

And the systemd user timer that rsyncs back to ~/.cache-bak each night. This lets me boot, do quick iterations, then have an on-disk backup in case of reboots or crashes.

Results (the obvious wins)
- Cold install times dropped. A cold npm install that previously took 3–4 minutes rarely hit that in repeat runs; incremental installs were sub‑minute.
- CI parity: since I still kept an on‑disk backup, CI or teammates didn't break when I pushed.
- I stopped burning mobile data when testing on the go. When home broadband choked, the RAM cache kept my workflow stable.

The failure that taught me rules
A week in, I was at an airport in a rush. My laptop was still on battery, I had a low memory warning, and Chrome + VS Code + a couple of containers were open. The kernel started killing processes. Right on schedule, my language server died mid‑refactor. Not ideal.

Worst part: I had mounted ~/.cache entirely into tmpfs during that week (rookie move). The tmpfs ate RAM, the OOM killer picked chrome, then the IDE. I lost unsaved changes. I also discovered my rsync-on-shutdown trick doesn't help when the machine hard‑crashes or the battery dies mid‑flight. The on‑disk backup had last synced 36 hours earlier.

That episode forced two rules I still follow:

1) Size tmpfs conservatively. I set tmpfs to a fixed 6G on a 16GB laptop. Leave headroom for editors, browsers, and containers. If you're on 8GB, this trick is probably too aggressive unless you restrict it to a single cache (ccache or cargo only).

2) Periodic background sync is non‑negotiable. I use a systemd timer at 2am and a systemd user unit on shutdown to rsync. It costs seconds and saves hours of rehydration after an unexpected reboot.

A real tradeoff: battery and memory
RAM is faster, but not free. tmpfs increases memory pressure and can raise power draw because more memory pages are active and touched. On my old 8GB laptop, running tmpfs for npm made battery life noticeably worse. I reluctantly bought an 8GB SO‑DIMM (₹3,500) and doubled to 16GB. That fixed most problems. If you’re on a lightweight ultrabook with soldered RAM, this may be a non‑starter.

Also, tmpfs is not a replacement for SSD upgrades. If your SSD is the bottleneck because it's old and failing, tmpfs hides the problem but doesn't fix persistence or long‑term performance.

When to not use tmpfs
- When your project requires full reproducible cache state across reboots (e.g., heavy offline CI work).
- On machines with ≤8GB RAM unless you only tmpfs a tiny cache.
- When you can't tolerate the occasional unexpected cache‑loss (for example, a big offline deploy where rehydration would cause a rollout to fail).

What I walked away with
Tmpfs for caches is low friction and high ROI if you have RAM to spare and are willing to accept ephemeral state. It shaved minutes off my edit‑compile-test loop enough that I stopped feeling stupid waiting for installs on the office Wi‑Fi. But you must be deliberate: size it, back it up, and scope it narrowly.

I've kept one question open: could I get similar gains with an LRU RAM disk per-process (e.g., tmpfs per-project with eviction) to avoid the whole rsync dance? I haven't found a clean, cross‑tool solution yet. If you have one that works with npm and pip, tell me — I'll try it on the commute.