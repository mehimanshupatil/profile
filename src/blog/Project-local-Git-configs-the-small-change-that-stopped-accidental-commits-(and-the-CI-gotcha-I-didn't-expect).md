---
title: "Project-local Git configs: the small change that stopped accidental commits (and the CI gotcha I didn't expect)"
pubDate: 2026-04-06
description: "Why I moved aliases, hooks, and user settings into each repo, how it stopped wrong-author commits and noisy CI failures, and the one surprising case that broke our pipeline."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A developer typing on a laptop showing a terminal and code editor on screen"
  caption: "Photo by Tim Gouw on Unsplash"
  creditUrl: "https://unsplash.com/@timgouw"
tags: ["git", "developer-tools", "workflow"]
---

I was reviewing a pull request when I noticed a string of commits from a colleague that all used my work email. We had just hired two juniors and a consultant, and between laptops, VPNs, and a shared office machine, the global .gitconfig had become a dumping ground: aliases, hooks path, user.email, credential helpers, even a few project-specific ci.skip aliases. It worked until it didn't—wrong author metadata, hooks that ran locally but were ignored in CI, and, worst of all, people relying on aliases that didn't exist on their machines.

So I started moving everything that mattered into each repository.

Why project-local .gitconfig? Because developers move. Laptops get replaced. People contribute from home, office, a client VM, and occasionally a cybercafé. A repo is the single source of truth for how that project should be worked on. Putting config into the repo ensures everyone uses the same commit signing settings, same hooks, same helpful aliases. It turned a chaotic set of local customs into a reproducible developer experience.

What I put in the repo (the practical bits)
- .gitconfig: Not the full global file. A small file with things that must be consistent:
  - [user] name/email (templates; explained below)
  - [commit] template = .gitmessage
  - [core] hooksPath = .githooks
  - important aliases we actually use in CI checks (eg. lint-fix)
- .githooks/: portable hooks (pre-commit, prepare-commit-msg). Make them small and fast — nothing that needs network access.
- .gitmessage: commit message template with checklist (JIRA/issue ID, testing notes).
- README.developer: one-line setup: git config --local include.path ../.gitconfig.local or a short script setup.sh to do it for you.

How I rolled it out without creating more friction
1. Start with readme and a script. Nobody will read a config file. I added a setup.sh that:
   - sets core.hooksPath to .githooks
   - adds include.path for a common .gitconfig.local in the user's home (optional)
   - warns when user.name/email is unset
   Example:
   git config --local core.hooksPath .githooks
   git config --local commit.template .gitmessage
2. Keep hooks fast and local. Pre-commit runs only linters that are in the repo (eslint installed via node_modules/.bin) or quick tests. If a check needs a heavy docker image, run it in CI, not in the pre-commit hook.
3. Don't attempt to override global preferences that are legitimately personal (editor, credential helpers). Be surgical.
4. Add a check in CI to fail the build if commit author/email or commit message doesn't match the template. Throwing a hard error caught us immediately.

What changed, quickly
- Wrong-author commits dropped to zero in two weeks. When someone tried to push with the wrong email, the commit template and CI check made it painless to fix before merging.
- Onboarding time cut: a new hire could clone the repo, run ./setup.sh, and have hooks and aliases working immediately. No long one-on-one to explain "do this in your .gitconfig".
- Fewer "works-on-my-machine" excuses. When linters are part of the repo and run the same way locally and in CI, fewer surprises during code review.

The failure: the CI server ignored project-local configs
This is the honest, painful part.

Two months in we had a staged deploy fail during a Friday demo to a client. The pipeline complained about missing commit signing settings. Locally everyone had commit signing enforced via a local gpg config and a prepare-commit-msg hook that added signed-off-by lines. But our CI runner checked out the repo in a bare way (git clone --bare or a shallow fetch depending on the runner), or in some runners, the checked-out repo didn't use the working-tree hooks at all. The result: CI couldn't validate the GPG signatures, and the deployment job aborted.

Root cause: I assumed CI would respect core.hooksPath and local config. It didn't — our runner did a clean "git checkout" into a fresh directory and didn't run setup.sh, and because we had set rules that rejected unsigned commits, the deploy step failed. We lost a 30-minute demo slot while we debugged.

How I fixed it
- Moved the minimal, required metadata checks (user.email presence, commit message format) into the CI pipeline itself. CI should be authoritative, not a byproduct of local hooks.
- Ensured the repo's Docker image used for CI includes a tiny script that runs ./setup.sh as part of checkout. Now the runner sets core.hooksPath and the environment is consistent.
- Added a lightweight pre-merge GitHub action that validates the commit signing and authorship using the bare repository, so it doesn't rely on hooks being present in the workspace.
- Edited the README to call out "if your CI runner does a bare clone, add this step" — a humiliating but useful note.

Tradeoffs I accepted
- Developers lose some convenience: I stopped pushing personal aliases into the repo. If you want fancy shortcuts, keep them local.
- There's a little more setup step when you clone a repo: run ./setup.sh. It's three seconds, but it's a change. We mitigated that with a one-liner in the README and a small VS Code "open in container" task for the impatient.
- CI complexity increased slightly: more checks and a pre-checkout script. But it's a one-time cost that saved repeated demo failures.

One surprising side-effect
We found that our consultants — who contribute across many repos — appreciated the consistency. They had a script that ran setup.sh on every clone; it became their onboarding standard. That small ritual saved hours of "which linter version?" questions when they bounced between projects.

If you try this, a few practical tips
- Keep hooks minimal. If your pre-commit runs 30 seconds locally, people will bypass it.
- Don't try to force editor or credential helper settings from a repo.
- Put the authoritative checks in CI; consider pre-merge checks that don't rely on hooks.
- Document the one-liner. People will run that before anything else.

Takeaway: make the repo the contract for how the repo is worked on. Project-local git configs stop accidental commits and standardize onboarding, but assume CI is a separate actor — make it the ultimate source of truth for anything that can block a deploy. I learned that the hard way on a Friday demo. The setup script and CI pre-checks fixed it. Now commits are clean, PRs are predictable, and onboarding no longer eats up the first day.