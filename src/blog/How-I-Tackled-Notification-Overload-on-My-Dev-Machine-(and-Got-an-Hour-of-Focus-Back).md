---
title: "How I Tackled Notification Overload on My Dev Machine (and Got an Hour of Focus Back)"
pubDate: 2026-01-29
description: "Practical, India-friendly tactics to stop notification overload on your dev machine—what to silence, what to keep, and the tradeoffs I learned the hard way."
author: "Rohan Deshpande"
image:
  url: "https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&h=1000&w=2000"
  alt: "Developer at a desk with laptop and smartphone, notifications visible on screen and phone"
  caption: "Image credit: Pexels"
  creditUrl: "https://www.pexels.com/photo/374074/"
tags: ["notification overload", "productivity", "developer workflows"]
---

I used to live in a constant hum: Slack pings, CI failures, build notifications, calendar reminders, WhatsApp groups, and the inevitable "ping me when you're online" messages. It felt important to be instantly reachable—until I realised I was spending most of my day reacting, not building.

If you're in an Indian startup, consulting, or freelancing, this is worse: teams run late-night deploys, clients ping across timezones, and family WhatsApp groups are merciless. I began calling it notification overload. I tried turning off sound, then Do Not Disturb, then brutal app deletions. Nothing stuck until I stopped treating all notifications as equal.

Here’s the practical, slightly messy system I’ve settled on. It’s not perfect, but it gave me back consistent focus—and an extra hour or two of deep work every weekday.

What I mean by notification overload
Notification overload is when the volume and variety of alerts fragment your attention so often that context switching kills productivity. It’s not just about noise—it's about indiscriminate interruption. The goal is not zero alerts; it's the right alerts, on the right device, the right way.

My simple rules (one-line decisions)
- Keep production and emergency alerts: loud and redundant.
- Make team/async work quiet and batched.
- Move social and non-urgent things off your work device.
- Have a lightweight manual override for “I’m on call—wake me.”

How I actually implemented it

1) Audit for a week (data beats guilt)
I tracked every notification for seven days using a simple spreadsheet. Columns: source, time, consequence (ignored/responded), urgency (0–3). The surprise: ~70% were low-urgency (mentions, repo stars, non-actionable threads). The audit made it obvious what to silence.

2) Reclassify by channel, not by app
Instead of silencing Slack entirely, I split it:
- Production channels: alerts, oncall, pager — Push + phone SMS fallback.
- Team channels: @here or @channel removed; only direct mentions push.
- Social/announcements: mute, check twice daily.

Slack setup that works:
- Turn off "All new messages" for most channels.
- Use keywords for the few people who must reach you (client names, release).
- Use "Do Not Disturb" schedules tied to calendar focus blocks.

3) One device for interruptions
I decided that urgent work alerts go to my phone (vibrate + LED), everything else to the laptop (silent banner), and social only on my personal phone. This small split reduces the emotional pull of reaching for the phone every five minutes.

4) Batching and delivery windows
For non-urgent team notifications, set expectations: "We check non-critical channels at 10:30 and 16:30." It sounds prescriptive, and it is—but it works. People naturally escalate if something is truly blocking, and that’s who we reserved the "urgent" path for.

5) Production alerts: make them truly actionable
We trimmed our pager rules. From "alert for any error" to "alert when error rate > X and affects > Y users." This cut false positives dramatically. For oncall, we use an SMS fallback for major incidents. SMS costs in India are small compared to the hours lost to false alarms.

6) A humane override: the "come find me" group
There are times when a teammate genuinely needs to reach me now (deploy stuck, customer on a call). I created a short list of people who can DM "urgent" which bypasses silences for a 15-minute window. It’s a trust-based system—abuse is a social cost that rarely happens on small teams.

Tradeoffs and real downsides
- Missed nuance: With strict filters, you can miss a low-signal message that later matters. I still miss some soft-collaboration cues.
- Initial friction: Setting rules and convincing a team takes a few awkward days. Some teammates thought I was being standoffish until the cadence proved better.
- Oncall vulnerability: Reducing alerts aggressively without the right fallbacks can make you slower on true emergencies. We solved this with throttled escalation—email → push → SMS → call.

A few India-specific notes
- WhatsApp is unavoidable. Use "Custom Notifications" on Android: important contacts get a specific tone; groups are muted by default. Mute archived chats permanently.
- Telecom SMS as backup: for critical client SLAs, I still rely on SMS or voice for immediate escalation. It’s cheap and more reliable than push in some rural areas.
- Work hours culture: If you work with teams in different Indian cities, set explicit overlap windows. Culture often fills the silence—be explicit about when you are reachable.

Tools that actually mattered
- Slack (configure, don’t default): keywords, scheduled DND, channel muting.
- Android Do Not Disturb: allow calls from starred contacts only during focus blocks.
- A tiny VPS + webhooks: we forward specific CI alerts to SMS (cost ~₹200–₹400/month depending on volume). Expensive alerting SaaS was unnecessary for our small team.
- Simple calendar blocks labeled "Deep Work" and "Oncall." The label matters—others respect it.

How to start in 30 minutes
1. Do a 3‑day audit — note the top 5 noisy sources.
2. Mute those channels/apps for 24 hours.
3. Create one “urgent” bypass list (3–5 people).
4. Set two daily check windows for non-urgent channels.
5. Reassess after a week.

If you’re sceptical, try it for a week. The first day feels uncomfortable—there's a reflex that you might be “missing out.” By day three, that reflex calms, and by day seven you’ll notice more unstuck time.

I still get interrupted. Sometimes family messages need attention during work; sometimes a CI script I thought redundant rings at 2 a.m. The system isn't about eliminating interruptions—it's about owning which interruptions deserve your attention.

If you want, I can share my Slack settings checklist and a simple SMS webhook script I use. But whether you follow my exact steps or adapt them, the point is honest: fewer indiscriminate pings means more time to ship things that matter.

Thanks for reading—go mute something.