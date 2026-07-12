---
title: "Why I Stopped Using git stash (and the single rule that saved my mornings)"
pubDate: 2026-07-12
description: "I ditched git stash for a simple rule: if a context switch takes >15 minutes, make a WIP commit (locally or to a private remote) and use git worktrees. Practical steps, failures, and the ₹300 VPS trick."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop angled on a wooden desk showing a code editor and terminal on screen"
  caption: "Photo by Brian McGowan on Unsplash"
  creditUrl: "https://unsplash.com/@brianmcgowan"
tags: ["git", "developer-workflow", "tools"]
---

It was 9:12 AM, my manager pinged that payments had started failing on master and I had to switch branches right now. I did what I’d always done: git stash, checkout master, fix, run tests, checkout back, git stash pop.

Except this time pop failed with conflicts. I resolved two files, built, and pushed. An hour later I noticed a missing log statement I’d added before stashing. The stash had quietly dropped a file. I spent another 40 minutes piecing together fragments from editor undo, bash history, and the gh CLI. I was late for lunch and extra apologetic in a Bengaluru Slack channel I didn’t even own.

That was the last time I treated git stash like a safety net.

Why stash kept failing me

Stash is great for tiny, throwaway changes. But it has several qualities that make it fragile in day-to-day multitasking:

- It’s ephemeral by default. Stashes sit on a stack and are easy to forget or accidentally drop.
- Pop applies and deletes, so a conflict during pop can cause data loss if you panic and run a drop.
- It doesn’t play well with frequent context switches or long interruptions (meetings, power outage, low mobile data).
- In our office with intermittent Wi‑Fi and frequent branch-switching for hotfixes, stash often felt like a temporary bandage that became permanent technical debt.

One rule that fixed it

I replaced stash with one rule: if switching contexts will take more than 15 minutes, make a WIP commit instead of stashing. And if I can’t push to origin quickly (slow office Wi‑Fi, on mobile data), I push the WIP to a private bare repo on a cheap VPS I control (₹300–₹400/month). The mechanics are basic, but the discipline matters.

Why this works:
- Commits are durable and visible in the reflog; you can always find them.
- Worktrees keep multiple checkouts on disk so switching branches is instant and local.
- A private remote (not the team repo) lets me push small WIP snapshots without cluttering shared history or waiting on CI.
- Pushing to my VPS when I find a decent connection replaces the fragile “I’ll stash and push later” promise.

How I actually do it (short, practical)

1) Small change (<15 minutes): stash is fine. Quick experiment, throwaway tweak.
2) Bigger change (>15 minutes) or interrupted work: commit locally to a WIP branch.

Commands I use as aliases:
- Create a WIP commit: git add -A && git commit -m "WIP: feature-x — <short note>"
- Create a worktree for a branch: git worktree add ../feature-x feature-x
  - This keeps my feature checkout separate; no more “I’m on master, oh wait not really.”
- If I want remote safety but don’t want to touch origin, push to my private bare repo:
  - git remote add wip ssh://me@myvps/~/repos/project.git
  - git push wip HEAD:refs/heads/wip/arjun/feature-x

My VPS is just a ₹300/month small droplet. It’s private, SSH-only, and I prune old branches once a week. When I’m on mobile data, I avoid pushing; the local WIP commit + worktree is enough. When I reach home Wi‑Fi, I push and continue.

Two small conventions that saved me more time than I expected:
- WIP commits start with "WIP:" and include a single-line note. It’s findable with git log --grep=WIP.
- I never rebase WIP branches. I squash them into a clean feature commit before merging.

The honest failure and tradeoffs

This doesn’t come without cost.

Once, in a hurry, I committed a secret API key into a WIP commit and pushed to my VPS. I realised within 30 minutes and had to rotate keys, update configs, and run a few fire-drills. That taught me three lessons: use .gitignore and commit hooks, never push secrets to any remote (private or not), and make a habit of scanning the diff before any push.

Another time, my office network was so slow that pushing even a 2MB WIP (lots of small binary files) cost precious mobile data. I’d switched to WIP commits thinking I’d push later — and then lost time when I had to share the state with a teammate. So I added a micro-rule: if work includes binaries >1MB, make a local WIP and copy the necessary files to a shared Google Drive or use rsync over my home network when I’m back.

Finally, there were days stash was indeed faster. For a five-line change, typing git stash is still quicker than thinking through branches. My rule is deliberately simple so I don’t over-engineer: stash for throwaway tweaks; commit for anything that matters.

Why this mattered in India

Two practical constraints pushed me to this workflow:
- Slow or metered internet (mobile data recharges of ₹200–₹300 still affect choices).
- Frequent, urgent context switches at small startups where hotfix + feature work collide.
Using local commits + worktrees meant less waiting for network, fewer lost edits during power cuts, and an easier audit trail when I had to explain "what changed" to a manager.

What I walked away with

I stopped treating stash as a safety net and started treating commits as the truth — temporary, explicit, and findable. That one small rule (15 minutes) cut my morning recovery time, prevented the “where did my changes go?” panic, and made collaboration less awkward when I had to hand off.

If you try this, be paranoid about secrets and set a small hygiene habit (pre-push diff review). That single tiny friction — looking at the diff before pushing — is what keeps the rest of the workflow safe.