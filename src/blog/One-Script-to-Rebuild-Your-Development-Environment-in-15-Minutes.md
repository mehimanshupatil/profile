---
title: "One Script to Rebuild Your Development Environment in 15 Minutes"
pubDate: 2025-11-23
description: "Stop wasting hours setting up machines. A practical, idempotent approach to creating a single script that reproduces your dev environment quickly and reliably."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&h=1000&fit=crop"
  alt: "Open laptop on a desk showing a code editor and terminal"
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["developer workflow", "dev environment setup", "productivity"]
---

Have you ever stared at a fresh machine for longer than you care to admit, hunting down the right Node version, remembering which VS Code extensions you swear by, and rediscovering that obscure CLI tool you once needed? Setting up a new workstation is the kind of chore that drains creative energy before you even start coding.

I used to treat setup as a “one-off” — install this, fiddle with that, copy dotfiles, curse, debug, repeat. Then I built a single reproducible script that does 95% of the work in about 15 minutes. It’s not magic; it’s just deliberate design: idempotent steps, clear order, and a few dependable tools. If you want to stop wasting time and feel more confident when switching machines or onboarding new teammates, this approach will change that small part of your life.

## Why one script matters

A consistent dev environment does three things: removes friction, reduces bugs that only happen locally, and frees mental bandwidth for actual work. When your setup is ad hoc, you carry invisible debt — forgotten tools, mismatched versions, and undocumented tweaks. That’s how “works on my machine” becomes a real problem.

A single script makes setup repeatable. It’s also a living document of your preferences: package managers you trust, editors and extensions you use, and the way you manage runtimes. Treat the script like configuration rather than a sequence of random commands. That mindset shift — from “do this once” to “this is my environment as code” — changes how you maintain and share it.

Finally, a well-written script is idempotent: run it twice and nothing breaks. That saves you from fragile restore steps and lets you safely tweak things without fear.

## What a good dev environment setup actually includes

There’s no one-size-fits-all list, but generally a solid dev environment script covers these layers in order:

- Operating system tweaks and package managers (Homebrew, apt, winget)
- Shell and shell tools (zsh/bash, fzf, ripgrep)
- Language runtimes and version managers (nvm, rbenv, pyenv, asdf)
- Development tools (Docker, kubectl, Terraform)
- Editor and extensions (VS Code + extensions, config files)
- Dotfiles (gitconfig, .gitignore_global, .ssh/config)
- Credentials and secrets handling (SSH keys, GPG)
- Project helpers (git hooks, CLI tools like gh, awscli)

You don’t install everything at once — install the most crucial items first, then add optional blocks that can be toggled. The script should detect the OS and run only the relevant sections. When the script is modular, you can reuse parts for servers, CI images, or teammate onboarding.

Main keyword reminder: dev environment setup appears naturally in the examples and instructions here so you can find it later.

## How to actually start: a practical script blueprint

Below is a practical, idempotent structure you can adapt. Keep it in a Git repo (e.g., ~/dotfiles or github.com/you/machine-setup), and version it like any other project.

1. Repo layout (simple)
- bootstrap.sh — the orchestration script you run first
- install/
  - os/brew.sh
  - os/apt.sh
  - runtimes/asdf.sh
  - editor/vscode.sh
  - dotfiles/link-dotfiles.sh
- docs/ — notes for manual steps (e.g., 2FA recovery)

2. Principles to follow
- Check before you install (idempotency)
- Make backups of existing files (.bashrc.bak)
- Use package managers where possible
- Keep secrets out of the repo — prompt for them or point to secret managers
- Make optional sections explicit with flags (e.g., --full or --minimal)

3. Example snippets

OS detection (bash):
```bash
#!/usr/bin/env bash
set -euo pipefail

OS=""
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="mac"
elif [[ -f /etc/debian_version ]]; then
  OS="debian"
else
  OS="linux"
fi
echo "Detected OS: $OS"
```

Idempotent install example (Homebrew):
```bash
install_homebrew() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
    echo "Homebrew already installed, updating..."
    brew update
  fi
}
```

Linking dotfiles safely:
```bash
link_dotfile() {
  local src="$1" dst="$2"
  if [[ -e "$dst" && ! -L "$dst" ]]; then
    mv "$dst" "$dst".bak
    echo "Backed up $dst to $dst.bak"
  fi
  ln -sf "$src" "$dst"
  echo "Linked $src -> $dst"
}
```

Install runtimes via asdf (portable approach):
```bash
# install asdf if missing
if [[ ! -d "$HOME/.asdf" ]]; then
  git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.12.0
fi
# ensure asdf in PATH and then:
asdf plugin-add nodejs || true
asdf install nodejs 18.17.0
asdf global nodejs 18.17.0
```

These patterns let you add tools one at a time while keeping the whole script safe to rerun.

## Quick wins and practical tips to keep this maintainable

- Start small. Automate the top 10 things you manually install today. That yields the biggest time savings quickly.
- Use package lists rather than individual commands where possible. For example, brew bundle or winget import makes re-install easy.
- Keep secrets out of Git. For SSH keys, either generate inside the script and instruct the user to add the public key to services, or prompt to copy an existing key from a secure place.
- Document manual steps in docs/ — things you cannot automate (2FA, hardware tokens, corporate VPNs). Clear instructions reduce onboarding friction.
- Use dotfile stow or symlink scripts so config files are easy to update and revert.
- Test on a VM or secondary account before trusting the script on your primary machine.
- Make the script modular and use flags. A --minimal flag for quick setups and --full for a complete environment is handy.
- Keep a changelog in the repo. When you change versions (e.g., bump Node), note why and the date so teammates or future-you understand the reason.

Main keyword check: dev environment setup appears naturally three times here.

## Mistakes I see people make (so you don’t have to)

- Writing a single monolithic script that mixes OS-level changes, secrets, and interactive prompts. Split concerns so you can run non-interactive parts in CI or remote provisioning.
- Hardcoding usernames, directories, or network paths. Use $HOME and detect OS to keep things portable.
- Assuming the script will always succeed. Add sanity checks and fail-fast conditions with helpful error messages.
- Committing private keys or credentials. Don’t. Ever.
- Not updating the script. Your environment evolves; schedule a quarterly tidy-up and document breaking changes.

## Making this work with teams

If you’re building this for a team, put it in a central repo with a README and a short checklist for new joiners. Consider:

- A bootstrap CI job that runs the script in a container or VM to ensure it doesn’t break.
- A simple web page or README that explains which sections are mandatory and which are optional.
- A tiny CONTRIBUTING.md to accept new tools or changes — this keeps the script relevant and shared ownership prevents it from rotting.

And remember: not every developer agrees on every tool. Use sensible defaults and make opt-in configuration easy.

Wrapping up

A reproducible dev environment setup turns an annoying chore into a predictable, low-friction step. Aim for idempotence, modularity, and clear documentation. Put your script under version control, keep secrets out, and run the setup on a test machine before trusting it. Do that once, and the next time you unbox a laptop or onboard a teammate, you’ll save hours and start being productive faster — and that tiny win compounds into a lot more calm days at the keyboard.