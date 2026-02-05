---
title: "ADB over Wi‑Fi: How I Save Iteration Time When Testing Android Apps"
pubDate: 2026-02-05
description: "Skip the cable. A practical guide to using ADB over Wi‑Fi for faster Android iteration, plus troubleshooting, security tradeoffs, and India-specific tips."
author: "Devika Iyer"
image:
  url: "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&h=650&w=1300"
  alt: "Android smartphone on a desk next to a laptop, screen on."
  caption: "Image credit: Fauxels / Pexels"
  creditUrl: "https://www.pexels.com/photo/black-android-smartphone-with-turned-on-screen-1181675/"
tags: ["ADB over Wi‑Fi", "mobile development", "developer workflow"]
---

A few months into a sprint I grew tired of the tiny time leaks: plug cable in, wait for the phone to wake, adb install — and repeat, twenty times a day. The minutes add up. I switched to ADB over Wi‑Fi for most fast iterations and regained focus. It’s not magic — but used thoughtfully, it shaves friction without adding risk. Here’s the pragmatic way I use it, what goes wrong, and when I still prefer a cable.

Why ADB over Wi‑Fi
- Faster feedback: Install, logcat, and screen mirroring without tugging a cable.
- Fewer interruptions: No accidental disconnects when you move the device.
- Cleaner desk: Useful when you’re demoing on multiple devices or pairing with scrcpy for live demos.

Core recipe (works on most Android devices)
1. Connect phone via USB to your dev machine once.
2. Enable Developer options → USB debugging.
3. In terminal: adb devices (confirm device listed).
4. Tell the device to listen over TCP: adb tcpip 5555
5. Find the phone’s IP: on the phone Settings → About → Status or run adb shell ip -f inet addr show wlan0
6. Connect wirelessly: adb connect <PHONE_IP>:5555
7. adb devices should now list your device as <IP>:5555. You can unplug the cable.

Note: on Android 11+ some vendors support adb pair over a QR/code (safer). If your device supports it, use adb pair <host>:port to avoid enabling tcpip on a public network.

Four practical tweaks I use every day
- Keep screen awake during dev: Developer options → Stay awake. Prevents Doze from killing the adb connection during quick tests.
- Use a private hotspot for stability: If the office Wi‑Fi is flaky, create a phone hotspot and connect your laptop to it. This isolates the dev loop and avoids enterprise firewalls.
- Dedicated port script: I keep a small script that runs adb connect, then scrcpy, then tail -f logcat — one command to start the dev session.
- Static IP / bookmark: If you use a router, assign a stable IP to the phone so you don’t hunt it each morning.

Common failure modes (and fixes)
- "Unable to connect": check that both devices are on the same network and the phone’s firewall (some vendor ROMs block). If you’re on WSL, run adb on Windows or set up adb server bridging — WSL networking can complicate things.
- Intermittent disconnects: Doze, aggressive battery optimization, or AP roaming are usually the culprits. Turn off battery savers for your app and enable Stay awake while charging if you need long sessions.
- Security prompts: Newer Androids prompt to allow USB debugging authentication. You’ll need to accept the key when you first connect via USB.
- Public networks are dangerous: If your laptop and phone are on a public Wi‑Fi, anyone on that subnet can try to connect to adb. Don’t leave tcpip open there.

Security and tradeoffs
ADB over Wi‑Fi trades convenience for a wider attack surface. The risks:
- Open adb TCP ports: While adb requires authentication, older devices or custom ROMs may have weaker protections.
- Accidental exposure: If you leave tcpip enabled and join a public network, your device could be reachable.

My rules to limit risk:
- Only enable adb tcpip when on a trusted network (home, personal hotspot, private office Wi‑Fi).
- Disable it after the session: adb usb (switches device back to USB mode) or reboot the device.
- Prefer adb pair when available — it uses a temporary pairing code and is safer than leaving tcpip open.

Why I still plug in sometimes
- Performance: Large APK installs or frequent adb logcat + push/pull are more stable and faster over USB.
- Reboot/bootloader work: If I’m flashing images, unlocking bootloader, or doing low-level dumps, USB is mandatory.
- Power: Continuous testing drains battery; USB keeps the device charged.

India-specific tips that helped me
- Office Wi‑Fi gets restrictive fast: Many Indian startups use segmented VLANs or strict NAC. If Wi‑Fi blocks adb, I either use the phone hotspot or carry a cheap travel router (~₹1,000–1,500) to create a private network.
- Data cost myth: Using a hotspot between phone and laptop doesn’t consume mobile data — it just creates a local network. So you don’t need a higher data plan to use ADB over Wi‑Fi.
- Device diversity: Some Indian-market devices (especially heavily skinned MIUI or Funtouch) may sleep aggressively; explicitly whitelist adb in battery optimization.

When to use ADB over Wi‑Fi and when not to
- Use it for fast iteration, UI tweaks, live debugging, and demos — anything where you want mobility and fewer cable reconnects.
- Don’t use it for long-running instrumentation tests, flashing, or when you need maximum speed and reliability.

Closing note
ADB over Wi‑Fi is one of those small workflow upgrades that feels almost indulgent until you subtract the friction and see real time saved. It’s not a universal replacement for USB — expect flaky moments and lock down security — but for daily app iteration it feels like regaining a few uninterrupted minutes every hour. If you try it, start with a hotspot and a short checklist (enable tcpip, pair if available, disable after) and you’ll know quickly whether it fits your routine.

If you want, I can share my two-line script that connects, opens scrcpy, and tails logcat — it’s my morning ritual before I open the IDE.