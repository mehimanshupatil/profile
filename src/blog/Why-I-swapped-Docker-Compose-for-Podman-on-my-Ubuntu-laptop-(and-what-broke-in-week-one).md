---
title: "Why I swapped Docker Compose for Podman on my Ubuntu laptop (and what broke in week one)"
pubDate: 2026-04-19
description: "How I replaced Docker Compose with rootless Podman for everyday local development on a modest Ubuntu laptop — the wins, the weird failures, and the one habit that made it usable."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop showing terminal windows with code"
  caption: "Photo by Brett Jordan on Unsplash"
  creditUrl: "https://unsplash.com/@brettjordan"
tags: ["developer-tools", "containers", "local-development"]
---

I was in the middle of a code review when my 8‑GB work laptop decided it had had enough. Chrome, VS Code, Slack and a Docker Compose stack — all competing for the same memory — and suddenly everything stuttered. The company image mandates Docker Desktop for macOS/Windows, but on Linux I was free. I had two options: buy more RAM (₹6,000–₹8,000) or make do with what I had. I picked the software route and moved to Podman.

You can call it frugality. I call it practical laziness: one less hardware upgrade, one less thing to carry between home and office. Here’s the exact tradeoff I lived with for three months — including the week where half the microservices failed.

Why Podman felt like the obvious move

Docker Desktop on Linux is heavy — the daemon, the GUI, automatic Kubernetes — all useful, but every extra process costs me when my connection back home occasionally throttles and my laptop fans get theatrical. Podman promised a few things that mattered to me:

- Rootless containers by default. No daemon consuming memory all the time.
- systemd integration per user: start only the containers I need.
- CLI compatibility (podman-docker wrapper) so most Docker CLI habits continued to work.
- Lower steady‑state RAM use, which actually made my laptop usable for other apps.

Installation was straightforward on Ubuntu: apt install podman, add the podman-docker package, install podman-compose from pip for composeYAML support. I tested basic stuff, swapped a couple of aliases (docker -> podman), and pushed my first "docker-compose up" that suddenly ran rootless and quieter.

The week that taught me Podman isn't 'drop-in' perfect

Three days in, the team asked me to run the full integration suite locally before merging a payments change. The compose file had a dozen services, healthchecks, volumes, networks, and an nginx container that relied on Docker's host networking quirks.

Two things happened.

First, mounted volumes behaved differently. Permissions on files inside containers were wrong — my app couldn't read certs mounted from /home. Fix: I had to chown the host path to match the container user or run podman with --userns=keep-id. Ugly, but manageable once I knew the why: rootless containers map UIDs differently.

Second, docker-compose features like depends_on and some networking behaviors were inconsistent under podman‑compose. Services that expected a Docker network DNS entry sometimes failed to find each other. The ugly fix was to explicitly define and reference a network in the compose file and add simple wait-for scripts for startup ordering. In one case the database accepted connections but wasn't ready for migrations; depends_on had hidden that for me in Docker but not with podman-compose.

I also broke a CI parity assumption. Our CI used Docker images built with BuildKit and relied on Docker layering quirks. I could build images with podman build, but a few edge cases around ARGs and cache usage produced different image sizes and one flaky integration test. For the final sanity check before merging, I still triggered a CI job that used a Docker runner.

What actually stuck and helped me stop fighting my machine

I settled on a pattern that balances the wins and the tradeoffs.

Make systemd user units for long‑running stacks. Instead of "docker-compose up" I created a small systemd --user unit that runs podman play kube (I generate kube YAML from my compose files when needed). This meant no daemon eating memory when I wasn't running a stack, and quick "systemctl --user start my-stack" when I needed it.

Keep a tiny helper script for volume permissions. A three‑line script to chown mounts to my UID before starting removed 60% of my permission headaches. It looks gross. It worked.

Treat podman as day-to-day, Docker as the final check. Podman handles development, iterative debugging, and saves my laptop from melting. I keep one lightweight Docker VM (Colima on Mac or a disposable Docker Desktop instance on another machine) for final builds and tests that must match CI exactly.

Failures worth mentioning

I couldn't get Podman to behave on my Macbook the way it did on Ubuntu. Podman on macOS depends on a VM, and that VM's FS performance was worse than Docker Desktop. So my Macbook colleagues were still on Docker Desktop, which meant differences in how volumes and file watching worked. The team had to accept a small "it works locally for Linux, slightly different on Mac" cost.

Also, early on I tried to alias docker -> podman and run everything blind. That backfired when I accidentally pushed images tagged in a way that CI didn't expect. Naming and CI parity require discipline.

Indian context — why this feels practical, not theoretical

Mumbai‑and‑Bengaluru‑style realities matter. My home connection is decent but not generous; uploading layers to a private registry burns mobile data and time. Running lighter locally cuts iteration time and saves a few hundred MB every day. I also avoided spending ₹6–8k on a RAM upgrade just to keep Docker Desktop comfortable. For a few months, that budget mattered.

The real takeaway I walked away with

Podman is not a drop‑in replacement in a mixed‑OS team. But for a lone Linux developer on a modest machine it removes predictable friction: no daemon hogging RAM, no GUI processes, and a sane path to systemd management. Expect to fix volume permissions, add explicit waits, and maintain one small Docker environment for parity. If you're trying to avoid a hardware upgrade and want fewer processes fighting for your 8 GB, it's worth the work.

One practical rule I now follow: use Podman for daily iteration, but run one final Docker‑based build/test before any merge that touches CI assumptions. It kept my laptop cool and my merges sane.