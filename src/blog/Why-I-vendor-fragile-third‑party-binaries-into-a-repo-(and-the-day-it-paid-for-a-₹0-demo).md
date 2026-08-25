---
title: "Why I vendor fragile third‑party binaries into a repo (and the day it paid for a ₹0 demo)"
pubDate: 2026-08-25
description: "I stopped trusting external binary hosts for demos and CI. I now keep third‑party SDKs in a small vendor repo, served as a submodule — how I set it up, why it works, and what it cost me."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk showing code on the screen, with a coffee mug beside it"
  caption: "Photo by Christina @ wocintechchat.com on Unsplash"
  creditUrl: "https://unsplash.com/@wocintechchat"
tags: ["developer-tools", "dev-infra", "reproducibility"]
---

It was a Tuesday client demo in a noisy co‑working space in Pune. My laptop was clean, the app was wired to a sandbox, and the one third‑party SDK we depended on—hosted on a tiny CDN—timed out on the first network call. No retries. The UI froze. We stared at a spinner for 30 seconds until the client politely left.

That spinner was avoidable. The SDK had been pulled from an external URL during our build. When the CDN hiccuped (probably a routing issue from the office ISP), the build completed but the runtime failed to fetch the native binary. I had a choice: keep relying on other people's hosts and accept the hairline failures that make demos stressful, or do something mildly annoying that guarantees the binary is there.

I chose annoying. I started vendoring third‑party binaries.

Why I stopped relying on external hosts

Two practical patterns pushed me:

- Our office and client networks are flaky. Mobile tethering, corporates behind restrictive proxies, and occasional CGNAT mean downloads from small CDNs fail more than you'd like.
- CI and offline demos need determinism. A build that succeeds locally because it fetched a binary during development but fails on CI or in a client's environment is the kind of intermittent failure that costs mornings.

Vendoring means keeping the exact binary your build needs inside a separate, versioned repository (not mixed into main app code). For us that was JARs, .so files for Android, a few binary blobs for desktop SDKs. I serve them from a tiny artifact repo (a Git submodule) that our CI and developer checkouts can fetch from a reliable host.

How I implemented it (the exact pattern I use)

This is what worked for me on a ₹0–₹300/month budget and minimal ops.

1) A dedicated vendor repo
I created a small Git repo named myorg/vendor-binaries. It contains one folder per dependency (e.g., stripe-android/1.2.3/) with the actual files and a small manifest (vendor.json) listing version, SHA256, origin URL, and license text. The manifest is the single source-of-truth for updates.

2) Git submodule in each project
Projects that need binaries add vendor-binaries as a submodule. That keeps the main repo small and makes updates explicit. On CI I do git submodule update --init --recursive.

3) CI pulls from a stable host
For CI I mirror the vendor repo to a tiny, ₹300/year VPS (or use GitHub/GitLab private repo with their storage). That avoids relying on the developer's laptop network when building in shared runners. Mirroring is a cron that git push-es the vendor repo to a bare repo on the VPS.

4) Build scripts check hashes
Every build step computes SHA256 of the binary against vendor.json. If it doesn't match, the build fails loudly. No silent corruption, no silent upgrade.

5) Make updates a pull request
To update a binary you open a PR in vendor-binaries: add the new files, update vendor.json, include the source URL and license, and CI runs a checksum/scan. This makes upgrades visible and audited.

Why this is different from git‑LFS or artifact servers
I considered Git LFS and Nexus. LFS is fine, but we had two issues: (a) cost and limits for private LFS storage for small teams in India, and (b) complications when someone forgets to fetch LFS objects before a demo. Nexus/artifactory is great, but it’s ops-heavy for a tiny team.

A submodule vendor repo is low-friction: standard git, predictable, and within the control of the team. It also works offline once checked out—a key property for demos on trains, flights, or client sites.

The tradeoffs and a real failure that changed how we use it

Vendoring sounds ideal until the day I shipped an old, vulnerable SDK.

Two months in we had a security bulletin for a vendor binary. A junior dev updated the app's build file to bump the version but forgot to update the vendor repo submodule. CI used the bumped version (fetched from the vendor repo clone on the VPS) and the app deployed with the old vulnerable binary—because the vendor submodule wasn't updated and our checksum guard didn't catch the mismatch (we had allowed a fallback to network fetch during a rollover day).

I fixed it with three changes:

- No fallbacks. If the binary isn't present or checksum fails, the build fails.
- A daily mirror check that says: "local mirror differs from upstream" and creates an automated PR to update vendor-binaries if the official source changes.
- A small on‑call checklist: when you update a vendor binary, also create a release note and tag the vendor repo. This made upgrades visible to reviewers and auditors.

Practical constraints you should know up front

- Repo bloat: binaries add size. We keep the vendor repo git‑pruned and occasionally squash older versions into tar archives in a releases/ folder. That reduces the working-tree impact.
- Licensing: you must keep license files and ensure redistribution is allowed. I once had to remove a binary and point to a licensed downloader because redistribution was prohibited.
- Manual updates: there’s friction. You accept a small manual step to update a binary. That's intentional—automatic updates were what broke demos for me.

When it actually helped

Three weeks after I set this up I did the same Pune demo. The client's proxy blocked the CDN our SDK vendor used. The spinner reversed into a smooth flow because the build used the vendored .so and the app started instantly. No explanations, no blaming the network. The client didn't even notice the difference. I did, and I didn't feel like apologising.

A short takeaway

If you demo to clients in India—or run CI across flaky networks—keeping essential binaries in a separate vendor repo (served as a submodule and guarded by checksums) trades a bit of upkeep for consistent demos and reproducible builds. It costs time, not money. The honest hard part is discipline: no fallbacks, visible PRs for updates, and treating those binaries like code with ownership and review. That discipline is what saved my demos—and my sleep.