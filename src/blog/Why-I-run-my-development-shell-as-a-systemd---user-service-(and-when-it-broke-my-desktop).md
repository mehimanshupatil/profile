---
title: "Why I run my development shell as a systemd --user service (and when it broke my desktop)"
pubDate: 2026-09-28
description: "I stopped treating shells as ephemeral. Running my dev shell as a systemd --user service gave me predictable dev sessions, auto-started background tools, and one dependable log — with a few painful tradeoffs."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with terminal windows visible on the screen"
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["developer-tools", "systemd", "local-dev"]
---

I was midway through a client demo in our small Bengaluru office when my laptop decided its environment had had enough. My local mock servers were gone, my PATH pointed to nothing useful, and a stray background process I needed to tail had died silently. The demo kept on — slides, polite nods, the bit where you pretend a failing demo is "edge case" — and I swore I would never trust ad hoc shells again.

That week I started moving my development shell into systemd --user. Four months later, I still use it for every project I care about. It didn't fix everything, but it fixed a class of failures that used to eat half my mornings.

## The exact pain I wanted to stop

This wasn't about vanity or "neat config". It was a predictable pattern:

- I boot the laptop, connect to flaky office Wi‑Fi, and open terminals in random order. Some terminals pick up .profile, some source .bashrc, some get my language manager's shims, some don't.
- Background helpers (local MinIO, a tiny Redis, a custom port-forward) are started in ad hoc tmux panes or systemd user timers. They disappear when I close a window, or they fail quietly because PATH was wrong.
- When a demo or on-call hits, I waste 10–20 minutes recreating the same environment I had yesterday. My mistakes include wrong Python versions, stale env vars, and background processes running under different shells.

I wanted three simple things: reproducible startup, reliable background services per project, and logs that don't live only in a forgotten tmux pane.

## What I actually did (the pattern that stuck)

The idea is simple: treat your interactive dev shell as a managed user service. Instead of "open a terminal and hope", I have one systemd --user unit per project that:

- starts a login shell (so it sources the same files)
- starts tmux with a named session, or starts my usual background helpers directly
- restarts on failure
- writes logs to the user journal so I can do journalctl --user -u dev-myproject -f

Conceptually it's a single source of truth for "my project is live on this laptop".

A trimmed example of the pattern I use (you don't need to copy-paste to get the idea):

- A unit file: ~/.config/systemd/user/dev-myproject.service
  - ExecStart=/usr/bin/env bash --login -c 'exec tmux new -A -s myproject'
  - Restart=on-failure
  - WantedBy=default.target

- A small wrapper script that ensures the runtime shims are present, starts Redis/MinIO from $HOME/.local/bin if missing, and exports the environment the app expects.

- Enable it with: systemctl --user enable --now dev-myproject.service
- View logs: journalctl --user -u dev-myproject -f

Why this is better in practice:
- Startup is deterministic. I update the unit once; teammates can copy it. On a fresh laptop I enable the unit and get the same background services.
- Background processes survive closing terminal windows. They also restart if they crash during a long run.
- Debugging is easier: the journal is searchable, timestamps are consistent, and I can attach with tmux -CC from a remote machine if needed.

For a small startup with patchy office internet and developers using diverse Linux laptops, this created a reliable baseline. When I walk into a client call, I know what services are up.

## The honest failures and tradeoffs

This is not a silver bullet. There are real things that broke and behaviors I had to learn to live with.

1. Desktop integration problems
   - Early on I blew away my gnome-keyring startup because I'd tried to centralise everything in my systemd shell. Result: no desktop notifications, password prompts stopped appearing for apps, and the clipboard lost integration. It took a day of fiddling (and a few annoyed product demos) to learn which UI services need to be started by the desktop session and which can run under systemd --user.
   - The practical fix: keep GUI session responsibilities with the desktop (keyring, notification daemon). Only run dev-only helpers under the unit.

2. Systemd versions and "linger"
   - On an older Ubuntu machine at my parents' place, systemctl --user behaved differently. I wanted services to keep running after I logged out; enabling linger required sudo loginctl enable-linger myuser (which I can't do on every machine). So I keep a fallback: simple pm2 or local forever scripts for truly portable needs.
   - Lesson: this pattern works best on modern desktops you control. For TO‑GO laptops or fresh client VMs, keep the simple scripts too.

3. Expectation mismatch with tmux
   - I had a habit of detaching and killing tmux panes without realising the systemd unit would see that as a failure and restart, creating new sessions and confusing me. I added graceful exit handlers to the wrapper script and changed Restart=on-failure to Restart=idle to avoid noisy restarts.

4. Hidden complexity with PATH and env
   - Systemd user units run with a slightly different environment than an interactive login shell. I used that to my advantage (clean env), but I also had to be explicit about loading my pyenv/ndenv/shims. That meant adding a minimal env loader script to the unit — more setup, but more predictability.

Despite the friction, I accepted the tradeoffs because they were visible and fixable. Random, invisible failures were the ones I hated; these problems were explicit and could be documented.

## The one takeaway I keep recommending

If you often waste 10–20 minutes rebuilding the same dev environment, try this pattern: move the "what must run for me to demo or debug" bits into a managed user service, not random terminals. It forces you to codify what "live" looks like, gives you logs that survive terminal bubbles, and reduces the number of surprise demos where the laptop decides to be creative.

Start small: one project, one unit, and don't try to move desktop services into systemd --user until you know what breaks. For me, that discipline bought consistent demos, fewer frantic Slack messages at 11pm, and a handful of mornings back.