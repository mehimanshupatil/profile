---
title: "Stop Sharing Keys: How Short‑Lived SSH Certificates Fixed Our Dev Access Mess"
pubDate: 2026-03-16
description: "Ditch long‑lived SSH keys. A practical, low‑overhead guide to using short‑lived SSH certificates for secure, auditable developer access in small Indian teams."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=1000&w=2000"
  alt: "A laptop keyboard and terminal with code, shot from above in a 2:1 aspect ratio"
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["SSH certificates", "devops", "security"]
---

We used to handle SSH access like most small teams: generate a keypair, ask new hires to paste the public key into a server's authorized_keys, give contractors temporary access by emailing them a key, and pray. When someone left, we rotated a few keys, cursed at missing audits, and accepted the risk.

That all changed when we adopted short‑lived SSH certificates. For a team of eight working across client infra and a few cheap VPSes (many under ₹1,000/month), certificates cut the churn, removed shared keys, and made audits simple. I’ll explain how SSH certificates work in practice, why they’re a better fit for small Indian teams, and the tradeoffs you’ll hit once the honeymoon ends.

What SSH certificates actually buy you
- Short lifetimes: Instead of long‑lived keys you place on every server, you sign a developer’s public key with a central Certificate Authority for a short window (e.g., 1–8 hours). After expiry the cert is useless.
- Easy revocation by design: When certificates expire, access goes away. You don’t need to SSH into every host to remove keys.
- Central policy and audit: Your CA can issue certs with specific principals, source IP constraints, and expiries. Logs of issuance give you a single place to audit who got access and when.
- No key sharing: Developers keep private keys private. The CA signs their key; servers trust the CA, not copies of everyone’s pubkey.

How it looked for us (practical setup)
We needed something simple and reliable—not Vault, not a heavy SSO integration, and not a manual daily chore. Our stack ended up like this:
- A tiny CA host (small VPS, ₹300–₹500/month) running an open solution (examples: step-ca from Smallstep, or an SSH signing service you write that runs the ssh-keygen -s operation).
- Servers configured with TrustedUserCAKeys pointing to the CA public key (one line in /etc/ssh/sshd_config, then systemctl restart sshd).
- A short script or web UI that verifies a user (we used Google Workspace SSO + group membership) and signs their public key for 1–4 hours.
- Developers keep an ed25519 key locally and use ssh-agent. The signed certificate (id_ed25519-cert.pub) is kept alongside the key and used automatically by SSH.

The typical flow:
1. Developer authenticates to the signing service via SSO.
2. They upload their public key (or the service pulls it from a trusted store).
3. The service signs the key with the CA and returns a cert valid for, say, 2 hours.
4. The developer's SSH client presents the cert and logs in—the server accepts it because it trusts the CA.

Why this fits small Indian teams
- Cost: You can run the CA on a ₹300–₹600/month VPS. No SaaS bills, no Vault cluster.
- Bandwidth and latency: Signing traffic is tiny; cert issuance is fast even over modest connections common in India.
- Hiring/turnover: Indian startups often hire contractors and interns quickly. Short‑lived certs remove manual onboarding friction.
- Compliance and audits: A single audit log of certificate issuance beats hunting authorized_keys across many servers.

Real downsides and tradeoffs
- Single point of truth: The CA is critical. Compromise it and all certs become suspect. Treat the CA like a high‑value secret—use backups, limited access, and optionally hardware security modules.
- Ops overhead: You still need to run and secure the CA, keep its clock accurate (time skew breaks expiries), and rotate the CA key on a schedule. That’s more to manage than “put a pubkey in authorized_keys.”
- Windows madness: Native Windows OpenSSH support exists but can be clumsy. Some teammates on Windows needed extra guidance to store keys in Pageant or the Windows agent.
- Offline or emergency access: If your CA host is down (or your signing flow needs SSO and that provider has an outage), issuing new certs is harder. We keep a small emergency keypair with a very short, manually rotated lifespan and audit it strictly.
- Learning curve: Developers need to understand cert vs key, how to use id_ed25519-cert.pub, and ssh-agent behavior. Expect questions.

Implementation tips that actually helped
- Start with a 1–4 hour default. Short enough to be safe, long enough not to be annoying.
- Automate issuance in CI or developer tooling: make a CLI like myteam-cert get --duration 2h so issuing is a one‑liner.
- Store CA pubkeys in /etc/ssh/trusted_user_ca_keys.pem on servers via configuration management (Ansible/Chef/Puppet). That single file is easier to audit and rotate than thousands of authorized_keys entries.
- Log everything: write issues to a central audit log when you sign a key (user, principal, IP, duration). Make logs tamper‑resistant if possible.
- Plan CA rotation: rotate the CA key every 6–12 months and have a migration plan so servers trust the new CA before old certs expire.
- Make emergency access deliberate: keep one short‑lived break‑glass key, audited and rotated weekly, not a permanent backdoor.

When to consider heavier tooling
If you need per‑command justifications, dynamic host certificates, or tight integration with secrets engines, look at Vault’s SSH backend or enterprise offerings. For most small teams in India balancing cost and complexity, a tiny CA + SSO check is adequate.

Conclusion
Short‑lived SSH certificates won’t make every security problem disappear. You trade manual key chaos for a little operational complexity and a critical CA to manage. For our team, it was worth it: fewer shared keys, simpler offboarding, and a much clearer audit trail — all on the budget of a single small VPS and a couple of scripts.

If you’re tired of playing key whack‑a‑mole across servers, try a pilot: pick one bastion, deploy the CA, convert a small group of devs, and measure how many hours you save on onboarding and audits. Expect a few bumps, but the control you gain is real—and refreshing.