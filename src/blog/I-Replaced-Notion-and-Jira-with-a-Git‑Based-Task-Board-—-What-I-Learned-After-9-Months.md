---
title: "I Replaced Notion and Jira with a Git‑Based Task Board — What I Learned After 9 Months"
pubDate: 2026-01-02
description: "Tired of Jira bloat and Notion drift? I moved my team's workflow into the repo with a git-based task board. Here’s why it worked and where it didn’t."
author: "Rohan Deshpande"
image:
  url: "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&h=1000&w=2000"
  alt: "A person typing on a laptop with a notebook and coffee on a desk"
  caption: "Image credit: Firmbee.com / Pexels"
  creditUrl: "https://www.pexels.com/photo/photo-of-person-using-laptop-1181675/"
tags: ["git-based task board", "developer workflow", "productivity"]
---

When your team's backlog lives in three places — Jira for PMs, Notion for specs, and TODO.md on a dev's laptop — you stop trusting any of them. Two months of duplicated cards, missed reviews, and billing emails from Atlassian later, I tried something my manager called "bonkers": move the board into the code.

Nine months in, we run a git-based task board. We store tasks as markdown files in the repo, use branches and PRs for work, and a tiny CI job renders a Kanban page on GitHub Pages. It's not for every team, but for small engineering-led product teams in India (where SaaS line items are increasingly scrutinised), it became our best tradeoff between discipline and friction.

Why a git-based task board worked for us

- Single source of truth: Specs, tests, and the task all live in the same commit history. If a bug appears, the PR and the task file show exactly what we agreed and why.
- Low cost and predictable ops: No extra paid seats. For early-stage startups in India, that means ₹0–₹3,000/month saved per team compared with Notion/Jira plans that pile up in USD.
- Code-centric workflow: Opening a branch for a task makes the task lifecycle part of development. The PR becomes the canonical status update and review ritual; no separate "mark done" step in a SaaS board.
- Offline-first and audit-friendly: You can create tasks, change status, and push when connectivity returns. The git history gives a tamper-proof timeline for decisions.
- Better context with commits: Each commit references the task file. Reviewers see the code and the spec together, reducing back-and-forth.

How we set it up (simple, practical)

1. Task files: tasks/<ticket-id>.md. Each file has YAML frontmatter: title, assignee, status, priority, sprint, and a brief spec. Example: tasks/2026-001.md
2. Branch per task: feature/2026-001-add-login. Work happens on that branch; the PR merges the task branch into main.
3. Small automation: a GitHub Action scans tasks/*.md, compiles a Kanban HTML (or JSON), and deploys to a /board page. No heavy UI; just readable columns and links to files/PRs.
4. CLI helpers: gh for opening PRs, a tiny Python/Node script to create templated task files (git commit included), and a Husky hook to prevent empty status fields.
5. Notifications: PRs are still where Slack pings happen. We use PR templates to surface required test steps and QA checkboxes.

The workflow in practice

- PM or dev runs ./mk-task "Add OAuth" — that creates tasks/2026-017.md and commits it.
- Assign, then checkout feature/2026-017 and implement.
- PR title includes the task path; reviewers open the task file from the PR sidebar to check acceptance criteria.
- On merge, the CI changes the task status to "Done" (or we delete the file if we prefer archival in /archive).

The real benefits we felt

- Tighter reviews: Reviewers stop guessing the intent — the task spec lives alongside the diff.
- No translation layer: No more copy-pasting task descriptions between Notion/Jira and commit messages.
- Faster onboarding for engineers: New joiner builds the repo and immediately sees active work and standards.

But it’s not a silver bullet — tradeoffs and real downsides

- Not designer/PM friendly: If your product managers or designers insist on rich drag-and-drop boards, comment threads, attachments, or mobile apps, this will feel clunky. We lost a bit of cross-functional ease at the start.
- Search and reporting: We don't have Jira's nice velocity charts out of the box. You can write scripts, but maintaining custom reporting is extra work.
- Permission model limits: Git permissions are all-or-nothing compared to granular SaaS roles. In one case we had to create a separate docs repo to give contractors limited write access.
- Noise in git history: If you auto-commit status changes, the main history gets more task-focused noise. We solved it by making status updates squash commits or using CI to edit the board rather than commits from humans.
- Scale limits: For large orgs with hundreds of concurrent tasks, the markdown approach becomes unwieldy. We hit noticeable slowdowns when the tasks folder crossed a few thousand files; at that point you either build indexing or move to an issue tracker.

When to try this (and when not to)

Try a git-based task board if:
- Your core contributors are engineers and comfortable in git.
- You want tight coupling between code, spec, and review.
- You’re a small team (3–20 people) looking to cut SaaS costs and reduce context switching.

Skip it if:
- Your org needs heavy PM/Designer collaboration on a visual board.
- You require enterprise reporting, audit compliance, or detailed role permissions out of the box.
- Mobile-first contributors need to triage tasks from phones constantly.

Final notes and one hard lesson

The hardest part was culture, not tech. For the first two sprints we tripped over habits: PMs tried to "assign" tasks in Notion still, and some devs opened PRs without updating the task file. We enforced the discipline with pair onboarding, a small README, and a one-week freeze where all activity had to touch tasks/*.md. That forced the habit.

If you're curious, start small: implement it in a single repo for a sprint or two. If it sticks, you’ll get cleaner PRs and fewer "which ticket was that?" conversations. If it doesn’t, you’ve learned a lot about what your team actually needs — and saved a month of SaaS subscription fees in the process.

If you want, I can share the tiny scripts we used to scaffold tasks and the GitHub Action that renders the board. It’s intentionally simple so teams in India and beyond can adopt it without a big ops lift.

Thanks for reading — now go open a branch for the next thing you want to finish.