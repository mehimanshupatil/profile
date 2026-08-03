---
title: "Why I display the active ticket in my shell prompt (and the tiny script that actually kept me focused)"
pubDate: 2026-08-03
description: "A one‑line habit: show the current ticket ID and short note in every terminal. How I built it, when it failed, and why it saved me 30+ minutes a day."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a terminal window open and a coffee mug beside it"
  caption: "Photo by Alex Knight on Unsplash"
  creditUrl: "https://unsplash.com/@alexknight"
tags: ["productivity", "developer-tools", "focus"]
---

It’s 4:12 pm. I’m three dings into a Slack thread, have a PR review open, and the PM has just asked me to “quickly check” a production log. I switch terminals. I open another tab. I forget which branch belonged to the bugfix I was halfway through. Five minutes later I’m back at the original tab, swearing, like it’s 2012 and I don’t own a brain.

That used to be my daily friction — tiny, repeated context switches that added up to lost focus and irritated colleagues. I tried the usual stuff: fewer tabs, a single task tracker, calendar blocks that looked good on paper and failed at 3 pm. The thing that finally stuck was embarrassingly small: I made my shell show the active ticket ID and a one‑line note in every terminal prompt.

What I changed (the minimal script)

I wanted a visible, persistent anchor. Something that appears the moment I open a shell and tells me, in two characters and ten words, what I should be doing.

The setup is two tiny parts:

1) A CLI to set/clear the current task:
- task-start <TICKET> "one-line note"
- task-clear

I keep a single file ~/.current_task that the script writes to. task-start writes "PROJ-234: investigate Redis OOM" into that file and exports TASK=PROJ-234 in the calling shell.

2) A PS1 snippet that reads ~/.current_task and prints it at the start of the prompt (coloured, short). On bash/zsh it’s one line that’s cheap to evaluate.

Example commands I use (conceptual — your shell will differ):
- echo "PROJ-234: investigate Redis OOM" > ~/.current_task
- export TASK=PROJ-234
- PS1="$(cat ~/.current_task 2>/dev/null) \u@\h:\w\$ "

Why this works better than a fancy tool

- Visibility: the prompt is unavoidable. I open a new terminal dozens of times a day. Seeing the ticket there is a micro‑reminder to keep context. It beats opening Yet Another Tab or switching apps.
- Low friction: starting a task is one command. It takes less time than mentally arguing whether to create a JIRA subtask.
- Cross‑tool: the same TASK env can be referenced by my small git hook to suggest commit message prefixes, and by tmux status lines so even a terminal multiplexer shows the current task.
- Offline friendly: works on my laptop on the 4G backup when office Wi‑Fi crawls at our Bengaluru hub. No network call, no flaky API.

Concrete benefit I saw

I tracked two weeks before and after. On average I regained ~30 minutes of uninterrupted work per day. Not because it magically extended focus stamina — because the prompt prevented an extra 6–8 small switches that each cost 3–5 minutes of context rebuilding.

When it broke (and why that mattered)

This is the honest failure: for a week I relied on the prompt and stopped writing the tiny one‑line note. I’d simply task-start PROJ-456 and leave it at that. The prompt read "PROJ-456" for hours. Two things happened:

- I made a commit with the wrong ticket referenced because my commit template auto‑prefixed commits with $TASK. That required a revert and an awkward explanation on the PR.
- The prompt became meaningless background noise. Without the short note — "reproduce on staging" or "add unit tests" — the anchor lost its value.

The fix was brutal but simple: I made task-start require a note (one sentence) and added a pre-commit hook that refused to prefix a commit without one. That tiny enforcement nudged me back into concise intent-setting. It also forced me to pause for ten seconds and think "what's my next small goal?" before diving back in.

Real constraints and tradeoffs

- This doesn’t solve deep work. If you need a 90‑minute block, scheduling a prompt doesn’t build willpower. It only saves low‑value switching.
- Prompt leakage: screenshots, shared terminals, or accidental logs can expose ticket IDs or short notes. I avoid including sensitive content in the note (no customer PII, no internal passwords).
- Discipline still matters: you must call task-start and task-clear. If you don’t, you’ll get stale prompts. My workaround: a tiny cron job that reminds me every 2 hours to check if my TASK still applies.
- GUI apps: this helps terminals. It won’t stop you from losing browser tabs or VS Code buffers. But it integrates well with the parts of my workflow that are terminal-heavy: git, running tests, tailing logs.

How I use it in an Indian work context

- In teams that use JIRA, the ticket ID is a perfect anchor. In smaller startups where we use GitHub issues, I use the issue number prefixed (e.g., #112).
- For freelancing gigs where clients don’t have structured tickets, I put the client's short name and task: "ACME-invoice‑UI".
- When internet is flaky (I work from a small apartment in Pune sometimes), the prompt avoids any cloud calls and still keeps me honest.

One script I run on every laptop

If you want the idea, try this pattern for a week:
- Make task-start require a one-line note.
- Put the note in ~/.current_task and export TASK.
- Show the file in your PS1.
- Add a tiny git hook that suggests the commit message as: "$TASK - <your message>" but refuses to insert a blank TASK.

No special tools. No new app. Ten minutes to set up. A week to test.

What I walked away with

A small, visible anchor reduced my context switching far more than another "productivity app" ever did — because it lives where I spend the most mental energy: the terminal. It didn’t fix focus entirely, and it once cost me a messy revert. But forcing myself to write one short sentence before I start a task made me stop auto‑switching and start thinking in smaller, finishable steps.

Try it for five workdays. If it becomes background noise, tighten the rule: require the one‑line note. It’s a tiny friction that pays back in minutes, not hype.