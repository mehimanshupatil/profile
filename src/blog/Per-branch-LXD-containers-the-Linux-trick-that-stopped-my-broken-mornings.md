---
title: "Per-branch LXD containers: the Linux trick that stopped my broken mornings"
pubDate: 2026-06-06
description: "I stopped fighting port clashes, flaky local services, and slow DB restores by running one LXD container per git branch — here's how I set it up, what broke, and why it stuck."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden desk showing code on the screen with a cup of coffee"
  caption: "Photo by Brett Jordan on Unsplash"
  creditUrl: "https://unsplash.com/@brett_jordan"
tags: ["lxd", "local-development", "dev workflow"]
---

It was 9:12 a.m. and my terminal had the same shameful history: three running Postgres instances, a Redis process orphaned from yesterday, and a node service that wouldn't bind because my other branch's container had stolen :3000. I wasted thirty minutes killing processes, editing ports, and then re-running tests that still flaked because a migration had run against the wrong DB.

I needed isolation that was quick to create and cheap to tear down. Docker Compose wasn't solving the port and network bleed; starting full VMs was slow, and copying data around burned mobile data when I was on a spotty Bengaluru connection. So I started launching a disposable LXD container per git branch. It was rough at first, but it fixed my mornings — mostly.

Why LXD, not Docker

Docker solves process isolation. LXD gives full system containers: systemd, multiple services, a proper network stack and snapshots. For a backend project that touches Postgres, Redis, a background worker, and an Nginx proxy, that mattered.

The one-sentence workflow I ended up with:
- checkout branch
- run a tiny script that creates or resumes a container named project-branch
- bind-mount the repo in
- run `systemctl start` services inside the container
- work with services as if they were production, and destroy when done

How I set it up (practical, not theoretical)

My laptop: Ubuntu 24.04, 16GB, NVMe. If you have 8GB, it still works but you'll be more disciplined about how many containers are live.

Key pieces that made it usable:

1. A tiny bootstrap template
I keep a cloud-init snippet in the repo that LXD uses to create containers fast. It installs only what the project needs (Postgres, Redis, openjdk, node) and creates the project user. Then I snapshot that base once so new branch containers start in ~2 seconds.

2. Rehydrate, don't rebuild
Command I use (simplified):
- if container exists: `lxc start project-branch && lxc exec project-branch -- systemctl start app`
- else: `lxc copy project-base project-branch && lxc config set project-branch security.nesting true && lxc start project-branch`

Copying a prebuilt base is nearly instant because LXD copies by reference until you write.

3. Code on host, services in container
I bind-mount the repo into /home/dev/project inside the container. That keeps my editor and file watchers local (fast on Linux) while processes run isolated. I used `lxc config device add project-branch repo disk source=/home/me/code/project path=/home/dev/project`.

4. Network routing
I use LXD's bridged network so containers get their own private IPs. Then my script writes an /etc/hosts entry (local-dev DNS) and registers the host port in a tiny reverse-proxy container. No port-hacking required.

Why this fixed my mornings

- No port conflicts. Each branch has its own IP and services.
- Migrations run against the branch’s DB. No accidental cross-branch data.
- Snapshots mean I can fork a branch, experiment, and roll back in seconds.
- Office wifi is flaky; LXD cached images so I didn't repeatedly pull big containers.

The honest failures and tradeoffs

1. Disk and snapshot bloat
I ignored LXD storage until it was 40GB. Snapshots are convenient — and greedy. I had to write a cleanup script to prune containers older than two weeks. That cost me a nerve-racking hour the day I accidentally pruned a container I needed; I rebuilt it but lost some in-progress state.

2. Mac and teammate compatibility
LXD works great on Linux. On Mac, you need a remote LXD host (a tiny VPS or an always-on Linux box). Our team is half-Mac, half-Linux. My LXD setup helped me but wasn't directly shareable. I ended up documenting a matching Docker Compose file for Mac users and accepted that parity wasn't perfect. That's a real downside if your team runs macOS.

3. Bind-mount performance surprises
Initially I bind-mounted NFS-backed project folders (I use a small NAS at home) and watched file IO spike. The fix was to keep code on the local NVMe. Yes, I bought a tiny 256GB NVMe (₹3,400 on sale); that solved the slowness and avoided burning mobile data to rsync.

4. Small-memory machines
On an 8GB laptop, you can run one or two containers. I still use a "single-container per feature" rule rather than letting multiple branches pile up. If you need more, a cheap VPS as a remote LXD host (₹300–₹500/month) is a sensible extension.

The day it nearly failed me

I once relied on a container snapshot for a demo, and my laptop's NVMe died two days earlier. Backups saved my code, but not the container snapshots. I had to reproduce the environment on another machine in an hour — possible, but it exposed that snapshots are convenient, not a backup strategy. Since then I push dockerfiles/ansible playbooks that re-create containers from scratch and keep small backups of database dumps on a separate cloud bucket.

Why I still prefer this to other options

Compared to Docker Compose: fewer hacks to run multiple services, easier to test full systemd behaviors.
Compared to full VMs: faster to create and cheaper on disk.
Compared to remote dev servers: local latency and editor responsiveness stay excellent.

The takeaways I actually walk away with

If you work on Linux and your project needs multiple local services, per-branch LXD containers cut the friction of cross-branch interference. They aren’t a perfect team-wide solution — they forced me to accept a Linux-first workflow and manage disk cleanup — but for my solo feature work and on-call debugging, they recovered hours every week I was otherwise spending on process surgery.

If you’re Mac-only, consider a tiny remote LXD host (₹300/month) instead of trying to shoehorn this into macOS. If you’re on Linux: build a small base image, snapshot aggressively, and automate pruning before your SSD becomes your adversary.