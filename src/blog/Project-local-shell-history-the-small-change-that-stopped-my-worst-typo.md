---
title: "Project-local shell history: the small change that stopped my worst typo"
pubDate: 2026-05-06
description: "How I switched to per-project shell history so I stopped re-running the wrong commands on prod — the simple setup, the one mistake that still trips me, and why it's worth the tradeoffs."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a wooden table showing code in a terminal, with hands typing."
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["developer-tools", "workflow", "ops"]
---

It was 1:20 a.m., my home UPS had started its third automatic restart that week, and I was SSHing into the staging box over flaky Airtel broadband. I wanted to re-run a migration that had failed earlier. I pressed the up arrow out of habit to recall the last psql command I'd used on my local machine and hit Enter.

The command ran. Not on staging. On production.

Three hours and awkward Slack messages later, we had a partial rollback, a hotfix branch pushed, and one customer refund of about ₹4,500 that I still think about. The mistake wasn’t dramatic. It was gloriously, boringly human: my shell history gave me the wrong command at the worst possible time.

After that night I stopped defensively tapping my foot and started treating my shell history like a safety boundary.

Why project-local history
For years I assumed my global shell history was helpful. It is — until it isn't. The common problems I saw:

- Up arrow confusion: commands used in Project A leaking into Project B.
- Dangerous copy-paste: pasting a sudo rm or psql one-liner that looked right until you notice the wrong host or DB name.
- False confidence: "I ran this before, so it's safe" — even when the context (cwd, env vars, active kube context) was different.

Project-local history does one obvious thing: it keeps the list of typed commands tied to the repository you're in. If I'm in repo-x, my history file is repo-x/.history; in repo-y, it's repo-y/.history. No more accidental command resurrection from the wrong project.

How I set it up (simple, low hassle)
I wanted a setup that worked with zsh and bash, didn't require me to install a bunch of tooling, and survived my usual laptop reboots and slow hotel Wi‑Fi. This is what I landed on.

1. Decide where to store per-project history
I use the repo root's .git dir for convenience: .git/.shell_history
(If you prefer not to touch .git, use .cache/shell_history or $XDG_STATE_HOME/project-shell-history.)

2. Hook into the shell initialization
Zsh (in ~/.zshrc):

  if [ -n "$PWD" ]; then
    PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$PROJECT_ROOT" ]; then
      export HISTFILE="$PROJECT_ROOT/.git/.shell_history"
      export HISTSIZE=5000
      export SAVEHIST=5000
    else
      export HISTFILE="$HOME/.shell_history"
    fi
  fi

Bash is similar; adjust HISTFILE and history options accordingly.

3. Keep the history file shared across tabs
I enable immediate append so if I open multiple shells in the same repo, they all write to the same file:

  shopt -s histappend      # bash
  export PROMPT_COMMAND="history -a; history -n; $PROMPT_COMMAND"  # append and reload

4. A tiny guard for dangerous commands
I added a wrapper that prompts for confirmation if a command contains psql -c 'drop' or rm -rf and I'm in a repo marked as "production-affecting". We have a file PROD_PROTECT in repos with DB migrations. The script checks for that file and prompts once per shell session.

Why this stuck
- The change is tiny. If the repo is a git repo, history is automatic.
- It surfaces context. When I press up, I see only commands relevant to the codebase I’m working on.
- It reduces the most common mental slip: assuming the shell remembers the right host.

The honest failure I ran into
I implemented this and felt smug for a week — until I pushed a .git/.shell_history accidentally. Yes, I committed the file. So the very thing I used to avoid leaking commands almost leaked commands to the remote repo. Simple fix: add .git/.shell_history to .gitignore and set the Git exclude:

  echo ".git/.shell_history" >> .gitignore
  git update-index --assume-unchanged .git/.shell_history  # just in case

Lesson: never assume little files won't be committed. Double-check your gitignore and your team's workflow. I also learned that some CI runners clone with a clean working tree, so their history file is empty — fine for CI, awkward for local tests where I wanted a shared history across teammates. That tradeoff made me decide: per-project history is for local safety, not for shared operational playbooks.

Tradeoffs and annoyances
- You lose global recall. I can no longer hit Ctrl‑R and find that one random curl I used last month across projects. Sometimes that's annoying. I compensate by using a short, separate global history file for cross-project utilities ($HOME/.global_history).
- Tooling interactions. Some GUI terminals cache shell sessions weirdly and don't pick up prompt-command history sync. It took a night of fiddling to get consistent behavior across Alacritty and iTerm.
- Not foolproof. It didn't stop me once from pasting aone-line psql command that had the wrong --host. The wrapper helps, but it's not a replacement for habit: check your prompt, check your env, use tab-completion to see the DB host.

When to not use it
If you live in a world of many micro-repos and you constantly switch contexts inside one parent directory, per-repo history can feel fragmented. Also, if you share a single dev machine between multiple people (rare for me), per-project history won't protect against someone else's mistakes.

A simple habit that goes with it
Project-local history is a safety net, not a strategy. Combine it with two tiny habits that cost almost nothing:

- Make a habit of checking your prompt (I include the current kube context and DB host in mine).
- When running dangerous operations, prefix with echo then run the real command: echo psql ... && psql ...

Takeaway
I like small, local safety boundaries. Project-local shell history stopped me from resurrecting the wrong command at 1:20 a.m. and saved my team at least one painful weekend. It won't stop every risky action, and I still mess up, but it changed the kinds of mistakes I make from catastrophic to fixable.

If you do one thing tonight: add a project-local HISTFILE and add that file to .gitignore. It takes five minutes. It might save a refund, a patch, or a sleepless sprint review.