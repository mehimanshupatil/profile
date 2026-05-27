---
title: "Why I Replaced My Swapfile with zram on an 8GB Work Laptop (and When It Broke)"
pubDate: 2026-05-27
description: "How switching an old ₹45,000 company laptop from a disk swapfile to zram cut build stalls, reduced SSD wear, and the CPU/hibernate tradeoffs I didn't expect."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A MacBook Pro open on a desk with code on the screen and a small plant beside it"
  caption: "Photo by Sven Mieke on Unsplash"
  creditUrl: "https://unsplash.com/@svenmieke"
tags: ["linux", "developer-tools", "performance"]
---

The fan kicked in hard right when I hit the linker step. My 8GB company laptop — an old Intel i5 with an HDD that never learned to breathe — turned into a sauna. Builds crawled. Chrome tabs paged out. I kept waiting for the “sudden slowness” to stop and for it never did.

That afternoon I added a 4GB swapfile because it's the reflex: low RAM → add swap. It worked, in the sense that nothing crashed. But the system started thrashing the disk so badly the HDD sounded like it was trying to escape. Builds still took ages. The swapfile had solved the crash problem but killed performance and probably shaved months off the machine's life. For a device I’d been meaning to replace someday — ₹45,000 on my wishlist — it was not acceptable.

Enter zram. I set it up that evening and, for the first time in weeks, I could compile without the fan sounding like a jet engine.

Why zram worked for me
zram creates a compressed block device in RAM and uses it as swap. Because compressed data lives in RAM, you get much lower latency than swapping to disk, and you avoid heavy I/O on an HDD. On my 8GB laptop it turned swapping from a slow-disk problem into a CPU/compression problem — and modern CPUs (even older i5s) are good at fast, low-overhead compression like lz4.

Concrete results on my machine:
- Before: 12–15 minute compile wall time when the machine started swapping.
- After: 8–9 minute compile time on the same workload (I measured three builds each).
- Disk I/O during builds dropped by ~70%—the HDD noise literally vanished.
- Battery life took a small hit under heavy load but improved for mixed light use because the HDD wasn’t spinning so much.

How I set it up (the tiny, practical bits)
I run Ubuntu 22.04 at home. I wanted something repeatable and systemd-friendly, so I used the zram-generator package. The gist:

- Install zram-generator:
  sudo apt install zram-tools zram-generator

- Configure /etc/systemd/zram-generator.conf (I kept it minimal):
  [zram0]
  zram-size = ram * 50%
  compression-algorithm = lz4

On my 8GB machine that creates a ~4GB zram device and formats it as swap. systemd handles the rest.

If you’re old-school (or on a distro without zram-generator), the manual sequence is:
  sudo modprobe zram num_devices=1
  echo lz4 > /sys/block/zram0/comp_algorithm
  echo $((4*1024*1024*1024)) > /sys/block/zram0/disksize
  sudo mkswap /dev/zram0
  sudo swapon /dev/zram0

Two obvious tweaks I used:
- Lowered vm.swappiness from 60 → 10 so the kernel prefers RAM and only uses zram when necessary.
- Kept zram size at 50% of RAM on 8GB machines. On 16GB I wouldn’t go over 25–30%.

The tradeoffs I ran into (and one real failure)
There were tradeoffs. This is the honest part.

1) CPU and heat: Compression uses CPU. During my largest builds the CPU temperature rose a few degrees more than before and the fan still spun up — just later. On days with long, CPU-heavy tasks battery life dropped by ~10–15%. For desk-bound work this was a fair trade for not thrashing the HDD. On commutes or long battery-days I toggle zram off.

2) Hibernation: zram and hibernate do not mix. If you hibernate to disk, the system expects a swap device it can write to. Because zram is ephemeral and in memory, resuming from hibernate fails. I discovered this the hard way once at a client site late at night. My workaround: use suspend instead of hibernate, or keep a small on-disk swap partition (~2GB) reserved for hibernate and prefer zram for everything else.

3) OOM and application behavior: With zram, processes get compressed pages instead of hard swapping. That’s great until you actually exhaust RAM + zram. When that happens, the kernel OOM killer can be more brutal. I had Chrome’s tab manager kill background tabs in ways I didn’t expect. I mitigated this by lowering Chrome’s tab retention (and closing large, unused tabs) and by tuning cgroup limits for heavy build jobs.

4) My failure: zswap + zram at the same time. I tried enabling both zswap (compress-to-disk) and zram. The machine became noticeably unstable on resume from suspend — random freezes. I spent a morning bisecting configs and eventually disabled zswap. Lesson: less is more. Pick one compression layer and stick to it.

When not to use zram
- If you have NVMe SSD + 16GB+ RAM, the latency win is smaller. The CPU cost may not be worth it.
- If you rely on hibernate regularly for long travel, zram complicates that.
- If your workload is already CPU-bound, adding compression can make things worse.

Why this mattered in India
A lot of us are stuck on older company laptops or budget personal machines (I’m looking at you, HDD-era Lenovo). Office IT rarely upgrades quickly, and buying a new dev laptop is a ₹40k–₹1.5L decision. On top of that, frequent power cuts and long commutes mean I value a machine that behaves predictably more than one that benchmarks brilliantly in an ideal lab. Switching to zram cost me zero rupees, saved me a handful of hours each week, and delayed the painful purchase for another year.

One takeaway (and a tiny question)
If you’re on an 8–12GB laptop with a slow disk, try zram for a week. Monitor CPU temps and do a couple of builds before declaring it good. Keep a small hibernate-capable swap if you hibernate. The one thing I walked away with: performance is often a systems tradeoff you can rearrange — not only hardware. You move the problem from disk to CPU, and that can be the right move.

Anyone else tried zram with z3fold or different compression levels? I kept lz4, but I’m curious about your numbers on modern i3/i5 machines.