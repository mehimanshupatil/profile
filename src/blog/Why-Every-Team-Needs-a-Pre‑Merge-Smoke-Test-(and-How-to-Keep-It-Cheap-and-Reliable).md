---
title: "Why Every Team Needs a Pre‑Merge Smoke Test (and How to Keep It Cheap and Reliable)"
pubDate: 2026-02-10
description: "A practical guide to adding a lightweight pre-merge smoke test that catches obvious regressions, saves review time, and fits small Indian teams' budgets."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80"
  alt: "Developer at a laptop running tests — code editor and terminal visible on screen"
  caption: "Image credit: Mikael Kristenson / Unsplash"
  creditUrl: "https://unsplash.com/photos/1515879218367-8466d910aaa4"
tags: ["pre-merge smoke test", "developer workflow", "continuous integration"]
---

If your team treats pull requests like black boxes—open, wait, review, rerun CI, fix, repeat—you're paying in time, context switches, and reviewer frustration. For small engineering teams in India (or anywhere), the simplest guardrail that pays for itself in days is a pre-merge smoke test: a short, opinionated script that runs before a PR is merged to catch the obvious, prevent noisy rollbacks, and keep reviewers focused on intent instead of basic breakage.

I added a pre-merge smoke test to my last startup nine months ago. It doesn't catch every bug, but it cut flaky production rollbacks by half and saved reviewers hours a week. Here's the practical way to do it without blowing your CI minutes or adding a maintenance burden.

What a pre-merge smoke test should do (in practice)
- Be fast: target 60–180 seconds on a decent runner. If it takes 10 minutes, people will skip it.
- Be deterministic: avoid long, flaky end‑to‑end suites. Use stable checks that fail reliably for actual regressions.
- Focus on critical flows: authentication, main API endpoints, build+bundle success, and a quick integration with any external dependency that typically breaks merges.
- Be lightweight and scriptable so it runs locally, in CI, and in PR checks.

Typical contents (my real checklist)
- repo build: npm ci && npm run build (or mvn -DskipTests install)
- unit smoke: run a small tagged subset of unit tests or a fast test reporter
- start services: docker-compose up -d for local dev services (or run a lightweight in‑memory mode)
- API smoke: curl or a tiny HTTP test tool to verify 3–4 key endpoints (login, read a core resource, create/delete a resource)
- lint/typecheck: static checks that block obvious mistakes
- bundle sanity: filesize/bundle hash thresholds only if they matter

I call this script pre-merge-smoke.sh and keep it in /scripts. It returns non-zero on failure and prints an actionable message.

An example (conceptual)
- npm ci --silent
- npm run build --if-present
- npm run lint -- --max-warnings=0
- NODE_ENV=smoke docker-compose -f docker-smoke.yml up -d
- sleep 2
- ./scripts/api-checks.sh || { echo "API smoke failed: see logs"; exit 1; }
- docker-compose -f docker-smoke.yml down

Why this beats "run the whole CI"
- Faster feedback loop: engineers can run it locally in a minute before opening or updating a PR.
- Reviewers can require the smoke check to pass in PRs; they don't have to run the whole suite.
- It prevents obvious merge-time surprises like build failures, missing env config handling, or major API contract regressions.

Where teams get it wrong (and how I learned)
- Too big a scope. At first I included 150 unit tests and a full e2e run. CI time exploded and people ignored it. Shrink to the 10–20 highest‑value checks.
- Fragile external dependencies. We had a flaky third‑party service used in a smoke test. Solution: stub it locally or hit a cached test endpoint.
- False confidence. A green smoke test doesn't mean the release is bug-free. Make it explicit: "This prevents obvious breakage. It is not a substitute for thorough tests."

Cost and infrastructure tradeoffs — India context
Small teams are sensitive to CI minutes costs and latency. Two practical ways to keep costs low:
- Run the smoke test on self-hosted runners (a cheap VPS at ~₹300–₹800/month or an always-on office machine). It gives consistent environment and saves hosted CI minutes.
- Make the script runnable locally with minimal dependencies (e.g., docker-compose with a smaller smoke compose file). Encourage devs to run it before pushing.

Both approaches have tradeoffs. Self-hosted runners require maintenance and expose your infra to security risks if misconfigured. Local runs depend on developer machines being reasonably powerful. Pick one and accept the occasional overhead of updating the runner image or adding a note to the onboarding doc.

Enforcing a culture, not just a script
The script itself won't stick unless the team agrees to treat it as a norm:
- Make the smoke test a required status on PRs. Don’t make it optional if you want behaviour change.
- Keep it visible: failures should include clear logs and pointers to remediation.
- Review the list quarterly. As the app evolves, the useful checks change—update the script rather than adding more bloat.

A small, real-world caveat
After nine months we still had two production incidents that the smoke test missed—one was a rare race condition, the other an infra change that bypassed the smoke runner. Those taught me that a pre-merge smoke test reduces noise and catches the commons, but it doesn't replace good monitoring, canary deployments, or thoughtful post‑merge checks.

The practical rollout plan (a weekend playbook)
1. Inventory the critical flows (login, core read/write, build).
2. Draft a 10–step smoke script that runs in <=3 minutes.
3. Add it as a required check in your Git provider for protected branches.
4. Provide a self-hosted runner or a clear local path with a tiny docker-smoke compose.
5. Schedule maintenance: review and prune every 3 months.

If your team treats a green PR as a promise of stability, you've already lost. Treat a green pre-merge smoke test as a promise of "no obvious regressions"—and use it to make reviews smarter, not lazier. It's low effort, low cost, and for most small teams in India it buys back time and reduces embarrassing rollbacks. Try it for one month; if nothing else, you'll stop merging PRs that immediately fail the build.

Thanks for reading — if you want the basic script I use, ping me and I'll share a trimmed-down version you can drop into any repo.