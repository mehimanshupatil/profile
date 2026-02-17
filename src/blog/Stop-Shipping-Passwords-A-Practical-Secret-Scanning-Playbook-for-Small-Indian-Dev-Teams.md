---
title: "Stop Shipping Passwords: A Practical Secret Scanning Playbook for Small Indian Dev Teams"
pubDate: 2026-02-17
description: "A hands-on, low-cost playbook to find and stop secrets in your repos—practical steps, tooling choices, and the tradeoffs small Indian teams should know."
author: "Devika Iyer"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=2000&q=80"
  alt: "A developer's laptop screen showing code and a terminal on a wooden desk"
  caption: "Image credit: Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/photos/1515879218367-8466d910aaa4"
tags: ["security", "developer tools", "devops"]
---

If you’ve ever typed an API key into a quick test file, committed it, and felt the stomach drop an hour later when you remembered—welcome to the club. Small teams and startups in India (and everywhere) ship secrets by accident. The difference between a minor nuisance and a serious incident is whether you catch those mistakes early—and how you respond when you do.

This is a practical, low-friction secret scanning playbook I’ve used on two small product teams. It assumes limited budget and a desire to avoid creating endless developer friction. The main goal: stop new secrets from landing in repos, detect old ones, and make cleanup tolerable.

Why "secret scanning" matters (and where it often fails)
- A public leak (or code shared with a contractor) can expose cloud keys, DB credentials, or payment gateway secrets. Remediation quickly becomes expensive.
- Built-in paid solutions from GitHub/GitLab are great but costly for smaller orgs and don’t help private repos in cheap hosting scenarios.
- Teams either rely on manual reviews (fragile) or buy enterprise tooling—there’s a gap for lightweight, pragmatic setups. Enter secret scanning.

Core principles I follow
1. Prevent first, detect second. Stopping commits early saves the most pain.  
2. Keep developer flow smooth. Blockers must be fast and explain how to fix an issue.  
3. Rotate keys aggressively. If a secret is found, treat it as compromised by default.  
4. Accept some noise; tune rules over time.

Concrete playbook (what to do this week)

1) Inventory and quick wins (1–2 days)
- List places keys live today: cloud consoles (AWS/GCP/Azure), CI, config repos, S3 buckets, third‑party dashboards. Prioritize high-impact credentials (production cloud keys, payment gateways).
- Immediately rotate any keys you find in public or shared places. Treat history-exposed keys as compromised.

2) Add pre-commit secret scanning (low-friction, local)
- Use a pre-commit hook that runs a fast scanner like detect-secrets or gitleaks locally. These are free, run fast, and discourage mistakes before they reach CI.
- Configure the hook to fail locally for obvious matches (e.g., AWS secret patterns) but warn for fuzzy matches. Developers appreciate fail-fast for clear problems and warnings for potential false positives.

3) CI scanning that blocks merges
- Add a CI job that runs a stricter scanner (gitleaks, truffleHog) across the pushed ref. Make it a hard block on main branches.
- To reduce friction, run the CI scan in parallel and return a clear explanation with line snippets and remediation steps (how to remove the secret, rotate keys, and purge history).

4) Scan repo history monthly
- Add a scheduled job that scans repository history for older leaks. This catches secrets committed and later removed—but still present in history.
- If a secret is found in history, plan a cleanup using git filter-repo or BFG, then rotate the exposed secret. Don’t skip rotation: history rewrite without rotation keeps you vulnerable.

5) Integrate alerts with your workflow
- Send CI findings to a dedicated Slack channel or email with standardized templates: what was found, where, and immediate next steps (rotate + remove + history purge).
- For small teams, a single human (on-call lead or dev owner) should triage scans to avoid alert fatigue.

6) Make secret authorship and policy obvious
- Add a CONTRIBUTING.md short section: “Do not commit secrets. Use environment variables and vaults.”
- Provide easy, local dev patterns: .env.example, and a small script to fetch dev creds from a safe place (or mock credentials for local testing).

Tools and costs
- Free/low-cost: detect-secrets (Mozilla), gitleaks, truffleHog, pre-commit framework. They work well for GitHub/GitLab on free tiers.
- Paid but optional: GitHub Advanced Security, commercial SAST vendors if you need enterprise-grade correlation and central reporting.
- For secret storage, start with free-tier HashiCorp Vault, Doppler (paid tiers), or a simple encrypted S3/KeyStore pattern depending on budget.

Tradeoffs and realistic downsides
- False positives will happen. Regex-based secret scanning flags many false alarms (base64 strings, tokens in test data). Plan time to tune allowlists and educate devs; otherwise confidence in scans erodes.
- History rewrites are awkward. Purging old secrets is disruptive—force-pushing rewritten history affects forks and open PRs. Reserve history rewrite for true compromises.
- Scanners don’t replace good architecture. Over-reliance on scanning can let bad patterns persist (hardcoding for speed). Use scanning as a safety net, not a crutch.

A short checklist to implement this month
- [ ] Add detect-secrets + pre-commit and share setup instructions in README.
- [ ] Add a CI job running gitleaks that blocks merges into main.
- [ ] Schedule monthly repo-history scans and assign an owner to triage findings.
- [ ] Create a standard incident play: rotate, purge history (if necessary), notify stakeholders.
- [ ] Replace any remaining env-stored secrets in production with a managed secret store or CI secret variables.

Final thoughts
Secret scanning is not glamorous, but done right it saves time, money, and sleepless nights. For small Indian teams where budgets and attention are limited, the sweet spot is inexpensive open-source scanners, developer-first pre-commit hooks, and a short, well-practiced incident playbook. Expect friction at first—false positives, a few annoyed devs—but if you balance prevention with pragmatic detection, you’ll dramatically reduce the “oh no” moments that cost far more than a little tuning and discipline.

Treat this playbook as an evolving team habit: start small, measure how many secrets you stop or find, and tighten rules only as the team grows. If you want, I can share a sample pre-commit config and a CI job snippet tuned for minimal false positives.