---
title: "Running ssh-agent as a systemd --user service (and the one automation it broke)"
pubDate: 2026-06-02
description: "I moved my SSH agent into a systemd user service to stop passphrase prompts and accidental multiple agents — and discovered the one case where it actively breaks automation."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a wooden desk showing a terminal window and a coffee mug nearby"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["developer-tools", "ssh", "linux"]
---

I was on a Bengaluru local, 7:30 pm, trying to push a branch before a standup. My phone hotspot hiccupped, I reconnected to the office VPN, and git asked for my SSH key passphrase — again. Two terminals, three tmux windows, a VS Code remote and an editor in the same session: each one popped the passphrase dialog. I had three ssh-agents running, three sockets, and one annoyed me.

That night I decided to stop juggling agents. I moved ssh-agent into systemd --user with a socket-activated unit. One stable socket. One prompt for my private key per login. No more duplicate agents, and ssh-agent survived switching TTYs and restarting X11. It’s been quieter since. But one automation silently stopped working, and it forced me to accept a tradeoff I still live with.

Why I did it (practical details)
I wanted two concrete things:

- A single, stable SSH_AUTH_SOCK across shells and graphical sessions.
- Socket activation so ssh-agent only starts when needed and the session doesn’t fork rogue processes.

I used a pair of systemd user unit files in ~/.config/systemd/user:

ssh-agent.socket
[Unit]
Description=SSH Agent Socket

[Socket]
ListenStream=%t/ssh-agent.socket
SocketMode=0600

[Install]
WantedBy=sockets.target

ssh-agent.service
[Unit]
Description=SSH Agent

[Service]
Type=forking
Environment=SSH_AUTH_SOCK=%t/ssh-agent.socket
ExecStart=/usr/bin/ssh-agent -a $SSH_AUTH_SOCK
ExecStop=/usr/bin/ssh-agent -k

[Install]
WantedBy=default.target

Enable and start them with:
systemctl --user enable --now ssh-agent.socket

Then I set SSH_AUTH_SOCK in my shell startup so every login shell sees the same socket:
export SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/ssh-agent.socket"

On my daily laptop (Fedora at the time), this gave me exactly what I wanted: single passphrase prompt after unlock, keys available to tmux and VS Code Server instances, and no stray ssh-agent processes eating memory. Socket permissions stay user-only. If nobody tries to use it, it never runs until the socket is accessed.

What actually changed about my workflow
- One prompt per login. Nice when I hop between terminals, SSH into my home dev box, open a remote editor, or run git from a GUI.
- No more accidental agent leaks. Previously I’d find /tmp/ssh-*/agent.* sockets lingering from old sessions.
- It’s slightly easier to reason about agent availability: if $SSH_AUTH_SOCK exists and points under $XDG_RUNTIME_DIR, it’s my systemd-managed agent.

Where it broke (the honest failure)
Three months in, I pushed a change to an internal repo and an overnight CI job failed to fetch a submodule from a private Git server. The job used sudo in a wrapper script on our Jenkins runner and relied on agent forwarding to give root access to my key. The failure log was a single line: Permission denied (publickey).

Root cause: my $SSH_AUTH_SOCK pointed to $XDG_RUNTIME_DIR/ssh-agent.socket only in my user session. When the CI wrapper did sudo, the agent socket wasn’t visible to the root environment and sudo -E didn’t reliably preserve the variable. Worse, when the Jenkins agent executed build steps inside a container or via a systemd service, there was no user session to provide the systemd --user socket at all.

Before systemd --user, I had used per-shell agents or key forwarding that just happened to be present in the environment the CI runner used. Once I centralized the agent into my user session, automation that assumed "my key is available because I loaded it somewhere" silently broke.

How I adapted (and the tradeoff I accepted)
I didn’t revert the systemd approach. Instead I added a deliberate fallback:

- For human workflows I keep the systemd socket and a local ssh-add invocation on login.
- For automation (CI, remote sudo scripts, system services) I stopped relying on my interactive agent. I provision a deploy key instead — minimal, restricted, and stored as a secret in the CI system (GitHub Actions or our GitLab). That key covers non-interactive operations only.
- For development tasks that genuinely need my personal key in root context, I use a small script that explicitly forwards the socket into the target root environment with correct permissions (and only after I approve it). This is manual and deliberate.

This is the honest constraint: systemd --user is tied to an active user session. It’s great for interactive work but unreliable for non-interactive or root contexts. If you do lots of automation that depends on your personal key existing in places where your user session doesn't run, you will need deploy keys or a different mechanism.

Other small annoyances I ran into
- On some laptops GNOME Keyring still claimed SSH_AUTH_SOCK. Fixing that required disabling the SSH component of gnome-keyring or adjusting which agent wins.
- When I SSH into my laptop from another machine before a graphical login, $XDG_RUNTIME_DIR might not be set and some old scripts assumed a different default path. I had to guard shell rc files to export SSH_AUTH_SOCK only when XDG_RUNTIME_DIR exists.
- Containers and system services often don’t see the user socket. Don’t try to bolt this onto an ephemeral container unless you mount the socket deliberately (and understand the security implications).

One takeaway (and what I still don't automate)
A systemd user ssh-agent fixes a lot of everyday friction: fewer popups, fewer agents, and easier reasoning about where your keys are. But it’s an interactive-user solution, not a universal one. For automation, keep deploy keys or CI-managed secrets and treat your personal key as a human-only credential.

If you try this: set the socket path to $XDG_RUNTIME_DIR/ssh-agent.socket in both the unit and your shell, expect GNOME Keyring hiccups, and prepare a deploy-key fallback for CI. That one manual change saved me dozens of annoying prompts — and one late-night failed job taught me to stop pretending my laptop session could be my automation layer.