---
title: "A 10‑Minute Repro VM That Saves Me a Client Support Hour (and the day it lied)"
pubDate: 2026-06-08
description: "How I maintain tiny, versioned VM images to reproduce client bugs fast—what I automate, the storage and bandwidth tricks I use in India, and the one failure that taught me to stop assuming."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of hands typing on a laptop keyboard with code visible on the screen"
  caption: "Photo by Christina @ wocintechchat.com on Unsplash"
  creditUrl: "https://unsplash.com/@wocintechchat"
tags: ["developer-tools", "debugging", "repro"]
---

It was 9:15 p.m. on a Wednesday. The client’s staging server kept failing a POST to our payment callback. Logs showed a TLS error that only happened under load. They handed me a stack trace, a vague “it works on my machine”, and a promise: “Can you reproduce this locally?” I pulled the code, ran the tests, stared at a green CI, then stared at my slow home internet. Two hours later I was still trying to match the exact distro, OpenSSL version and systemd behavior. The bug was reproducible in an environment I didn't have. I lost an hour to setup. Then I lost another hour to context switching.

After that week I decided to stop gambling time on ad-hoc local setups. I built one small habit that pays back on those nights: a tiny, versioned reproducible VM for each client or major environment. It boots in ~10 minutes on my laptop and matches the service-level environment well enough to either reproduce the bug or tell the client why the bug can't be reproduced without more info.

Why a tiny VM, not Docker?

Containers are great. But in my experience with payment integrations, vendor drivers, and kernel-tied TLS quirks, Docker can hide the differences you actually need to test. The problems that ate my hours were OS packages, systemd service ordering, specific OpenSSL builds and the odd kernel behavior under cgroups. A minimal VM gives me an entire userspace and kernel surface to match — without spinning up a full cloud instance.

What I keep in place

- One base qcow2 per distro+major-version (Ubuntu 20.04, 22.04, AlmaLinux 8) stored compressed on an external SSD (I use a ₹2,500 1TB SSD). These are thin and easy to layer.
- A per-client overlay image (few hundred MB) that contains the app user, packages, config files, and a systemd unit or two. Overlay lets me keep the base read-only and swap specifics quickly.
- A tiny metadata repo (git) with cloud-init user-data snippets, package lists (apt-mark showmanual), and a startup script that runs the app and some smoke tests.
- A Makefile that runs qemu-system-x86_64 with sensible defaults, forwards ports, and mounts my code directory read-only. make start boots the VM in under 10 minutes on my 16GB laptop.
- A systemd --user service on my laptop that prunes old images overnight and rsyncs new overlays to a ₹300/month VPS when I need to share an image with a teammate who’s on slow office internet.

How I make it actually fast

- Overlay, not clone. Creating new overlays is a fraction of cloning full images. I work with qcow2 overlays and qcow2 backing files to keep disk use low.
- Lightweight base images. I strip docs and large packages from bases (build-essential, manpages) so boot times and image sizes shrink.
- Cached apt mirror. I run a tiny apt proxy (apt-cacher-ng) on the VPS. When I'm on mobile tethering or a flaky office connection in Bengaluru, apt packages come from the VPS instead of downloading again. It saved me at least ₹200 in extra mobile data the month I set it up.
- Versioning. Every overlay has a simple semver in the metadata repo and a changelog. If a client says “it’s broken after package X updated”, I can check out the overlay tagged to last week and boot the exact environment.

A real example: reproducing a TLS handshake failure

One client had a TLS handshake failure only under heavy concurrent requests. Booting the exact distro+OpenSSL build in the overlay reproduced it within minutes. The issue turned out to be a sysctl value (net.ipv4.tcp_tw_reuse) set differently by their sysadmin. I patched the overlay, repro'd, and pushed a small config change. No long setup, no long debug session.

The week it lied

There was one bug that broke my faith in small VMs: a race that depended on a CPU microcode quirk and a proprietary driver the client ran on their VM host. My reproducible VM was green. The client’s VM under KVM on their provider failed. I spent a day on false confidence until the client sent me /proc/cpuinfo and dmesg. The difference was in a vendor microcode and a kernel module. My tiny VM had no hope of matching that without turning into a full hardware-capture project.

That taught me two things:

- Repro images are about eliminating obvious setup noise quickly, not cloning the entire production environment perfectly.
- Ask for small, specific artifacts early: kernel version, /proc/cpuinfo, system logs, and a minimal stress script. If the bug is about hardware or microcode, a small VM won’t help.

The tradeoffs I accepted

- Maintenance. I rebuild bases every month. It’s a 20–30 minute job and a little annoying. But it beats repeating the same "install, fail, reinstall" cycle during an incident.
- Storage. Even with overlays, the SSD filled up if I hoarded too many images. I keep only the last three overlays per client and offload older ones to the VPS or to cold storage.
- False negatives. Some bugs simply can't be reproduced without the exact physical or hypervisor setup. I accept those as part of the checklist: if the VM is green, I escalate the need for host-level data instead of chasing arbitrary fixes.

How this changed my nights and meetings

I now lose far fewer evenings to environment setup. On an incident I can boot an environment and know within 10–15 minutes whether I have a reproducible case. That changes the conversation: “I can reproduce this in environment X; it fails at step Y” is a lot more useful than “I tried, can't reproduce.”

In meetings, the ability to say “let me boot the client overlay and demo” reduces finger-pointing. It also made engineers a lot more likely to try reproducing locally because the friction is gone.

One takeaway

If you’re still spending your nights installing packages to match a client environment, stop. Build one small, versioned VM per client or environment — make it bootable in ten minutes, keep it lightweight, and automate the mundane parts (overlay creation, package caching, and sharing). It won’t match everything. But it will turn hours of setup into ten focused minutes, and that change is worth the extra SSD and ₹300 VPS.