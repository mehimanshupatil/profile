---
title: "Why I Switched to a CLI Password Manager (and What I Lost Along the Way)"
pubDate: 2026-02-26
description: "Why a CLI password manager fixed my security and workflow headaches—and the real tradeoffs I ran into while making the switch in India."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&q=80&w=2000&h=1000&fit=crop&auto=format&cs=tinysrgb"
  alt: "A developer's laptop screen showing a terminal with password-manager commands and a notebook beside it"
  caption: "Image credit: Unsplash / Glen Carrie"
  creditUrl: "https://unsplash.com/photos/1522202176988-66273c2fd55f"
tags: ["CLI password manager", "developer workflow", "security"]
---

I used to let browser password managers do the heavy lifting: save the password, offer autofill, and nag me to create a stronger one. It was convenient—until it wasn’t. After a few sketchy extension incidents, a flaky cross-device sync, and repeated moments where I couldn’t access important credentials on a flaky mobile connection in a client site, I moved to a CLI password manager. It changed how I work for the better, but it also introduced real friction I didn’t expect.

Why I picked a CLI password manager

- Control and auditability: With a CLI password manager (my main keyword), everything lives where I choose—GPG-encrypted files in a git repo, or a synced vault with a known remote. I can inspect diffs, track changes, and use standard tools to back up secrets.
- Minimal attack surface: Browser extensions and autofill are convenient but expose secrets to the browser context. A CLI password manager keeps secrets out of the browser unless you explicitly copy or send them.
- Scriptability: I can integrate secrets into scripts, CI jobs, and deployment workflows without coping with browser automation hacks. For a dev who writes small automation and deployment scripts, this is pure gold.
- Predictable performance: CLI tools work fine on low-powered machines and over slow networks—important when testing on client sites or on-the-go in tier-2 Indian cities with patchy mobile data.

How I structured my setup (practical, not perfect)

I use a git-backed vault encrypted with GPG. Each password is a small file named after the service (keepass-style folders for grouping). My workflow:

- Create/edit: pass insert service/name
- Fetch in scripts: pass show --clip service/name (copies to clipboard for a few seconds)
- Sync: git push/pull to a private repo on a cheap VPS or private Git provider
- Mobile: use a simple Android client that can decrypt with my GPG key (or use a second device as a trustworthy middleman)

This lets me do things like rotate a DB password, commit the new secret, and have my CI pull and decrypt it during deployments. No browser involved.

Three neat wins I didn't expect

1. Fewer accidental leaks. Because I rarely paste credentials into a browser, I stopped leaving passwords in Slack, emails, or plain text temp files. The discipline of explicit copy-and-paste helped.

2. Better team ownership. Our small team treats the vault like code: review a credential change, see a commit message explaining why it changed. That single change reduced "who changed the DB password?" calls during late deployments.

3. Cheap disaster recovery. If my laptop dies, the encrypted git repo + my offline GPG key (I keep a copy on an air-gapped USB in a safe) are all that's needed. No vendor account recovery hoops.

Tradeoffs and where the CLI model stumbles

- Mobile UX is worse. No native smooth autofill on Android or iOS unless you rely on an app that pairs with your vault. I often find myself copying a TOTP or password manually; for frequent mobile workflows (UPI, mobile banking apps), that’s slower. In India, mobile-first banking and UPI flows are still a reality—expect friction.
- Onboarding non-technical teammates is harder. I once tried to get a non-technical colleague to use the CLI vault; they gave up after two tries. If your org needs immediate wide adoption, a full CLI-first approach may slow you down.
- Syncing is your responsibility. When you self-host the git repo, you control access—but you also manage backups and uptime. I pay a small VPS fee and run simple monitoring, but that’s extra ops work.
- Clipboard exposure: Many CLI tools copy secrets to the clipboard for convenience. That’s better than pasting into a browser sometimes, but clipboard snooping on desktop or phone is still a risk if your machine is compromised.
- Password discovery is less discovery-friendly. In the browser, saved passwords pop up; with a CLI password manager you need to remember paths or use fuzzy search. That’s a plus for discipline, but it slows casual lookups.

Tips for a practical transition

- Start hybrid. Keep browser autofill for low-risk accounts initially (social media) and move critical credentials (banking, production servers, CI keys) first.
- Use a documented structure. Name files and folders predictably: bank/axis, infra/prod-db. Good names prevent mental overhead later.
- Automate backups. A cron job that mirrors the encrypted repo to a second secure location saved me once when I accidentally force-pushed a bad state.
- Make mobile usable. If your team is mobile-heavy (many Indian teams are), pick a compatible mobile client or a short-lived TOTP strategy to reduce copying hassles.
- Educate colleagues. Ship a one-pager on how to use the vault, why it’s safer, and the steps to recover access. Don’t assume everyone handles GPG keys without guidance.

Is a CLI password manager for you?

If you’re a developer, ops person, or part of a small team that values control and automation, the CLI password manager model is liberating. It forces better habits and integrates cleanly with code and CI. But it’s not magic: you trade immediate convenience and smooth mobile/in-app autofill for security, transparency, and control. For mixed teams or heavy mobile-first users, a hybrid approach—CLI for high-risk secrets, a vetted password manager for everyday autofill—often hits the best compromise.

I still keep a browser password manager for low-risk sites and for the inevitable moments when I need fast mobile access. The CLI vault is where the keys to production, our bank accounts, and critical APIs live. That split has reduced late-night incident chaos and forced us to document why every secret exists—two wins that, for me, outweigh the occasional annoyance of extra copy-paste.

If you try it, expect a small productivity dip during the first month. After that, you’ll either love the clarity or miss the smooth autofill—and at least you’ll understand which tradeoffs you made and why.