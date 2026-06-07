---
title: "The tiny git-notes habit that saved review context in our worst PRs"
pubDate: 2026-06-07
description: "How I used git notes to attach reviewer context to commits, the automation that made it reliable, and the squash-merge gotcha that nearly erased months of history."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&h=800&fit=crop&auto=format"
  alt: "Hands typing on a laptop keyboard with a code editor visible on the screen"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["git", "code-review", "developer-tools"]
---

The PR had ballooned to 18 commits and four reviewers. We were on a call, screen-sharing the diff, and every time someone asked “why this change?”, I had to re-open old messages, search Slack, or scroll through thirty commits to find the context. The worst part: the explanation often lived in a review comment tied to a now-rebased commit SHA. Nobody could tell whether a behavior was deliberate or accidental. We wasted minutes — sometimes hours — re-explaining decisions.

That was the moment I stopped relying on scattered PR comments and started attaching the context directly to commits: git notes. Small change, big friction reduction. Here's what I actually did, why it worked for us in an Indian startup with flaky office internet and hurried reviewers, and the one mess-up you should plan for.

Why git notes, not PR comments
I wanted review context close to the code and versioned with it. Commit messages are for intent. PR comments are ephemeral and tied to GitHub’s UI. Git notes are just refs/notes that sit in the repo and attach free-form text to a commit SHA. They don’t change the commit object, so they’re safe, searchable locally, and part of the git workflow.

Practical wins in week one:
- When someone asked “why this config toggle?”, I ran git notes show <sha> and read the reviewer’s conclusion. No Slack, no browser.
- Junior engineers learned faster because the “why” lived where the “what” did. Fewer repeat explanations.
- On slow office Wi‑Fi, pulling notes (a few KB) was noticeably faster than loading long GitHub threads.

The workflow we actually used
We kept it deliberately tiny so people would adopt it. No UI, no extra apps — just three commands you already have.

1) Add a reviewed note:
git notes --ref=review add -m "LGTM after fixing null-case. See: discussion thread #42" <commit-sha>

2) Read it:
git notes --ref=review show <commit-sha>

3) Push notes:
git push origin refs/notes/review

That last step is crucial. By default notes live only locally. We automated the push inside a tiny git alias and a GitHub Action that, on PR update, pulled refs/notes/review and appended a one-line summary to the PR body if the repo had a protected merge strategy (more on that later). The result: even people who never ran git had the notes accessible via the PR.

The automation that made it stick
People will adopt only if friction is near zero. We built two tiny automations:

- A git alias in our dotfiles: notebook = "!f() { git notes --ref=review add -m \"$1\" $(git rev-parse HEAD) && git push origin refs/notes/review; }; f"
One command to capture the context and push it upstream.

- A GitHub Action that runs on pull_request:
  - It fetches refs/notes/review
  - For each commit in the PR, if a note exists it appends a one-line summary to the PR timeline (not a bulky dump — that annoyed people)
This solved two problems: reviewers who never ran git could still see the context, and a minimal audit trail existed on the PR.

The real tradeoff: rebases, squashes, and the week we almost lost history
We learned the hard way that git notes bind to commit SHAs. That’s also their strength — immutable link to a snapshot. But when a team rebases or uses squash-and-merge, those SHAs change or disappear. One Friday we did a cleanup: squashed and force-pushed a long-running feature branch. The git notes were still in the remote under refs/notes/review, but they were attached to commits that no longer existed in the branch. The GitHub Action appended a bunch of now-orphaned summaries to the PR body, and our local git notes looked stale.

We nearly lost months of contextual history because:
- Some engineers thought notes were automatically preserved on squash.
- Our GitHub Action appended summaries but didn’t archive the full notes to a stable place.
- Our backup process didn’t snapshot refs/notes/*.

Fixes we implemented:
- Change the merge process: require "Rebase and merge" or "Create a merge commit" for PRs that had any review notes. If the team insisted on squashes, we added a CI step that copied notes into the PR body (a canonical, human-readable record) before the squash commit was created.
- Backup refs/notes/review nightly to a small JSON file stored in an archive branch (size was tiny). We use a cheap VPS cron (₹300/month) to keep a copy; restores are simple git fetch + git notes import.
- Teach the team: a two-line policy in our CONTRIBUTING.md about notes and merge strategies. No surprises.

Limitations and the Indian dev-context realities
- Git hosting policies vary. On our GitHub Enterprise instance a short-lived policy once blocked pushing arbitrary refs. We solved that with a permissions request and a scoped refs/notes/review. If your company locks refs, this won't fly.
- Squash merges still erase SHA-linked notes unless you snapshot them to the PR.
- Git notes are not visible in GitHub’s commit list UI; they live behind the API or your scripts. Our GitHub Action mitigated that, but it does add CI time — acceptable for us, but not for every tiny repo.
- In low-bandwidth setups (Bengaluru co-working or a slow home broadband), pushing notes is lightweight. But if your notes grow into long transcripts, they stop being "tiny" and defeat the purpose.

One honest failure
We tried to capture full review threads into notes for completeness. It grew fast and became unreadable in the terminal. The habit died quickly. The right balance was a one-paragraph decision summary in the note and a link to the long thread. Brevity matters.

What I walked away with
Attach context to commits close to the code, but don’t treat git notes as magic. They save time when used sparingly and with a clearly documented merge strategy. For us, the tiny win was not the notes themselves but the habit: stop re-explaining decisions. Put a one-line summary where someone can find it without reopening Slack.

If you try this, start with a two-command habit: add the note, push the ref. Add an automation that copies a minimal summary to the PR before any destructive merge. That one extra minute per review saves an afternoon of lost context later.