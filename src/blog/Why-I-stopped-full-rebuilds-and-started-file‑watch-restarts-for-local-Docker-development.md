---
title: "Why I stopped full rebuilds and started file‑watch restarts for local Docker development"
pubDate: 2026-08-04
description: "I replaced the full docker-compose rebuild cycle with an inotify-driven per-service restart. It saves minutes every iteration — and once cost me a demo. Here's the tradeoff."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with code editor visible"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["developer-tools", "local-dev", "docker"]
---

It was 3:12pm in a Bengaluru co‑working space. I had promised a quick front‑end demo at 3:30pm to a customer; my laptop was mid‑air after a fresh git pull. I watched npm install crawl at 50 KB/s on the office Wi‑Fi and felt the familiar sinking feeling: a full docker-compose build would eat the demo.

That day I stopped letting full rebuilds decide when I could demo. I started using a tiny file‑watcher that restarts only the service that actually changed. Four months in, it saved me dozens of minutes every day. But it also taught me when partial restarts are a lie.

Why full rebuilds were killing me

Our local iteration loop looked like this:
- git pull
- docker-compose build
- docker-compose up -d
- run migrations, seed data, wait

Even with a decent laptop, this took 4–10 minutes. In an office with flaky captive Wi‑Fi (or when I was tethering on a 1GB/day mobile plan), npm/yarn downloads and Docker layer churn were painfully slow. The obvious workaround — prebuilt images or cached registries — helped, but wasn't always available for feature branches or hotfixes.

The simple observation that changed things: 90% of the time, a change touches only one service (frontend assets, a small backend handler, or a config). Restarting that service and reloading assets is usually enough to see the change. I stopped rebuilding the whole stack and started orchestrating targeted restarts.

What I actually run now

I wrote a small wrapper that watches my repo paths and, on change, runs a targeted restart inside Docker instead of a full rebuild. It's intentionally small and dumb — in shell, because that's reliable across machines.

A stripped version of the watcher:

    # watch-and-restart.sh
    # requires inotifywait (inotify-tools)
    WATCH_PATHS="frontend/src backend/src common/lib"
    inotifywait -m -r -e close_write,move,create $WATCH_PATHS |
    while read path action file; do
      case "$path" in
        *frontend*)
          echo "frontend changed: $file"
          docker-compose exec frontend sh -c "npm run build:dev || true"
          docker restart myproject_frontend_1
          ;;
        *backend*)
          echo "backend changed: $file"
          docker-compose exec backend sh -c "supervisorctl restart app || true"
          ;;
        *)
          echo "misc changed"
      esac
    done

Why this is actually faster
- No Docker image rebuilds: I avoid the overhead of invalidated layers and network downloads.
- Targeted warm containers: the service keeps its mounted volumes and caches; requests hit warm caches.
- Faster feedback loop: recurring small builds (npm transpile only) are measured in seconds, not minutes.

Practical tweaks I use
- I keep dev-only build commands inside the container (npm run build:dev) to reuse the container's node_modules and avoid host/VM mismatches.
- I use docker-compose exec to run incremental build steps rather than copying files or rebind-mounting.
- I add a tiny overlay to docker‑compose.override.yml that mounts source dirs and exposes supervisor for process restarts.
- For Windows/Mac I prefer watchexec or entr because inotify limits and symlink semantics differ.

The tradeoffs and the demo that went wrong

I'm honest: this is not a universal win. The first time it bit me was during a client demo.

I had changed a DB migration, updated the backend code that assumed the new table, and only restarted the backend container. The migration hadn't run because my restart routine doesn't trigger full startup migrations (I run those manually to avoid accidental local data changes). The backend connected to a schema that didn't exist and threw at runtime — right in front of the customer. I lost the demo.

That taught me a concrete rule: never rely on partial restarts when schema, environment, or cross‑service contracts change. I now have a simple header in commit messages: "affects-schema" or "affects-contract". The watcher ignores those commits and prompts me to run the full build/migration flow.

Limitations you should expect (and accept)
- Not for cross‑service changes. If you change an API contract, a library used by multiple services, or the DB schema, partial restarts are a liability.
- Watchers on macOS/Windows can miss events or be slow with many files. You need entr/watchexec or polling fallbacks.
- Some dev setups rely on container startup for one‑time hooks (seeding, migrations). The watcher bypasses those by design; you must run them manually when needed.
- Debugging stateful bugs becomes trickier: a partial restart preserves container state. That helps most times, but can hide initialization bugs.

Why it's worth the mess for small teams in India

If your office internet is unreliable, or you demo on a personal hotspot (₹199/day mobile plans, limited daily quota), the minutes saved are real. For me, saving 4–6 minutes per iteration meant I could demo an extra change, test an edge case, or switch branches without silently burning time.

On the other hand, if your CI is fast and your infra closely mirrors prod, the partial approach loses appeal. It also asks you to be disciplined: label schema changes, run migrations deliberately, and accept occasional failed demos.

How I use it day-to-day now

I run the watcher during active development. When I touch UI or handler code, the watcher picks it up and restarts the right service. For merges that say "affects-schema" or for releases, I explicitly run the full docker-compose build + migrations on a warm staging box.

Takeaway

Small, targeted restarts cut friction. But they require the discipline to know when a shortcut becomes a liability. The rule I actually use: if it touches data, contracts, or multi‑service libraries — no shortcuts; do the full build. Otherwise, watch, rebuild, restart, and keep the demo rolling.