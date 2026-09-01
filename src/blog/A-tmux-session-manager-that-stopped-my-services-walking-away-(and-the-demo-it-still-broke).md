---
title: "A tmux session manager that stopped my services walking away (and the demo it still broke)"
pubDate: 2026-09-01
description: "How I replaced fragile systemd --user services with a tiny tmux-based manager to keep local dev services running across logins, and the real tradeoffs I learned."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Hands typing on a laptop keyboard with a terminal visible on screen"
  caption: "Photo by Scott Graham on Unsplash"
  creditUrl: "https://unsplash.com/@scottgraham"
tags: ["local-dev", "tmux", "developer-tools"]
---

It was 9:15 AM, I had a demo with a client in Koramangala, and my laptop had just updated and logged me out overnight. I reconnected, opened my browser, and found the demo backend processes had vanished. systemd --user had decided hitting logout meant "stop everything", including the small Postgres and a background mock-payment worker I trusted to be running. The call started in five minutes.

This wasn't the first time. systemd --user is tidy — it gives you journald logs and restart policies — but it's fragile for the kind of bouncing I do: sleep/resume on the metro, SSH into a work VM, and multiple X sessions across desktops. I needed something that would keep processes alive across transient sessions and let me reattach quickly. I ended up building a tiny tmux session manager. It fixed more demos than I can count. It also taught me where tmux is a terrible idea.

Why tmux, not systemd --user

I tried the usual fixes first: enable linger, write more robust systemd units, move the heavy stuff to a cheap VPS (₹300/month). Linger helped on servers but made my laptop act like a server — and I didn't want daemons eating battery or interfering with suspend. The VPS added network lag and dependency on office Wi‑Fi. I needed local persistence with instant visual access when something broke.

tmux does three things I cared about:
- It creates a single long‑lived process (tmux server) that lives across SSH/tty sessions.
- Sessions are easily scripted: I can ensure a session exists and run startup commands.
- Reattaching is fast; I can show a terminal to a client within seconds.

The manager I actually use

I kept it tiny. A 40‑line shell script lives in ~/bin/dev-sessions and runs at login (or via a single systemd --user one-liner that only launches tmux). The core is:

- Create a named session if missing: tmux new -d -s project
- For each pane, start the service with a simple wrapper like: bash -lc 'cd ~/projects/x && ./dev/up'
- An idempotent ensure loop: if a pane is dead, restart it; if the session doesn't exist, recreate it.

No magic. No dependency on systemd for supervision beyond launching tmux at login. I use ssh sockets and tmux's -S option so the same tmux server is accessible whether I'm on my laptop, plugged into office LAN, or connected over mobile tethering.

The wins were immediate. On that Koramangala call I reattached, switched the pane to the mock-payment worker, and hit a test endpoint. No restart, no spin-up delay. When I left for a meeting, I detached. The processes kept running. When I returned, everything was there.

Where tmux bit me

I should be blunt: tmux is not a drop-in replacement for systemd.

1) Logs are a mess unless you plan for them.
I assumed the terminal output was enough. It's not. Long‑running processes produce noise; searching for a specific error across ten panes is painful. I had to add tee-based logfile wiring into my service wrappers. That worked, but it added complexity I avoided with journalctl.

2) Resume and suspend race.
My big failure: a week later, after a full system update that changed the kernel and some libraries, tmux's socket was left in /tmp with stale permissions. On resume, tmux had started but couldn't accept connections, panes were zombie-ish, and my manager script couldn't recover them automatically. I lost a half-hour rebuilding a database and reseeding test accounts before a new demo. Solution: move tmux sockets to a predictable dir under my home, and ensure the manager validates processes by PID, not just tmux pane state. Ugly, but fixable.

3) No restart policy.
If a process segfaults, tmux won't restart it. I added wrapper loops for critical things, but then I lost startup ordering guarantees that a proper systemd unit gives. There's a microtradeoff: easier persistence vs. fewer guarantees.

4) UX for others.
Pairing with a junior dev once, they expected systemctl status and annoyedly asked "where do I see logs?" I spent ten minutes explaining tmux panes. It changed team onboarding expectations.

Tradeoffs I accepted

- I accepted manual log setup. I now publish simple ./dev/logs and rotations in each repo.
- I accepted weaker supervision: critical services (Postgres, Redis) I migrated to lightweight Docker images with restart policies when I need reliability. For everything else — local API servers, mock services, long-running worker scripts — tmux is fine.
- I traded auto-restart discipline for fast interactive recovery. If a process dies, I want to see it die and fix it quickly, not have systemd hide failures behind endless restarts during a demo.

Practical rules I stuck to

## Keep a reproducible start script per repo
Each repo has dev/start.sh that creates the panes and redirects logs. My tmux manager calls that. When something breaks, I can cd into the repo and run the same script locally without touching the manager.

## Put tmux sockets in $XDG_RUNTIME_DIR or ~/.local/share/tmux
This avoids stale /tmp problems on suspend or after an update.

## Use small wrappers for supervision
For worker processes I care about, the wrapper looks like:
bash -lc 'until ./worker; do sleep 1; echo crash >> crash.log; done'
Yes, it's crude. But it gives me visibility and controlled restarts.

## Accept when systemd is better
For background daemons I rely on systemd (with linger) or a cheap VPS. I don't force tmux to replace a proper init system. It’s a pragmatic boundary, not an ideological one.

The takeaway

tmux fixed the specific problem that had me re‑starting services five times on rotation days: processes walking away when I logged out or switched sessions. It gives me fast, visible persistence and instant recovery during demos. The tradeoff is more plumbing for logs and supervision, and edge cases where tmux sockets go bad (the day I learned to move them out of /tmp).

If your demos die because user sessions die, try a small tmux manager before you spend ₹300/month on VPS or wrestle with linger. But if you want supervised, journaled, production-like guarantees for long-running daemons, keep systemd in your toolbox. I use both — tmux for the “show me now” moments, systemd for the “run forever” services.