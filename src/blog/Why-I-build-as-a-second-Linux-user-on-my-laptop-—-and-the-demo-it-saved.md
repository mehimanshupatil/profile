---
title: "Why I build as a second Linux user on my laptop — and the demo it saved"
pubDate: 2026-07-27
description: "I stopped trusting 'works on my machine' by running builds as a clean, non-GUI user on my laptop. How I set it up, the tradeoffs, and the one demo it rescued."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of hands typing on a laptop keyboard with terminal windows visible on screen"
  caption: "Photo by Prateek Katyal on Unsplash"
  creditUrl: "https://unsplash.com/@prateekkatyal"
tags: ["local-dev", "reproducibility", "developer-tools"]
---

It was 9:45 a.m., client call in five, and my screen showed green tests and a working frontend. I plugged my laptop into the conference TV, started the app, and watched the login screen hang on a blank spinner. No errors in Chrome. No helpful logs. My heart sank — this was the same machine I used to run CI locally, but it behaved differently.

That afternoon I tracked the problem to a stray XDG environment variable and a system font fallback that my normal desktop session had loaded from gnome-fonts. The containerized CI ran headless and used fonts packaged with the app. My laptop didn't. The app worked for me because my usual session had decades of cruft — background services, cached fonts, SSH agents, credentials in .bashrc — everything CI didn't have. The demo failed because my environment was not "clean".

After that week of embarrassments, I adopted one rule: if I want CI-like guarantees on a feature or demo, build and run it as a different, clean, non-GUI user on my laptop. No dotfiles, no login agents, no desktop session baggage. The difference was immediate. It found missing env vars, implicit credentials, and hidden desktop-only behavior long before demos and code reviews.

Why a second user works better than Docker alone

Containers are great, but they hide two classes of bugs: things that rely on a user's session (GNOME keyring, font caches, ssh-agent sockets), and things that accidentally read credentials or tokens from home dotfiles. CI isn't a container on your laptop; it's a clean environment. Creating a dedicated, non-GUI user gives me a quick local environment that's closer to CI without the overhead of full VMs or pushing to actual CI every small change.

A clean user is cheap and predictable. It enforces that:
- your build scripts declare every dependency, not rely on ~/.profile
- your app doesn't try to access the desktop's keyring or font folder
- file permissions and ownership issues are surfaced

How I set it up (my exact commands and habits)

I use Ubuntu on a work laptop. Setting the user takes five minutes and costs nothing:

- Create the user (no password login):
  sudo useradd -m -s /bin/bash builduser
- Give it temporary sudo for setup (optional):
  sudo usermod -aG sudo builduser
- As builduser, create a minimal dotfiles folder with only what's necessary:
  sudo -u builduser mkdir -p /home/builduser/.config
- Use rsync or a simple git clone to bring the repo in:
  sudo -u builduser git clone --recurse-submodules <repo> /home/builduser/project
- Run the build as builduser:
  sudo -u builduser bash -lc 'cd /home/builduser/project && ./build.sh'

For quicker iteration I use su -l builduser to get an interactive shell. I avoid copying my main user's SSH sockets or agent; if the build genuinely needs access to a private repo, I add a deploy key to the project's config or temporarily forward minimal credentials.

I also keep a tiny wrapper script in my main account:

#!/bin/bash
# run-as-builduser.sh
sudo -u builduser bash -lc "cd /home/builduser/$1 && ${2:-bash}"

Now I can run tests or the demo build in ~10 seconds without touching CI.

What this caught (and what it doesn’t)

In three months this habit caught:

- Missing DB migration step: my desktop had a local DB with the right schema; builduser did not.
- A config read from ~/.aws/credentials that the app silently used in production.
- A headless rendering bug where fallback fonts differed, breaking PDFs on CI but not on my desktop.
- A race caused by a systemd user service my desktop had running.

But it also has limits and costs. Honest tradeoffs:

- It won't help if the bug needs GUI hardware or an external device (camera, a specific Bluetooth dongle). Then I still need a real device or VM that matches the target.
- File permissions messes happen. I once ran a build as root while debugging, and build artifacts owned by root required chown-ing. That cost me 20 minutes and a mild swear.
- Corporate laptops: some companies lock down user creation or sudo. On such machines I use a lightweight alternative: a container with a clean /home mapped to mimic a user, or runid with podman. Not as perfect, but workable.

Why I kept the habit despite the friction

Switching users feels like extra steps. At first I found it annoying to jump context. Then I treated running as builduser like a lightweight smoke test: "If it works in builduser, it's worth pushing." That one extra check saved me two full CI runs per feature and one humiliating call.

It's also become an implicit code smell detector. If you need to copy a 100-line snippet from ~/.bashrc to make something run, that's a red flag. I force myself to fix the script or clearly document the dependency instead.

A real failure (so you know this isn’t a silver bullet)

Two months after adopting the habit I leaned on it too hard. For a client demo with heavy PDF generation, I built and validated everything as builduser. The demo still failed in their environment — a minimal Debian container on the client's server without a specific system package (libtiff). I had a false sense of total coverage because builduser matched my CI but not the client's runtime. The lesson: builduser reduces "it works on my machine" noise, but you still must validate the actual deployment environment.

If you want to try it

- Make the user. Use it for smoke tests and demos.
- Treat failures as specs: if something breaks only in builduser, it needs either a documented dependency or a fix.
- Automate the minimal steps to run as builduser (script, alias).
- If you can’t create users, use a container that reproduces a clean home directory and no desktop services.

Takeaway

Building as a second, clean user turned "works on my machine" from an apologetic excuse into a reproducible test. It doesn't replace CI or real environment testing, and it adds a small maintenance cost, but it finds the hidden session- and dotfile-based bugs that used to derail demos and reviews. After the TV-demo disaster, that tradeoff was worth every extra keystroke.