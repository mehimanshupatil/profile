---
title: "Why I Use SOPS + Cloud KMS for Secrets — and When to Stop Pretending You Need Vault"
pubDate: 2026-01-16
description: "A practical, India‑friendly approach to secrets management that balances auditability, low friction, and real operational cost for small teams."
author: "Rohan Deshpande"
image:
  url: "https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1000&w=2000"
  alt: "Person typing on a laptop at a wooden desk with a phone and notebook beside it"
  caption: "Image credit: Pexels / Pixabay"
  creditUrl: "https://www.pexels.com/photo/person-using-laptop-374074/"
tags: ["secrets management", "developer workflows", "security"]
---

I used to treat secrets like glitter: out of sight, out of mind, and impossible to remove once they got everywhere. After a couple of accidental pushes, a late-night CI failure, and a painful onboarding session for a new hire in a café with flaky Wi‑Fi, I settled on a pattern that’s boring, auditable, and—most importantly—actually usable by real teams in India.

My position: for most small teams and side projects, keep secrets in encrypted files in the repo using Mozilla SOPS, backed by a cloud KMS (AWS/GCP/Azure). Use your CI provider’s secret store for runtime injection. Run a dedicated secret manager (HashiCorp Vault, AWS Secrets Manager) only if you need dynamic secrets, short-lived credentials, or enterprise-grade access policies. That tradeoff—simplicity now versus operational capability later—has saved us time, reduced mistakes, and worked when people were offline or on metered mobile data.

Why this feels right in practice
- Auditability without mystery: Encrypted YAML/JSON files committed to the repo give you a single source of truth that you can review in pull requests. You can see who changed the encrypted file and why. When onboarding or investigating an incident, you have a readable history to follow.
- Low-bandwidth friendliness: Developers in India often work from cafés, trains, or homes with metered data. An encrypted file is just text. No one needs to be constantly connected to a remote vault just to fetch config during local development.
- Minimal ops burden: SOPS + KMS is a few commands to set up. Contrast that with Vault: you need HA, backups, auth methods, renewal policies, and someone to maintain it. For a five‑person team, that ops cost is real.

How I actually use it (practical pattern)
- Store environment secrets in secrets.enc.yaml (SOPS-encrypted). Commit to the repo so PRs can show context.
- Use a cloud KMS key to encrypt the SOPS key. Team members get access through their cloud IAM accounts or use PGP keys for contractors.
- In CI, decrypt at runtime using a key available to the CI job (CI secrets or an IAM role). Inject variables into the process, but don’t check decrypted files back into the repo.
- For personal/team credentials (SSH keys, SSNs? no), use a password manager (Bitwarden/1Password)—don’t mix those with repo secrets.

I mention this because “secrets management” is abused as a category: people conflate encrypted files, CI secret stores, Vault, and password managers. They’re different tools for different problems. Naming the pattern keeps expectations realistic.

Common objections—and why they’re valid
- “But Vault gives dynamic secrets and rotation!” True. Vault’s dynamic DB creds and short-lived tokens are a huge win for large systems. The downside: you’ll spend weeks operating it well. If your biggest secret is a single production DB username/password, SOPS + rotation scripts are cheaper and less risky.
- “What about key compromise and rotation?” With SOPS, rotation is manual. You’ll need a rotation plan: re-encrypt the repo with a new KMS key or rotate PGP keys and rotate credentials in services. It’s more human work than a managed secret store. That’s an explicit tradeoff.
- “Cloud KMS is provider lock‑in.” Also true. Using AWS KMS ties you to AWS for that layer. If you care about multi‑cloud portability, use PGP keys or a cross‑cloud KMS abstraction—but expect more setup.

A realistic onboarding flow (two constraints you’ll actually face)
1) Granting access means IAM or PGP sharing. In India, where contractor churn and freelance help are common, you’ll often grant temporary access. That introduces human error—revoke those IAM entries promptly. Treat this as a people problem as much as a tech problem.
2) Rotation is inconvenient. Rotating a key in SOPS requires re‑encrypting files and coordinating deploys. Do it quarterly or when someone leaves, and accept the small operational cost.

When to graduate to a full secret manager
- You need dynamic secrets: short-lived DB credentials, per-request tokens, or AWS IAM on behalf-of workflows.
- You have regulatory obligations that require fine-grained audit trails and policy enforcement beyond commit history.
- Your team size and incident surface mean someone will be dedicated to running infrastructure anyway.

What I’d change after long-term use
- Invest in clear onboarding docs and an automated script for “give me access” + “revoke my access.” The single biggest source of friction has been manual IAM steps.
- Add an audit job that checks for accidentally committed plaintext secrets and flags unencrypted secret file patterns in PRs. Prevention costs little compared with a leaked token.
- Keep short-lived runtime secrets (CI tokens, deploy keys) out of the repo entirely—use the CI’s encrypted store only.

If you’re starting today in India and care about shipping features without gifting the production key to a public fork, do this: choose SOPS + KMS, document the onboarding, use CI secrets for runtime, and set a clear policy for rotation and offboarding. Don’t ship Vault as the first thing you learn—treat it like a later investment.

Secrets management shouldn’t be a magical vault guarded by rituals; it should be a boring, reliable process that your team can follow even when someone’s on a 2G hotspot. The hard wins are not the tools themselves but the conventions you adopt: who gets access, how you rotate, and how you verify you didn’t accidentally check a secret into master. Do that, and the rest becomes manageable.