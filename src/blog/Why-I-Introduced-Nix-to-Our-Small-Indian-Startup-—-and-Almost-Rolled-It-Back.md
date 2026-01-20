---
title: "Why I Introduced Nix to Our Small Indian Startup — and Almost Rolled It Back"
pubDate: 2026-01-20
description: "How adopting Nix fixed reproducible dev environments for our small team — what worked, what didn’t, and how to adopt it without breaking onboarding."
author: "Rohan Deshpande"
image:
  url: "https://cdn.pixabay.com/photo/2015/01/21/14/14/laptop-606760_1280.jpg"
  alt: "Open laptop on a wooden desk displaying terminals and code editors"
  caption: "Image credit: Pixabay / Free-Photos"
  creditUrl: "https://pixabay.com/photos/laptop-computer-working-office-606760/"
tags: ["Nix", "developer tools", "dev workflow"]
---

We hit a wall one Friday afternoon: the feature that worked on two machines failed on CI and on the QA laptop. Debugging turned into a three-day scavenger hunt through different Node, OpenSSL and image-builder versions. It felt like déjà vu — the same “works on my machine” story that eats sprints.

That week I introduced Nix into our repo. Six months later it’s a firm part of our workflow — but not without painful detours. If your team is small, your internet is flaky (yes, India-specific life), and people switch laptops every six months, here’s a practical take on what Nix actually buys you and how to adopt it without breaking onboarding.

Why we chose Nix (the real benefits)
- Bit-for-bit reproducible dev shells. A checked-in Nix expression meant everyone had the same compiler, same libpng, same Python binary. No more “it failed because you updated X”.
- Reproducible CI that matched developers. CI pulled the same closure from the cache, so builds that passed locally passed in CI.
- Precise dependency control for native builds. We could pin glibc, OpenSSL, and system libraries — this solved differences between our Mac-heavy engineering laptops and Linux CI.
- Disk hygiene: Nix GC made it easy to remove cruft from dev machines without deleting the system Python or breaking other projects.

A very India-relevant upside: binary caches saved data. Instead of everyone re-downloading huge Node toolchains or native build deps every time, we used a shared cache and CI artifacts. For engineers on 4G or patchy home broadband, that made a noticeable difference.

What realistically broke (and why I almost rolled it back)
- Steep onboarding cliff. Installing Nix and teaching team members the mental model (derivations, closures, profiles) took time. New hires spent a day just understanding how to enter a shell and where to run tests.
- Long cold installs. The first time Nix pulled the closure without a cache, the machine chewed through hours and a fragile home connection. That hurts morale.
- Tooling mismatch. GUI toolchains (Android Studio, some Electron apps) didn’t always play nicely. Packaging those in Nix required extra work and wasn’t always worth it.
- Occasional surprise rebuilds. A small change in a pinned dependency could force rebuilds that cascaded. We learned to pin aggressively and keep updates scheduled.
- Cognitive overhead for maintainers. Someone has to maintain the Nix files; for a tiny team this is non-trivial overhead. After six months, our primary maintainer had a backlog of updates to nixpkgs pins and binary cache configuration.

How we introduced Nix without detonating the team
1) Start narrow: dev shells only. We added a default.nix that provided compilers, node, python and build tools for a single service. No flake, no system-wide switch. The command was simple: nix develop or direnv + nix-direnv for automatic shells. That gave immediate wins without teaching everyone's whole computer to be Nix-aware.
2) Add a binary cache early. We used Cachix (free for open-source) and a private cache for internal artifacts. Binary caches turned that painful cold install into a 2–5 minute setup for most engineers — indispensable when bandwidth is a constraint.
3) Keep CI as a first-class citizen. CI pulled from the same binary cache. We added a GitHub Action step to build and push binaries on PR merge. That reduced odd, environment-specific CI failures to near-zero.
4) Pin everything. We pinned nixpkgs using a lockfile (or a channel URL) and updated it on a weekly cadence. Unpinned builds were the biggest source of surprise rebuilds.
5) Document the simple flows. Two commands: one to enter the dev shell, another to run tests. Keep the README explicit. Leave advanced Nix patterns for a separate doc.
6) Know when to stop. For GUI-heavy tooling, we accepted that people would install Android Studio outside Nix and we used Nix only for reproducible CLI and build deps.

Practical commands we actually used
- Enter dev shell: nix develop
- Build & cache in CI: nix build --impure --file .#myPackage && cachix push our-cache /nix/store/...
(You don’t need to memorize them — pin a script: scripts/dev.sh to hide the complexity.)

When Nix is worth it (my take)
- Adopt Nix if: you have cross-platform differences (macOS vs Linux), native build dependencies, frequent “it works on my laptop” bugs, and enough engineering bandwidth to maintain Nix expressions.
- Skip or delay Nix if: your project is a single-language web app with no native deps, your team is <3 people with zero bandwidth to maintain tooling, or you ship mainly mobile apps where IDEs dominate.

Two final tradeoffs to accept
- You trade time for stability. Early on, expect lost hours learning and configuring Nix. You buy fewer debugging hours later, but not for free.
- Someone needs to be the Nix shepherd. That role doesn’t have to be full-time, but without a maintainer you’ll accumulate cruft (outdated pins, broken caches, confusing docs).

If I had to do it again, I’d be even more conservative: start with dev shells, push binary caches first, and automate pin updates via a scheduled job. Nix is not a silver bullet, but for our startup it stopped two-week debugging sprints and made feature branches reliable again — and in India, where downloads and laptops are often limited resources, those reliability wins pay back quickly.

If you want, I can share a minimal default.nix example we used for a Node + Python repo and a sample GitHub Action to push to Cachix. It’s the small scaffolding that turned Nix from “a curiosity” into “something we rely on.”