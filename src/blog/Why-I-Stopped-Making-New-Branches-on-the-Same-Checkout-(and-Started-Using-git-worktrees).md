---
title: "Why I Stopped Making New Branches on the Same Checkout (and Started Using git worktrees)"
pubDate: 2026-02-21
description: "Use git worktrees to isolate features, speed context switches, and avoid the 'stashed changes' dance—practical tips for Indian devs on constrained hardware."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&w=2000&q=80&fm=jpg&crop=entropy&fit=crop&h=1000"
  alt: "Two open laptops on a desk showing code editors and terminals, a developer swapping contexts between tasks."
  caption: "Image credit: Brooke Cagle / Unsplash"
  creditUrl: "https://unsplash.com/photos/1498050108023-c5249f4df085"
tags: ["git worktrees", "developer workflow", "git"]
---

I used to juggle half‑finished features by stashing, switching branches, and promising myself I'd clean up later. That promise rarely held. One messy afternoon—an accidental commit to main and an hour of cherry‑picking later—I switched to git worktrees. It changed how I context‑switch, review code, and onboard to unfamiliar parts of a repo.

If you're tired of "I have uncommitted changes" as your daily excuse to avoid switching tasks, this is for you.

What git worktrees actually give you
- Parallel checkouts: each worktree is a full checkout of the repo at a particular branch or commit. You can have feature-A in one folder and fix-B in another, both linked to the same object database.
- Fast context switches: no stash/pop dance, no risk of accidental commits to the wrong branch.
- Safer experiments: you can test messy changes in an isolated folder and nuke the worktree when done.

Main keyword (used naturally): git worktrees. You'll see why I use git worktrees for the things I used to do poorly.

When they make sense (and when they don't)
Use git worktrees when:
- You're switching between unrelated tasks (bugfix vs feature) multiple times a day.
- You review and run other people's branches locally; having a separate checkout keeps your working tree clean.
- You're working with long‑running feature branches that can't be rebased frequently.

Skip them when:
- Your repo is tiny and disk is at a premium. Each worktree adds files on disk (though not another full .git).
- Your team relies on heavyweight IDE integrations that assume a single checkout. Some IDEs need extra setup to work smoothly with multiple worktrees.

How I actually use them (practical commands)
Here are the patterns I use daily on Linux and WSL. Windows works too, but paths differ.

1) Create a worktree for a branch you're reviewing or building:
- git fetch origin
- git worktree add ../wt/feature-x origin/feature-x
This makes a folder ../wt/feature-x with that branch checked out. No stash required, no interference.

2) Start a temporary experiment:
- git worktree add --detach ../wt/experiment HEAD
Make changes, run tests, then remove it:
- git worktree remove ../wt/experiment
If you created commits you want to keep, push or merge first—removing a worktree doesn’t delete commits reachable only from that worktree.

3) Clean up stale worktrees:
- git worktree list
- git worktree remove <path>
This keeps your repo tidy. I run a quick check once a week.

Editor tips
VS Code: open the worktree folder (File → Open Folder). The Git extension detects the repo. If you use the built‑in terminal, your path and branch are isolated.

IntelliJ: prefer opening a separate window per worktree. Enable "Use 'git' from PATH" and point to the correct git if you use SDKs per project.

Tradeoffs and the real‑world snag list
- Disk usage: worktrees share the .git object store, but working files duplicate. In big monorepos this adds up. On company laptops with limited SSDs, I keep only 2–3 active worktrees.
- IDE quirks: some plugins track projects by repo root and can confuse you if the IDE expects a single .git. The fix is opening worktrees as separate projects, but that uses more RAM.
- Hooks and submodules: worktrees interact awkwardly with certain hooks and nested submodules. Tests that depend on relative paths can break if you move worktrees around.
- Human cleanup: unused worktrees can linger. If you forget to remove them, you'll have dangling directories and possible confusion about branches. Make cleanup part of your routine.

A small India‑specific note
Many of us work on corporate laptops with restricted home directories, VPNs, or slow network storage. I keep worktrees inside my local home (fast SSD) and avoid creating them on network mounts or WSL paths that map to Windows drives—those slow down filewatchers and IDE indexing. For monorepos at some startups here, I limit worktree count and rely on lightweight test runs to avoid rebuilding everything.

Why it's better than "one checkout, many branches"
The biggest win is cognitive: each task gets a physical place on disk. That reduces accidental commits, lets you run services for only one task at a time, and makes reviewing someone else's branch as simple as opening another folder.

A downside after long use
After months of using git worktrees, I noticed a subtle mess: my shell history and tooling started getting fragmented. I had different local env tweaks in different worktree folders (env files, .env.local), and when I deleted a worktree I sometimes forgot to remove related local services or docker containers. It forced me to build a lightweight "worktree teardown" checklist: stop local services, remove containers, then remove the worktree. Not a huge problem—but a real operational cost.

When to roll this out team‑wide
Introduce git worktrees as an optional workflow first. Run a short demo, show how it avoids common mistakes, and document editor setups for VS Code and IntelliJ. The only teams that should avoid it are those with heavy CI assumptions tied to absolute paths or where disk quotas are severe.

Final thoughts
git worktrees aren't a silver bullet, but they fixed the small friction that was eating my focus: the constant context‑switch overhead and the fear of corrupting a clean checkout. For Indian devs juggling unstable SSH, modest laptops, and lots of context switches between client demos and bug fixes, they're a practical tool that pays back in saved time and fewer hair‑pulling moments.

If you try them, start with one review workflow: create a worktree for every PR you test locally. See how long you keep it, what tools complain, and refine from there. And yes—add cleanup to your Friday checklist. You'll thank yourself.