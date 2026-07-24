---
title: "The night Notion locked me out: why I moved incident runbooks to a git repo"
pubDate: 2026-07-24
description: "How I stopped relying on Notion for on‑call runbooks and built a tiny Git‑backed runbook repo that survived flaky SSO, mobile data, and a midnight pager—plus the tradeoffs I still live with."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1496318447583-8b3e1847b58f?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop in a dimly lit room, with code visible on the screen"
  caption: "Photo by Miguel Á. Padriñán on Unsplash"
  creditUrl: "https://unsplash.com/@miguelapadrinan"
tags: ["runbooks", "on-call", "devtools"]
---

The pager went off at 02:13. My phone buzzed, the office Slack lit up, and I opened Notion from my phone to follow the runbook the night shift had added a week earlier. Notion refused to load—our SSO had a hiccup, and my phone's 1GB prepaid pack had exactly the kind of unreliable bandwidth that makes a modern web app crawl. I fumbled through chat messages trying to remember commands, while a cascade of alerts kept firing.

That night I realised I had two problems: a single point of failure (Notion+SSO), and a format that wasn't optimised for frantic, low‑bandwidth reading or fast copy‑paste on a phone. The runbook existed, but it wasn't where I could use it when I needed it most.

I moved the runbooks into a tiny Git repo. That decision was born of that 02:13 buzz and a very practical checklist: low friction to fetch, readable on small screens, auditable history, and editable by engineers who already live in git. Eight months in, it's my primary incident source—even on shaky mobile networks—but it's not perfect. Here’s exactly how I set it up, why it works for a small Indian startup team, and the one failure that forced me to change how we update runbooks.

Why a repo, not another doc tool
- Notion is great for rich pages, approvals, and onboarding. It’s terrible when your SSO, VPN, or mobile connection is flaky at 2 a.m.
- Our team already uses GitHub for everything else. Everyone knows clone, fetch, grep. No new accounts, no new UI.
- Plain Markdown is tiny. A 50‑line runbook is 2–3 KB. It loads instantly on cheap phones and copy/pastes cleanly into terminals.
- Git gives you audit trails without asking. I can see who last changed the "database restore" steps and revert if they broke the wording.

How the repo actually works
I kept the setup minimal so people would actually use it.

- Layout: /runbooks/<service>/<incident>.md. Files are versioned, small, and focused. A single file rarely exceeds 200 lines.
- Local fetch: git clone once on my laptop and phone (Termux on Android; iSH on iPhone for the brave). For quick access, I added a one‑line curl endpoint that serves the raw file from GitHub via the raw.githubusercontent URL. No JS, no heavy rendering.
- Search: ripgrep locally. On phones I rely on GitHub’s fast search when the mobile data behaves.
- Publishing: a GitHub Actions job builds a tiny static site (pure HTML) for the team intranet. That site is cached by Cloudflare and is basically just preformatted Markdown—works even on the worst office Wi‑Fi.
- Editing: engineers edit in branches and open PRs for larger changes. For small corrections (typos, after‑incident notes) the on‑call person edits directly on the repo with the web editor; that creates a commit and preserves history.

All of this costs us effectively ₹0 beyond standard GitHub billing. No extra SaaS licences. The biggest productivity gains are in read access: during incidents we don't wait for a page to load or a login to happen.

Real tradeoffs I accepted
Nothing free is perfect. The repo model forced tradeoffs we still live with.

- Non‑engineers struggle. Our ops manager or product owner can’t always edit comfortably. We trained them to file an issue, and a nearby engineer merges it. This adds friction for occasional updates, and yes, we lost some nice visual diagrams in the process.
- Merge conflicts in the heat of an incident are real. We fought over a "who fixed this last" line once and created a messy PR that took longer to resolve than it should have. We fixed this with a tiny rule: on‑call can push direct edits to a /drafts folder that gets merged post‑incident.
- Mobile editing is still clunky. The GitHub web editor works, but it's not as friendly as a rich editor when you're trying to insert a screenshot from a phone. We accept that for reliability.
- It exposed our laziness on maintenance. With Notion, the team had been pretty lax (formatting, dead links, out‑of‑date steps). In git there's pressure to keep things accurate because bad instructions are a commit away from being reverted—and that’s both good and painful.

An honest failure: the night the runbook lied
Three months after the move we hit an outage where our database schema mismatch required a manual add‑column and data backfill. The runbook had been rewritten two days earlier with the new safer procedure, but the engineer who updated it had done so on a local branch and never pushed. I followed the old steps. For 42 minutes we were restoring the wrong dump, and the service stayed degraded longer than it should have.

That mistake made two changes mandatory:
- A post‑incident checklist step: "push local edits before leaving on‑call." Yes, sounds obvious. We made it a line item in every incident report.
- We added a "last verified" footer to each runbook with a git commit hash and a quick checksum script that flags local copies older than the latest commit. It’s a small guardrail that caught a stale file for a teammate a week later.

When the repo is wrong, it's very wrong. Unlike Notion where edits could be interactive and you might be prompted about conflicts, git relies on the human to push and sync. We accepted that risk and built small social and technical mitigations.

What I actually walked away with
A runbook isn’t a fancy doc; it’s a tool you use when you’re tired, on a bad network, and under pressure. Moving runbooks into git made them fast, auditable, and resilient to SSO or web UI failures—exactly what matters at 02:13 with a 1GB prepaid plan and a Bangalore signal that decides to nap. The tradeoffs are real: non‑engineers need a little help, merge conflicts happen, and local edits can go missing. But after eight months and dozens of incidents, I trust the git repo more than I trusted a document I couldn't open.

One question we still ask every quarter: how do we make editing runbooks as easy for ops and product folks as it is for engineers, without reintroducing the single point of failure? We haven't solved that cleanly yet. If your team cracked that balance, tell me how — short, practical notes only.