---
title: "Why I split my GPG key and put the annoying part on a hardware token"
pubDate: 2026-04-03
description: "How I stopped losing signed commits and shipping unsigned releases by using an offline primary key, subkeys for day-to-day signing, and a cheap hardware token — plus the mistakes that hurt."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden desk with coffee cup and a small security key beside the keyboard"
  caption: "Photo by Manki Kim on Unsplash"
  creditUrl: "https://unsplash.com/@mankikim"
tags: ["security", "developer-tools", "infrastructure"]
---

It was 2am and I had just rebuilt my laptop from scratch. I’d pushed a hotfix, created a signed tag, and gone to bed satisfied. Next morning the CI yelped: our release artifact had no valid signature. My local git still showed the signed tag. My CI runner had been signing with a key that didn’t exist anymore.

I’d already lost a primary GPG key once — during a rushed reinstall where I forgot to export it. That time it meant frantic keyserver uploads, revocations, and explaining to the team why half our artifacts were now "probably fingerprinted by someone else." I promised myself I wouldn’t repeat it. Then I did something better: I split my identity into an offline primary key and smaller subkeys, put the usable bits on a hardware token, and built a CI-friendly fallback using cloud KMS. It made releases boring, which is exactly the point. It also taught me a few tradeoffs the hard way.

Why split keys at all
A single long-lived GPG key feels simple until you hit theft, laptop loss, or that 2am reinstall. If the private key is compromised, you must revoke and re-communicate trust across repos and users. If it’s lost, you have to rebuild trust from scratch.

Splitting fixes both problems. You keep a small, air-gapped primary key that certifies subkeys. Daily signing — commits, tags, SSH, and CI — uses subkeys that you can rotate without breaking the entire web of trust.

How I organised mine (and why it mostly works)
- Primary key: created on an offline machine using a fresh USB live image. Never uploaded. Stored encrypted on a USB stick (LUKS) in a small safe at home — yes, old-school. This key exists only to sign and certify subkeys.
- Subkeys: I created three subkeys — one for signing, one for authentication (SSH), and one for encryption. The signing subkey I moved onto a hardware security token (a FIDO/GPG-compatible key). The authentication subkey I kept in my laptop's secret store for SSH agent forwarding.
- CI and automation: for our GitHub Actions/hosted CI I didn’t put the private subkey into secrets. Instead I created an asymmetric signing key in our cloud KMS (AWS KMS/GCP KMS). CI requests a signature from the KMS and publishes artifact + detached signature. We verify signatures using the primary key’s cert and the KMS public key.

Concrete benefit: when I switch laptops I do not import the primary. I plug the hardware key in, and my commits and tags are signed again. CI keeps producing signed artifacts because the KMS signing key is independent. If a subkey is accidentally exported or the laptop gets cloned, I can revoke that subkey only, leaving the primary intact.

The failure that taught me more than any blog post
I made a rookie mistake: I once exported a subkey to another machine to debug a signing failure, then forgot to delete it. My laptop was compromised (luckily not the safe), and the attacker had a usable subkey. I detected it within a day and revoked that subkey — which worked — but the process was messy. We had to sync keyring updates across the team, and some CI jobs using cached verification metadata failed until we re-published the new fingerprints.

Important lesson: physical tokens are not optional if you want strong protection. Exportable subkeys defeat the point. Also: revocation is real work. Plan for rotation and automate publishing revocation certificates alongside your release process.

Tradeoffs worth knowing
- Complexity: this is more moving parts. You’ll deal with GPG quirks, pinentry annoyances, and CI KMS permissions. For one-person side projects this can feel like over-engineering.
- Hardware token ergonomics: hardware tokens can be fiddly on Linux laptops with flaky USB ports or weird udev rules. I bought a small USB-A token for ₹2,500 and another USB-C adapter for ₹300. It mostly works, but sometimes I still have to toggle udev rules or replug mid-sign.
- CI cost and ops: using KMS for signing costs a few cents per operation and needs careful IAM rules. In our startup this was acceptable; in a one-dev side project I might simply use a short-lived subkey in a GitHub secret and accept the risk.
- Tool compatibility: not all package registries or signing workflows accept detached GPG signatures or KMS public keys cleanly. We had to add an extra verification step to our release pipeline.

Short, practical checklist if you want to copy this
- Create the primary key offline. Export its public key and the revocation certificate. Store both in at least two safe places.
- Create subkeys and sign them with the primary.
- Put the signing subkey on a hardware token and mark it non-exportable.
- Set up cloud KMS asymmetric key for CI signing. Restrict IAM to pipeline role only. Publish the KMS public key alongside your primary key cert.
- Build small scripts to verify artifacts: check detached signature, primary cert, and KMS public key fingerprint.
- Practice a rotation: generate a new subkey and revoke the old one to ensure your process works.

A small India-flavoured note
If you work from a Bengaluru co-working desk or a Pune apartment, remember physical security: keep that LUKS-encrypted USB primary key somewhere you can get to across cities (a locker, a trusted family member). Buying a decent hardware token in India can cost ₹2–3k; it’s cheaper than explaining a compromised release to an angry customer.

What I actually walked away with
I walked away with a boring release process. No more middle-of-the-night panics about unsigned artifacts, and no "who lost the GPG key?" Slack threads. The overhead is real: a couple of hours to set up, small monthly KMS costs, and the occasional USB hair-pull. But losing a private key (or having it stolen) used to cost me days of trust-rebuilding. Now I spend that time writing tests.

If you care about reproducible trust — especially for team projects or anything users download — the split-key + hardware token + KMS approach is practical. If you're solo and releasing trivial scripts, it might be too much. My compromise: use the split model but relax CI KMS if your threat model is low. The one non-negotiable for me now is a non-exportable signing subkey on hardware. Once I stopped treating signatures like magic and made them recoverable, releases stopped being emergencies.