---
title: "Why I Host a Tiny apt Repo for Dev Tools — and the signing mess I didn't expect"
pubDate: 2026-05-20
description: "I stopped having newbies download and re-download binaries. I host a small apt repo for team developer tools — what I run, why it saves hours, and the GPG mistake that broke provisioning."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop at a wooden desk with a notebook and coffee"
  caption: "Photo by Claudio Schwarz on Unsplash"
  creditUrl: "https://unsplash.com/@claudioschwarz"
tags: ["devtools", "packaging", "infra"]
---

I remember watching a new joiner on her first day struggle through the same five downloads I’d seen every quarter: gh, bat, ripgrep, a specific terraform binary, and a private helper we ship as .deb. She had slow home internet, and the office policy refused snaps. By lunch she had stalled. By the end of the day I’d done three manual installs for her over my laptop’s hotspot while I lost focus on my own task.

That was the friction. Repeated downloads, flaky mirrors, corporate restrictions, and mobile data costs for people in tier‑2 cities. We needed installs that were fast, repeatable, and worked for fresh laptops the first time. I built a tiny apt repository and it solved most of those problems. But not without a week of teeth‑grinding when I learned I’d ignored two boring things: package naming and GPG key hygiene.

Why an apt repo (not just GitHub releases or a script)
- Apt is allowed on most company laptops. IT would rather approve an apt source than a random curl | bash.
- .deb installs integrate with dpkg/apt, run pre/post scripts, and respect permissions. That matters for small helper tools we ship to engineers.
- A repo lets me pin versions, host our own builds (so we don't hammer upstream or use mobile data repeatedly), and add metadata (Depends, Conflicts) so installs don't blow away system packages.
- It’s tiny infra: a single nginx instance + reprepro or aptly, GPG signing, and a CI job that builds and uploads .debs.

What I actually run
- CI (GitLab) builds .deb artifacts for each tool/package. I use fpm to wrap a static binary into a .deb when upstream doesn't provide one.
- A small VPS (₹600/month) with nginx serves the repo over HTTPS. For internal-only access we tunnel via Tailscale; for public open‑source tools it’s just a CDN‑backed endpoint.
- reprepro manages Packages files and dists. It’s simpler than it sounds: put the .deb in the right folder, run reprepro includedeb, and it updates the indices.
- I sign the Release file with a GPG key and publish the public key at /repo.gpg. Onboarding is a one‑liner we paste into our internal docs:
  curl -sSL https://repo.example.com/repo.gpg | sudo apt-key add - \
  && sudo tee /etc/apt/sources.list.d/devtools.list <<< "deb [arch=amd64] https://repo.example.com stable main" \
  && sudo apt update && sudo apt install my-tool

Immediate wins
- New laptops install required tools in under a minute. No re-downloading from Github releases, which are blocked in some corporate networks.
- Developers in metros and smaller cities saved a few GB of mobile data each over a year. One dev reported a ₹450 savings in a month because they stopped tethering.
- We control versions. When terraform 1.7 landed with a breaking change, we could freeze the team on 1.6 via apt pinning rather than answering Slack for two days.

The thing that broke onboarding (and why it was on me)
Two weeks after launch I started getting panicked messages: apt update failed with "The following signatures couldn't be verified", and multiple new machines couldn't install anything from the repo. I had rotated the GPG key earlier in the week (because I like to be tidy) and pushed the new public key, but the Release file was still signed by the old key for a subset of packages due to a CI race. Some machines had the new key cached; some didn't. Chaos.

That would have been a minor hiccup if not for the second mistake: one of our packages used the same package name as an Ubuntu package in an LTS backport. During an apt upgrade, my package was marked as a candidate and apt forcibly upgraded a system library dependency in a few laptops, breaking an internal GUI. I had not checked "Conflicts" or chosen a sufficiently unique package name like org-team-tool. I also hadn’t taught our tooling to set the Origin/Label fields properly, which made troubleshooting take longer.

What I changed (actionable, specific)
- Unique names: prefix private packages with org- or team-. No collisions.
- Automate GPG rotation: CI builds sign with a short‑lived key stored in our KMS; rotation updates a manifest and we push new public keys atomically. Test machines fetch the new key and verify it before apt update.
- apt pinning file in our onboarding repo: prefer our repo for specific packages, and set Priority on pinning to avoid accidental upgrades of system packages.
- A simple health page that checks Release signature, repository timestamp, and package existence. Slack alert if the Release signature changes unexpectedly.

Tradeoffs you should know
- You introduce ops you must maintain. I spend ~30 minutes a week on CI packaging, key rotation, and index cleanup. For a team of 2–3 this is overkill. For 8–40 engineers it’s time saved on provisioning and fewer "works-on-my-machine" Slack threads.
- Offline work suffers. If you often work entirely offline, a repo on the cloud is a liability unless you cache packages locally (we do for on‑call kits).
- Security surface area: expose a web endpoint and you need HTTPS, rate limits, and careful auth if it’s internal. I learned that the hard way when a misconfigured ACL briefly made our private helper public.

When it actually paid off
The clean moment: we gave three interns fresh company machines at 9am on the same day. They all had the exact dev toolchain by 9:10. No follow‑up installs. No mobile data tethering. That hour saved me more context switches than the 30 minutes/week I now spend on the repo.

One thing I still don't love
Key management is fiddly. Even with automation, there’s a subtle trust question: how many machines should automatically accept a rotated key? We settled on a staged rollout: new key for packages added after a date, old key still accepted for 90 days. It's not elegant, but it stops us from bricking provisioning.

If you have a small team and provisioning is a recurring pain, hosting a tiny apt repository is one of those infra moves that pays for itself quickly. But be boring about package names and GPG keys; if you ignore those, you'll spend a week fixing what you could have avoided.