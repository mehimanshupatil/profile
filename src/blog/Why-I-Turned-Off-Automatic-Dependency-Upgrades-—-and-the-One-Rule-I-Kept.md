---
title: "Why I Turned Off Automatic Dependency Upgrades — and the One Rule I Kept"
pubDate: 2026-04-28
description: "I shut down auto-merging dependency PRs after a midnight outage. Here’s the precise workflow I replaced it with, the failure I didn't anticipate, and the one automation I still trust."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk showing a code editor and terminal windows"
  caption: "Photo by Sven Mieke on Unsplash"
  creditUrl: "https://unsplash.com/@svenmieke"
tags: ["developer-tools", "devops", "software-engineering"]
---

It was 2:15 a.m. when I woke up to a Slack thread full of failed payment logs and a terse DM: "Are we rolling something?" Our small payments service had a burst of 500-ms timeouts, then errors: checksum mismatches while calling a third‑party adapter. The stack traces pointed to a tiny utility library we’d automatically upgraded the night before.

We were running Renovate with auto‑merge on minor and patch bumps. It saved me a few routine PRs and, at 2 a.m., it also shipped a breaking transitive change from a dependency that changed a function signature (semver lie). Tests had passed in CI because our suite mocked the adapter. Production hit an edge case that CI didn’t cover. I spent the weekend tracing, hot‑fixing, and rebuilding trust with the client. That was the finish line: I flipped the switch and turned automatic merges off.

What I was defending against
Automatic dependency upgrades are attractive for small teams. They reduce busywork, keep things current, and close security holes quickly. But they also introduce three practical problems I’d underestimated:

- Semver is not a promise. Libraries sometimes release non‑backwards changes inside minor/patch versions.
- CI ≠ production. Our tests mocked the network/timing realities Indian payments systems expose — slow banks, intermittent retries, and timeouts that only show up with real traffic.
- Speed hides responsibility. With auto‑merge, I stopped reading changelogs. That felt efficient — until it wasn’t.

Turning off automerge felt reactionary. It was, but it forced us to be deliberate.

The new workflow (exact, copyable)
I didn't go back to manual PRs and no automation. I wanted the noise turned down and the safety turned up. Here’s the workflow I implemented and have kept for a year:

1) Keep bots, stop auto‑merge
- Renovate (or Dependabot) still opens PRs. I disabled any auto‑merge policy. The PRs become notifications, not automatic deployments.

2) Two-tier policy for merges
- Patch-level security fixes: auto‑merge allowed only if a tiny smoke suite passes (see next point).
- Everything else (minor/major): manual approval after checklist.

3) The smoke suite
- A GitHub Action runs a focused set of tests on upgrade PRs: a tiny local end‑to‑end against a real containerized instance (no mocks), one payment flow using a test Razorpay sandbox key and a mocked bank response that simulates a slow connection, and a basic latency check. If the smoke suite fails, the PR is blocked.
- These checks run in parallel and complete in under five minutes.

4) Changelog gate and "why this matters" PR template
- The PR template requires a one‑line summary of the change from the maintainer or the person merging (link to changelog, breaking notes, and a risk level).
- If the changelog contains "breaking" or "removed", the PR must be flagged for a short review by the on‑call backend owner.

5) Weekly dependency review meeting (15 minutes)
- We batch non‑urgent upgrades and review them on Fridays. Small teams can handle 10–15 dependency PRs this way.

6) One automation I kept: security alerts + auto‑patch for critical CVEs
- For CVEs with a CVSS above our threshold, we still allow auto‑merge, but only if the smoke suite passes and the patch is a direct dependency. Transitive auto‑patches are blocked and routed to the on‑call list.

Where this approach bit me (the honest failure)
A month after switching off auto‑merge entirely for a period, I got sloppy. We treated dependency updates as "non‑urgent" and missed a critical OpenSSL backport that affected an internal client library. Because no bot had auto-merged it, our library stayed vulnerable for two weeks. We had to do a hot patch, coordinate with three clients, and take a Saturday to push updates. That failure taught me not to swing the pendulum too far toward manual. Automation needs boundaries, not full removal.

Tradeoffs you should expect
- Speed vs. safety: Merges take longer. For our tiny startup that meant slower minor feature rollouts twice a week. I accepted that.
- Cognitive load: Someone has to read changelogs. The 15‑minute weekly review turned out to be less costly than emergency weekend work, but it’s still scheduled time.
- Infrastructure: The smoke suite needs a small bite out of CI minutes. In India, where cloud CI credits are tight, this cost mattered — we capped smoke builds to run only on renovate PRs and used small self‑hosted runners for the heavy parts.

Why this works in practice
We reduced weekend pagers to almost zero. Production issues caused by surprise dependency changes dropped to near‑zero. Developers spent ten extra minutes per upgrade PR reading changelogs and writing the one‑line risk note. That discipline changed our culture: we stopped treating dependencies as "someone else's problem."

One takeaway
Turn off blind auto‑merge. Keep the bot for PR creation and security noise — but require minimal, automated, real‑world smoke tests plus a human check for anything beyond a trivial patch. It costs a few developer minutes each week and saves you a messy midnight. That tradeoff fits a small Indian product team: we pay in scheduled time, not in scrambled weekends.