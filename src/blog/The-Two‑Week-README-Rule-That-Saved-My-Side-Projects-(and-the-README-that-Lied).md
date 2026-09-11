---
title: "The Two‑Week README Rule That Saved My Side Projects (and the README that Lied)"
pubDate: 2026-09-11
description: "I force myself to write a usable README within two weeks of starting any side project — the exact rules, the template I actually use, and the one README that embarrassed me into discipline."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden desk with code on screen, a notebook and pen beside it"
  caption: "Photo by Kobu Agency on Unsplash"
  creditUrl: "https://unsplash.com/@kobuagency"
tags: ["developer-workflow", "documentation", "side-projects"]
---

It was 2 a.m., and I was trying to recover a side project I’d started eight months earlier. I had the repo open, a terminal, and the vague recollection that I’d once gotten this thing running “in five minutes.” I couldn’t find that five‑minute path. There were seven environment files spread across three folders, a half‑written deploy script, and a README that said two sentences: “This is a demo app. Run yarn && yarn start.”

I gave up, opened a new repo, and started again. Same mistakes two months later. Then, after a particularly painful client demo where I spent most of the call in a frantic console, I copied the old project into a private folder, deleted the README, and made myself a rule: no side project survives two weeks without a runnable README. If I couldn't document how to get it running in that window, I would delete the branch and either stop or rewrite with constraints.

This is the rule I keep. It’s ugly, it’s opinionated, and it’s saved me more time than I can measure.

Why two weeks
Two weeks is long enough to get a minimal prototype going and short enough that you still remember the assumptions you made. If you wait longer, the mental overhead of recovery multiplies: which database did I use? which cloud provider? which secrets were temporary? Two weeks collapses that overhead into a small, actionable task: write how to run it today.

The actual rule
1. Within 14 days of the first commit, write a README that gets a new machine from zero to running in five commands, with one demo command that shows the app working.
2. Keep the README honest and minimal: no feature lists, no long philosophy. Practical steps only.
3. Include exact values for test credentials, the smallest seed database, and a "last tested" date.
4. Commit the README before any "feature" merge. If I can’t explain how to run the feature, I don’t ship it.

What my READMEs actually contain
I keep a tiny template and paste it into every new repo. The template is three sections: Setup, Run, Demo. Each section is short. An example (condensed into text here) looks like:

- Setup: OS assumptions (I mention macOS/Linux), required tools with exact install commands (brew install node@16), and any global deps I refuse to depend on.
- Run: explicit sequence — create .env with these keys, run ./scripts/db-init, yarn install, yarn dev.
- Demo: a single curl or a single browser URL that proves the app works, plus test credentials: demo@example.com / demopass123.
- Troubleshooting: the two things that usually break on my machine (port 5432 in use, missing node version), with one-line fixes.
- Last tested: date and the OS.

I intentionally avoid exhaustive platform support. If my README says "works on Ubuntu 22.04 and macOS Ventura," a contributor on Windows knows not to waste an hour.

Why this is not “good documentation”
I’m not trying to produce a docs site or an academy course for my code. The goal is recovery speed. The README exists so that when I open a repo after three months, or hand it to someone on a quick demo laptop in a Bengaluru cafe with flaky Wi‑Fi, I can get to a working state without downloading 20GB of extraneous stuff.

Practical constraints I accept
- Minimalism over perfection. I will not write an install guide for every OS. I support the two platforms I use.
- I keep one seed DB that’s small. This means some features won’t behave identically to production — but for demos and development it's good enough.
- I commit to keeping the "demo command" working. If something breaks, I update the README and push it immediately before touching features again.

The time tradeoff that actually matters
Writing the README takes 20–45 minutes the first time. It slows down my momentum in week one. But it prevents the 2–4 hours of debugging and reconfiguration I used to do every time I returned to a project. For me, the math is trivial: 30 minutes now saves multiple hours later.

One honest failure
This rule saved me from many frustrating mornings. It also bit me once. I wrote a README and included a demo account with credentials. I tested the demo locally and pushed the repo public. A security researcher found the demo account, used it to log into a staging endpoint that accidentally had elevated permissions, and modified seed data. The fallout was small — I corrected the permissions and moved the repo private — but it was a hard lesson.

The failure changed the rule: never include real API keys, never run staging on a public URL without a firewall, and put a line in the README: "This repo has seed/demo accounts. Do not use in production." I still include demo credentials, but they are explicitly tagged, short‑lived, and I avoid any connection that could reach a production resource. That embarrassment made the rule safer.

How this fits Indian reality
In India, I rarely demo in perfect conditions. Client offices have strict proxies. Hotel Wi‑Fi coughs. My own mobile hotspot sometimes drops mid‑clone. A README that says “run yarn && yarn start” is a liability when yarn install tries to fetch a hundred packages over a meh connection. So I list the lightweight steps first: run a local sqlite DB instead of Postgres for demos, or run with --offline where possible. I also include a "bring‑your‑own" tip: if network is flaky, run ./scripts/serve-static to show the UI without backend connectivity. Small friction mitigations like these matter when bandwidth and patience are limited.

What changed in how I work
- I start every new repo with the README skeleton.
- I write the "demo command" before any feature.
- I refuse to merge features without updating the README if the setup changes.
- Every two months I scan older repos and delete the ones I can’t bring back in five minutes. Ruthless pruning keeps the list useful.

If you try one thing
Make the README a recovery script, not a manifesto. Ask yourself: what are the exact five commands I would run on a fresh laptop to see this run? Write them down. Test them on someone else's machine or a clean VM. If it works, you’ve reduced future friction massively.

Final takeaway
A README written early isn’t charity documentation for others — it’s an insurance policy for your future self. The two‑week deadline is arbitrary. It just needs to be short enough that you don't forget why you built the thing. My README rule is defensive programming for habits. It won’t make your project perfect. It will make it reliably resumable.