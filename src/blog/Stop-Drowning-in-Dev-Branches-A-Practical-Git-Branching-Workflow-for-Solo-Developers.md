---
title: "Stop Drowning in Dev Branches: A Practical Git Branching Workflow for Solo Developers"
pubDate: 2025-11-28
description: "Tired of messy branches and merge chaos? A simple, practical git branching workflow for solo developers that keeps work small, safe, and easy to ship."
author: "Arjun Malhotra"
image:
  url: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1500"
  alt: "Developer typing on a laptop with branches sketched on paper beside it"
  caption: "Image credit: Pexels"
  creditUrl: "https://www.pexels.com/photo/1181671/"
tags: ["developer workflow", "git", "productivity"]
---

# When your git branches start looking like a jungle

You open your repo and see ten branches with names like feature/login-v2-final, fix/typo-again, and temp-experiment-isaac. Two of them were started three months ago. You can't remember what half of them do. Merging one makes another fail. Sound familiar?

Branch sprawl isn't just messy—it's a productivity leak. For solo developers, it's surprisingly easy to let branches accumulate because there's no one policing the workflow. The result: longer merge times, harder rollbacks, and a creeping fear of touching the main branch. I’ve been there. The good news: you don't need a complex branching model to be disciplined. A few practical rules and tiny habits make your git branching workflow predictable and calm.

## Why a deliberate git branching workflow matters (even solo)

Branches are how you isolate work, experiment, and keep main deployable. But isolation only helps when branches are short-lived and clearly named. Long-lived branches tend to diverge from main, creating merge conflicts and CI surprises. That slows you down more than the effort saved by postponing a merge.

A sustainable git branching workflow reduces cognitive load. When you know exactly what a branch represents, how it should be reviewed (even by yourself), and how long it should live, you can move faster. It also makes debugging simpler: bisecting, reverting, or cherry-picking become straightforward when your commit history is tidy.

A clean workflow also protects the habit of small, frequent shipping. Small changes are easier to test, easier to understand later, and less risky to roll back. For solo devs building features or running early-stage products, that safety is gold.

## A practical, minimal branching model for one-person teams

Here’s a lightweight model I use and recommend—it’s essentially trunk-based with tiny topic branches. It’s low overhead and scales well if you later join a team.

Rules:
- Keep main always deployable. Treat it like production-ready code.
- Create short-lived topic branches from main for any work longer than a single commit.
- Push early and often. Use pull requests locally (even if you're the only reviewer) or a simple branch checklist.
- Merge frequently—prefer rebasing small branches onto main and fast-forward merges when possible.
- Delete branches after merge and run a weekly cleanup.

Naming convention:
- feature/<short-description>
- fix/<ticket-or-short-description>
- chore/<tooling-or-doc>
- experiment/<short-descriptor>

Examples: feature/auth-oauth, fix/typo-landing, chore/setup-githooks

Why this works: names are readable at a glance, branches are scoped, and deletion keeps the branch list short.

## What actually happens during a typical task

Step through a real scenario so you can see the workflow in action.

1. Start from a clean main:
   - git checkout main
   - git pull origin main

2. Create a topic branch:
   - git checkout -b feature/payment-retries

3. Work in small commits. Aim for one logical idea per commit:
   - git add .
   - git commit -m "Add retries to payment client; use exponential backoff"

4. Push the branch early:
   - git push -u origin feature/payment-retries

5. Use a lightweight PR or draft merge request. Add a one-line description and run CI.

6. Rebase when main changes:
   - git fetch origin
   - git rebase origin/main

   Resolve any conflicts locally, run your tests, then push (force-with-lease if necessary).

7. Merge with a fast-forward or squash merge depending on your history preferences. Delete branch:
   - git checkout main
   - git pull origin main
   - git merge --ff-only feature/payment-retries
   - git push origin --delete feature/payment-retries

If you prefer a cleaner commit history, use squash merges via your remote UI. If you want full history, keep atomic commits and use fast-forward merges when possible.

## Quick wins to change your habits today

Small changes that yield big clarity:

- Start a "branching ritual": every new task gets a branch and a one-line description in the PR. This tiny discipline prevents a lot of confusion later.
- Use git hooks to run tests before commit. It reduces broken commits and makes `main` safer.
- Add a README/CONTRIBUTING in your repo describing your branching model. Even if you're solo, it becomes your memory aide.
- Run git remote prune origin weekly to remove deleted branches from your local view:
  - git fetch -p
- Create a few Git aliases to speed commands:
  - git config --global alias.lg "log --oneline --graph --decorate --all"
  - git config --global alias.cm "commit -m"
- Cleanup old branches automatically with a script that lists merged remote branches older than X days. Small automation keeps the branch list readable.

These quick wins make the workflow visible and enforce small, helpful constraints without slowing you down.

## Mistakes people don't notice (and how to fix them)

- Letting experiments live on main as commits: If it’s experimental, use an experiment branch. Reverting experimental commits on main creates noise and risk.
- Waiting to merge until the feature is "perfect": Long-lived branches diverge. Break work into smaller milestones and merge incrementally.
- Not documenting intent in branch names or PRs: A branch name and one-line description save future-you hours when revisiting code.
- Using merge commits by default: They’re fine in collaborative projects, but for solo devs, fast-forward or squash merges keep history simpler.
- Never deleting merged branches: A crowded branch list tempts you to reuse names or causes confusion. Delete merged branches immediately.

Fix these and you'll feel the difference—less time untangling git history, more time shipping features.

## Tools and patterns that actually help (not just noise)

You don’t need fancy tooling, but some proven tools can make the workflow frictionless:

- CI on every push: Even a simple test run gives confidence. CircleCI, GitHub Actions, GitLab CI—pick one.
- Protected main + required checks: Prevent accidental direct pushes to main. As a solo dev this still helps because it forces you to use branches.
- GitHub/GitLab draft PRs: Use drafts to signal "WIP" if you're not ready.
- Local utilities: gh (GitHub CLI) or glab (GitLab) to open PRs from terminal quickly.
- Small scripts: one to purge local branches merged on origin, another to list stale branches older than 30 days.

Use a few of these; don’t sprinkle a dozen. The aim is to support the workflow, not replace discipline.

# Wrapping Up

A tidy git branching workflow doesn't need complexity—just consistent habits. Treat main as sacred, keep branches short-lived and descriptive, push early, and merge often. With those practices, your repository stops feeling like a jungle and becomes a tool that actually helps you move faster.

Try it for a week: pick one habit (tight branch names or deleting merged branches) and stick to it. Small, steady changes compound fast—your future debugging sessions will thank you.