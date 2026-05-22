---
title: "Disposable QEMU VMs: the one‑snapshot trick I use for risky dependency upgrades"
pubDate: 2026-05-22
description: "I stopped risking my main dev environment for dependency upgrades. I keep a base QEMU image and create disposable qcow2 snapshots to test breaking changes—here’s the exact tradeoff."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of a laptop keyboard and code on a screen"
  caption: "Photo by Christopher Gower on Unsplash"
  creditUrl: "https://unsplash.com/@christophergower"
tags: ["devtools", "local-dev", "qemu"]
---

It was 10:42 PM and my CI had passed all morning builds, but the release branch failed on a transitive dependency nobody on the team wanted to touch. We needed to upgrade and confirm the app didn't regress on Ubuntu 22.04 where our customers run it — but that upgrade touches system packages, Python wheels, and native bindings. I wasn't willing to risk my day‑to‑day laptop, and containers alone weren't enough: the issue only appeared under a certain system glibc + package set.

So I spun up a disposable QEMU VM from a base qcow2 image, applied the upgrade, ran tests, and tossed the snapshot when I was done. An hour later the release was unblocked. No rollback, no wrenching my local dev setup back into working order.

This is the workflow I've settled on when I need to do risky system‑level tinkering: keep a well‑maintained base image on fast storage (I use a 512GB SATA SSD I bought for ~₹4,500), create an overlay qcow2 snapshot per experiment, run whatever commands, and delete the snapshot when done. Cheap, fast, and safe.

Why a disposable VM, not a container or cloud VM
Containers are great for reproducible userland, but they don’t reproduce system packages, kernel versions, or certain file‑system quirks. Our bug involved a native extension compiled against a specific glibc available only on the distro image we ship. A cloud VM would work, but I often need the iteration speed of a local machine (quick file syncs, local X forwarding for UI tests, and no monthly VPS management). Also, using a remote VPS for every experiment burns data and sometimes means paying a few hundred rupees a month if you do a lot of testing. Local QEMU gives me control.

How I structure it (minimal, practical)
I keep one base image per distro/version I care about: ubuntu-22.04-base.qcow2. This base is my "clean slate": system updates applied, dev packages installed, SSH/RDP off, minimal user account created. I store it on that SSD so image I/O isn't painful.

When I need to experiment:

- Create a snapshot overlay: qemu-img create -f qcow2 -b ubuntu-22.04-base.qcow2 work-experiment.qcow2
- Boot with libvirt/QEMU, forwarding my SSH key and mounting the repo via 9p or using rsync to copy a workspace into the VM.
- Do the upgrade, run tests, iterate.
- When done, shutdown and delete work-experiment.qcow2.

Two practical bits that made the flow tolerable:
- Share code with 9p (virtiofs if your qemu supports it) or rsync the project into the VM at boot. Rsync is my default; copying 50–200MB over 1 second on the SSD beats fighting stale caches.
- Use snapshots aggressively. The overlay qcow2 is small and fast to create, and deleting it fully reverts to the base. No "oh no I patched /usr and now my laptop can't find pip" drama.

A real example that paid off
We had a CI failure only reproducible on Debian bookworm base images. Locally I couldn't reproduce because my laptop runs Fedora. I booted the bookworm base image, created an overlay, ran the package upgrade that CI ran, executed the failing test suite, and collected logs. The tests failed in a way that pointed to a missing symbol in a system library — a red flag for a packaging regression, not our code.

I filed a compact bug report with stack traces and exact package versions. The maintainer fixed the packaging issue; we pin the working version for the next release while the package fixes land. Without the disposable VM I would have spent a day trying various hacks on my main machine and possibly broken it.

The failure that taught me to be paranoid
After three months of bliss, a sudden power cut during a long upgrade corrupted a snapshot overlay. The VM wouldn't boot; virt-manager threw storage errors. I lost some local test artifacts and had to re-run the whole upgrade on a fresh overlay. Lesson: snapshots aren't invincible. I now:

- Take quick rsync backups of important test artifacts to a host directory during long runs.
- Avoid doing battery‑critical work without a UPS. I keep a ₹3,000 UPS for my desk now because one power cut cost me two hours.

Tradeoffs I accepted
- Disk usage: base images consume space. The SSD purchase was deliberate. If you don't have spare SSD space, this won't be pleasant.
- CPU and RAM: VMs are heavier than containers. My cheap work laptop gets hot and slower when running multiple VMs. I usually limit experiments to one VM at a time.
- Slightly slower iteration: booting a full VM is slower than spinning a container. For quick userland changes I still prefer Docker or devcontainers. This approach is for system‑level risk that I refuse to test on my primary environment.
- Occasional hardware quirks: GUI forwarding, USB passthrough, or special devices (SIM cards, cheap 4G dongles I sometimes use for network tests) are fiddly in QEMU. It’s doable, but it's another config item.

When not to use it
If your change is strictly application code or Node/Python package upgrades that don't touch system packages, use containers or isolated virtualenvs. Use a disposable VM when the bug boundary crosses the distro boundary — kernel, glibc, system libs, package managers, or when a dependency is only available as a distro package.

Why this sticks for me
Because it matches my constraints: slow office internet some days, a need for low-latency local debugging, and the occasional requirement to reproduce a bug on exactly the same distro our users run. It's cheaper in money and time than provisioning cloud VMs for every small experiment and much safer than letting risky upgrades loose on my main laptop.

Takeaway
If you ever find yourself asking "what's the worst that could go wrong if I run this upgrade on my machine?", the right answer is usually: run it in a disposable VM first. Set up one base image per distro you care about, keep it on fast storage (buy the SSD if you must), create a qcow2 overlay for each experiment, and delete it when you’re done. It won't replace containers or remote VMs, but for system‑level, risky tests it saves time, arguments, and a lot of painful rollbacks.