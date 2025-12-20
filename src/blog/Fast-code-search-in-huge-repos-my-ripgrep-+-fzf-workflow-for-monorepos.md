---
title: "Fast code search in huge repos: my ripgrep + fzf workflow for monorepos"
pubDate: 2025-12-20
description: "A practical, low-cost workflow using ripgrep, fzf and bat to do fast code search in large monorepos on modest machines."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.0&w=2000&h=1000&fit=crop&q=80"
  alt: "Developer typing on a laptop with code on the screen and a cup of coffee nearby"
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["fast code search", "developer tools", "workflow"]
---

When your repo grows past a few hundred megabytes, the tiny “Find in Files” that used to save you starts to feel like molasses. I've been there — large monorepos, limited RAM on a work laptop bought in India, and intermittent internet that makes cloud-based search tools feel like a luxury. Over the last two years I landed on a practical, offline workflow that gets me to the right file in seconds: ripgrep + fzf + bat.

This isn't a magic solution for every situation, but it's fast, cheap, and—critically—works well on a mid-range laptop. Below I explain the pieces, a small shell function you can drop into your shell, and the tradeoffs to expect.

Why this combo?
- ripgrep (rg) is a blazing-fast recursive search that respects .gitignore and handles huge codebases efficiently.
- fzf gives instant, interactive filtering of results so you can narrow matches without rerunning searches.
- bat is a nicer previewer (optional) that shows syntax-highlighted context as you browse results.

Together they deliver a simple, keyboard-first "fast code search" experience that feels like using an IDE search but without the memory footprint.

What I actually run
Install ripgrep, fzf, and bat via your package manager (apt, pacman, Homebrew, or Scoop/WSL on Windows). On my Ubuntu laptop (8–16GB RAM typical for many devs in India) this is lightweight and snappy.

Here’s a stripped-down shell function I use (works in bash/zsh):

search() {
  local query="$1"
  if [ -z "$query" ]; then
    echo "Usage: search <term>"
    return 1
  fi

  rg --line-number --hidden --no-ignore-vcs --glob '!.git/**' \
    --glob '!node_modules/**' --glob '!dist/**' --glob '!build/**' \
    --color=always "$query" \
  | sed -E "s/(:[^:]+:)/\1\x1b[0m/" \
  | fzf --ansi --delimiter : --nth 3.. \
      --preview 'bat --style=numbers --color=always --highlight-line {2} {1}' \
      --bind 'enter:execute(vim +{2} {1})'
}

Drop it into .bashrc or .zshrc. Usage: search TODO or search MyClassName.

How it feels in practice
- Type the basic search, get instant results, and interactively filter with fzf.
- Select an entry to open the file at the matching line in your editor (I bind enter to open vim; change to code or idea if you prefer).
- The preview shows a syntax-highlighted snippet so you rarely open the wrong file.

A few practical tweaks I lean on
- Use --hidden and --no-ignore-vcs when you need to search dotfiles or generated files; otherwise let ripgrep honor .gitignore to speed things.
- Add --glob '!**/*.min.js' or other excludes to avoid noisy matches.
- For cross-repo searches, run the command at your repo root; ripgrep is multithreaded and scales surprisingly well.
- If you want fuzzy matching on file paths too, pair fd (fd-find) to produce file lists and feed them to fzf.

Why I prefer this over cloud or indexed tools
- No upload of proprietary code — important for many teams in India and small companies.
- Works offline and inside VPNs.
- Low memory usage compared to full IDE indexers or Sourcegraph instances; on an 8GB laptop the responsiveness remains solid.

Real tradeoffs (so you know the limits)
- Not semantic — this is text search. You’ll miss type-aware queries, cross-reference jump-to-def, and advanced language features that an indexed code intelligence tool provides.
- On truly massive monorepos (tens of GBs with millions of files), ripgrep still runs well but initial scans can be slower; in those cases an indexed solution or selective globbing becomes necessary.
- Windows support is fine via WSL but requires extra setup; native Windows shells are more fiddly.
- You need to install and maintain a few CLI tools; small overhead but worth it for speed.

A realistic workflow example
Say you’re debugging a flaky feature and you remember the environment variable name but not where it’s read. You run:

search "FEATURE_X_ENABLED"

Within seconds you have occurrences across services, quickly preview context with the arrow keys, and jump into the one that shows how it’s parsed. No waiting for a server-side index to catch up; no extra cost.

Tuning for Indian constraints
If your machine is modest (4–8GB RAM), avoid opening too many editor instances from fzf; prefer a single editor and reuse buffers. If your office bandwidth is capped or unreliable, this offline approach keeps you productive without bringing up remote tools.

Parting advice
This setup won't replace an IDE's deep static analysis, but it's the fastest way I know to find the right file or line in a noisy monorepo when time matters. The biggest win is velocity: fewer context switches, less waiting, and a keyboard flow that keeps your hands where the work happens.

Try it for a week. Tweak the globs to suit your repo, add aliases for service roots you work on, and accept that sometimes you’ll need a semantic tool for really hard cross-repo problems. For everyday debugging and exploration, this "fast code search" combo saves me minutes every day — and those add up.

Good luck, and if you want, tell me what your repo looks like and I’ll suggest globs and a tuned function that fits it.