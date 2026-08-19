---
title: "Why I stopped letting my local dev servers run as root"
pubDate: 2026-08-19
description: "Running services as root on your laptop hides permission and socket bugs. I started running everything as the app user locally — the checks that caught a production-only bug and the tradeoffs I accepted."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a wooden desk showing code on the screen with a coffee cup nearby"
  caption: "Photo by Christopher Gower on Unsplash"
  creditUrl: "https://unsplash.com/@christophergower"
tags: ["dev-environment", "linux", "developer-tools"]
---

The client call was going fine until the demo form refused to accept UPI callbacks. The app logged a terse "permission denied" when trying to create /var/run/payments.sock. I was on my laptop, with the service started by my usual start-dev script (which runs everything with sudo because it's convenient). The production box ran everything under an "app" user. I had been running as root for months. Root had been covering for me.

That afternoon I learned a simple, ugly truth: running local services as root makes a whole class of permission and ownership bugs invisible. The bug didn’t exist in my machine — until I tried to do a client demo from my office where we used a thin reverse proxy running as a normal user. The socket owner mismatch broke the chain and the payment callback failed.

I decided to stop the habit. I now run all local services as a non-root “app” user and have a preflight that simulates production ownership. It found permission issues, socket problems, and file-path assumptions I had pushed onto ops. It also made demos less brittle. Here’s how I did it, what failed, and the tradeoffs I accepted.

## The tiny habit that changed my demos
The core of what I added was embarrassingly small:

- Create a local "app" user (UID and GID fixed in repo-level docs) on my laptop VM or use a throwaway Docker user.
- Run the dev server with sudo -u app ./start.sh instead of sudo ./start.sh.
- Add a preflight script run by make dev that checks ownership and permissions of critical paths (logs/, tmp/sockets/, uploads/) and fails loudly if something will be created as root.
- Add one CI job that runs the docker image as a non-root user and asserts the service still starts.

Concretely: instead of binding to a directory owned by root, my start script ensures the directory exists and is chowned to UID 1501 (our standard dev UID), then launches the process with sudo -u app. For containers I built a dev Dockerfile with a dedicated user and used USER app in the image. The preflight prints helpful fixes (chmod 775 tmp && chown 1501:1501 tmp) so fixing is one command.

Why it works: production rarely runs as developer-privileged root. The permission model—socket ownership, log rotation files, pid files—is where things break. Force your local dev process to share that model and you catch those breaks before a demo or a deploy.

## What this actually caught
In the first month I found three real bugs:

- A background worker that assumed write access to /var/log/app and crashed when logrotate rotated the file and replaced it with root-owned file. This was trivial on my laptop before.
- A payment component that created a unix domain socket but left permissions as 766, which a proxy running as another user couldn't connect to.
- A deployment script that ran chown -R /srv/app (as part of a hotfix) and, because my local runs used root-owned temp files, it wiped out a user's uploads path in staging during a test.

These are not edge puzzles. They break client demos, CI runs that use non-root runners, and production interactions with sidecars (nginx, haproxy, systemd). Catching them locally saves the awkward "sorry, give me 10 minutes" dance in front of stakeholders.

## The failure I didn’t expect (and the tradeoffs)
This approach isn't frictionless. I hit a real blocker after enforcing non-root runs.

Once, we had an urgent on-call patch that needed to bind to port 443 on a production VM. The quickest fix in that moment was to give the service CAP_NET_BIND_SERVICE so it could bind to low ports without being root. My local dev setup, which refused to grant capabilities to the app user, caused our hotfix branch to fail local smoke tests. The team was split: one side wanted to exempt the hotfix branch from the non-root rule, the other wanted the strictness to remain.

We compromised by allowing an escape hatch: a single flagged script (run-as-root-for-hotfix) that's only used under a documented emergency workflow. It’s gated in CI by a required maintainer approval. The takeaway: strictness helps, but it also slows emergency patches if your production depends on capabilities or system-level permissions. Decide which constraints are "real" and embed an approved way to bypass them when truly necessary.

Other tradeoffs I accepted: slower iteration when editing files that need different ownership, needing to explain "run as app user" to new hires, and extra CI flakiness early on while the team adjusted paths and perms. Those costs are one-time frictions that pay off if you value fewer demo surprises.

A second limitation is macOS and Docker Desktop quirks. On macOS it's awkward to create consistent UIDs across team machines. Our pragmatic fix was to standardise on a mapped UID in the repo README and a small bootstrap script that, on macOS, creates a local VM (multipass) for dev that honors UIDs. It's not perfect, but it keeps my Linux parity for demos and CI.

## How to adopt this without hating life
Start with the critical paths, not the whole system. Pick sockets, upload dirs, and the proxy interface. Add a preflight that fails loudly. Document one dev UID and a one-line bootstrap to create it. Put a non-root smoke test in CI that runs the image as a non-root user and ensures the service starts and responds on health endpoints.

Expect pushback. The first time this broke a fast hotfix you’ll be tempted to remove it. Don’t. Instead add a documented escape hatch and keep it visible.

I walked away with one clear, selfish takeaway: if you demo to humans, stop using root by habit. Root makes development easy but demos fragile. Making your local environment look like production—at least around ownership and capabilities—means fewer last-minute panics, cleaner CI, and, oddly, fewer rude Slack pings at 10pm.