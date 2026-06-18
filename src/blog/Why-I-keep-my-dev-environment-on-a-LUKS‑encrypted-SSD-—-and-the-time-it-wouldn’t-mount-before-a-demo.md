---
title: "Why I keep my dev environment on a LUKS‑encrypted SSD — and the time it wouldn’t mount before a demo"
pubDate: 2026-06-18
description: "I carry a ₹3,500 encrypted external SSD with my development environment. It solved laptop swaps and office security — until one morning it refused to mount before a client demo."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of a person typing on a laptop placed on a wooden desk"
  caption: "Photo by Alvaro Serrano on Unsplash"
  creditUrl: "https://unsplash.com/@alvaroserrano"
tags: ["developer-tools", "security", "portable-workflows"]
---

I was ten minutes before a client demo when my laptop froze on a black prompt. Not the "bad internet" freeze or a WebApp error — my encrypted external SSD, with the project, my SSH keys, and the demo build, refused to open. No password prompt, no device node. Just silence.

That SSD is the thing I reach for when I switch between home, office, and client machines. It’s where I keep a small, self-contained Linux dev environment: my dotfiles, repo clones, a cached Docker image store, and a handful of SSH keys. Total cost: a 512GB NVMe in an enclosure — about ₹3,500. The solution solves three recurring problems for me in Indian work life: company laptop MDM limits, cramped office machines, and the need to keep client code physically isolated from corporate drives.

Here’s why I started doing it, how I set it up, the day it refused to work, and why I still carry it.

Why an encrypted SSD instead of cloud or a VM

I’d tried other options. A cloud VM is convenient until your Bangalore office internet drops to 2G during lunch. Codespaces work until your company blocks the provider. Syncing everything to Google Drive is fine until your work laptop is audited and the Drive is removed. An encrypted external drive hits a different set of tradeoffs:

- Portability: plug into any Linux (or macOS) laptop and work with your environment locally — no network required.
- Isolation: client projects live on removable media, separate from the host OS and corporate backups.
- Security: LUKS encryption means if the device is lost (cabs, train, or a colleague’s desk), the data is unreadable without the passphrase.

How I actually set it up (practical, not theoretical)

I keep my setup deliberately minimal because complexity is what breaks me in airports.

- Hardware: a 512GB NVMe in a USB‑C enclosure (₹3,000–₹4,000). Fast enough for builds, small enough to carry.
- Partition + LUKS: one LUKS2 container, ext4 inside. I use cryptsetup with Argon2 defaults, because I don’t want a terrible passphrase to be the weakest link.
  sudo cryptsetup luksFormat /dev/sdX --type luks2
  sudo cryptsetup luksOpen /dev/sdX devenv
  mkfs.ext4 /dev/mapper/devenv
- Mounting: I open it manually on a host: sudo cryptsetup luksOpen, then mount to ~/devenv. No automount — I don’t want accidental access when I plug it into a coworker’s machine.
- Small systemd user unit: I have a tiny systemd --user service that binds the mount into my home and starts the dev shell (a script that sets PATH, loads nvm/asdf, and points GOPATH). If it fails, systemd logs give me a quick place to look.
- Backups: nightly rsync to an encrypted cloud bucket (rclone to an S3‑compatible bucket) and a weekly clone on another encrypted SSD. Losing the drive is annoying — losing the work is not an option.

The day it failed and what actually broke me

What triggered the panic: I was on a client’s loaner MacBook (company policy, no admin installs). I plugged in the SSD, typed the passphrase, and nothing happened. No device node. I rebooted. Still nothing. Ten minutes later I borrowed an engineer’s Linux laptop; same issue.

Two things I learned, the hard way:

1) Enclosure compatibility matters. Some USB enclosures switch NVMe to a proprietary bridge that older kernels don’t recognize properly. The loaner Mac’s firmware didn’t like the enclosure; the drive wasn’t even visible as a block device. I should have tested the enclosure on as many machines as possible. I hadn’t.

2) LUKS version mismatch can be subtle. I defaulted to LUKS2 and Argon2. A couple of older Linux installers still have a cryptsetup that handles LUKS2 awkwardly or requires additional packages. That wasn’t my primary problem here, but I had a flashback because in another incident I was forced to carry a rescue USB with a live distro that had a newer cryptsetup.

Fix: Swap enclosure, and keep a tiny rescue USB. The loaner Macbook could read a 2.5" SATA enclosure I had in my bag. I moved the NVMe into that, it came up, I opened LUKS and the world resumed. The rescue USB (a 2‑minute live USB with cryptsetup and my ssh keys) is now a mandatory item in my bag.

Honest constraint: the MDM and hardware limits

This approach isn’t a silver bullet. Corporate MDM and policy can block USB devices or prevent you from running sudo. Once, I had to demo for a government client on a locked-down workstation — no external drives allowed. I had a plan B (a cloud VM with identical environment guarded by an IP allowlist), but the SSD was useless then.

Other tradeoffs: performance and wear. NVMe in USB is fast enough for typical dev work, but large Docker builds or VMs are slower than an internal SSD. I avoid swap and heavy I/O on the external device. Also, constantly plugging/unplugging increases wear; I replace the enclosure every two years.

Why I still use it

Because the tradeoffs align with my constraints. For me, the biggest wins are:

- Faster context switching: I can move between home and office and start work within a minute.
- Less noise in audits: client code is not on my corporate laptop.
- Predictable privacy: I control the encryption passphrase and the backup destination.

If you travel with work frequently, deal with multiple MDM machines, or want an offline fallback for demos, it’s cheap insurance. But don’t be smug about it — have the rescue USB, test your enclosure across the machines you use, and keep off‑device backups.

One takeaway I actually kept

An encrypted external SSD is not a backup; it’s a mobility and security tool. Treat it like cash: useful for getting things done quickly, but don’t keep all your money in your pocket. Keep an automated off‑device copy and a rescue USB. And test your hardware across the exact machines you’ll use for demos — that one extra 15‑minute test would have saved my morning.

If you use something similar, what enclosure, rescue tools, or recovery stories do you swear by? I want better rescue‑USB recipes that fit under 1 GB.