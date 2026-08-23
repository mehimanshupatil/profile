---
title: "Packaging my dotfiles as a Debian package (and the signing headache that taught me limits)"
pubDate: 2026-08-23
description: "I turned my dotfiles into a small .deb so new machines set up in minutes — and learned the hard way about signing, permissions, and what dotfiles should never contain."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a coffee cup beside it and someone's hands typing"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["dotfiles", "developer-tools", "infrastructure"]
---

It was 9:45 a.m. before a client demo and I was still copying config files, hand-editing ~/.gitconfig, re-checking PATH entries, and installing the same handful of packages I always forget. Every laptop setup felt like déjà-vu — slow, fiddly, error-prone. I wanted a reliable, repeatable, apt-get style way to "install my dev environment" in one command.

So I did what engineers do when annoyed: I packaged my dotfiles as a Debian package.

Why a .deb? Because apt/dpkg are familiar, atomic, and easily versioned. I could put a package on a tiny VPS, apt install it on a fresh Ubuntu box, and have consistent paths, systemd user services, and desktop entries in place. It sounded elegant. And for a while, it was.

How I built it (the simple, useful bits)
- Keep the package purely user-level. I created a package named arjun-dotfiles_0.9.0_all.deb that, when installed, drops files under /usr/share/arjun-dotfiles and creates a postinst script that symlinks selected files into /home/$USER/.config, /home/$USER/.local/bin and ~/.bashrc.d. Using /usr/share keeps dpkg happy — the package manager owns the files and can uninstall cleanly.
- Use fakeroot and dpkg-deb. Build steps are tiny: layout the filesystem tree, add DEBIAN/control, DEBIAN/postinst and DEBIAN/prerm scripts, run fakeroot dpkg-deb --build. No custom packaging system needed.
- Put executable helpers in /usr/local/bin via postinst (symlinks), not by editing PATH directly. That avoids races and is transparent to other users on the machine.
- Host the .deb on a cheap VPS as an apt repo. I spun up a ₹300/month VPS, installed reprepro, and served a minimal repo over HTTP. apt sources.list.d/arjun.list + apt-key (I'll come back to this) and machines could apt update && apt install arjun-dotfiles.
- Versioned releases. Bump the package version when I change configs that are not safely overridden (e.g., VS Code settings). I tag in Git and upload the built .deb to the VPS.

What actually worked
- New laptop bootstrap went from ~25 minutes of copy-paste and fiddling to an apt install that handled symlinks, user services and even installed a few CLI tools that my scripts expected.
- Rollbacks were trivial: apt remove arjun-dotfiles removed symlinks and code I didn't own in the home directory.
- Teams loved it for onboarding interns and contractors. One apt command, consistent shell prompt, sane git hooks.

The three mistakes that stung
1) I attempted to manage dotfiles that must remain user-owned
On my first public release I shipped a postinst that chowned some files into /home/$USER directly. It ran as root (dpkg scripts do), set ownership incorrectly for a user that wasn't created yet on some machines, and in one case overwrote a carefully hand-edited ~/.bashrc on a senior teammate's workstation. He lost a custom prompt that took him months to perfect. I learned the hard rule: package files must be installed as root in a neutral place — never directly write into a user's home. The postinst should only create symlinks and be idempotent.

2) GPG signing felt necessary — until it wasn't
I wanted a proper apt repo, so I created a GPG key and added the public key to apt-key on my machines. Then one morning I accidentally committed the private key to a branch in my dotfiles repo. It was a dumb, avoidable mistake — but it forced a complete repo / key rotation, re-signing every package, and three days of onboarding everyone to the new repo key. I now store signing keys on a hardware token and never in the codebase. If you host an apt repo, plan key management first. Expect the day you'll need to rotate keys and make that process scripted and tested.

3) Cross-distro and permission issues are real constraints
What works on Ubuntu/Debian doesn't apply cleanly to Fedora, Arch, macOS, or WSL2 quirky mounts. I assumed the team would be on Ubuntu LTS. They weren't. Some engineers use Fedora at home; some use WSL which behaves differently with symlinks. The package became a brittle "official setup" only for a subset of machines. I had to stop pretending a single .deb would solve all onboarding. The constraint: if your org is heterogeneous, keep the .deb as an option, not the standard.

The tradeoffs I accepted
- Complexity vs. convenience: packaging added build and repo-maintenance work. I now spend ~30 minutes every release to build, sign, upload, and test the package. For me that cost is worth it — for a small team it might not be.
- No secrets in packages. Nothing that looks like a token, SSH key, or personal password goes into the .deb. Ever. Secrets belong in a secrets manager or are generated during first-run.
- Human-in-the-loop for edge cases. I still keep a bootstrap shell script (repo clone + symlink dry-run) for folks who want non-packaged installs. The .deb is for repeatable defaults, not for every personal tweak.

When it failed spectacularly
Two months in, in the middle of a client demo, apt tried to upgrade my dotfiles package because I had pushed a hotfix to fix a zsh completion bug. The postinst ran and re-wrote a handful of symlinks while I was in a tmux session. My shell prompt reset and some environment variables vanished; the demo CLI failed. I had to apt remove arjun-dotfiles and manually restore. The root cause: postinst scripts are run by root and are not transactional from the user's perspective. Lesson: never change live active shell files during an upgrade; emit a "changes pending — please logout/login" marker instead.

Who this actually helps (and who it hurts)
- Helps: engineers who get fresh laptops, contractors, small startups with many Ubuntu desktops, people who value reproducible defaults.
- Hurts: polyglot OS environments, teams that expect dotfiles to be a personal playground, and anyone who can't tolerate post-install reboots/logouts.

Final takeaway
Packaging dotfiles as a Debian package is a practical, repeatable way to standardise developer setups on Debian/Ubuntu. It's fast, versioned, and reversible. But it's not magic: treat it as a delivery mechanism for stable, shared pieces only. Keep secrets out, never write directly into home directories from postinst, and assume you'll need a fallback manual script. The real win wasn't the package itself — it was forcing discipline around what config is shared and what remains personal.

If you try this, start with a tiny package that only symlinks a handful of files and add signing/key rotation playbooks before you need them. And keep a backup of your colleague's prompt. You'll be grateful.