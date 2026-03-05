---
title: "Why Trunk‑Based Development Is Actually Better for Small Indian Teams (and What You'll Sacrifice)"
pubDate: 2026-03-05
description: "A practical take on adopting trunk-based development for small Indian teams—how it speeds shipping, what infrastructure you need, and the tradeoffs to expect."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=2000&h=1000&fit=crop"
  alt: "Two developers looking at a laptop screen showing code, collaborating over a desk"
  caption: "Image credit: Brooke Cagle / Unsplash"
  creditUrl: "https://unsplash.com/photos/1498050108023-c5249f4df085"
tags: ["trunk-based development", "git", "software engineering"]
---

I switched my small product team from long‑lived feature branches to trunk‑based development two years ago. The result wasn't some magical productivity potion — it was a slower, steadier climb toward fewer merge headaches, faster feedback, and more frequent releases. If you work on a small Indian startup or as a freelance dev collaborating with others, trunk‑based development is worth a serious look. But it also demands discipline and a little upfront investment.

What I mean by trunk‑based development
- Keep one mainline (trunk) — usually main or trunk — and land small, frequent changes directly to it.
- Branches exist, but they are short‑lived: think minutes to a day, not weeks.
- Use feature flags, good CI, and quick review cycles so half‑finished work doesn't break production.

Why it felt like the right move for us
We were a 6‑person team with a mix of mid and junior devs, occasional contractors, and remote hours spanning multiple cities. Long‑lived branches meant painful merges, duplicated fixes, and late surprises in reviews. Moving to trunk‑based development forced us to break features into shippable slices and to keep the mainline always deployable.

Concrete wins we saw:
- Faster feedback loops: CI ran on every push to trunk, so bugs were caught within minutes instead of during a week‑long integration.
- Smaller, easier code reviews: PRs were focused and reviewable in 15–30 minutes. That made code review a regular habit rather than a herculean task.
- Easier rollbacks and less drift: Because everyone integrated often, environments and dependencies stayed aligned.

The infrastructure and habits that matter
Trunk‑based development isn't a silver bullet — it's a practice that needs supporting tooling and culture:
- Reliable CI that runs fast. If your CI takes 30+ minutes per push, the flow breaks. We trimmed test surface area, parallelised pipelines, and ran only targeted tests on short PRs.
- Feature flags. These let you merge incomplete work safely. Start simple: boolean flags guarded by config and a small cleanup policy.
- Trunk CI gating. We required green CI and at least one approving review before merges. That balances speed with safety.
- Short‑lived branches and clear PR naming. We allowed branches for tiny experiments, but they had auto‑delete and a 24‑hour TTL.

Tradeoffs and the hard parts (no sugarcoating)
- You trade isolation for integration speed. If your team isn’t disciplined about small commits, trunk becomes a mess. We had to enforce tiny PR sizes and fail fast on noisy commits.
- Feature flags add technical debt. We accumulated stale flags until we added a quarterly cleanup sprint. Without that, feature flags become the worst kind of entropy.
- Dependence on CI reliability. In India, where busy CI minutes and flaky network access are real concerns, a slow or broken CI is a productivity choke point. We budgeted for more build minutes and invested in a lightweight self‑hosted runner for common jobs to reduce cloud bill shocks.
- Onboarding complexity. New hires must learn the mental model of incremental delivery and flag usage. Expect the first 4–6 weeks to include repeated reminders and review cycles.

A simple playbook to try on a small team
1. Start with rules, not tooling: agree on PR size limits (e.g., <= 300 lines), TTL for branches, and one approving review.
2. Patch your CI: make quick wins — cache dependencies, run unit tests first, run slow integration tests nightly.
3. Introduce feature flags gradually. Begin with flags around risky endpoints or user‑visible UI changes.
4. Make trunk green sacred: merges must not break trunk. Use fast CI gating and clear rollback steps.
5. Schedule flag cleanups and a monthly “merge health” review so tech debt doesn't pile up.

India-specific considerations
- Data and CI costs: If your CI charges by minutes, trunk‑based development can increase push frequency. We reduced cost by running cheap self‑hosted runners (₹300–₹1,000/month VPS) for quick tasks and reserved cloud CI for heavy integrations.
- Timezones and async reviews: With distributed teams and contractors across Indian cities, keep PRs small so reviews fit into overlapping hours. Synchronous review binge sessions rarely work.
- Internet reliability: Encourage local dev caches (npm, pip mirrors) and let devs run minimal CI locally for quick verification. Pushing many tiny changes over flaky connections is painful otherwise.

When it doesn’t make sense
If your team lacks basic CI, can’t ship small increments (regulatory or other blockers), or expects up to a month of feature isolation, trunk‑based development will frustrate you. It’s not an org design that magically solves coordination problems; it magnifies the effects — good and bad — of your processes.

Final words
Trunk‑based development pushed us to discipline and paid dividends: fewer merge conflicts, clearer ship lanes, and a culture of rapid feedback. But it forced hard choices, like investing in CI, owning feature flag debt, and tightening PR hygiene. If you’re a small team in India trying to ship more reliably without hiring more people, give trunk‑based development a try — but plan for the infrastructure and cleanup work it demands. Do the groundwork, and it will repay you in calm releases and fewer late‑night merges.

If you want, I can share the exact CI pipeline tweaks we used to make short CI runs feasible on a budget.