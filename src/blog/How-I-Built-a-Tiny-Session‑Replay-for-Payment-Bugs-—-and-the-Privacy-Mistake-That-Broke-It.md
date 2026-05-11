---
title: "How I Built a Tiny Session‑Replay for Payment Bugs — and the Privacy Mistake That Broke It"
pubDate: 2026-05-11
description: "I needed a way to reproduce payment bugs that appeared on certain phones. I built a cheap session‑replay, learned how to redact, sample, and accept tradeoffs — and paid for one hard mistake."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with someone typing; phone and notebook beside it"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["debugging", "payments", "privacy"]
---

My inbox lit up at 10:12 PM: three support tickets, same flow, same vague failure, different devices. Users in Mumbai, Bengaluru, and a Tier‑2 city reported payments that stuck on “processing” after UPI auth. Logs on the backend showed a successful callback from the PSP, but customers saw the spinner and closed the app. Reproducing it locally? Impossible. It only happened on a handful of devices and only after users had been in the app for 10–15 minutes.

I knew the classic causes: flaky network conditions, WebView quirks, a race in the JS bridge, or something the PSP did with 2FA flows. I tried remote debugging, asked users for screenshots, and sent a verbose instrumentation build to three volunteers. Nothing. The bug was hiding in the live, real‑user session. So I built something to record sessions — selectively.

Why not use a paid session‑replay product? Because (a) cost for our traffic looked like ₹20k+/month, (b) third‑party SDKs often grab everything and ship it off to another country (privacy risk), and (c) we handle UPI and card flows where a naively captured session could include highly sensitive fields. I wanted control, low cost, and redaction.

What I actually built
I put a tiny client SDK in our webview and mobile‑web wrapper. It does three things:

- Capture high‑level events: route changes, button clicks, network request/response metadata (URL, status, timing), console errors.
- Capture DOM diffs using rrweb’s diffing idea, but only for the payment screens (the parts that help reproduce UI races).
- Capture a short network snapshot: request URL, headers (except Authorization‑like headers), and a SHA256 hash of the body — not the body itself.

Then compress, AES‑encrypt with a per‑team key, and send in batches via fetch to a ₹300/month VPS (small DigitalOcean droplet). The server stores blobs for 7 days by default, indexed by anonymized user ID, device model, and local time. I used chunking and gz to keep mobile data usage reasonable; typical session blobs were 50–150 KB.

Redaction and sampling — the hard rules
From the start I insisted on two immutable rules:

1) Never capture raw payloads for payment endpoints. I replaced bodies with a hash and a size marker. If we needed the body for a specific repro, we only fetch it after a legal/security review and explicit consent from the user. That meant we could still identify when two sessions had the same payload shape or identical parameters without storing secrets.

2) Default sampling: only 0.5% of sessions are recorded. But we provide a server‑side “raise sampling” token that support can ask a user to toggle for 24 hours (a simple in‑app consent). Most of the bugs I needed were sparse; 0.5% plus targeted increases caught them within a day.

Why these rules matter: bandwidth, storage, and legal exposure. In India, capturing payment data carelessly is not just messy — it invites customer outrage and regulator attention. The rules forced design tradeoffs: more metadata, less raw fidelity.

The failure that taught me to be paranoid
Two weeks in, I thought I was careful. We shipped the SDK to staging, then to production behind the sampling flag. It worked: we replayed a session and saw a race between a JS timeout and a PSP’s callback handler — the UI switched state before the callback was applied. We fixed the race. Victory.

Three days later, a support engineer flagged a user who said her UPI app had shown masked account numbers after a failed payment and asked whether we logged any part of the UPI auth flow. We audited the logs and found — horrifyingly — that a small piece of legacy instrumentation we’d forgotten about was still active in the webview: a change‑observer that captured an input overlay element and, for some devices, pulled masked digits into the session blob. They were masked (e.g., 1234xxxx), but they were still present. I’d violated rule #1 by accident.

The fallout was immediate: we pulled the SDK for a day, notified internal security, and added three more checks to our CI: a static analyzer that scans for DOM selectors matching known sensitive elements, a runtime checklist that throws an exception if an input element with type=password or selectors matching payment fields is captured, and a mandatory review step for any change to the capture whitelist.

That mistake cost us trust and a day of on‑call panic. It also changed how I think about session replay: recording is powerful and dangerous. Always assume you'll capture something sensitive until proven otherwise.

Tradeoffs and limits I accepted
- Lower fidelity: No raw request/response bodies. That occasionally forced us to ask users for consent or to run a targeted debug build. It’s slower than full capture, but worth it.
- Sampling delays: at 0.5% we might wait hours for a repro. We mitigate this with the support toggle and by increasing sampling for specific cohorts (Android 9 WebView, certain PSPs).
- Maintenance overhead: the SDK needs continuous audits as UIs change. Expect to spend 1–2 engineer days/month maintaining redaction rules and CI checks.

When this is the right tool
Use this setup if you’re dealing with flaky UI or integration bugs that only appear in the wild and are hard to reproduce on emulators — payment flows, WebView races, PSP redirects behind regional networks. Don’t use it as an analytics or UX tool; it’s for debugging, and the bar for capture should be high.

One takeaway
If you’re going to record anything from real users, build the safety net up front: explicit redaction, tiny sampling by default, short retention, and CI checks that make sensitive captures a build break. The only thing worse than not being able to reproduce a bug is reproducing it and realising you captured someone’s payment data while doing it.

I still have that ₹300 VPS running. It’s caught three more hard‑to‑find bugs since the incident. I pay for it willingly — but now I sleep with a checklist beside me.