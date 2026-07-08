---
title: "Moving work notes out of Notion: the Obsidian + Git setup that actually scales"
pubDate: 2026-07-08
description: "Why I stopped relying on Notion for day-to-day engineering notes and switched to an offline-first Obsidian + Git vault — the simple setup, the merge conflict that hurt, and the one rule that saved me."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1505238680356-667803448bb6?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop at a wooden table with a notebook and coffee."
  caption: "Photo by Dylan Gillis on Unsplash"
  creditUrl: "https://unsplash.com/@dylangillis"
tags: ["productivity", "notes", "tools"]
---

It was the night before a client demo. Office internet was limping along at 200 Kbps (Bengaluru building-wide outage), and I needed one line from a troubleshooting note I had written that morning. Notion wouldn't load. The mobile app kept spinning. The browser tab timed out. I sat there, phone tethered to the laptop, watching a page I had edited an hour ago refuse to render. The demo went okay, because I winged it. But the irritation didn’t go away.

That was the fifth time in three months I’d been blocked by cloud-first note software. Slow internet, flaky mobile, or a workplace firewall would turn my note-taking into a lottery. I wanted two things: reliable offline access, and notes that felt like code — discoverable, versioned, revertible. Notion gave me convenience and a nice interface. It didn’t give me control.

## The setup I actually use now

I moved my daily engineering notes and runbooks into an Obsidian vault, stored in a Git repository. No central server required. No heavy sync service by default. This is what works for me, in practice:

- Obsidian as the editor. Markdown files, links, and local graph visualisation. I open the vault on my laptop and it's instant.
- The vault lives in a private Git repo (GitHub). Every meaningful edit I make I commit with a short message: "note: pager handover" or "doc: DNS debugging steps".
- For syncing between my laptop and phone when I need it, I use Syncthing on the devices I control. Syncthing replicates the vault folder peer-to-peer over LAN or over the internet (with relays when necessary). It’s free, runs on Linux/Mac/Android, and doesn't care about flaky ISPs.
- For anything sensitive (API keys, client PII), I keep a separate encrypted file using GPG. I never commit secrets into the repo. I also enforce a pre-commit hook that scans for obvious secret patterns. The hook is tiny — five lines — but it saved me once.
- Backups: a daily cron job pushes a bundle to a cheap ₹300/month VPS (tar + gzip + GPG) and retains 14 days. Cheap insurance; restores have been trivial.

Why this over ObsidianSync or Notion? Because offline first = reliability. Git gives me history and safe rollbacks. Syncthing keeps mobile edits available without a third-party cloud. I can grep my whole vault with ripgrep in 0.2s. No waiting. No spinner.

## The day it broke — and what I learned

Nothing that matters stays perfect. Two tradeoffs bit me hard.

First: merge conflicts. One rainy weekend I edited the same meeting note on my phone on a train and on my laptop at a café. Syncthing synced both copies to the VPS and then to my laptop. Git, when I finally committed, complained about conflicts. I opened both versions, tried to resolve manually, and accidentally deleted a half-hour of debugging steps I needed for the Monday incident. I could have recovered via reflog, but I didn’t — because I hadn't pushed yet, and the reflog was messy. I lost time reconstructing that troubleshooting timeline.

Second: search collisions and mobile ergonomics. Obsidian on Android is good, but it’s not as fast for heavy linking as the desktop. Syncthing sometimes leaves partial file states if the phone app is killed mid-sync. For this reason I avoid editing large multi-section docs on mobile.

Those failures taught me two practical rules:

- Commit early, commit often. Small commits mean conflicts are smaller and easier to resolve. I now aim for commits that correspond to single thoughts: "add note about X", not "weekend edits".
- One device is authoritative for a note during active editing. If I start a long edit on my laptop, I mark the note title with "editing (laptop)" and avoid touching it on mobile until I push. Yes, it’s mildly manual. Yes, it avoids the pain.

I also introduced a tiny habit: a 10-second pre-demo checklist. Open the vault, grep the keyword I know will save the demo, and confirm the file is committed and pushed. Takes less time than refreshing Notion.

## The real tradeoffs (money, convenience, company norms)

I’m not pretending this is frictionless. Obsidian offers a paid sync and mobile app experience. I could have paid for Obsidian Sync (~$4/month back when I checked) and had a polished cloud-backed flow. I chose not to, because I prefer avoiding recurring costs and keeping data control. If you travel a lot or want battery-level syncing without tinkering, Obsidian Sync is worth the ₹300–₹400/month for many people.

There’s also onboarding friction. New hires expect a Notion link. I still keep a public-facing, curated Notion page for high-level docs and company-facing runbooks. Obsidian + Git is for personal or small-team operational stuff where offline access and version history matter more. We sync the essential runbook pages into Notion when they stabilize.

Finally, this setup assumes you don't mind a bit of ops. Syncthing, GPG, cron jobs — they all need occasional attention. If your home internet is truly chaotic, or you share devices, this will add complexity. But in my day-to-day, the added reliability is worth the few minutes of maintenance each month.

What I actually gained

I stopped being the person who refreshes a page and prays the notes load. I regained micro-moments — the ability to open a vault, grep, and get the precise command I need. Version history saved me when I misremembered why a change was made. And the discipline of small commits changed how I write notes: more atomic, better titles, less noisy edit history.

My honest takeaway: moving away from cloud-first note tools is not about avoiding convenience. It's about choosing reliability over convenience for specific classes of work — on-call runbooks, incident timelines, and any note you might need when the internet is the thing that's broken. If you want a predictable, offline-first experience and don't mind a little setup, Obsidian + Git + Syncthing gives you that. If you want zero maintenance and perfect mobile UX, buy Obsidian Sync or stick with Notion — but be ready for the occasional "spinning page" at the worst possible moment.