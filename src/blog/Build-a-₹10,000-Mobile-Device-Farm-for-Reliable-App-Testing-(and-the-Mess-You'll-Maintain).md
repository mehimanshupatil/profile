---
title: "Build a ₹10,000 Mobile Device Farm for Reliable App Testing (and the Mess You'll Maintain)"
pubDate: 2026-03-28
description: "A practical, low‑cost guide to building a small mobile device farm in India for real-device testing—what to buy, how to connect, and the tradeoffs you'll face."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=2000&h=1000&q=80"
  alt: "Several smartphones laid out on a table connected with charging cables for testing"
  caption: "Image credit: Markus Spiske / Unsplash"
  creditUrl: "https://unsplash.com/photos/AHBvAIVqk64"
tags: ["mobile device farm", "mobile testing", "developer workflows"]
---

If you build Android or cross‑platform apps in India, you know the pain: an issue only happens on an old Redmi with Android 9, or a vendor ROM that throttles background processes. Emulators catch many bugs, but real users run real devices. I built a tiny, cheap mobile device farm (about ₹10,000) so I could reproduce problems fast without shipping devices back and forth. It’s not glamorous. It works. And it costs time to keep running.

Why a small device farm (and why not just Firebase Test Lab)
- Real devices reveal race conditions, OEM quirks, background‑kill behaviour and flaky network handling that emulators and cloud labs miss.
- Cloud device farms are great but costly for frequent debugging and slow to iterate on interactive issues.
- A home device rack gives immediate access for exploratory testing, manual repro, and quick automation runs.

Main components I bought (approx costs in India)
- 3–5 second‑hand phones (OLX/Quikr/PhonePe Bazaar): ₹2,000–₹5,000 each. Mix recent midrange and one old, popular model (e.g., Redmi/Realme with Android 9).
- Powered USB hub (7–10 ports): ₹1,200–₹2,000.
- Short, labeled USB‑A cables: ₹300.
- Small UPS or uninterrupted power strip: ₹2,500 (keeps charging + prevents corrupting logs during outages).
- A cheap Raspberry Pi or spare laptop to act as the orchestrator: ₹2,000–₹5,000 (or free if you already have one).
- A simple phone stand or DIY rack (cardboard or wood): ₹200.

Total: roughly ₹6,000–₹12,000 depending on device choices.

How I wire it up (fast, repeatable setup)
1. Physical layout: phones on a shelf, cables neatly labeled by device name. Keep a sticky note with device build properties (ROM, Android version).
2. Orchestrator: I use a Raspberry Pi (headless) with adb installed. It connects to all devices over USB through the powered hub. The Pi exposes SSH so I can run commands from my workstation.
3. Per‑device udev rules and persistent adb keys: I set udev rules on the Pi so devices are stable and show deterministic names (e.g., device‑redmi‑9). This avoids the “which device is at /dev/bus/usb/003” guessing game.
4. Remote control: scrcpy gives near‑real‑time screen control and recording. For automation, I run adb shell am instrument (Espresso) or Appium/WebDriverAgent on the orchestrator.
5. Logs and artifacts: a script pulls logcat and app traces into timestamped folders on the Pi, compresses them, and syncs the small set of failure artifacts to my laptop.

A few practical scripts I use
- A starter script to list devices, their Android version, uptime, and battery health.
- A wrapper to run a UI test on one device, copy logs/artifacts, and rotate to the next device (simple Bash + adb loop).
- A tiny web page on the Pi showing device thumbnails (using scrcpy‑single‑shot PNGs) so teammates can pick a device to repro on.

When automation helps — and when it doesn't
Automated tests (Espresso/Detox/Appium) are invaluable for smoke runs across the farm: install, run, collect. But flaky vendor ROMs and background process kills mean tests will flake and need triage. I run short smoke tests nightly, but rely on manual repro for surprising platform issues. Expect to spend time debugging the test harness as much as the app.

Tradeoffs and the messy bits
- Maintenance is real. Batteries age, devices reboot, USB cables fail, and the hub can choke if too many power‑hungry phones draw current. Plan for replacements and a tiny spare‑part budget.
- Diversity vs. manageability. More devices catch more bugs, but each device adds maintenance overhead. I limit mine to 4–5 models that cover 70–80% of user installs.
- Security: these are real devices with accounts and data. Keep them factory reset except for the debugging build, and segregate any personal accounts. If you test sensitive flows (UPI, payment apps), avoid storing real credentials on the farm.
- Not a full substitute for cloud labs: you can't easily run huge parallel test matrices or access exotic vendor devices that are rare in India. Use both where it makes sense.

Where I saved—and where I spent
- Saved by buying used devices and reusing an old Pi. Used phones often work fine for testing UI, sensors, and network behavior.
- Spent on a decent powered hub and the UPS—power issues were the single biggest source of random failures. A cheap hub without external power will drop devices under load.

Some India‑specific tips
- OLX/Quikr and local WhatsApp groups are gold for buying common models cheaply. Test the battery and charge cycles before you commit.
- Popular Indian models (Redmi/POCO/Realme) have OEM customizations that cause unique bugs; include at least one such device.
- If your office building has frequent power cuts, a small UPS saved me from corrupted logs and mid‑repro power losses.

A small, maintained farm beats ad‑hoc borrowing
Before this I borrowed devices from colleagues or asked testers to repro — slow and inconsistent. The device farm gives me immediate control when a customer reports a device‑specific crash. It also changed how I debug: I can iterate on a fix, install the build, and verify on multiple real devices in 20 minutes.

If you try it, start tiny: one cheap phone, one powered hub port, and a Pi. You’ll quickly learn which devices matter for your users and whether the maintenance drift is worth the time saved in debugging. It’s not a polished lab—expect cable mess, occasional battery failure, and a checklist of “is the Pi up?”—but it’s the fastest way I’ve found to turn user reports into reproducible fixes.

Thanks for reading—if you want, tell me the three device models most of your users run and I’ll suggest which two are worth adding first.