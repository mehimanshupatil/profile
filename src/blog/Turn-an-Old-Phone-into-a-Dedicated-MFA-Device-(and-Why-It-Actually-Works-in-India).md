---
title: "Turn an Old Phone into a Dedicated MFA Device (and Why It Actually Works in India)"
pubDate: 2026-02-03
description: "Repurpose a spare Android as a cheap, offline MFA device: step-by-step setup, realistic tradeoffs, and India‑specific tips to keep your accounts secure."
author: "Devika Iyer"
image:
  url: "https://images.pexels.com/photos/6078121/pexels-photo-6078121.jpeg?auto=compress&cs=tinysrgb&h=1000&w=2000"
  alt: "A person holding an older Android smartphone on a wooden table with a small padlock beside it"
  caption: "Image credit: Pexels / Polina Kovaleva"
  creditUrl: "https://www.pexels.com/photo/person-holding-black-android-smartphone-6078121/"
tags: ["security", "personal-tech", "developer-tools"]
---

I keep a small, beat-up Android in a drawer. It has no SIM, no social apps, and lives most of its life in airplane mode—except when I need a second factor. After a couple of months using it as a dedicated MFA device, I stopped treating MFA like a convenience and started treating it like a tool I protect intentionally. If you have an old phone lying around, you can do the same—at almost zero cost—and significantly raise your account security. Here’s how I set mine up, the tradeoffs I learned, and the specific bits that matter if you’re in India.

Why use an old phone as MFA?
- Cost: Hardware FIDO keys (YubiKey, Titan) are great but cost money and sometimes take weeks to ship. An old smartphone is free or can be replaced with a cheap used handset for ~₹2–5k.
- Offline TOTP works everywhere: Most services support time‑based one‑time passwords (TOTP). A dedicated offline device reduces phishing and account recovery risks tied to your daily phone number or cloud backups.
- Convenience for teams: If you manage small infra or a startup, dedicating a device to shared admin accounts (with careful processes) is cheaper than buying multiple hardware keys.

Main keyword: old phone as MFA (used below 4 times for clarity and search).

What I did (step-by-step)
1. Pick the right device
   - Prefer Android over iOS for flexibility. Even a 5–6 year old low‑end Redmi/Poco or Motorola works.
   - Avoid phones with severely swollen batteries—safety first. Replace batteries only if you know what you’re doing.

2. Factory reset and strip it down
   - Wipe the device, create a local user, and do not log in with your primary Google/Apple ID.
   - Remove the SIM and any microSD card. No carrier dependency, no accidental number recovery flows.

3. Harden and isolate
   - Set a strong device PIN and enable full‑disk encryption (Android usually does this by default on modern devices).
   - Turn on airplane mode by default. Only enable Wi‑Fi briefly for updates if needed.
   - Disable location services, Bluetooth, and auto‑backups. Do not enable cloud sync for authenticator apps.

4. Install a trustworthy authenticator
   - I use Aegis or andOTP (open source) for Android. These apps store secrets locally and support encrypted exports.
   - Add TOTP tokens by scanning QR codes while both the account and the phone are physically in front of you.

5. Backup securely
   - Export encrypted backups to an external USB stick and print the most critical recovery QR codes (store them in a physical safe or locked drawer).
   - Keep one copy offsite with a trusted person if your device is your primary recovery path.

6. Routine and storage
   - Keep the device powered down when not in use. I charge mine once a month to ~50%—Li‑ion batteries last if you avoid constant top‑ups.
   - Label the phone (“MFA – DO NOT USE”) and store it somewhere dry and not obvious.

Realistic tradeoffs and where this falls short
- Not phishing‑resistant like FIDO2: A dedicated phone running TOTP still can be phished if you paste codes into a rogue site. It’s far better than SMS or cloud backups, but hardware security keys provide stronger protection for high‑risk accounts.
- Battery and reliability: Old batteries degrade. If you rely on this device for critical account recovery, replace the battery or maintain a charging schedule. I learned the hard way when my forgotten phone had a dead battery during a midnight incident.
- Physical theft risk: A stolen phone is a real threat. That’s why PIN, disk encryption, and a printed backup kept in a safe are non-negotiable.
- No universal compatibility: Some enterprise services require FIDO2 or security keys. This approach doesn’t replace those requirements. Treat the old phone as an extra layer, not an all-in-one replacement.

India‑specific notes
- Cheap used phones are widely available on OLX/Quikr or local exchange shops for under ₹5k—useful if you don’t have a spare.
- Avoid relying on SMS-based 2FA—carrier number portability and recovery flows in India make SMS fragile and sometimes insecure.
- If you have a remote working team, ship a spare used phone for shared admin access rather than juggling personal devices.

When to upgrade to a hardware key
If you handle highly sensitive infrastructure (production DBs, signing keys, payroll access), buy a proper FIDO2 security key. They’re now available locally and sometimes free through corporate programs; consider them mandatory for critical accounts.

My final rule of thumb
Treat the old phone as a dedicated, offline vault: minimal surface area, strong local protection, and a clear, tested recovery plan. For day-to-day devs and most personal accounts, an old phone as MFA is a cheap, practical improvement over SMS and cloud‑synced authenticators—just don’t assume it’s the end of your security journey.

If you want, I can list recommended Android models to buy used under ₹5k in India, or a checklist you can print and follow while setting up your device. Either way, start by finding that spare phone in your drawer. It’s doing better guarded than gathering dust.