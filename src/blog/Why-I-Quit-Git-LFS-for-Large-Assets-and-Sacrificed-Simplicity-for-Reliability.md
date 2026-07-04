---
title: "Why I Quit Git LFS for Large Assets and Sacrificed Simplicity for Reliability"
pubDate: 2026-07-04
description: "I moved our game's 1GB-plus asset blobs out of Git LFS into a git‑annex + S3 setup — cheaper clones, fewer CI timeouts, but a messier onboarding and one release that taught me humility."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop with code visible on the screen and a coffee cup nearby"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["git", "developer-tools", "infra"]
---

It was 2 a.m. and our CI pipeline was cloning the monorepo for the thousandth time that week. The log hung at "Fetching LFS objects" for seven minutes, then timed out. The deploy failed. The QA engineer in Pune messaged that their home broadband was choking on the repo clone. I stared at the terminal, then at the billing alert from GitHub: we'd burned through our LFS bandwidth for the month.

We had been doing the sensible, obvious thing: put large binaries into Git LFS, keep source in Git. It worked for a while. Then we kept adding artists' folders — new textures, sounds, APKs for internal testing — and the LFS storage and egress quickly became the team's surprise monthly bill. More importantly, clones and CI runs became unreliable in Indian home networks and intermittent office internet. CI failures were the symptom. Slow onboarding, missed releases, and developers who carried whole repos on mobile hotspots were the real problem.

Why Git LFS stopped being enough

- It hides complexity, but doesn't eliminate bandwidth. Every fresh clone pulls the LFS objects you ask for. That’s fine if everyone works on the same assets all the time. It’s terrible when a mono-repo has 2GB of rarely touched art.
- GitHub's LFS quotas are punishing for small teams that don't predict asset growth. We hit the bandwidth cap twice; both times a release pipeline stalled.
- In India, developers often use metered home ISPs or mobile hotspots. A 1GB forced download is a real, wallet‑felt hit (₹200–₹300 in mobile data for some plans), and a reason for delayed onboarding.

I needed two things: smaller, fast repo clones for normal dev work, and a cheap, reliable place to host big blobs that CI and staging could pull from deterministically.

What I built (₹300 VPS + object store)

I switched to git‑annex for tracking large files and put an S3‑compatible object store behind it. The pieces:

- git‑annex in our repo to let git track file pointers instead of the binary blobs.
- MinIO running on a small VPS (₹300/month) with block storage for local caching and a lifecycle that mirrors to a cheaper object store (we used an S3-compatible bucket from our cloud provider).
- A CI job that fetches only the assets required for a build using git annex get --auto --include=path/to/asset.

Why this worked for us

- Clones are tiny. Developers without art work no longer pull gigabytes during git clone or CI checkouts.
- Predictable CI. The pipeline explicitly asks for only the assets needed for that build. No surprise LFS fetches in the middle of a test run.
- Cost control. Hosting the object store and a small VPS cost us roughly ₹800–1,200/month versus unpredictable LFS bills that spiked into the thousands once.
- Offline-friendly for artists. Artists can run git annex assistant with a local disk repository, which means they can push large assets locally and sync when convenient.

A week of real pain (honest failure)

This didn't go smoothly. Two things bit us hard.

First, onboarding. git‑annex is not Git LFS. It's more powerful and more arcane. New hires tried to push assets and the repo rejected the push because they hadn't enabled the annex assistant or set up our special remotes. We added onboarding docs and a single 20‑minute session, but the first two weeks were slow.

Second, a release broke in staging because one small asset wasn't present in the object's remote. The pipeline logged "file missing" only in the last step. Nobody noticed because our old LFS workflow had given us a false sense of "everything is in the repo." We spent three hours tracking the missing SHA, found that an artist had pushed to a local disk remote, and had never synced the gateway S3. That hour sucked. We added pre-merge checks to run git annex fsck for changed paths and a CI gate to fail fast if an asset pointer is unreachable.

Tradeoffs I accepted

- Complexity over simplicity. git-annex is more flexible but harder to explain. We traded the "one command clones everything" simplicity for dependable, selective fetching.
- Operational responsibility. Running MinIO + a small VPS means I now babysit uptime and backups. But the cost is predictable and the SLA for our use was simple: if the MinIO instance is down, CI will fail loudly before deployment.
- Slightly worse UX for casual contributors. If you expect non-technical contributors to drag-and-drop into a GitHub web UI and have everything just work, this isn't for you.

Practical rules that kept this usable

- Never trust a pointer without a check: CI runs git annex fsck --fast on the required paths before starting any build step that needs binaries.
- Make the S3 remote writable only from our artists' workstations or a guarded CI key to avoid accidental pushes to local-only remotes.
- Provide a "one-liner" script for new devs that configures git-annex assistant and runs an initial fetch for the subfolders they commonly use.
- Use content-addressed names for assets in the object store so CI can fetch by SHA and avoid accidental overwrites.

When you should consider this

If your repo contains a few large, infrequently changed blobs (art, release APKs, video cutscenes) and freelancers or remote contributors are joining regularly on metered connections, this pattern is worth the setup cost. If everyone's always working with the same giant binary files, a simple LFS setup might still be better because the mental model is simpler.

What I walked away with

The thing I didn't expect: predictability matters more than convenience. Moving large blobs out of the default clone path meant fewer surprise CI failures and faster day‑to‑day work for most developers. But that predictability only arrived after we added checks and shored up onboarding — and after that one midnight release that taught me humility.

Open question I still carry: what's the minimal onboarding script and CI hook that makes git-annex feel as frictionless as Git LFS without losing its benefits? If you've solved that, tell me how you did it — preferably with one command and no manual SSH fiddling.