---
title: "Developer onboarding that actually works: my 1‑hour provisioning playbook"
pubDate: 2026-02-06
description: "A practical, India‑aware playbook to get new engineers productive in a day: a one‑hour provisioning script, a Day‑0 checklist, and the tradeoffs I learned the hard way."
author: "Rohan Deshpande"
image:
  url: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&h=1000&w=2000"
  alt: "Open laptop on a wooden desk with a coffee cup and notepad, representing a developer workspace"
  caption: "Image credit: Pexels / Burst"
  creditUrl: "https://www.pexels.com/photo/black-laptop-computer-1181671/"
tags: ["developer onboarding", "dev productivity", "engineering"]
---

When a new hire joins, the first 48 hours often tell you more about your company than the interview ever did. Are they staring at a blank IDE and waiting for a senior engineer to babysit installs? Or are they writing their first PR on day one? For the teams I've helped scale in India, the difference was almost entirely process: developer onboarding.

I used to accept a week of hand-holding as inevitable. Then I tracked the time: each stalled hire cost senior engineers ~12 hours of context switching and at least one blocked feature. We built a small, opinionated repo and a one‑hour provisioning script. It didn't remove all problems, but it cut new‑hire time‑to‑first‑PR from five days to one in most cases. Here’s the approach that paid for itself within three hires.

Start with a Day‑0 checklist (people first)
- Hardware and courier: confirm delivery date and whether corporate MDM will be preinstalled. In India, courier times and MDM approvals are real constraints—plan a buffer.
- Accounts: SSO access, GitHub/ GitLab, Slack, JIRA, cloud console, payroll/email. Request these 72 hours before the start date and make someone responsible.
- Expectations: a tiny welcome doc listing "your first 90 minutes" tasks — join Slack, accept invites, run the provisioning script.

The repo: make onboarding a product
Create a single repo (call it onboarding) with:
- README: the What & Why, not a wall of commands.
- scripts/: idempotent shell scripts named 01-system, 02-packages, 03-dotfiles, 04-repos, 05-seed. Each script should be safe to re-run.
- dotfiles/: opinionated editor + terminal config.
- infra/: prebuilt dev container image (optional), seeds for local DBs, and a small helper to restore sample data.

Keep it OS-aware. We supported macOS and Ubuntu WSL in our team; Windows native machines used preconfigured WSL images. If you have many managed Windows laptops with MDM, the script can fall back to a cloud workspace (codespace or a small VPS).

What the one‑hour script does (practical checklist)
1. Validate prerequisites (admin rights, disk space, network).
2. Install package manager (Homebrew / apt / choco) and core tools: git, asdf (for runtimes), Docker, jq, gh, and a terminal.
3. Configure SSH keys and push the pubkey to a scoped company repo (or guide to add via SSO).
4. Clone the company's skeleton repos and run a seed script that populates a local database snapshot.
5. Apply dotfiles and editor extensions (defaults only—no heavy opinionation).
6. Run a smoke test: build a tiny example service and run its test.

A few implementation tips that saved us time
- Use asdf for predictable runtimes. It handles node/python/go versions better than ad‑hoc installs across dev machines.
- Keep secrets out: use sops or a developer-only vault for any credentials. Our script never exposes production keys.
- Prebuild a dev container image for the most common service—pushing a ready image to a container registry reduced local build times from 30m to 3m for some stacks.
- Make failures actionable. When a step fails, the script prints one command to fix it (no more guessing).
- Add a "first PR" task in the README: edit README.md, run tests, open a draft PR. Nothing beats an early win.

Measure the impact
We tracked two metrics: time to first successful test run, and the number of senior engineer interruptions in week one. Provisioning cut the median time to first test from ~28 hours (spread over the first three working days) to under 3 hours. Senior interruptions dropped by ~70% for each hire. That translated into real cost savings: in India, even one senior engineer hour saved per hire per week compounds fast.

Tradeoffs and real downsides
This is where people get evangelical—and wrong. A provisioning repo is not a replacement for human onboarding or documentation. Expect these downsides:
- Maintenance overhead: you now own scripts. Dependency updates, OS changes, and new packages need regular attention. Budget 2–4 hours/month for upkeep.
- Edge cases: corporate MDM, strict Windows policies, or flaky home networks in tier‑2 cities will still break the flow. Have a fallback: a prebuilt cloud dev image or a loaner laptop.
- Security review: scripts that generate credentials or push keys need an audit. Don't let "convenience" shortcut your secrets posture.

When automation isn't the right answer
If you hire one contractor a quarter, the ROI might not justify the work. This system works when you hire multiple engineers per year or want consistent ramp across distributed teams. Also, don't over‑automate: pushing every single preference into dotfiles makes devs feel boxed in. We keep defaults minimal and document how to opt into niceties.

A few practical next steps you can steal tomorrow
1. Create a minimal onboarding README and a tiny 01-validate script that just checks SSO and Git access.
2. Make a one‑line invite template that your hiring manager emails 72 hours before start.
3. Bake one reproducible smoke test a new hire can run and pass in 10 minutes.

Developer onboarding is an infrastructure problem dressed up as HR. Treat it like a product: small scope, measurable goals, and a preference for iterative improvements. Do that, and you'll not only save senior engineers time—you'll set new hires up to enjoy the job from day one.

If you want, I can share a small example repo layout and the minimal set of commands we used for macOS and Ubuntu WSL. It's not a silver bullet, but it's the fastest way I've seen to turn chaotic first days into productive ones.