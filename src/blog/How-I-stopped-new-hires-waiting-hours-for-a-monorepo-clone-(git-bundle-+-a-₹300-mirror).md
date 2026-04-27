---
title: "How I stopped new hires waiting hours for a monorepo clone (git-bundle + a ₹300 mirror)"
pubDate: 2026-04-27
description: "If your office internet turns cloning a 10GB monorepo into a half‑day affair, this is a practical, low-cost way I ship repos to new devs in India without sacrificing history or CI."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218360-1a3b0d1c8b81?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden table showing a terminal with git commands"
  caption: "Photo by Jakob Owens on Unsplash"
  creditUrl: "https://unsplash.com/@jakobowens"
tags: ["git", "onboarding", "developer-tools"]
---

The first time the new hire sat across from me, he opened his laptop, typed git clone, and we waited. And waited. Our office link had the kind of upload speed that makes you nostalgic for dial‑up, and the repo was a 12GB monorepo with a 6GB history. After an hour his clone was still at 4%. He blamed his laptop. I blamed the office ISP. The reality was we were wasting a developer-hour quota that Delhi‑office budgets don't cover.

We tried all the usual tricks: shallow clones, sparse-checkout, git-lfs for big blobs. Useful, but not enough — shallow clones break a surprising amount of tooling (some CI tasks expect history), sparse-checkout is a mental tax new hires always get wrong, and many of our repos have large binary blobs we can’t split immediately. So I built the simplest thing that solved the painful part: full history, fast transfer, minimal setup. It’s a git bundle + rsync (or a USB handoff), and an optional ₹300 VPS mirror that makes recurring onboarding painless.

Why a bundle? Because the worst part of cloning over a slow link is the round trips and pack transfer. A git bundle is a single file snapshot of a repository (refs and objects) that you can scp/rsync/USB to the other machine, and then unbundle locally. No network round trips to the origin during the transfer, no partial fetch behavior, no surprising shallow depth. It preserves history and tags. It feels like passing a tarball.

How I actually use it (practical, not theoretical)
I run this from the repo host (CI runner or an admin machine that has a good connection to our origin):

1. Make a bundle:
   git bundle create repo.bundle --all
This dumps everything into a single file. For a 12GB repo the bundle is ~7–8GB (git compresses some), and it includes tags and refs.

2. Transfer:
   - For ad-hoc hires: rsync the bundle to their laptop over the office LAN (fast).
   - For remote hires or branch offices: rsync/scp the bundle to the hire’s home or hand them a USB (₹600 for a decent 64GB USB drives — cheaper than burning four hours of developer time).
   - For scaled onboarding: rsync the bundle to a cheap VPS mirror I run on a ₹300/month VPS. New devs fetch from the VPS (far less latency and the VPS is colocated with a good provider).

3. Unbundle locally:
   git clone repo.bundle repo-local
   cd repo-local
   git remote add origin git@github.com:org/repo.git
   git fetch origin
The key is the initial local clone is instant because everything’s already there. The later git fetch from origin can be fast (it only needs missing refs) or scheduled for later when someone has a decent connection.

The mirror trick that made it scalable
I tried handing out bundles manually and hit two problems: (a) repeated work on my side when I had to regenerate bundles for each hire, and (b) when someone needed the latest branch, the bundle was stale.

My cheap solution: a small VPS (I use a ₹300/month Singapore VPS) that mirrors the repository with a cron job:
   git clone --mirror git@github.com:org/repo.git /mirror/repo.git
   cd /mirror/repo.git && git remote update --prune
Then I rsync the mirror’s bundle directory to an internal HTTP server (or just let new hires ssh and scp the bundle). The VPS keeps the bundle generation local to itself and has a fast pipe to GitHub, so I only pay ₹300 monthly and zero developmental hours on each onboarding.

The failure that taught me a rule
Inevitably, I made a mistake. Once, a new hire cloned from a bundle I’d handed out, started working, and pushed. The push failed because their local repo didn’t have an origin set correctly — I’d shown a rushier workflow and they added origin as a file:// path to the bundle location. In their confusion they forced a push with --force, and our CI picked it up before I could catch it. We lost a branch tip transiently (we recovered, but not without livecalls and blame).

That episode taught me two things: always automate the post-unbundle steps and never let manual onboarding be the single source of truth. My current bundle script does three automated things after unbundle:
- sets origin to the canonical git@github.com URL,
- sets up a branch tracking (git branch --set-upstream-to),
- and runs a lightweight sanity check that refuses to allow pushes until fetch origin completes.

And one honest limitation: bundles are not a replacement for regular fetches. If a dev wants to push code upstream, they still need connectivity to the canonical remote. Bundles are a bootstrap for local work and CI, not a long‑term offline workflow. Also, generating and distributing a full bundle for a repo that changes dozens of times a day is wasteful; that's where the mirror VPS helps by creating periodic bundles instead of ad‑hoc copies.

Why this works in Indian offices
Our constraints matter. Shared 100Mbps office links often feel like 20Mbps per person during peak. Home broadband varies by neighborhood. Mobile data is expensive enough that asking a remote hire to download 8GB is a real ask (₹300–₹500 worth of data for many plans). The bundle approach gives you choices: LAN transfer in office, physical USB handoff for those with poor last-mile, or a small VPS mirror for remote hires. The cost math is straightforward: a ₹300 VPS or a ₹600 USB drive is cheaper than repeated developer-hours.

When not to use this
If your repo is tiny (<500MB), this is overengineering. If you change refs dozens of times each day and require the absolute latest commit for every new hire, you’ll need more automation around bundle refreshes (and maybe consider splitting the repo). Also, sensitive orgs with strict audit requirements might not allow offline bundles; check compliance.

What I actually walked away with
A cheap habit: automate the unbundle steps and treat the bundle as a bootstrap, not a permanent mirror. When we hired five people across three cities last quarter, none of them spent a morning waiting for a clone. That saved about 20 developer-hours and at least one angry manager meeting. The approach is low-tech, low-cost, and respects the real constraints we have in India — flaky last-mile, expensive mobile data, and impatient new hires.

If you're dealing with slow clones, try making one bundle, hand it to a colleague over LAN or a ₹600 USB, and see how quickly they can be productive. If you scale it, add a small VPS mirror and a tiny script that automates origin setup. It's not elegant. It's practical.