---
title: "Why I stopped treating one tmux session like my whole dev world"
pubDate: 2026-06-19
description: "I used to keep one long‑lived tmux session across machines. After losing work and fighting flaky SSH, I switched to short, named sessions plus a tiny wrapper that saves scrollback. Here's what I do now."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with a coffee mug on a wooden table"
  caption: "Photo by Glenn Carstens‑Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["devtools", "workflow", "linux"]
---

It was 2:17 AM, my laptop hot and fan‑loud, office VPN flaky, and I was frantically reattaching to the same tmux session I’d been using for two months. One window had my REPL, another had a CI watcher, a third had a half‑finished sed incantation. SSH dropped. Reattach failed. When it finally came back, my REPL history was gone and the CI watcher had died mid‑run. I stared at the blank prompt and realised something small had been turning tiny outages into hours of recovery work: I treated one tmux session like a persistent brain.

That session had become a mess: dozens of windows, shorthand names like "dev", and a mental model that "if it's in tmux it will survive". That assumption is wrong in the real world—especially in India where I switch between office wired networks, home broadband that blips during monsoon, and mobile tethering with Airtel when the fiber dies. Over two painful incidents I changed my habit. I still use tmux, but differently.

Why a single long‑lived session felt good (and why it wasn't)
Keeping one tmux session has obvious perks. Everything is in one place. Reattach = instant context. Shortcuts keep working. But the tradeoffs hit me in real scenarios:

- Fragile reattach across machines: $TERM mismatches, different tmux versions on a desktop vs work laptop, and terminal emulators that handle unicode/line drawing differently. Reattaching sometimes mangled panes.
- Single point of confusion: When someone asks "which window has the DB logs?" the answer is "um, in my 47th window." I kept wasting 10–20 minutes every session just hunting.
- Hidden assumptions about backgrounding: I once closed a pane thinking a process would survive because tmux was persistent; it didn't. A long test run died. That cost me a full evening.
- Bloated scrollback and memory: that session carried months of logs. On a laptop with 8GB RAM and zram swap, it felt heavy. During a compile the machine started swapping, tmux slowed, everything went downhill.

What I changed — three small, practical rules
I didn’t rip tmux out. I rewired how I use it. These are specific habits (and the one script I now run before I start a task).

1) Session per task, named and forgettable
Instead of "one session", I now create sessions named like project/task/user: algo‑fix/metrics/arjun or infra/migrate‑20260614. Names are explicit and ephemeral. I aim for a lifespan of the task: a bugfix session lives a day; a release session might live a week.

Command I use:
  tmux new -s "$PROJECT-$TASK-$(date +%s)"

Yes, I use timestamps. It avoids collisions and forces me to stop assuming I’ll reattach months later.

2) Auto‑save scrollback on detach
Losing the scrollback was the worst. I added two tiny tmux commands to my shell wrapper: when I detach or kill a session, it runs capture‑pane and writes it to ~/tmuxlogs/<session>.log. That file becomes my quick "what happened" record.

Example (very small):
  tmux capture‑pane -pS -10000 > ~/tmuxlogs/$SESSION.log

This costs me a few KB per session and zero mental overhead. On my laptop the folder is 50–100MB a month; manageable. I can search logs with rg in seconds. For longer garbage collection I delete logs older than 90 days.

3) If it must survive, don't rely on tmux
After losing a migration run, I stopped using tmux as the mechanism for durability. Long jobs now run under systemd --user services, nohup+disown, or inside a tiny script that uses setsid and tees output to /var/log/myjobs/. For anything I can't restart with a single command, I use a proper backgrounding mechanism.

Honest failure and the lesson it forced
The first two weeks after switching to per‑task sessions were clumsy. I closed a session thinking the output was saved because my wrapper did a capture‑pane, but the process had spawned children and the child continued silently after I detached, eating CPU and running a flaky experiment for hours. My wrapper saved scrollback but not the child's output once it moved TTYs. I had to admit: tmux capture isn't a job supervisor.

That incident made the rule stricter: if the job matters more than being able to reattach, put it under proper process supervision. I added a checklist line to my wrapper: "Is this long‑running? yes/no" — and if "yes" it warns me and suggests systemd-run or screen+nohup.

Why this works in India (and for small teams)
We flip networks a lot — office to home to mobile. We don’t always have identical machines (laptop vs desktop). We also work on low‑spec laptops sometimes bought on a ₹40,000 budget. Ephemeral, named sessions map to that reality: they reduce cross‑machine assumptions and make context explicit. The scrollback logs pay back quickly when your office network drops during a demo and you need to show what went wrong.

The ugly tradeoff: more files, more short‑lived sessions
Yes, I have more tmux sessions visible when I run tmux ls. I have a tmuxlogs folder with a few dozen files. Sometimes I forget to clean up. Once, one of the logs had sensitive tokens because I had evalled a curl with a key; that pushed me to better secrets habits, not to stop saving logs.

My tiny wrapper (a 20‑line shell script) looks like this:
- creates a timestamped session with a descriptive name
- writes a short TODO to ~/tmux/notes/<session>.md
- on detach, captures pane to ~/tmuxlogs/<session>.log

That script cost me maybe an hour to write and has saved me many more hours.

One thing I actually walked away with
Treat tmux like a temporary workspace, not long‑term storage. Name sessions per task, capture scrollback automatically, and if something needs to survive network and reboots, put it under a proper job supervisor. That rule turned hours of "where did I leave that thing?" into a 30‑second lookup most days.

If you have a different low‑friction way to capture scrollback or resurrect panes without the mess, I'm genuinely curious — I've tried resurrect plugins and they felt brittle across tmux versions. What works for you?