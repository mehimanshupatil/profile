---
title: "Why I split my dotfiles into tiny packages (and stopped breaking other machines)"
pubDate: 2026-05-15
description: "I moved from one big dotfiles repo to several small, opinionated packages with a tiny bootstrap. Fewer surprises, safer installs, and one painful mistake that forced the change."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a terminal open and a cup of coffee beside it"
  caption: "Photo by Dan Nelson on Unsplash"
  creditUrl: "https://unsplash.com/@dannelson"
tags: ["dotfiles", "developer-tools", "workflow"]
---

It was 11 pm. I was helping a friend set up their new work laptop over a shaky Vodafone connection in a Bengaluru apartment. Two commands and a reboot later, their shell prompt looked right, vim had my plugins, and their keyboard layout had quietly changed to Dvorak. They texted a thumbs-up. Then their package manager started failing. Then the touchpad stopped recognising taps. Then they called.

I had done this hundreds of times on my own machines: clone my single large dotfiles repo, run install.sh, and everything fell into place. It was fast. It felt elegant. It also assumed too much: my preferences, my distro quirks, my global installs. My "one script to rule them all" model kept leaking — replacing defaults, symlinking config files across /etc, or running scripts that expected Homebrew on macOS and apt on Ubuntu. On someone else’s machine it behaved like a mildly malicious configuration virus.

That night ended with me reverting commits, restoring backups, and promising I'd never again make "one install" an all-or-nothing gamble for other people's laptops. That promise became the reason I split my dotfiles into small, purpose-first packages and a tiny bootstrap that asks questions.

Small packages, big difference

My new model is simple: each logical piece of my setup is its own repo (or folder in a monorepo) with a single responsibility and clear, idempotent install steps.

Examples:
- shell/ — zsh config, minimal plugins, and a couple of helper scripts. It does not touch system files.
- editor/neovim/ — init.lua, plugin list, and a script that installs plugins but asks before writing to ~/.config.
- tooling/cli/ — functions and wrappers for tools I actually use (gh, git, gh-pages) with a README that lists platform support.
- laptop/ubuntu/ and laptop/macos/ — small, opt-in scripts that configure OS-level settings; they are interactive and clearly labelled as destructive.

The intent is that "install shell" should be safe on any machine. "install laptop/ubuntu" is explicitly for my personal laptop and begins with a confirmation: "This will change system settings and install packages. Proceed? [y/N]".

Why this works for me in India

- Bandwidth matters. Each package is small — a few KB to a couple MB — so cloning and inspecting over a mobile hotspot is feasible. I don't force a 200MB dotfiles bundle on someone tethering to their phone.
- Intermittent setups. My packages are idempotent. If a network blips while a plugin installs, rerunning the same package picks up where it left off safely.
- Security and corporate laptops. At one job I needed to keep corporate machines pristine. Having a tiny shell package that only sets zsh aliases allowed me to have a usable shell without touching the laptop's security posture.

How I bootstrap now

I carry one tiny install script in a single repo: bootstrap.sh. Its job is not to configure everything but to ask, clone, and delegate.

Sequence:
1. clone bootstrap
2. run ./bootstrap.sh
3. script lists available packages with one-line descriptions and shows platform compatibility
4. I pick which packages to install (or pass flags)
5. each package's install script runs in a sandboxed way: it writes to $HOME only, creates backups (foo.conf.orig.YYYYMMDD), and logs actions to ~/.local/dotfiles/logs

This sounds fussy. It is. But the friction is intentional: I want the person running it to think twice before allowing something to touch system files.

The failure that shaped the rules

After I switched to packages, I made a rookie mistake: a package I wrote to "improve" keyboard shortcuts on my Ubuntu laptop invoked gsettings without checking whether gsettings was present. On a friend's minimal Ubuntu install, that call failed halfway, leaving their gnome-settings messed up. I thought my safety checks were sufficient. They weren’t.

I fixed it by hardening installs:
- preflight checks for command availability
- explicit fallbacks with no-ops and descriptive warnings
- atomicity where possible: write to temp files and move them into place only on success
- clear rollback: create timestamped backups of changed files and a rollback script per package

Tradeoffs I accepted

- Slightly longer initial setup. The small prompts and checks add a minute or two. I value predictability over raw speed when someone else’s work is involved.
- More maintenance. Splitting means more small READMEs and version checks. I solved this with a tiny CI job that lints installs and verifies that each package's "safe by default" policy is followed.
- Occasional duplication. Some install steps (like ensuring git is configured) appear in multiple packages. I accept this because it reduces dangerous cross-package assumptions.

Practical rules I enforce now

- Never touch /etc unless the package is named laptop/OS and explicitly warns about it.
- Always backup before overwrite: ~/.bashrc → ~/.bashrc.dotbak-20260515
- Interactivity by default for destructive actions; accept --yes for automation.
- Keep package size <10MB where possible — faster clones over mobile.
- Document prerequisites clearly (node, python3, brew, apt) and fail fast if not present.

What really changed

The first week I switched, I felt slower. Then I noticed fewer "what did you run on my machine?" messages. I could hand a coworker a link to "shell/" and they could install only that part. New hires stopped asking me to "set up my laptop" — I gave them the selective link and added a checklist to our onboarding doc.

If you care about reproducibility, this approach is not exotic: it's modular design applied to personal configs. The real win for me was social: safer defaults mean fewer late-night debugging sessions for other people and less cognitive load when I switch machines.

One takeaway (and a question)

If you find yourself running install.sh on other people's work laptops, split your repo. Make installs idempotent, ask before changing system settings, and keep packages small. It buys you safety and fewer angry late-night calls.

One question I still wrestle with: how opinionated should a "personal" package be when it's meant for others? My current rule is simple — if it would annoy you being applied silently to someone else's laptop, it should be opt-in. That one rule saved me more hours than all my automation combined.