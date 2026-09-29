---
title: "Per‑repo SSH wrappers: the tiny habit that stopped me pushing with the wrong key (and the submodule that broke it)"
pubDate: 2026-09-29
description: "I started using a per-repo SSH wrapper so each project uses the right key. It cut accidental pushes and access headaches — but submodules and CI forced ugly tradeoffs."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a coffee cup and a notepad"
  caption: "Photo by Christin Hume on Unsplash"
  creditUrl: "https://unsplash.com/@christinhumephoto"
tags: ["git", "ssh", "developer-tools"]
---

It was 9:12am and I’d already done two dumb things: push a half-baked feature to a client repo with my personal SSH key, and then realize Jenkins’ CI didn’t have permission to fetch a private submodule so the build died in prod. The client pinged. My inbox lit up. I sat there, forehead on the laptop, thinking: this should not be this fragile.

I have three Git identities, two GitHub orgs, and one legacy client that still uses a private GitLab server reachable only over a bastion. On a startup laptop, with SSH agent forwarding, .ssh/config globs, and a habit of copying keys between machines, the wrong key walking into the wrong push was the predictable kind of disaster that repeats until you harden something.

Global ssh config was convenient until convenience became the problem. I needed something small, repo-local, and impossible to ignore.

Why global SSH config failed me (again)
- I had an IdentityFile rule for *.corp.* that worked 90% of the time. The other 10%? When I ssh-add’d my laptop’s default key, Git would happily use that and GitLab would reject it — or worse, accept it and push into a repo the key should not have touched. Agent forwarding masked issues: it made access transparent during manual work but hid failures on CI and other machines.
- Switching contexts meant toggling agent keys, editing ~/.ssh/config, or remembering arcane Host aliases. On mental-debt weeks, I skipped the toggles.
- Submodules and CI were the real gotchas. They fetch independently and don’t inherit the environment I relied on locally. The first time the CI job failed because it couldn't fetch a private submodule, I knew this had to be fixed at the repo level.

What I actually built (and how it looks)
I started with a one-file approach in each repo I care about: a tiny ssh wrapper plus a one-line git config. No global edits, no extra tools, zero rupees.

Repo layout (kept minimal):
- repo/.ssh-wrapper.sh — executable, in .gitignore
- repo/.gitconfig.local — optional convenience to set core.sshCommand
- README.md — short note so co‑workers know why this exists

The wrapper is tiny and explicit (illustrative, not exact):
- It sets GIT_SSH_COMMAND to use a specific IdentityFile and disables agent forwarding surprises.
- It also fails fast if the key path doesn't exist — better to error than to quietly use another key.

Why this works for me:
- It’s explicit: each repo declares which key it uses. No guessing.
- It’s self-contained: clone the repo, read the README, and you know how to set it up.
- It reduces blast radius: a misconfigured global file can affect dozens of repos; a per-repo wrapper affects only one.

A real example of my wrapper (conceptual)
- At the top: check for $CI or $GITHUB_ACTIONS and behave differently (CI pipelines typically inject SSH or use deploy keys).
- Use absolute paths to keys under ~/.ssh/, not relative ones in the repo. Never commit the key.
- Export GIT_SSH_COMMAND and invoke git as usual.

The day it failed (the honest tradeoff)
Two months after I rolled this out, we hit a morning outage. A release job pulled a private submodule hosted in a different company account. Locally, my wrapper worked because I had a symlink ~/.ssh/client_key -> /secure/wherever. In CI, the job ran on our self-hosted runner which didn't have that key and didn't pick up the repo wrapper because submodule fetches in our pipeline ran in a separate step that reset environment variables.

Result: the deploy staged, then died during the asset build. Our rollback was messy and cost a few late‑night coffees. The root cause: I’d assumed the wrapper would be used end-to-end. It wasn't. CI, submodules, and cross-repo fetches need explicit configuration.

What I changed after the outage
- For CI: I moved away from relying on repo-local wrappers alone. The pipeline now injects the correct GIT_SSH_COMMAND as part of the job environment (we store a key in the CI secrets store and mount it temporarily, with strict permissions). Yes, this required adding a secret and a tiny bootstrap script in our pipeline; it’s slightly uglier but reliable.
- For submodules: if the submodule lives in the same org, I prefer relative HTTPS URLs with a CI token, or I ensure the CI runs one unified fetch step with the right env. If cross-org, we add a short onboarding note and a small script that sets GIT_SSH_COMMAND consistently before any git submodule operation.
- For developers on company-managed laptops where adding keys is bureaucratic: the wrapper becomes documentation more than automation. It's still useful because it makes requirements explicit during code reviews and onboarding.

Practical rules I actually follow now
- Never commit keys or symlinks. Ever.
- Keep the wrapper in .gitignore; keep a README. If you rely on a key, document exactly how to add it to your machine and CI.
- Fail fast: the wrapper should error if the key is missing. Quiet fallback to the agent is how mistakes happen.
- Treat CI differently: inject GIT_SSH_COMMAND in your pipeline rather than hoping the wrapper is sufficient.
- Use HTTPS submodule URLs with short-lived tokens where possible — submodules are a maintenance pain; don't compound it with hidden SSH behavior.

Context for Indian teams
This pattern helped me while working with satellite contractors in Pune and a legacy client who forces traffic through a bastion. It also fits remote-work realities: my home internet in a Chennai flat and a coworker on a Mumbai ISP both behaved the same because the repo told them which key to expect. For startups with locked corporate laptops and MDM, the wrapper often ends up as documentation — but documentation that reduces tribal knowledge is still valuable.

Final takeaway: small, visible constraints beat global magic
The per-repo SSH wrapper isn't sexy. It won't replace proper access controls or short-lived credentials. But it stopped my wrong-key pushes overnight because the project started explicitly stating its expectations.

If you try it, expect one ugly edge: CI and submodules. Don't assume your wrapper is an automatic fix. Make your CI the source of truth for repo access and let the wrapper be the human‑facing contract. That tiny change — explicit, local, and noisy when misconfigured — is the habit that saved my mornings.