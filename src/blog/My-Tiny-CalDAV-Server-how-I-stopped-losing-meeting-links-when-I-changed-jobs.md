---
title: "My Tiny CalDAV Server: how I stopped losing meeting links when I changed jobs"
pubDate: 2026-09-26
description: "I ran a small CalDAV/CardDAV server on a ₹300 VPS so my calendar and contacts don't disappear when company accounts get revoked—what worked, what failed."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a wooden table with a notebook, phone, and a cup of coffee"
  caption: "Photo by Scott Webb on Unsplash"
  creditUrl: "https://unsplash.com/@scottwebb"
tags: ["devtools", "self-hosting", "productivity"]
---

I missed a client demo three weeks into my notice period because my company disabled my Google Workspace account faster than I expected. The meeting link I’d created, the calendar of follow-ups, and a dozen shared contacts vanished in one sweep. I fumbled through chat logs and old emails for half an hour and then explained, awkwardly, why I’d disappeared.

That was the exact friction that pushed me to stop renting my calendar to other people’s infra. I now run a tiny CalDAV/CardDAV server on a cheap VPS and sync it with my phone and laptop. It’s not glamorous. It costs me about ₹300/month plus a domain renewal. But the week I handed in my resignation, it paid for itself in peace of mind.

Why self-host a calendar (and contacts)
- Because company accounts can, and will, disappear. Contractors, consultants, and folks who switch startups often hit this.
- Because shared links and invite metadata live in the calendar. Losing the host means losing the canonical source.
- Because my phone and laptop stay in sync even when I move networks—no more scrambling for meeting URLs in archived mails.

How I set it up (the practical bits)
I wanted something lean, reliable, and easy to recover. I tried a couple of stacks and settled on Radicale (CalDAV/CardDAV) running in Docker on a ₹300/month VPS (DigitalOcean/Synapse-like cheap tier). Total setup time: two afternoons.

What I did, step by step
- Buy a domain (₹700–₹1,000/yr) and point an A record to the VPS. Use certbot + Let’s Encrypt for TLS (free).
- Deploy Radicale in Docker. It stores data as simple files—easy to back up. Config: basic auth + HTTPS only.
- Expose only necessary ports. I use nginx as a reverse proxy with HTTP->HTTPS redirect and basic rate limiting.
- Sync clients: macOS Calendar works natively with CalDAV; on Android I use DAVx5 (paid-ish but excellent). iOS also supports CalDAV natively.
- For remote reliability, add Tailscale as a fallback: if TLS renewal or DNS ever breaks, my devices can still reach the server privately over the Tailscale network.
- Backups: daily cron to rsync the Radicale storage to an offsite bucket (encrypted). Restore test: once every quarter I import a copy to a local calendar app to make sure backups are healthy.

Tradeoffs and the one time it blew up
This is not zero-maintenance. You now own small ops work: cert renewals, server updates, backups, and occasional sync weirdness. I learned that the hard way.

First failure: my initial Radicale config allowed unauthenticated writes from a misconfigured client. Overnight someone’s phone (mine, misconfigured) and an automated script flooded the calendar with duplicate recurring events. I spent a Sunday deduplicating entries and restoring from backups. The root cause was timezone misconfig + client re-creating events on sync conflicts. Lesson: enforce auth, set sane ACLs, and pick a client that handles conflicts predictably. After that I flipped Radicale to strict ACLs, enabled write-rate limiting in nginx, and added a small "last-write-wins" preflight script that rejects obviously-bad bulk writes.

What I actually gained
- Continuity: when I changed employers, my scheduled events and contacts stayed with me. No frantic forwarding, no lost links.
- Independence: I can create recurring events that live outside any company umbrella (personal projects, interview pipelines, family schedules).
- Control over privacy: no analytics or corporate scanning. I keep a tighter grip on who can create or modify shared calendars.

Why this fits India work life
- Office Wi‑Fi in many buildings is flaky; Tailscale+CalDAV keeps my devices in sync even when I bounce between home 100GB JioFiber, an office hotspot, and a BharatNet-backed café. That’s useful when demos happen on odd networks.
- Salary cycles and job hopping are real. I’ve heard too many stories of calendar-based evidence disappearing when HR flips a switch mid-month.
- The cost fits an urban budget: ₹300/month + the odd ₹800/year domain is cheap insurance against a missed contract or a lost client call.

When I’d still choose a cloud calendar
I’m not evangelical. If you:
- Need shared company resources (shared conference rooms, corporate directories),
- Depend on tight integration with Google Meet, Zoom provisioning, or enterprise SSO,
then a cloud calendar still makes sense. I keep a secondary sync to Google for those integrations but treat it as ephemeral—my primary source of truth is my CalDAV server.

Final constraint worth stating: sync is only as reliable as the clients. I saw odd duplicates when I mixed a flaky Android client with macOS and iOS. If you don’t want to babysit, skip this. If you can tolerate ~1–2 hours setup and the occasional weekend incident, it’s worth it.

Takeaway
If you’ve ever lost a meeting because an employer disabled your account, consider a tiny, self-hosted CalDAV server as insurance: small monthly cost, a couple of hours to set up, and you keep the thing that actually matters—your schedule. Would I recommend everyone do it? No. But if you value ownership over convenience, it’s one of the simplest, lowest-cost ways to avoid a very specific, infuriating failure mode.