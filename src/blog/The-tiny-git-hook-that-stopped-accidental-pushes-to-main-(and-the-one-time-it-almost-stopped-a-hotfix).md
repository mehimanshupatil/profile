---
title: "The tiny git hook that stopped accidental pushes to main (and the one time it almost stopped a hotfix)"
pubDate: 2026-06-15
description: "How a simple pre-push branch-name check saved my team from accidental master pushes, how we rolled it out across a Bengaluru startup, and the one real failure that changed the rule."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop keyboard with a coffee cup nearby on a desk"
  caption: "Photo by Christopher Gower on Unsplash"
  creditUrl: "https://unsplash.com/@christophergower"
tags: ["developer-workflow", "git", "developer-tools"]
---

It was a Friday at 10:30 pm. We were merging a critical hotfix and the page was still red. I was juggling Slack threads, our on-call runbook, and a terminal where I meant to push a hotfix branch. Instead I typed git push origin master — a muscle-memory slip after a week of fast small fixes. The CI pipeline ran. The deploy went out. We were lucky: the change was harmless. I wasn’t always going to be.

That week I shipped a tiny rule and a 20-line pre-push script that stopped those slips cold. No satellite products, no expensive audits — just a pragmatic guardrail that cost us one evening of grief to design and still saved hours later. Here’s exactly what I did, why it worked, and the one time it nearly prevented a real emergency.

What I needed: a single, obvious rule
We had two recurring mistakes:

- People pushed work directly to main/master out of habit.
- Branch names were inconsistent — sometimes feature/JIRA-123, sometimes fix/123, sometimes just hotfix.

I wanted one simple constraint that was impossible to ignore but trivial to comply with. The rule I chose:

- You cannot push to main/master from a local branch whose name does not start with one of these prefixes: feature/, fix/, hotfix/, chore/, docs/.

That’s it. No linters, no commit-msg enforcement, no blocking developers inside a GUI. If you try to push a branch like my accidental master or a name without a prefix, the pre-push hook rejects it with a clear error and an example: git checkout hotfix/JIRA-321 && git push origin hotfix/JIRA-321.

The script (short, POSIX shell) did three things:
- Read $GIT_BRANCH or parse HEAD to get the current branch.
- Check against a small whitelist of allowed prefixes.
- Return non-zero if the branch didn’t match, printing the policy and the quick-fix commands.

How we pushed it without starting a revolt
Rules without adoption are noise. I followed three pragmatic steps:

1) Ship a shared server-side safeguard first. We added a server-side hook on our Git host that rejected pushes to main unless the ref being pushed originated from a branch with an allowed prefix. That made the rule effective even if someone didn’t have client hooks installed.

2) Make the client hook trivial to install. I added the script to repo/.githooks and a one-liner to our README: git config core.hooksPath .githooks. New devs get it automatically when they follow the repo README. We added the same line to our dotfiles for people who like seamless setups.

3) Give an exception path and educate. We documented how to do emergency bypasses: push --no-verify is allowed but requires a one-line Slack message in #oncall and a postmortem within 24 hours. That reduces people using bypass as a shortcut and keeps accountability.

The surprising benefits I didn't expect
- The team stopped naming branches randomly. Branch names became meaningful: feature/JIRA-205-login, hotfix/JIRA-321-504. That made PR titles and changelogs clearer and reviews faster.
- CI and permission rules got easier. Our automation could infer intent (hotfix vs feature) and apply different pipelines.
- On-call stress dropped. With the server-side safeguard, accidental main pushes became rare enough that Friday-night deploys felt less like Russian roulette.

The one time it failed — and why that mattered
Three weeks after rollout, at 2:10 am, a production cache layer started failing. I had the hotfix branch checked out locally on my laptop, but the pre-push hook rejected my push because my branch name included a slash-replacement I’d been experimenting with on Windows (hotfix\JIRA-999 — yes, inconsistent). I tried to bypass with --no-verify, but CI blocked the server-side check because our Git host's hook relied on ref metadata that wasn't present for that particular backup mirror replication.

Result: I couldn’t push from my laptop. I had to quickly SSH into a tiny cloud VM, clone the repo, create hotfix/JIRA-999 properly, cherry-pick the commit, and push. It cost me 25 minutes — precious in an incident. I was furious at the hook at 3 am. But stepping back, that failure taught three important constraints:

- Hooks must be tested across client OSes and name-encoding differences (Windows backslashes are a real thing).
- Server-side enforcement is essential, but it must be robust to mirrors and replication quirks.
- There must be a clear, audited emergency bypass that works across environments. Our --no-verify + Slack rule was fine for accountability but not resilient enough for all edge cases.

So I changed the script: normalize branch names for cross-platform encodings, add a tiny diagnostic message that prints what refs the server-side hook received, and document the cloud-VM contingency in the on-call runbook. Those 30 lines prevented the next late-night rework.

Tradeoffs worth accepting
- Developers occasionally grumble about an extra keystep. Fair. The cost is real for a tiny team pushing urgent fixes from a GUI client that ignores hooks. But the alternative — a single bad push — is often costlier.
- The policy nudges you toward disciplined branch names. That’s a culture change, not a technical one. It forced us to commit to Jira-linked branches; teams that don’t use ticketing will find it annoying.
- It won’t stop malicious actors. Hooks are convenience and discipline, not security. Server-side protection and Git host permissions are still required.

What actually changed for us
We reduced accidental pushes to main to near-zero. Our Friday-night blunders stopped. PR descriptions got better because branches were self-documenting. On-call escalations were shorter because the automation could tell a hotfix from a long-lived feature. And importantly: the team learned to treat the git client as part of our ops safety net, not a personal playground.

One takeaway
If you’re tired of “sorry, wrong branch” panic pushes, a small, well-documented branch-name guard — server-side backed and with a sane bypass — will buy you quiet nights. It’s tiny to implement (a few dozen lines of shell) and expensive to ignore when you actually need calm, reliable deploys.

I still keep that one-line emergency cloud-VM recipe in the runbook. It’s the true insurance that made the rule usable in the real world.