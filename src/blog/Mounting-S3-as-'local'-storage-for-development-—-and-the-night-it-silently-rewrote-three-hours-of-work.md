---
title: "Mounting S3 as 'local' storage for development — and the night it silently rewrote three hours of work"
pubDate: 2026-07-22
description: "I mounted an S3 bucket with s3fs to treat assets as local files for fast dev. It saved me data and time — until caching semantics silently corrupted edits. How I use it now, safely."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with code visible on the screen, next to a coffee cup"
  caption: "Photo by Austin Distel on Unsplash"
  creditUrl: "https://unsplash.com/@austindistel"
tags: ["dev-tools", "local-development", "infra"]
---

The panic starts small. It's 11:20pm before a demo to a client in Bengaluru. My laptop's cosy little terminal bell rings, I save a change to an image asset, and a second later the UI in the browser still shows the old asset. I hit refresh, then "revert" in my editor by accident. The change is gone. Three hours of fiddling photos and CSS are overwritten by what looks like an earlier copy.

I had mounted our S3 assets as a filesystem with s3fs. The idea was sensible: avoid downloading hundreds of megabytes of assets, keep builds fast on an intermittent home connection, and let my apps read/write like regular files. For weeks it worked. Then one evening the combined nastiness of s3fs's cache, eventual consistency on certain object ops, and my mental model of "local file = single source of truth" blew up.

If you’re tempted to mount S3 for development, here’s the exact experience I learned from — including the failure, the tradeoffs, and the setup I still use.

Why I mounted S3 in the first place
- My home internet is flaky and my mobile hotspot is expensive. Pulling the full assets folder for a feature build burned data and time.  
- The app expects a filesystem for image transforms. Rewriting a dozen build scripts felt worse than a mount hack.  
- I wanted parity with staging: same object URLs, same metadata, fewer "it works on staging, not locally" surprises.

The way I did it (the quick version)
- s3fs with IAM user keys, mounted under ~/s3-assets.  
- Mount options: use_cache=/tmp/s3cache, allow_other, use_path_request_style (needed for our storage gateway).  
- A tiny systemd --user unit to mount on login.

What went wrong (the honest failure)
Two nights before the demo I edited an image file in-place (crop + save). My editor wrote a temp file and renamed it over the original — normal POSIX behaviour. s3fs caches directory listings and objects locally and lazily syncs writes back to S3. But the default write semantics + the rename trick confused the cache: s3fs removed the cached object and queued an upload of the new file, while another process (a background sync from CI or my phone app) read the older object from S3 and re-wrote it. The end state was S3 holding the old image, my local cache pretending the new one was present, and my editor happily saving a timestamp that didn't match S3.

I pulled the latest from staging, and git merged the "old" file back into my branch, because my local filesystem had stamped different timestamps. In short: a mounting layer with lazy writes and eventual remote consistency lied to me about which version was authoritative. I lost the last three hours and learned the hard way that "local" ≠ "single writer, single truth" with cloud object stores.

What I wish I'd known
- Object stores are not filesystems. They lack POSIX atomic rename guarantees, and many FUSE drivers try to simulate them. This simulation breaks under concurrent writers.  
- Caching is the source of both speed and pain. The faster your cache flush strategy, the more upload requests and the more S3 costs; the lazier it is, the higher the chance of divergence.  
- Metadata (mtime, atime) is unreliable when a FUSE layer translates object ETags and upload timestamps into file attributes.

How I use S3 mounts now (the practical setup I actually trust)
I still mount S3 for read-heavy local development, but with strict rules and tweaks:

1) Read-only for primary workflow
- Mount the bucket read-only for day-to-day development. allow_other + ro. That eliminates write races. I run minor local transforms in a separate folder and only push final assets via a deliberate sync step.

2) If you must write, make it explicit and lock it
- Create a small wrapper script called s3-edit that:
  - copies the object to /tmp/project-edit-XXX,
  - opens my editor,
  - runs a checksum diff,
  - and then uses aws s3 cp to upload only when checksum changed.
- This removes editor-rename surprises and gives a deliberate push step.

3) Use goofys for metadata accuracy when reads dominate
- goofys is faster for read-heavy workloads and keeps fewer surprises around inode times. It still isn’t a full POSIX FS, but I've had fewer cache-induced contradictions.

4) Cache safely
- If you keep a local cache, point it to a persistent SSD location and configure frequent background flushes if you allow writes. For me: use_cache=/home/you/.s3cache and run a systemd timer to prune and flush every 5 minutes. That increased S3 PUTs, but saved uncertainty.

5) Monitor requests and bill shock
- S3 request costs can climb if your dev loop keeps doing small reads/writes. I added a billing alert and a CloudWatch metric to the bucket; two weeks in, my ₹300-ish monthly development budget turned into a ₹1,400 surprise because a runaway script kept listing and reuploading thumbnails.

6) Treat destructive operations as staging-only
- DB-like data, transactional writes, or anything multiple processes might edit stays off mounted S3. We keep such data on a dev replica of Postgres. S3 is for assets and read-only blobs.

Where this still breaks for me
- On-call edits at 2am: the wrapper script adds friction. I hate the extra steps when I’m tired. Sometimes I skip and regret it.  
- Mobile uploads and CI: different clients sometimes add or strip metadata, which confused cache invalidation. We ended up standardising headers in our upload pipeline to get consistent ETags.  
- Windows users on the team: FUSE options differ and behavior diverges. We keep a separate workflow doc.

Final takeaway
Mounting S3 as a "local" filesystem is a useful hack when you need fast, read-heavy dev against a shared asset set — especially with Indian internet constraints and mobile data costs. But you must treat it as a convenience layer, not as a source-of-truth filesystem. Make writes explicit, disable lazy tricks for mutating workflows, and accept the tradeoff: speed now, complexity later.

I still use a mount every day. But I no longer let it pretend it's the one true filesystem.