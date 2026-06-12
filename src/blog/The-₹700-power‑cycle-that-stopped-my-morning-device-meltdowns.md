---
title: "The ₹700 power‑cycle that stopped my morning device meltdowns"
pubDate: 2026-06-12
description: "How I used a ₹700 Sonoff (flashed with Tasmota) and a tiny MQTT webhook to power‑cycle flaky test devices — and the day it nearly bricked one."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with an IoT device and cables beside it"
  caption: "Photo by Ian Schneider on Unsplash"
  creditUrl: "https://unsplash.com/@ianschneider"
tags: ["devops", "hardware", "testing"]
---

It was 9:15 AM, my CI run had started, and the same two Android devices that run our nightly payment tests were unresponsive. The test runner timed out. I found myself on a chair, unplugging and replugging devices like a sleep‑deprived electrician. My office internet was fine. The phones were locked in a state only a power‑cycle could fix.

That morning I lost half an hour and my patience. It wasn't the first time. These cheap test devices — Mumbai-sourced handsets and one older Redmi — would freeze or stop responding to ADB after a few hours. The usual workaround was manual power-cycling. The weekly workaround was manual power-cycling. At some point I decided to stop treating unplugging as an acceptable step in my workflow.

What I built: a cheap remote power‑cycle

I bought a Sonoff Basic relay for ~₹700, flashed it with Tasmota, and put it between the power strip and the charging hub that feeds my test devices. I run Mosquitto on a ₹2,300 Raspberry Pi 3B+ at home (it lives in my study). A tiny webhook service (a 100‑line Python Flask script) subscribes to MQTT and exposes a secure HTTP endpoint that my CI or scheduler can call:

- curl https://ci.local/powercycle?device=hub1

The webhook sends a MQTT toggle to the Sonoff, which cuts power for 10 seconds and restores it. The devices boot cleanly and show up on ADB again.

Why this works better than "just unplugging"

Manual unplugging depends on me being awake, at my desk, and willing to interrupt work. I was losing ~20–40 minutes per incident — waiting for tests to fail, walking to the lab, unplugging, waiting for reboots, re-running tests. A remote power-cycle is three seconds of network latency.

There are some small wins beyond convenience:

- Predictability: I schedule a power‑cycle 5 minutes before the nightly suite. The lab is always in a known state before tests start.
- Reduced context switches: No interrupting engineers to ask someone in the office to jiggle cables.
- Reproducibility: If a test fails after a power-cycle, I know it's not because the device was in a weird frozen state to begin with.

How I integrated it into CI

I added a hook in our Jenkinsfile: before the device-dependent stage, call the webhook to power-cycle the hub. Jenkins waits five minutes for devices to appear (ADB wait‑for-device) and then runs tests. If the devices don't show up, Jenkins cancels the step and posts the failure in the usual Slack channel with a link to the Sonoff's MQTT logs.

This small pre-step knocked recurring morning failures from multiple times a week to almost never. The team reclaimed 2–3 hours per week collectively.

The tradeoffs and the day it almost bricked

There are honest tradeoffs.

First: it’s a bandaid. If the devices are leaking memory or a test causes a kernel panic, power‑cycling masks the symptom. Over the next month I scheduled daily runs and instrumented the flaky tests. We fixed two memory leaks, but not everything — because the power‑cycle removed the pressure to fix simpler timing issues. I accept that. For a small team shipping fast, uptime of the test lab matters more than immediate perfection.

Second: hardware is unreliable. The Sonoff worked for weeks and then, during a routine OTA firmware experiment, I bricked it. I had followed one tutorial and ended up with a dead relay. It needed serial flashing to recover — a 30‑minute detour and a reminder that cheap hardware can be a liability. After that I started buying one spare Sonoff and kept a small TTL‑USB adapter in the drawer. Cost: ₹700 + ₹350 for the TTL adapter. Insurance is cheap.

Third: power cuts and boot order. In India, power blips happen. If the mains return while the charging hub or devices are mid‑boot, some phones get stuck waiting for external power negotiation. I solved most of that by adding a 5–10 second stagger in the power restore sequence (Hub → Charger → Devices). It made the setup a bit more brittle to timing changes, but dramatically reduced boot‑hangs.

Also: security and local network assumptions. I keep the MQTT broker on my Pi inside the local network and expose only the small webhook over a reverse SSH tunnel from a cheap VPS (₹300/month) with a static domain and TLS. That adds complexity: monitoring the tunnel, renewing the Let's Encrypt cert. It was worth it — I didn't want my Sonoff speaking to a cloud vendor I don't control.

A few practical notes (because you’ll ask)

- Sonoff Basic + Tasmota is not the only route. Shelly devices are better but cost more. I chose Sonoff because it was cheap and easy to flash.
- Flushing Tasmota takes ~15 minutes if you’ve never done it. Keep an FTDI serial to fix bricked units.
- A 10‑second power‑cut is usually enough. Too long and battery-backed phones can retain weird states.
- Use ADB serial numbers in CI to verify devices are present after a cycle. Don't assume "one device appears = all good".
- Keep a physical backup: once the Pi crashed at 3 AM and the MQTT broker was down; the Sonoff could still be toggled manually. Have a plan for complete local failures.

Why I kept doing this

Because the ROI is immediate: ₹700 + an evening of tinkering saved me recurring, interruptive work that added up to hours per week. It changed the mental model of the lab: a known, automatable piece of infra rather than a mystical pile of flaky phones.

That said, I didn’t forget the underlying issues. The power‑cycle bought the team time to ship fixes without the daily drag of failed runs. But it also tempted us into complacency for a few weeks — a mistake I won't repeat.

Takeaway

If you have a small device lab that falls over more often than it should, a cheap, local power‑cycle is the cheapest productivity win you can buy. It’s not a root‑cause fix. Treat it as staging‑cleanup: automate the reset, log the failures it prevents, and use those logs to prioritize real fixes. And always keep a spare Sonoff and a tiny USB‑TTL — you will need them.