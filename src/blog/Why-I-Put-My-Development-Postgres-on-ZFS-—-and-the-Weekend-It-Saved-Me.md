---
title: "Why I Put My Development Postgres on ZFS — and the Weekend It Saved Me"
pubDate: 2026-06-11
description: "How I moved my laptop Postgres data to a small ZFS pool, how snapshots replaced slow pg_restores, the tradeoffs (memory, SSDs), and the time a cheap adapter almost ruined it."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden desk with code visible on the screen and a coffee cup nearby"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["devops", "postgres", "zfs"]
---

It was 2:10 a.m. and I had just pushed a migration that was supposed to be harmless. It wasn't. My local dev Postgres—an important, messy replica of staging—started throwing constraint errors. I needed to test a rollback path against an exact pre-migration state. pg_dump + pg_restore would take 25–30 minutes and chew through my laptop's fan noise and mobile hotspot. I remembered the snapshot I'd taken before running the migration. Thirty seconds later I was back at the pre-migration state, the migration reverted, and I went to bed.

That night is why I run my dev Postgres on a tiny ZFS pool on my laptop. It isn't for performance bragging or because ZFS looks cool in LinkedIn screenshots. It's because snapshots let me experiment like an idiot and recover like a grown-up.

How I set it up (cheap, practical)

I didn't rip out my laptop drive or buy enterprise gear. My setup is this: my laptop has the OS on the NVMe, and a separate 1TB SATA SSD (₹4,000–5,000) sits in a caddy. I created a simple zpool named devpool on that SSD and a dataset devpool/postgres. ZFS properties I use: compression=lz4 (saves I/O), atime=off (no pointless updates), and recordsize=8K for Postgres. I kept dedup off—no need and it eats RAM.

Snapshots are automated with a systemd timer that runs zfs snapshot devpool/postgres@auto-%Y%m%d-%H%M before any script that runs migrations or destructive seeds. For interactive backups I take manual snapshots: zfs snapshot devpool/postgres@before-migration-xyz. Rolling back is zfs rollback devpool/postgres@before-migration-xyz and Postgres finds itself in the exact state it was in when I took the snapshot.

Why it actually changed my workflow

Before ZFS I treated every migration like a landmine. I made copies of DB dumps to Google Drive (which I then had to download every time), or I ran pg_restore and waited, drinking cold coffee and worrying about mobile data. Now my workflow is exploratory by default.

If I'm trying something risky, I take a snapshot. If it goes south, I rollback. If a test accidentally truncates the wrong table, I rollback. If I want an old snapshot for debugging, I clone the dataset (zfs clone devpool/postgres@oldstate) and point a temporary Postgres instance at it; cloning takes seconds and doesn't duplicate the data. The total friction is so low that I take more consistent backups and test recovery paths more often.

I also use send/receive to export a snapshot to a small VPS when I need to share a pre-migration state with a teammate. zfs send | ssh user@vps zfs receive… is much faster than shipping SQL, and the received dataset is immediately mountable for remote debugging.

The tradeoffs and the day it failed me

ZFS is not magical. There are real, practical tradeoffs that affected how I use it.

Memory. ZFS loves RAM. With compression and ARC, it can use a lot. I run this on an 16GB work laptop and it’s fine; on an 8GB machine it got ugly. One afternoon I had a VS Code window, a browser with ten tabs, Docker, and my zpool active; the machine started swapping badly. I reduced ARC max with echo to /sys/module/zfs/parameters/zfs_arc_max and tuned the recordsize; that fixed it, but it means you have to manage memory expectations on smaller machines.

SSD behavior and power loss. ZFS expects decent underlying storage. I once had a stupid mistake: I kept the SSD in a cheap USB‑to‑SATA adapter because I move the drive between machines. One evening a power glitch and the adapter's flaky connection led to a degraded pool and, later, an import failure. ZFS was consistent—my metadata survived—but the incident cost a day of recovery, and I lost a snapshot because the hardware masked I/O errors. I switched to a proper internal bay and bought a ₹700 USB-to-SATA dock for occasional transfers. Lesson: ZFS mitigates software mistakes, not flaky hardware.

Backup philosophy. Snapshots are local. I use zfs send to copy important snapshots offsite, but that's manual unless you automate it. For me, that manual step is fine for day-to-day dev resilience; I still run periodic logical dumps (pg_dump) when I need longer-term portability.

Performance quirks. With compression=lz4 I usually see better throughput for our mostly-text data. But some workloads—large binary blobs—suffer. Tuning recordsize and knowing Postgres access patterns matters. Also, fsync behavior: be explicit about Postgres settings and trust neither ZFS nor Postgres defaults blindly.

Why I kept using ZFS even after the failure

The adapter incident pricked my confidence, but it didn't undo the benefits. The quick rollback that saved that midnight and every subsequent experiment outweighs the tasks of buying a proper SSD caddy, tuning memory, and scheduling remote sends. The failure taught me two useful things: (1) test your recovery steps from cold (not just the happy path), and (2) don't cheap out on the physical layer if you rely on snapshots.

A practical checklist I actually use (short, because you won't read a long list)

- Put ZFS on a separate drive if possible.
- Use compression=lz4, atime=off.
- Tune zfs_arc_max on 8GB RAM machines.
- Automate snapshots before migrations with systemd.
- Periodically zfs send important snapshots to a cheap VPS or an external drive.
- Don't run dedup unless you know why (it eats RAM).

One honest constraint

I still keep the canonical copy of staging/sensitive data in our usual secure place, scrubbed and access-controlled. ZFS on my laptop is for developer velocity, not compliance. If your company has strict data handling rules, ask the data owners before you clone real user data into a local dataset—even scrubbed sets can be sensitive.

What I walked away with

Snapshots remove hesitation. They turned my migrations from "pray-and-wait" into "try-and-revert-if-needed", which is a huge productivity multiplier. If you have a spare SSD and you value quick recovery over squeezing every last megabyte of storage, ZFS will pay for itself in fewer nights spent fixing avoidable messes. My only open question: why aren't more small teams using desktop-safe filesystems like this by default?