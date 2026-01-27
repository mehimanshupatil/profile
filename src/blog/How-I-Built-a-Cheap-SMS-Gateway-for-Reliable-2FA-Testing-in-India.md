---
title: "How I Built a Cheap SMS Gateway for Reliable 2FA Testing in India"
pubDate: 2026-01-27
description: "A practical, low-cost approach to building a local SMS gateway for testing 2FA and message flows—what works in India, and what doesn't."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=1000&w=2000"
  alt: "Hands holding a smartphone showing a text message thread"
  caption: "Image credit: Unsplash / Drew Beamer"
  creditUrl: "https://unsplash.com/photos/aqwQ4r9s6v8"
tags: ["SMS gateway", "developer tools", "india"]
---

I needed a reliable way to test OTP flows and inbound SMS handling for a payments app we were building in India. Using third‑party sandboxes was fine for unit tests, but they never caught quirks that only show up with real, delayed, or carrier‑filtered SMS. Buying a full aggregator integration just for dev work felt wasteful. So I built a cheap, local SMS gateway that works for day‑to‑day testing—and learned a few limits the hard way.

This is what I built, why I picked each piece, and when you absolutely shouldn't use this approach for production.

Why not just use Twilio or MSG91?
- They’re great for production, but in India you hit two friction points: DLT/template registration and limited inbound virtual numbers. Getting DLT templates and approved headers is necessary for production sending and can take time and cost money.
- Many aggregator sandboxes use US/European numbers. For Indian carrier quirks (delays, filtering, long‑code behavior), that doesn’t help.
So for testing, a local, inexpensive setup is often faster and cheaper.

The options I considered
- Android phone + app (cheap, easiest)
- GSM USB dongle + Raspberry Pi + Kannel/gammu (more robust, more setup)
- Cloud virtual numbers (fast, but not India‑authentic)
I went with an Android phone approach first, then added a GSM dongle later when I needed more stability.

What I actually built (short recipe)
1. Old Android phone (₹3,000–6,000) or spare device.
2. Install an SMS‑forwarder app (I used an open project that forwards SMS to a webhook over HTTPS) or a small Termux script that listens to SMS broadcasts and posts JSON to my dev server.
3. Dev server (local machine or a cloud dev host). I created a small endpoint /sms-receive that accepts POSTs with {from, body, timestamp}.
4. For sending tests, I used the same phone with a prepaid SIM. For scale or parallelism, I later added a ₹1,500 4G USB GSM modem on a Raspberry Pi running smsd/gammu and a simple relay.

How the flow works
- Incoming SMS arrives on the phone/dongle.
- The forwarder app or smsd relays it as a POST to my /sms-receive endpoint.
- My dev app ingests it as if it had come from a real aggregator, runs the same parsing and verification code paths, and I can assert on content, delays, and edge cases.

Why this worked for me
- Real carrier behavior: messages sometimes arrived late, out of order, or with extra characters—exactly the things automated sandboxes missed.
- Low cost: initial setup was under ₹5,000 if you have a spare phone; adding a dongle and Pi pushed it to around ₹6,500–8,000.
- Fast iterations: I could re‑send OTPs and see delivery behavior within minutes without DLT headaches.

Real constraints and tradeoffs
- Deliverability vs scale: This setup is for development and light manual QA. Sending bulk transactional SMS in production requires DLT registration and an aggregator. If you try to scale with multiple SIMs and send large volumes, carriers flag you.
- Reliability: Android apps and USB dongles can misbehave—phones reboot, apps get killed, and a carrier change can silently switch behavior. Expect occasional outages and build health checks.
- Compliance and templates: For production OTP delivery in India you must use DLT and approved templates. Your local SMS gateway bypasses that, which is fine for testing but not legal for production sending at scale.
- Edge cases it won't catch: Short codes and bank SMS often use special routing; virtual/local setups won’t perfectly emulate these for fraud/anti‑spam systems.

Practical tips and gotchas
- Use HTTPS and basic auth/tokens between the phone and your server. Your dev Wi‑Fi is a weak link.
- Add a heartbeat: the phone or Pi should ping your server every minute and notify when it loses connectivity.
- Persist incoming SMS locally too (SQLite or file). When the forwarder app crashes, you want to replay messages.
- Test delays intentionally—simulate a 30s-2min delay before forwarding to catch race conditions in your auth flow.
- If you need parallel numbers, buy multiple prepaid SIMs and a small USB hub for multiple modems. It’s messier than you think (power, heat, and SIM management).
- Account for costs: a local SIM in India still costs ~₹0.20–0.60 per SMS for OTPs depending on your plan and aggregators. For testing, do small batches.

When to stop and use an aggregator
- If you need guaranteed SLAs, long‑term logs, international reach, or to send thousands of SMS per day, switch to a certified aggregator and complete DLT registration.
- Use the local SMS gateway for dev, QA, and reproducing carrier quirks. For staging/production, use an aggregator with templates and delivery reporting.

A note about security
Treat the device as infrastructure: keep the forwarding token secret, rotate it when people leave, and don't expose the device directly to the public internet. The easiest path is point the phone at your dev staging server on a VPN or use an SSH reverse tunnel.

Final thoughts
Building a cheap SMS gateway taught me more about how OTP delivery actually behaves across Indian carriers than any sandbox ever did. It’s imperfect—flaky hardware, compliance limits, occasional phantom delays—but for daily development and QA it’s a productivity multiplier. Use it to catch the weirdness sandboxes miss, but don’t mistake it for a production strategy.

If you want, I can share the minimal webhook script I use (Node/Express) and the Termux/Android settings I prefer. It saved me hours when reproducing a nasty race condition with delayed OTPs.