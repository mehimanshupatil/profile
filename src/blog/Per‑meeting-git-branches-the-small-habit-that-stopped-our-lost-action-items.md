---
title: "Per‑meeting git branches: the small habit that stopped our lost action items"
pubDate: 2026-09-20
description: "I started creating a git branch for every meeting with a templated note, commit history, and a tiny PR — here's how it stopped lost action items, what broke, and when not to use it."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1600&h=800&fit=crop&auto=format"
  alt: "Hands typing on a laptop with a notebook and coffee on a desk"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["productivity", "meetings", "developer-tools"]
---

It was 4:30pm on a Friday. We’d just finished a sprint planning that felt productive until I checked my inbox on Monday and found three action items buried in a thread, two never acknowledged, one sat on someone’s todo list because nobody was sure who owned it.

I’d been trying the usual fixes — meeting minutes in Google Docs, a shared Trello board, and the person-responsible rule. All fine, but each had failure modes: Docs get overwritten, Trello cards never get created in the meeting because the internet in our Bengaluru office is patchy, and “responsible” becomes “someone will do it”.

So I started doing something small and slightly nerdy: I created a git branch for every meeting, wrote a templated markdown note, committed it, and pushed. That one change cut down lost actions in a month. Here’s exactly how I do it, why it works for dev-heavy teams, and the real tradeoffs.

Why a git branch, not Google Docs
- Immutable history: every update is a commit. You can see who added an action and when without hunting through chat threads.
- Offline-first: git works when our office Wi‑Fi drops (it does, predictably, on the second Tuesday of the month).
- Easy ownership: create an issue or assign a PR to the owner. No separate tool.
- Low friction for devs: we already live in repos and PRs. Adding one more branch is a mental match.

The setup I use (takes 2 minutes)
- Repo: a tiny repo called team-notes in our org. One directory per team.
- Template: meeting.md with fields — title, date, attendees, agenda, notes, actions.
- A tiny local script (bash) to create the branch and open the editor:

  branch="meet/$(date +%F)-${1// /-}"
  git checkout -b "$branch"
  cp templates/meeting.md "meetings/$branch.md"
  ${EDITOR:-code} "meetings/$branch.md"

- Commit and push: git add, commit -m "meet: sprint planning — 2026-09-20", git push -u origin "$branch".
- Open a PR to merge meeting notes into main when the meeting ends or actions are completed.

Workflow during the meeting
- One person (rotating) runs the script and shares the PR URL in chat.
- Note-taker updates the markdown inline. Attendees can add bullets directly or open quick commits.
- For every action item I add a sub-bullet with a line like:
  - [ ] @priya — add validation for UPI callback (ETA: 2026-09-22)
  Then commit. That commit is the single source of truth: who, what, when.

Why this stopped things slipping
- Visibility in the places developers already check: PR list and notifications.
- Assigning a PR forces a response. People don’t ignore assigned PRs the way they ignore an update in a shared doc.
- The history made follow-ups trivial: grep for “meet/2026-09” and you get everything.
- When the action is done, we update the markdown and merge the PR. No separate “done” ritual.

An honest failure: non-dev attendees and noisy PRs
This is the real constraint I learned the hard way. Our product and support folks initially hated it. They didn’t want to learn git or open PRs. The first month, meeting PRs became noise: 20 open PRs in the repo, email pings for every commit, and a lot of confusion.

What changed:
- I added a simple web view using GitHub Pages (10 lines of HTML + JS) that renders meeting files and shows outstanding actions. Non-devs can bookmark that and avoid git.
- We consolidated: one PR per meeting (not one per small change). Small edits are squashed into the meeting commit to avoid notification spam.
- We limited the repo to teams with >50% dev attendees. For cross-org syncs, we still use Google Docs. The git method is not a universal replacement.

When it backfired
Once, during a client call, I accidentally pushed a commit with internal debugging notes that referenced a client's internal endpoint. It was a private repo, but we still had to strip the commit and force-push to remove the detail. That taught me to keep a pre-commit checklist and never paste secrets into meeting notes. Also: company policy can forbid storing certain client data in code repos. Know your HR/legal limits.

Practical tradeoffs I accepted
- Requires basic git fluency. I trained two colleagues in a half-hour workshop. After that, adoption was painless.
- Adds a little overhead to every meeting. Creating the branch, committing, and opening the PR adds maybe 90 seconds. That cost is worth it where action items matter.
- Not great for external participants. We still send a sanitized summary via email for external stakeholders.

Results (concrete)
- In month one we dropped “lost action” incidents from around 3/week to 0–1/week. That freed approx. three developer-hours per week previously spent chasing decisions.
- We used to have two repeat follow-up meetings per sprint; those are gone most weeks.
- The tiny web view let product folks stop fearing git, and the PR notification pattern made accountability visible without micromanaging.

When you should not try this
- If your meeting attendees aren’t at all comfortable with git and you can’t give them a non-git view.
- If your company forbids storing any client-related notes in code repos.
- If meetings are large town-halls with no clear actionability — the overhead isn’t worth it there.

One takeaway I actually kept
If the meetings you run regularly create small, assignable work items and your team already uses git, try a per-meeting branch for four weeks. Automate the slow bits (a tiny script + a web view) and accept that you’ll tweak the rhythm: squash noisy commits, teach a couple of non-devs the basics, and keep sensitive data out of commits. It’s not a silver bullet, but for us it turned the "someone will do it" problem into “who is assigned this PR?” — and that one question mattered.