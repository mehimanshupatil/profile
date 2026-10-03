---
title: "Why my app's Hindi UI kept breaking — and the cheap test I built to catch it"
pubDate: 2026-10-03
description: "I built a small automated check plus a ₹3,000 test phone to find real-world Indic text rendering bugs. Headless browsers lied; real devices didn't. Here's what I did."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218360-8f1c9c8f51c5?w=1600&h=800&fit=crop&auto=format"
  alt: "A developer typing on a laptop with code visible on screen and a cup of coffee nearby"
  caption: "Photo by Prateek Gupta on Unsplash"
  creditUrl: "https://unsplash.com/@prateekgupta"
tags: ["i18n", "testing", "developer-tools"]
---

The client call was calm until the product manager tapped the screen and a line of Hindi text turned into a single square box. The layout slid, buttons overlapped, and our "release-ready" label looked like it belonged in a broken prototype. The demo room in Mumbai went quiet for the three seconds that felt like three minutes.

We had unit tests. We had visual regression for English screenshots running in CI. But none of that caught the Devanagari shaping problem — a ligature that the Android WebView rendered differently than Chrome on desktop. I promised myself three things that week: stop pretending headless is the same as a device, stop blaming fonts as "edge cases", and build a cheap, automatic way to catch this before a demo or release.

Why headless lied (short version)

Modern headless browsers use different rendering stacks than Android WebView or iOS WebKit. HarfBuzz, Skia, font hinting, system fallback — all of it can differ. On my CI (Chromium headless in Docker), the same Hindi string looked fine. On a mid‑range Redmi (Android 11) it showed a missing glyph or a broken ligature. Our i18n strings weren't corrupt. The runtime shaping was.

We could have bought a phone for ₹20,000 and called it a day. Instead I built something that cost me ₹3,000, runs in CI, and finds the majority of these problems before they hit a demo.

What I built — cheap device + screenshot diff

I kept the solution minimal so it actually runs regularly.

1) A ₹3,000 test phone
I bought a second‑hand Android phone on OLX for ₹3,000. It’s not glamorous. It has a real Android WebView and the system fonts our users get. That matters more than CPU or camera.

2) Automated screenshot runner (adb + headless browser fallback)
- My CI still runs Puppeteer to render pages and produce desktop screenshots. That’s my fast, cheap pass.
- I added a small runner (about 150 lines of Node) that boots the target page on the phone via adb reverse and triggers a screenshot through an instrumentation script (WebView.evaluateJavascript -> capture). The script pulls screenshots over adb and stores them as test artifacts.

3) Perceptual hash + tolerance diff
Pixel‑by‑pixel diffs are noisy. I use a perceptual hash (pHash) and an L2 threshold to detect meaningful visual changes in text rendering. For each page I keep the "golden" screenshot taken on the test phone the day it was added to the suite. New screenshots that exceed the threshold fail the check.

4) A tagging rule for demos and releases
Every release branch runs both desktop Puppeteer checks and the phone screenshots. Demos run the phone check on merge to the demo branch. That way, the Mumbai demo incident becomes a CI failure, not a mute, awkward moment.

The failure I didn't expect

For the first month it felt perfect. CI passed. Screenshots compared clean. Then one morning the check failed across three pages. Panic. I dug in. The captured screenshots on the phone looked identical to the golden ones. The diffs were triggered because I had changed the phone's system font accidentally.

An update to a device‑level font package had rolled in when I connected the phone to a home Wi‑Fi that auto‑applied an OS patch. Suddenly my "golden" phone no longer matched our users’ fleet or the staging devices. The naive approach of keeping a single golden screenshot on the test phone broke down.

I had to accept an ugly truth: the test device is a piece of real hardware that can drift. Patching happens. Batteries die. You need versioning and a rotation plan.

What I changed after the failure

I did three practical things immediately.

- Multiple golden roots: I keep golden screenshots for a small matrix of representative devices — an Android WebView on the test phone, an emulator image (pixel density and Android version variants), and a desktop Chromium golden. That captures both device drift and OS differences.
- Device snapshot and tagging: whenever I update a golden on a phone, I note the device build number and push the golden into the repo with a tag like android‑GSI‑11‑arm64. CI refuses to update goldens automatically; a failing test requires a human to confirm the visual change and accept a new golden.
- Monthly sanity checks: I added a weekly cron job to boot the phone, check battery, check adb connection, and re‑capture a set of smoke screenshots. It emails me if the device reboots into an OS update — which has happened twice.

Tradeoffs and the maintenance I accepted

This is not zero maintenance. The device needs charging. The adb cable finally frayed and cost ₹200. The screenshot runner occasionally times out on slow office Wi‑Fi, so I added an exponential backoff. The biggest tradeoff: tests that include device screenshots are slower. Two extra minutes per CI run is annoying when you’re in a hurry. But it turned a demo catastrophe into a predictable, fixable CI failure.

Also: the tests still won't catch every linguistic nuance. Complex scripts like Malayalam or Bengali can have rendering issues only visible under specific font fallbacks. If your app targets many languages, you'll need more devices or a rotation policy for fonts.

The thing I actually walked away with

Automated checks that include at least one real device catch the class of visual i18n bugs headless browsers miss. The device doesn’t need to be new. It does need to be stable (record its build number), part of a small matrix, and treated as a first-class test target with human-reviewed goldens. For ₹3,000 and 150 lines of code I stopped apologizing in demos.

If you ship in India with multiple languages, assume your desktop CI is lying until proven otherwise. Test on real WebViews. The earlier you find the mismatch, the cheaper the fix.