---
title: "Set your dev machine to UTC — the cheap trick that found two nasty timezone bugs"
pubDate: 2026-06-23
description: "I switched my laptop to UTC for development. It made scheduled jobs and date math failures obvious — and introduced calendar pain I didn't expect."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden table displaying code, with a small analog clock blurred in the background"
  caption: "Photo by Nick Morrison on Unsplash"
  creditUrl: "https://unsplash.com/@nckmr"
tags: ["developer-tools", "debugging", "timezone"]
---

The pager went off at 3:12 a.m. IST. A client in Europe reported onboarding emails arriving eight hours late. I pulled open the logs and everything looked fine — jobs succeeded, no retries, no queue backlogs. The timestamps were normal. Until I noticed the developer who wrote the job had their laptop set to IST, and the staging server was doing time math in UTC. A rounded-off timezone assumption hid the bug.

A week later I flipped my dev laptop to UTC and left it. No drama, just a new, glaringly honest clock in the top bar. Within days I had two bugs reproduced locally that otherwise had escaped for months.

Why I flipped my laptop to UTC

We ship globally but test mostly from Bengaluru and a single staging server in AWS London. On paper, everything used UTC; in practice, developers write code on machines set to IST and tests run with local defaults. That mismatch is a classic source of bugs — off-by-one-day emails, wrong "expires at" calculations, scheduled jobs firing at odd business hours.

Setting my laptop to UTC does three things for me:
- Removes the local-time comfort that masks assumptions. If code shows "2026-06-23T13:30:00Z" and my desktop clock also reads UTC, it's obvious when someone has added or subtracted offsets in the wrong place.
- Forces explicit timezone handling in code and tests. I started catching implicit uses of Date.now(), toLocaleString(), and naive cron schedules faster.
- Makes server vs. dev parity better. Staging and prod use UTC. My dev box should too.

How it found the bugs

Two concrete cases.

1) The “midnight job” that skipped Mumbai users
We had a nightly job that ran every day at "midnight local time" to generate daily digests. The job was implemented in Node, scheduled with a cron expression. On staging (UTC) it ran at 00:00 UTC and called a library that converted to local time using the server timezone. On my IST laptop set to local time, the job appeared to run at 00:00 and produce correct digests. After switching to UTC, I saw the job's "local conversion" move the boundary and realized it was picking dates incorrectly for IST users — some users fell into the previous day. Rewriting the job to store and operate on dates in UTC and explicitly compute daily buckets for Asia/Kolkata fixed it. Tests followed.

2) The token expiry that lived longer in dev
An auth token had its expiry calculated using Date.toLocaleString in a couple of helper functions. On dev machines (IST) the expiry showed, say, 11:30 pm, but on servers (UTC) it showed 6:00 pm because of a messy mix of .getTimezoneOffset() use and implicit conversions. With my laptop in UTC I reproduced token-refresh failures locally within minutes instead of hunting logs at 2 a.m. The fix was boring: keep expiry in UTC across the stack and only format for display at the UI boundary.

How I survived the change (and the thing I broke)

Flipping to UTC is cheap and powerful, but not frictionless. I learned the hard way.

What broke
- Calendar confusion. My GNOME/Google Calendar UI still displayed meetings in IST (because Google Calendar uses my account timezone), but native macOS alarms and some Electron apps read system timezone and showed UTC times. I missed a 9:30 a.m. stand-up because my laptop menu showed 4:00 a.m. until I trained myself to read the meeting time as "UTC 04:00 = IST 09:30".
- Desktop alarms and older Indian banking apps (some UPI tester apps we use) assumed local system timezone for scheduled reminders. A late-night reminder didn't trigger because I had set a system cron wrapped with TZ=UTC.
- Some GUI tools (calendar widgets, hardware clock sync with BIOS) required fiddling. On an Ubuntu laptop I had to teach timedatectl to keep the hardware clock in localtime when dual-booting Windows laptops for test devices.

How I made it tolerable
- I stopped changing the system timezone back for short tests. Consistency helps catch bugs early.
- Per-project TZ overrides. For services I run locally via systemd --user or docker-compose, I explicitly export TZ=Asia/Kolkata for UI-only tools and let backend services run in UTC. For example, my node dev container sets ENV TZ=UTC; my Electron app runs with TZ=Asia/Kolkata so its alarms and notifications align with my phone.
- Calendar habit: I now read meeting invites knowing they're in IST and mentally map. Ugly but effective. I also added "IST" to meeting titles sometimes, for other folks who use UTC.
- Tests: I added a tiny test helper that asserts date inputs/outputs include timezone information and never assume local time. No more fragile tests that pass only in one timezone.

The tradeoff I didn't expect
This uncovered a cultural issue in our team: because most of us are in IST, many PRs and tests didn't consider other timezones. Exposing that required a small policy change — we now require at least one integration test that runs with TZ=UTC and another with TZ=Asia/Kolkata for any feature touching dates. It slowed down PRs a little. But it also stopped us shipping "works on my machine" bugs to production.

One limitation: flipping my laptop to UTC won't magically fix libraries or third-party services that embed local-time assumptions. It will, however, make those assumptions visible sooner. For example, a vendor webhook that sends timestamps in local time still needs a contract and robust parsing on our side.

Takeaway
If you work on anything that touches dates, set your dev machine to UTC for a week. You'll either find bugs you didn't know you had, or you'll hate it and go back. Either way you'll be more aware. I kept mine in UTC — the minor pain in scheduling is cheaper than shipping two bugs that only show up at midnight in Mumbai.