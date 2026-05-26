---
title: "Why I replaced nvm with asdf for repo-wide runtime pinning — and the day it broke CI"
pubDate: 2026-05-26
description: "I swapped nvm for asdf to pin Node, Python, and Go per repo. It made on-boarding painless — until a release day CI failure forced a messy rollback and a better migration checklist."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk showing code on the screen, with a cup of coffee and notebook nearby"
  caption: "Photo by Andrew Neel on Unsplash"
  creditUrl: "https://unsplash.com/@andrew_neel"
tags: ["developer-tools", "nodejs", "workflow"]
---

It was 9:13 a.m. on release day. The pipeline had been green for two hours; we cut the tag; the production deploy hung at the build step with a cryptic error from an npm script that had worked all week locally. The last commit changed exactly one file: .tool-versions. Someone on the team had swapped us from nvm to asdf to "standardize runtimes". It worked locally for them. It did not work for the CI runner.

We had been bumping our heads against runtime drift for months. Different contributors (Mac, Ubuntu, WSL) and the CI image were all running different Node, Python, and Go patch levels. Debugging environment differences cost me and a couple of juniors at least one afternoon a week. Onboarding a new hire meant a 90‑minute session of nvm, pyenv, brew, PATH fiddling and "does npm install hang for you?" That felt stupid for a product company paying market salaries in Bengaluru.

Why this started

nvm is simple and great for single-developer workflows. But it’s a shell-only thing. It lives in ~/.nvm and depends on someone running the right shell init. Our monorepo has Node apps, a Python worker, and a small Go tool. We wanted one file checked into the repo that declares exact versions for each runtime so:

- new devs can run a single command and be ready,
- CI uses the same versions as local machines,
- and accidental local “works-for-me” issues stop showing up as production bugs.

asdf looked like the pragmatic answer. It can manage multiple runtimes through plugins and uses a single .tool-versions file at repo root. It has shims. The team liked that we could add Python 3.10.8, nodejs 18.16.0, and go 1.21.5 in one place.

How I actually rolled it out

I did a minimal, pragmatic migration instead of sweeping change.

1) Add .tool-versions to the repo with the versions we wanted.
2) Ask devs to install asdf (link in README) — one command with a curl script plus the shell init.
3) Teach one-liner: asdf install && asdf reshim.
4) CI change: in GitHub Actions we added a small step early in the job to install asdf (scripted), run asdf plugin-add for nodejs/python/go, then asdf install. We also cached ~/.asdf/installs between runs.

The first week was lovely. A new intern cloned the repo, ran asdf install and their first "npm ci && yarn build" worked. No more "oh you're on Node 16". Code that previously failed silently on older pip packages started failing fast and predictably. Pull requests had consistent test results.

Where it broke, honestly

Release day taught me humility.

Two things went wrong at once.

First, the asdf shim changes how global packages and binaries resolve. We previously relied on a system-installed yarn on CI and some global npm packages to be present. After switching to asdf, the shims pointed to the per‑version node, which in turn used a different npm global path. An npm global script we invoked in the release pipeline couldn't be found — the build failed. It was a simple PATH/npm prefix mismatch, but the error message was unhelpful and the pipeline happened during the release window. We rolled back the CI change and pushed two hotfix commits to restore the previous CI image.

Second, the asdf install step added 3–6 minutes to cold CI runs. That felt small until you multiply by 50 CI runs a day. Our CI minutes are not free; at our scale it was a real cost in developer time and queue delays. We also found the asdf shims added tiny overhead to many quick node invocations in the monorepo: 200 tiny npm scripts took an extra 200–500 ms each. Not critical, but annoying.

What I changed after the failure

I kept asdf. But I rewired the migration with explicit guardrails:

- Migration checklist: before touching CI, we audited any step that used global binaries. We replaced global deps with local devDependencies or dockerized one-off tools. That prevented the PATH mismatch.
- CI caching: instead of installing asdf from scratch on every run, we baked a base Docker image with asdf and our pinned runtimes (monthlies on a ₹300 VPS image cache during migration), pushed to our internal registry, and used that as the CI worker image. Cold runs dropped back under a minute.
- Explicit npm config: add an .npmrc that sets prefix and a postinstall script to ensure binaries go to node_modules/.bin when appropriate. This avoided relying on npm global paths entirely.
- Fast fallback: the repo README now includes a single "fallback" section — if you can't install asdf, use NVM with the exact node version from .tool-versions. This saved people on constrained machines (my cousin in a tier‑2 city on a cheap laptop with intermittent power) from getting blocked.

The tradeoffs I didn't sugarcoat

- asdf is slower than nvm for switching versions because of shims and plugin complexity. For single-runtime projects, nvm may still be faster and simpler.
- Plugin maintenance is real. We had to pin plugin revisions and occasionally patch the build pack for nodejs to use our internal mirrors for tarballs (India internet + corporate proxy = flaky downloads).
- There's a cognitive cost: new hires need to learn "what asdf does" and why we keep .tool-versions. It's a one-time cost but it exists.

What I walked away with

Pinning runtimes in one repo file was worth the pain. The best part wasn't asdf itself — it was having a single source of truth and making CI reflect the same environment. The hard lesson: tooling changes need a migration checklist that includes "what global binaries will break" and "how will CI be warmed/cached". If you don't ask those two questions, you'll ship a very educational release.

I still don't expect asdf to be perfect. But when the team can clone, asdf install, and be productive in 10 minutes, that's a predictable win that pays back in fewer "works on my machine" mornings. My open question: how much of this becomes unnecessary once package managers like npm and Python tools make per-project runtime activation first-class? For now, we live with shims and a better checklist.