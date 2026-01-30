---
title: "My ₹300/month Self‑Hosted Codespace: How I Run code-server + Tailscale for Remote Development"
pubDate: 2026-01-30
description: "Run a secure, fast self-hosted codespace on a cheap VPS—set up code-server with Tailscale, what works well, and the tradeoffs I learned after months of daily use."
author: "Rohan Deshpande"
image:
  url: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=2000"
  alt: "A developer typing on a laptop at a café table with code visible on the screen"
  caption: "Image credit: Pexels / George Milton"
  creditUrl: "https://www.pexels.com/photo/photo-of-person-using-laptop-1181671/"
tags: ["self-hosted codespace", "remote development", "dev tools"]
---

A few months ago I got fed up with constantly switching machines, carrying a bulky laptop, and waiting for IDEs to index after every SSH session. I wanted one place to open VS Code, pick up where I left off, and run small builds without the friction of local setup. The hosted options were nice but costly and sometimes laggy. So I built a self-hosted codespace on a cheap VPS and have been using it as my main dev environment ever since.

This is the exact setup I run for about ₹300/month, why I picked the parts I did, and the tradeoffs you should expect.

Why not GitHub Codespaces (or a laptop)?
- Hosted codespaces are convenient but add recurring costs and limits. For someone in India who flips between home, coworking, and client sites, a low-cost persistent environment is more practical.
- A laptop is fine, but syncing environments, backups, and consistent tooling across machines gets annoying. A remote codespace centralises that.

What I run (components)
- code-server (VS Code in the browser) — the core IDE experience.
- Tailscale — secure mesh VPN so my laptop, phone, and the VPS talk over an encrypted network without opening public ports or messing with DNS.
- A small VPS (1 vCPU, 1–2 GB RAM, 20–40 GB SSD) from a budget provider — comfortably fits into ~₹300/month on many providers or their promotional plans.
- Docker to isolate language runtimes and services; systemd to keep code-server running after reboots.

Why this combo works
- code-server gives the exact VS Code experience (extensions, settings sync) in a browser tab. No heavy local installs, and I can use lightweight laptops or my phone in a pinch.
- Tailscale avoids exposing ports, simplifies auth (use your Google/Microsoft/GitHub account), and keeps latency pretty low since traffic routes directly between devices where possible.
- A small VPS is cheap, always-on, and lets me keep dotfiles, test servers, and a consistent build cache. For web apps and backend services, performance is excellent for development.

How I set it up (high level)
- Provision VPS with a minimal Ubuntu image and a public SSH key.
- Install Docker and run code-server in a container. Mount a persistent volume for workspace and extension storage.
- Install Tailscale on the VPS and on my laptop/phone. Authenticate and ensure the VPS shows as an IP in your tailnet.
- Connect to code-server via the VPS tailnet IP and the code-server port. Because Tailscale handles the network, there’s no public exposure or wildcard cert mess.
- Optionally, run small developer services (Postgres, Redis) as local Docker containers and expose them to the code-server container over the Docker network.

Things that surprised me (good and bad)
- Faster startup than expected: I can open the browser VS Code tab in seconds and continue work. The machine stays warm (build caches remain), so iterative tasks are quick.
- Extension support is mostly flawless. Some language servers that expect a full machine (e.g., heavy Java LSP) can be memory hungry; plan for more RAM if you use them.
- Battery life improves on travel days because my laptop isn’t doing heavy indexing or local Docker builds.

Real constraints and tradeoffs
- Not for heavy builds or emulators: A ₹300 VPS with 1–2 GB RAM won’t handle large monorepo builds, native Android emulators, or heavyweight Docker Compose stacks. If your day-to-day includes those, you’ll need a bigger (costlier) VPS or keep local hardware for those tasks.
- Network dependence: If café Wi‑Fi is flaky, you’ll feel it. Tailscale helps, but you still need an internet connection to reach your codespace.
- Maintenance and security: You’re responsible for patching the VPS and updating code-server and Tailscale. It’s low effort, but it exists. Using Tailscale significantly reduces exposure, but don’t skip updates.
- Storage and backups: Snapshots or periodic rsync to a cheap object store are necessary. I schedule weekly backups of my workspace and dotfiles; losing the VPS would hurt but is manageable.

Practical tips from my months of use
- Use swap but cautiously: For low-RAM VPSes, a small swap file keeps processes alive during spikes. But swap is slow; it only masks memory limitations.
- Keep heavy tasks local: Use the codespace for editing, debugging, and running dev servers. Run CI, full builds, or resource-heavy tests on dedicated build machines.
- Sync secrets carefully: Use git-ignored env files and a secrets manager (1Password/Bitwarden) instead of storing secrets on the VPS. If you must store secrets, use encrypted files.
- Keep an auto-redeploy script: If the VPS reboots, a simple systemd unit that starts Docker containers and code-server saves time and context loss.
- Use VS Code’s Remote extensions to optionally attach a local VS Code instance to the remote server for slightly lower latency when needed.

When to pick something else
- If you need guaranteed low latency for graphics or native GUIs, use a local machine.
- If your workloads are CI-level builds or large-scale integration testing, a dedicated CI runner or bigger cloud instance is better.
- If you want a zero-maintenance experience and can pay, fully hosted codespaces are still a great option.

If you want to try it
Start with a cheap VPS for a month, install code-server and Tailscale, and migrate one project. You’ll know within a week if the performance and workflow fit your needs.

I still keep a local dev machine for certain tasks, but this self-hosted codespace has become my primary environment for day-to-day coding. It’s cheaper than hosted alternatives, gives me control, and—most importantly—lets me pick up work from any device without the usual setup friction. If you value consistency and don’t need a giant machine, it’s a practical middle path worth trying.