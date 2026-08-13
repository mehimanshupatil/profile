---
title: "Why I Run My Development Shell Inside a Podman Container (and the demo that taught me its limits)"
pubDate: 2026-08-13
description: "I moved my whole dev shell into a rootless Podman container for consistency and faster onboarding—until a client demo failed because the container couldn't see my VPN. Here's what I run, what broke, and the single rule I now follow."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with a coffee cup and notebook on the side"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["dev-environment", "podman", "developer-tools"]
---

I was at a client's small conference room in Whitefield, Bengaluru. The product manager had five minutes before stakeholders arrived. I opened my laptop, ran the repo-local dev shell, started the demo server, and then attempted the one action that guarantees panic: call an internal staging URL.

Timeout. Nothing.

Locals were watching the app spinner. My teammates were on chat saying “it worked yesterday.” It had — on my host. Not in the container. The demo died while I explained that the environment is "reproducible" and "isolated." That was my cue to stop defending abstractions and start fixing things people could see.

What I run and why

For the last 18 months I’ve used a repo-local, rootless Podman container as my daily dev shell. Not because I love containers for the sake of it, but because we kept hitting the same friction:

- New hires (or me after a reinstall) spent hours matching system deps.
- CI and my laptop had subtly different libraries.
- Office Wi‑Fi is flaky; downloading large apt/npm packages mid-demo is a confidence killer.

My minimal setup looks like this in practice: a systemd --user unit that boots a container for the repo, binds the workspace, forwards my SSH agent, mounts .gitconfig and the dotfiles I trust, and exposes ports to localhost. Launch is a single make dev. On Linux it's rootless Podman; on Mac I use podman machine and the same workflow.

Concrete benefits I got in real life

- Boot time: new machine ➝ productive in 10–20 minutes. No global Node installs.
- Consistency: “works on my machine” stopped being a lie — the container matched CI.
- Clean laptop: no node_modules clutter, fewer global installs breaking other projects.
- Bandwidth savings: we prebuilt images in CI and pulled them; the demo runs without re-installing packages.

The demo that failed (and why it actually mattered)

Root cause: network isolation. My host used Tailscale to reach internal staging under staging.internal.company. The container ran rootless Podman, which uses slirp4netns (an isolated user-mode network). That isolation prevented the container from seeing the host's Tailscale interface and DNS setup. Inside the container, curl to staging.internal.company just timed out.

I had assumed network parity. That assumption failed publicly.

What made this worse: I had bind-mounted my SSH socket and .aws/credentials to make auth seamless, so secrets were available inside the container — but network routes were not. I could SSH out from the host. From the container: no route. I tried fiddling with podman flags in the conference room and burned the remaining five minutes. We ended up switching to a laptop running the host environment, and the demo worked.

This taught me two practical (and mildly humiliating) lessons I still use.

Tradeoffs, failures, and the rules I now follow

Containers are not magic — they isolate, and that isolation includes networking. Here are the tradeoffs I accepted and the changes I made.

1) Always test network assumptions, in-container, before any demo
No more “it worked on my host” demos. I run, as part of my pre-demo checklist, one-liners from inside the container:
- curl -I <staging-url>
- dig +short <internal-host>

If any of these fail, the demo is off the container. This costs 60 seconds; it saved me three demos since that Whitefield day.

2) Keep a host fallback and a remote fallback
I maintain a tiny start-demo.sh that can (a) run the same server on the host, or (b) ssh to a cheap remote dev box and run the container there. That remote box is a ₹300/month VPS I rent; it's on a stable network and reachable when office Wi‑Fi or my container networking misbehave. Having that fallback costs money, but it's cheaper than a failed client meeting.

3) Use explicit network options where you can
If security policy allows, --network=host avoids isolation. On rootless Podman that's not always possible; slirp4netns has flags like --network=slirp4netns:enable_ipv6:true and allow_host_loopback, but they are fiddly. I keep documented options per repo (README: “If you need host networking, run xyz or use the remote fallback”).

4) Be honest about performance and platform limits
My 8GB work laptop gets sluggish when I mount large node_modules into the container. On company-managed MacBooks, podman machine is slower and requires extra disk. And some GUI tools (Electron editors that rely on local sockets) don't behave well in this setup. I tried to bend the system until it snapped — truth is, containers help most for CLI-centric backends and web servers, less for heavy GUI work.

One honest failure I still carry
I once configured the container to mount my entire home for convenience. That made dotfiles and secrets available — and one morning a careless change to a script in the container overwrote a local ~/.bashrc I hadn't backed up. I stopped mounting the whole home after that. Principle: minimal mounts, explicit intent.

What I actually walked away with

Containers make my dev environment predictable and my demos repeatable — most of the time. The single, non‑sexy rule I now treat as mandatory: test the things that differ from the host (networking, mounted sockets, external services) from inside the container before anyone sits down across from you. If that test fails, run the demo on the host or on the ₹300 VPS.

No silver bullets, but fewer embarrassing demos. And if you demo in a Bengaluru office with unpredictable Wifi and a stakeholder who likes to ask for "just one more feature," that extra 60-second test is worth more than the time you spent arguing about reproducibility in the parking lot.