---
title: "Why I attach a 30‑second recording to every UI PR (and the time it exposed real user data)"
pubDate: 2026-06-28
description: "I started attaching short screen recordings to UI PRs. It slashed back-and-forth, made reviews faster — and once accidentally exposed staging user data. Here’s how I do it safely."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden table with code on its screen and a coffee cup to the side"
  caption: "Photo by Fabian Grohs on Unsplash"
  creditUrl: "https://unsplash.com/@fabian2"
tags: ["code-reviews", "developer-tools", "india"]
---

It started on a rainy Tuesday in Bengaluru. I was reviewing a PR for a customer‑facing settings page: three screenshots, a screed of comments, and a 10‑message Slack thread where the author was trying to explain why the dropdown reset on slow networks. I opened the branch, reproduced the bug in 30 seconds, hit record, uploaded the clip, and pasted the link into the PR. Slack thread stopped. The dropdown problem was obvious. The fix was obvious. The reviewer approved in 12 minutes.

That became my habit: 15–30 second recordings for any UI change that could be ambiguous — state transitions, animations, error flows, and mobile behaviours. The difference was immediate. Reviews became about code and edge cases, not "what did you mean by this screenshot?"

Why a short recording works

- Screenshots lie. They are static and require a paragraph to explain timing, focus, and steps.
- A 30s clip captures flow: input → network delay → UI reaction. You don’t need to write the whole story.
- It sets reviewer expectations. They don’t need to boot a branch locally. They still can, but often don’t have to.

How I make these recordings without wasting time or data

I keep the process tight and cheap. I use tools already on my laptop and a tiny upload pattern so I’m not pushing gigabytes over my home connection or mobile data.

On Linux (my daily), I use ffmpeg to capture a specific window:

ffmpeg -f x11grab -video_size 1280x720 -i :0.0+100,150 -r 25 -vcodec libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p pr-clip.mp4

- video_size and +offset are tuned to the browser window. 720p at crf 28 gives a 10–20MB file for 30s; good tradeoff for clarity + upload cost.
- For macOS I use QuickTime (⌘ + ctrl + ⌥ + 5 workflow) and then ffmpeg to compress if needed.

If I’m testing mobile flows, I use scrcpy (Android) to mirror the device and record the window the same way. For iOS I use QuickTime mirroring.

Where I host the clip

Never in the repo. I upload to a private S3 bucket (Mumbai region) with a short presigned URL and paste that link into the PR template. If you don’t have S3, use your company’s internal file server or a private Google Drive link — anything that avoids committing binaries.

I try to keep every clip under 5–8MB. Smaller files mean reviewers on mobile or capped connections (I’m looking at you Airtel 4G afternoons) can open them without chewing data.

The PR snippet I paste

Recording: https://s3.ap-south-1.amazonaws.com/... (30s)
Steps: Open /settings → change plan → wait 2s on slow network
Device: Chrome 114, Ubuntu 22.04
Sensitive data scrubbed: yes

That last line became critical.

The time it blew up (my honest failure)

Three months in I got sloppy. A feature required a staging snapshot with realistic data. I recorded a bug repro, uploaded the clip, and added the link to the PR. A teammate pinged me: “This clip shows full emails and partial phone numbers for staged users.” I had used a real‑data snapshot without masking; the bucket was private but a misconfigured public ACL made one clip temporarily accessible. We had to rotate API keys, notify our privacy officer, and do an audit. It was embarrassing and costly in time.

What I learned (and changed)

- Never record on production data. Never. If staging needs realism, scrub or anonymize first.
- Automate scrubbing where possible. A tiny script that overlays a blur box on regions of the frame is 10 minutes of work and worth every second.
- Presigned, short‑lived URLs only. Expiry of 24–72 hours is enough for most reviews.
- Add a mandatory PR checkbox: "Recording attached? Sensitive data scrubbed?" Reviewers can decline the PR otherwise.

Tradeoffs worth noting

- Extra artifacts = more ops. Someone needs to manage the S3 bucket or Drive folder. If your team is tiny, that falls on you.
- Not a replacement for full local repros. If a reviewer plans to test interactions end-to-end (browser + backend), they will still run the branch. Recordings reduce noise, not replace testing.
- Privacy and compliance are real. At my previous company we had to stop recording flows that contained KYC snippets entirely. Your company policy may be stricter.

A couple of practical habits that keep this smooth

- Keep a 30‑second recording guideline in your PR template. If it’s longer than 45s, trim it into two clips or attach a short note.
- Standardize the filename: pr-<repo>-<number>-<short-desc>.mp4. It helps cleanup.
- Compress on the client before upload. I run a quick ffmpeg pass to crf 28 or use HandBrake presets if I need better control.
- For mobile reviewers, include device orientation and CPU profile if the issue is about animations.

An inexpensive, India‑flavoured note on mobile data

Uploading 20MB over home broadband in Bengaluru is trivial. Over mobile data — and if a reviewer is commuting — that 20MB matters. Keep clips lean. If you can’t, add a 10‑second preview gif (1–2MB) in the PR body and the full clip behind the presigned URL.

What I actually walked away with

Recordings don’t replace discipline. They don’t fix flaky tests or careless UX. But a tiny, consistent habit — attach a short, scrubbed recording and make it part of your PR — cuts the “what did you do?” noise out of reviews. It forces the author to reproduce and think about the flow, and it gives reviewers the context they need in 30 seconds.

If you try one thing: add "Recording: (link) — scrubbed: yes/no" to your PR template. It will make your next UI review one Slack thread shorter.