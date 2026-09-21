---
title: "One repo script that gives time‑boxed SSH access (and the week it failed)"
pubDate: 2026-09-21
description: "A small repo-level script I built to grant time-limited SSH access to servers for contractors and juniors — how it works, the race condition that taught me to use locking, and when this is still the wrong choice."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of hands typing on a laptop keyboard with code on the screen"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["infra", "security", "developer-tools"]
---

It was 11:20 pm on a Friday. A client demo the next morning needed a quick config tweak on a staging server. The junior on-call pinged me from a hotspot on her way home: “Can you add my SSH key? I need access for an hour.” I could give her a key, edit authorized_keys, and move on — but I’ve done that dance before: orphaned keys, no audit trail, and a PR full of questions during retros.

So I wrote a tiny script that lives in every repo: give-me-access.sh. It creates a time‑boxed SSH key pair, pushes the public key to the server with a clear expiry tag, and trusts the server to clean up expired entries. It’s been the single most practical access pattern for our small, distributed Indian startup. It’s far from perfect — and one outage taught me why.

Why not use a proper SSH CA or a managed bastion?
I like SSH CAs. I’ve set them up for larger teams. But for a 12‑person startup with contractors across Mumbai and Bengaluru, the overhead wasn’t worth it: PKI setup, onboarding docs, and a dependency on a central CA host. We needed something that:

- worked over flaky home ISPs and mobile hotspots,
- required zero external services,
- could be reviewed and run by anyone with git access.

What the script does (concrete)
Here’s the flow I use — nothing magical, just small, repeatable steps.

- On your laptop, run repo/scripts/give-me-access.sh --host staging --user deploy --duration 60
  - The script generates a temporary ed25519 key pair under ~/.ssh/repo-temp/${TIMESTAMP}-${USER}.
  - It outputs the private key path and an ssh command the user can paste to connect.
- The script scp's the public key to the server into /var/repo-access/keys/${REPO}-${USER}.pub and appends it to ~/.ssh/authorized_keys with a comment:
  - ssh-ed25519 AAAA... repo-access:repo-name:username:expiry=169xxxxxx
- A cleanup cron (or systemd timer) on the servers runs every 5 minutes, parses expiry markers in authorized_keys, and removes stale lines.

Why this is better in practice
- No manual editing: keys are tagged and machine-parsable.
- Short-lived by default: our default is 60 minutes — fewer orphans.
- Audit trail: the key files in /var/repo-access have metadata (who requested, repo, git commit id).
- Works even when our office VPN is down; it’s just SSH and scp.

An honest failure: the race that taught me locking
I was smug for three months. Then two engineers requested access to the same server within seconds. The script appended both keys to authorized_keys at the same time, and the file got corrupted (two concurrent writes clobbered it). Suddenly, nobody could login. We were on a 2am emergency call, fast-forwarding tail -f authorized_keys, manually reconstructing it, and muttering about our "clever" script.

Fix: use flock. I added a repo-level lock and a server-side lock file that the cleanup job respects. The change cost ten lines but saved three all-nighters. Lesson: local tools are easy to write, hard to get right in concurrency.

Other tradeoffs and real limits
- Dependence on server time: expiry uses the server's clock. On an old VM in an infra region with skewed NTP, expired keys stuck around. We now have a small monitoring rule that alerts if NTP drift exceeds 30s.
- Not for high‑security infra: If you handle financial production systems (Razorpay integrations, payment rails), this is not sufficient. Use short‑lived certs, Vault, or Teleport.
- Requires server-side agent or cron: every host must run the cleanup job. On ephemeral autoscaling instances that rebuild from AMIs, I had to bake the cleanup unit into the image or the init script; otherwise keys disappeared unpredictably.
- Source IP restrictions are useless under CGNAT: we once tried to implement from="1.2.3.4" restrictions in authorized_keys for extra safety. Indian ISPs and CGNAT made it unreliable — developers working from mobile data got locked out.

A few small bits that made it usable day-to-day
- Make the private key ephemeral and obvious. The script prints the exact ssh -i path and suggests setting a small SSH config alias. No searching files.
- Log every action to a central Slack channel (bot posts who requested, when, and the path). It made postmortems 10x easier.
- Rotate the cleanup cadence depending on host criticality. Production got a 1‑minute sweep and a separate alert if any key lived >4 hours.

When this approach failed me
Late last year a contractor used our give-me-access script to debug a live import. Their laptop froze mid-upload and their key remained in authorized_keys. The cleanup cron had been temporarily disabled during a maintenance window. That one sticky key gave me a new policy: mandatory post‑access confirmation. The script now requires the user to run repo/scripts/release-access.sh before it will accept another request for the same user; if the user doesn’t, ops gets a notification. It’s clumsy but beats surprise keys.

If you try it
- Start small. Make it a repo script so everyone can read it.
- Add idempotency and locking early.
- Treat the server cleanup as a first-class service — monitor it.
- Be honest about when to upgrade to a proper CA or a bastion.

Takeaway
The single thing I walked away with is this: small infra hacks must be built with the expectation they’ll be used by people who don’t read docs. That means safe defaults (short duration), clear audit trails, and mechanical cleanup. For day-to-day tasks at small Indian product teams, a tiny, time‑boxed SSH script is way more practical than a formal PKI — until you outgrow it. Then you’ll know exactly which parts to replace.