---
title: "Why I Encrypt My Phone Backups with GPG (and the week I nearly bricked my restore)"
pubDate: 2026-05-09
description: "I stopped trusting cloud vendor encryption and started GPG‑encrypting selected phone backups. Practical steps, one real failure, and the small tradeoffs I accepted."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a smartphone and a cup of coffee nearby"
  caption: "Photo by Alejandro Escamilla on Unsplash"
  creditUrl: "https://unsplash.com/@alejandroescamilla"
tags: ["backup", "security", "mobile"]
---

I was standing in the Chennai airport lounge with three hours of data left on my prepaid plan, watching a 20‑minute Google Drive upload crawl at 50 KB/s. I needed a copy of my phone's important stuff—WhatsApp chat exports, a KeePass DB, and a set of scanned documents—to hand over to my lawyer. The upload finished hours later. Two days later I read about a cloud provider breach. The idea that my most sensitive things were sitting in plain buckets, ready to be indexed by anyone who got a key, stopped sitting well.

So I started encrypting my phone backups with GPG. Not everything, not full device images (I tried that; it broke once). Just the bits I actually care about restoring: messages, passwords, tax PDFs, passport scans, and the occasional media folder. It took an afternoon to set up and a week of missteps to get right. It’s saved me twice since then.

Why GPG and not the cloud provider’s "encrypted at rest"
- I trust GPG because I control the keys. With provider-side encryption, keys are often managed by the provider or by an account service I log into—exactly the vector attackers target.
- GPG gives me asymmetric encryption: I can encrypt a file for my long‑term key (stored offline) and still decrypt anywhere with that private key (or a hardware token).

What I actually back up
I stopped trying to back up everything. Phones are messy. I keep an "essentials" folder on my laptop and sync it manually:

- KeePass database (exported and closed on phone)
- Authenticator backup codes (exported to plain text once, immediately encrypted)
- WhatsApp chat exports (the "export chat" feature gives me an MHT or .txt + media)
- Scanned PDFs of ID, PAN, passport
- A daily folder of photos I care about (not every meme)
- Important app data that provides an export (some apps have an "export" option; use that)

I use simple commands so restores are reproducible. Example workflow I use locally:

- On laptop: tar the folder, compress with zstd, encrypt for my GPG key:
  tar -C ~/phone‑essentials -cf - . | zstd -q -c | gpg --encrypt --recipient "My Name <me@example.com>" -o backup-2026-05-01.tar.zst.gpg

- Upload the .gpg file to my personal Nextcloud/Google Drive and a mirrored copy on a cheap ₹300 VPS via rsync-over-ssh.

Why I compress before encrypting
Compression after encryption is useless. Compress before encrypting to save bandwidth and storage—zstd works well and is fast on a modest laptop.

The week it almost bricked everything (my honest failure)
I tried to automate everything. I wrote a cron job that symmetric‑encrypted backups with a passphrase and uploaded them. Great — until I changed my laptop and, distracted during a reinstall, used a different passphrase manager with a typo. I couldn't decrypt the most recent month's backups. I had to dig through old phones, old laptops, and an offline flash drive until I found a working copy. Cost to me: a frantic day of restore, skipped meetings, and a ₹1,000 courier to get a drive to my city. Lesson: never rely solely on ephemeral passphrases. Use an asymmetric key pair whose private key is backed by a hardware token or at least an air‑gapped backup.

Constraints and tradeoffs
- Not a full device image: Android's adb backup is flaky on recent phones and many apps refuse to export data without root. I accept partial backups of what matters.
- Manual steps: exports still need occasional manual triggers. I automate uploads but not the export from some apps (WhatsApp, authenticator). That friction is intentional—automatic full dumps create more surface area for mistakes.
- Restore friction: decrypting on the fly requires the private key or a token. When I travel with limited data, decrypting a 500 MB archive over tethering is slow. I keep a local decryptible copy on my laptop for travel, encrypted with the same key but stored offline.

A small checklist I actually follow
- Use an RSA/ed25519 GPG key with 4096-bit subkey for encryption, private key on a YubiKey and one air‑gapped copy on a password‑protected drive I don’t carry.
- Export critical app data to a single folder, run the tar→zstd→gpg pipeline.
- Push to at least two locations (personal Nextcloud + cheap VPS). I use rclone for Nextcloud and rsync + systemd timer for the VPS.
- Test restores quarterly. I aim to decrypt and extract at least one backup each quarter in a weekend window. If you fail to test, you don’t have a backup—you have hope.

Why this actually works for me in India
- Bandwidth is expensive and flaky. Compressing and uploading encrypted archives saves data and gives me a single atomic object per backup (no partial restores due to sync failures).
- Cloud breaches and forced data requests feel real; keeping encrypted blobs reduces risk from a vendor compromise and unwanted legal fishing expeditions.
- I can use free/cheap cloud storage without trusting their encryption. A ₹300 VPS mirror is cheap insurance and keeps an off‑network copy within my control.

An open annoyance
I still haven’t solved automated, reliable account‑level backups for everything. Some apps are intentionally hostile to exports. For those, I rely on manual screenshots of settings or periodic export attempts. Not elegant. Not perfect. But better than nothing.

What I walked away with
Backups aren't guarantees; they're rehearsals. Encrypting the stuff I actually need with keys I control forced me to test restores (and find the mistakes that would've been fatal). The small time cost and occasional restore friction are acceptable tradeoffs for the confidence of owning my data. If you care about a handful of documents and secrets, this is a practical, low‑cost approach that works even on slow Indian connections.