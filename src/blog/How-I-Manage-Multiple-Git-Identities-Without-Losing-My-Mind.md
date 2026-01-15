---
title: "How I Manage Multiple Git Identities Without Losing My Mind"
pubDate: 2026-01-15
description: "Practical, no-nonsense setup for handling work, open-source, and personal Git identities on one machine—without breaking commits or security."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=2000&h=1000&fit=crop"
  alt: "A developer typing on a laptop with terminal windows and code visible on screen"
  caption: "Image credit: Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/photos/1515879218367-8466d910aaa4"
tags: ["multiple Git identities", "developer workflow", "git"]
---

A few years ago I had three Git personas: my company email, my personal GitHub account, and an open-source handle I used for projects. I kept screwing up commits—pushing company email to personal repos, signing with the wrong GPG key, or worse, using the wrong SSH key and getting blocked during a demo. If that sounds familiar, this piece is for you. I’ll show the practical setup I use every day to manage multiple Git identities on one laptop, the tradeoffs I learned the hard way, and when it's better to use separate machines.

Main idea: make identity selection local to the repository, keep keys and signing separate, and prefer explicit, auditable configuration over magic.

Why this matters
- Employers (especially in India) often require corporate email for work repos and may insist on code ownership clarity.
- Open-source projects require an email linked to your GitHub account to credit commits.
- Signing commits (GPG) is increasingly expected for security-sensitive projects.

I use the phrase multiple Git identities a lot below—because treating them as first-class citizens (not a hacky git config edit) prevents mistakes.

Step 1 — SSH keys per identity (and ~/.ssh/config)
Create a dedicated SSH keypair per identity: id_rsa_work, id_rsa_personal, id_ed25519_os. Store them in ~/.ssh/. Then add this to ~/.ssh/config:

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_work

Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_personal

When you add the remote, use the host alias: git@github-work:org/repo.git or git@github-personal:me/repo.git. That simple change avoids accidental pushes with the wrong key.

Step 2 — Repo-local Git config (no global overrides)
Never rely on global user.email and user.name if you have multiple identities. In each repo, set:

git config user.name "Rohan Deshpande (Work)"
git config user.email "rohan@company.example"

To make this less tedious, create directory-based includes in your global ~/.gitconfig:

[includeIf "gitdir:~/work/"]
  path = ~/.gitconfig-work

[includeIf "gitdir:~/personal/"]
  path = ~/.gitconfig-personal

That way any repo under ~/work/ picks up work identity automatically. I use this for most projects and it saved me many facepalms. The keyword multiple Git identities appears again because this technique scales: one include file per identity.

Step 3 — GPG signing per identity
If you sign commits, generate a GPG key per identity and configure each repo’s user.signingkey to the right key ID. Export public keys to the matching GitHub/GitLab accounts. If you’re on Windows or WSL, GPG agent setup is the fiddly part—expect one afternoon of troubleshooting.

If you want higher security, use a hardware token (YubiKey etc.) to store keys. In India, a decent YubiKey begins around ₹3,000–₹5,000; useful if your company requires hardware-backed keys, but it adds cost and friction.

Step 4 — Credential helpers and HTTPS
If you use HTTPS for remotes, credential helpers can cache credentials globally which can bite you. Avoid caching multiple account credentials in the same helper. For GitHub, I use SSH (see step 1) so credential helpers don’t get involved. If you must use HTTPS, consider per-repo credential.helper entries or use git-credential-manager with profiles.

Step 5 — Editor and tooling integration
IDE plugins often use the global git config or the first SSH key found. In VS Code, set "git.path" and use workspace settings (.vscode/settings.json) to force user.email for that workspace. Test your setup by running git config user.email and ssh -T git@github-work before a demo or CI run.

Common friction and tradeoffs
- Complexity: Once you split into multiple keys and GPG identities, onboarding a new machine becomes longer. You’ll duplicate keys across machines (except hardware tokens) or re-generate them, which is annoying.
- Repository portability: If you clone a repo outside your usual directory structure, includeIf rules won’t apply—so commits may use the wrong identity. A quick git config check should be part of your clone checklist.
- Company policies: Some orgs forbid private keys on personal laptops or require device registration. In that case, a separate OS user, VM, or a dedicated work laptop is simpler and safer.
- History fixes: If you discover wrong identity commits already pushed, rewriting history (git filter-branch or git filter-repo) is possible but messy—expect coordination and PR rework. Prevention beats cure.

When to choose separate machines or VMs
If your employer requires sensitive secrets, device management, or forbids personal accounts on the same device, go with a separate user account or virtual machine (WSL, Docker dev container, or a light VM). It’s extra maintenance but reduces policy headaches and accidental leaks.

A minimal checklist to avoid disasters
- Add SSH host aliases and use them in remotes.
- Use includeIf in ~/.gitconfig and place repos in identity-specific directories.
- Verify git config user.email in any repo you contribute to, especially before big merges.
- Use repo-level .vscode/workspace settings if your IDE tends to override identity.
- Keep GPG usage only where required; hardware token if your threat model demands it.

Final note — make the setup visible and repeatable
I keep a dotfiles repo with my ~/.ssh/config, ~/.gitconfig-work, and a README that lists steps for new machines. If you’ve ever had to debug "why my commits show the wrong email" during a release, this will save time. Managing multiple Git identities is a mild nuisance but well worth the upfront effort: fewer broken author histories, clearer attribution, and more confidence during demos and open-source contributions.

Wrap-up
Treat multiple Git identities as part of your developer hygiene. Use directory-based includes, SSH host aliases, and per-repo signing keys. Accept the tradeoff: slightly more setup and occasional maintenance, but far fewer awkward apologies in PRs and release notes. If policy or risk is high, isolate identities with a VM or a dedicated device—it's an extra cost, but sometimes the right choice.

If you want, I can share a small repo with my dotfiles snippets and a step-by-step script that sets up SSH aliases and includeIf files — I use it when provisioning new machines. Shall I paste it here?