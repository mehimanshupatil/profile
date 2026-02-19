---
title: "What's in My ₹3,000 On‑Call Kit (and Why I Carry It Everywhere)"
pubDate: 2026-02-19
description: "A compact, practical on‑call kit you can assemble in a weekend — what to pack, why each item matters, and the real tradeoffs I learned on call in India."
author: "Arjun Malhotra"
image:
  url: "https://images.pexels.com/photos/373945/pexels-photo-373945.jpeg?auto=compress&cs=tinysrgb&h=1000&w=2000"
  alt: "A small zip pouch laid open on a wooden table showing cables, a power bank, SIM cards, and a USB adapter."
  caption: "Image credit: Pexels / Pixabay"
  creditUrl: "https://www.pexels.com/photo/assorted-technology-items-on-brown-wooden-table-373945/"
tags: ["on-call kit", "incident response", "developer workflows"]
---

If you've ever sprinted out of bed at 2 a.m. to fight a pager and found your home Wi‑Fi dead, you know the feeling: adrenaline, half-remembered runbook steps, and the conscious decision not to get out of pajamas to drive somewhere. For me, that sequence happened enough times that I stopped playing improv theatre and built a tiny, reliable kit I could grab in under 30 seconds.

I call it my on‑call kit. It fits in a small zip pouch and costs around ₹3,000 if you shop sensibly. It has saved me hours (and a lot of panic) more than once. Below’s what I carry, why each item matters, and the real downsides you should consider before doing the same.

What I pack (and why)

- A 10,000 mAh power bank (₹1,000–1,500)
  - Why: Phones, MiFi devices, and USB sticks die faster than you expect under continuous use. A 10,000 mAh bank is light, charges a phone once or twice, and can keep a small LTE hotspot running through a long incident.
  - Tradeoff: It adds weight and needs charging. I keep it topped up weekly.

- A basic LTE MiFi or USB dongle + a prepaid SIM (₹1,000–2,000 total)
  - Why: Home broadband or office VPN can be the single point of failure. A small MiFi gives you an independent path to the internet and a reproducible test environment. In India, look for carrier combos with decent night data or unlimited plan trials for Dev/Test.
  - Tradeoff: Mobile networks can be flaky in the same outage area; it’s insurance, not a silver bullet. Also, MiFi devices require occasional firmware checks.

- USB-C (or lightning) to Ethernet adapter (₹400–800) + 1m Cat6 cable
  - Why: When Wi‑Fi craps out but the ISP's copper is alive, plugging into an ethernet-enabled wall port can restore enough connectivity to run diagnostics or push a rollback.
  - Tradeoff: Not every place has an exposed jack, and this is useless on flights. It’s a niche item that pays off rarely but hugely.

- A small multi‑cable (USB‑C, micro‑USB, lightning) and a 30‑cm USB‑A cable
  - Why: One cable that handles most devices beats rummaging for cords mid-incident. Short cables are better for portable power banks and cramped spaces.

- Two physical 2FA keys (YubiKey‑like) or an old phone with a dedicated authenticator app
  - Why: Some on-call tasks require privileged console access that’s bound to an MFA device. Keeping a hardware key or a dedicated offline phone minimizes the risk of losing MFA access when your primary device is unreachable.
  - Tradeoff: Hardware keys cost ~₹2k–5k. If you use keys, treat them like cash—losing one is a security incident.

- A laminated 1‑page runbook and emergency contacts
  - Why: Under stress you forget simple commands and passwords. A printed runbook with the fastest rollback and contact numbers saved offline is gold.
  - Tradeoff: Paper can be out of date. Update it monthly and store a digital snapshot in an accessible, encrypted place.

- A tiny USB stick with a rescue image (2–8 GB)
  - Why: Quick bootable tools for password resets, network diagnostics, or collecting logs. I keep one with a minimal Linux live image and a few scripts.
  - Tradeoff: Carrying sensitive scripts needs discipline—encrypt anything with credentials and treat the stick like a secure key.

- Pen, highlighter, and small notepad
  - Why: Phone notes are fine, but you sometimes need to jot network IPs, timestamps, or pager IDs quickly. Paper works offline and is easier to hand off during a shift change.

How I use it in practice

The kit lives on a small shelf near the front door. When a page comes, two steps: grab the pouch, check the battery light, and head for the nearest chair with signal. In 80% of cases where home broadband is flaky, the MiFi + power bank combo buys me a reliable connection within five minutes and the printed runbook tells me whether to roll back or scale a service.

I’ve also used the Ethernet adapter during office ISP outages—plug, authenticate through backup VPN, and run a quick healthcheck. Once I used the rescue USB to boot a recovery image and collect a kernel panic log from a workstation that wouldn’t boot otherwise. Real, small wins.

Real constraints and when not to bother

- Cost vs benefit: A full kit with YubiKeys and a MiFi can cross ₹4k–6k. For many individual contributors, the marginal value is high; for orgs with on-call teams and redundant infrastructure, a personal kit may be overkill.
- Security risk: Anything portable is a risk if lost. Encrypt USB sticks, separate personal vs. team MFA devices, and register hardware keys so they can be revoked quickly.
- Maintenance: Batteries die, SIMs get deactivated, and printed runbooks go stale. The kit is low effort to maintain if you schedule a weekly 5‑minute check, but it’s not "set and forget."
- Not a replacement for good systems: If your architecture lacks redundancy, a kit is first‑aid. The real fix is better observability, runbooks, and prebuilt recovery automation.

How to assemble yours this weekend

1. Start tiny: buy a cheap 10,000 mAh power bank and a short multi‑cable (₹1,000 total). Test them for a week.
2. Add an LTE SIM (₹200–500) and either an old phone or a ₹1,200 MiFi. Verify connectivity from multiple rooms.
3. Add the runbook and a USB stick with a single rescue image when you feel comfortable.
4. Consider hardware MFA only if your team requires it; otherwise use a dedicated authenticator phone.

An on‑call kit isn’t a badge of toughness. It’s low-friction resilience: a small set of reliable tools that reduce cognitive load when things are messy. For me, carrying that pouch has turned a handful of 2 a.m. meltdowns into manageable, predictable work. You’ll still lose sleep sometimes—nothing fixes that—but you’ll lose far fewer mornings to panicked improvisation.

If you want, tell me your team size and I’ll sketch a kit with specific models and links you can actually buy in India.