---
title: "Disposable AWS Accounts for Risky Experiments (and the ₹25,000 Mistake That Taught Me Limits)"
pubDate: 2026-09-16
description: "How I stopped fearing infra experiments by using throwaway AWS accounts: the minimal setup, the one costly mistake, and the guardrails that actually matter."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with code visible on the screen, sitting at a wooden desk"
  caption: "Photo by Tran Mau Tri Tam on Unsplash"
  creditUrl: "https://unsplash.com/@trantaumitram"
tags: ["cloud","aws","experimentation","infra"]
---

I remember sitting on a Saturday night, caffeine edge on, staring at a design that needed a risky infra change: a new ingress controller, a nonstandard VPC layout, and a stateful migration we couldn’t easily roll back. My team’s staging cluster already felt fragile; production felt like a landmine. I could use feature flags, canaries, more tests — or I could stop treating my infrastructure like a sacred cow and try the change somewhere I could burn it to the ground without tears.

So I started a disposable AWS account.

If you’ve done anything vaguely infra‑adjacent in a small Indian startup, you’ve felt the friction: approvals, billing tags, “don’t touch production” guards, and the low hum of dread before any change. A disposable account gave me a sandbox with two properties I hadn’t had before: permission to fail, and a clean slate that matched production enough to be useful.

What I set up (the cheap, practical parts)
- An AWS Organization with one long‑lived “golden” account and a bunch of sibling experiment accounts. I keep these under one consolidated bill so finance isn’t surprised by dozens of tiny accounts.
- A short Terraform module that boots the bare minimum: VPC, an IAM role for cross‑account access, an S3 backend for state (with a lifecycle policy), and CloudWatch billing alarms. This is a 15‑minute script I run the first time I need an account.
- Cross‑account role + MFA. I never share long‑lived keys; I assume I’ll be careless and design for that. The role has a name like arn:aws:iam::123456789012:role/experimenter and requires an MFA session.
- SCPs (Service Control Policies) that are permissive by default, but with one rule: deny anything outside a curated whitelist (no RDS restore from snapshot if it references prod, no creating IAM roles with wildcards). This prevents the dumb mistakes.
- Billing alerts and a budget with a hard threshold at ₹3,500 (~$40). For experiments I’m willing to accept, I bump it; otherwise the alert auto‑freezes the account by removing the experimenter role via an automation lambda. Yes, I’ve automated my own lockdown.
- A trivial scrubber script for any replayed logs or test data that might touch PII. This lives in the golden account and gets run before importing any trace.

Why this actually saved me time
Before disposable accounts I’d spend days carving out time to “do the experiment in staging” and still be terrified. The disposable account removed the cognitive load. I could:

- Push a risky change and wreck it instantly. No “please don’t do this” Slack messages. No surgical rollbacks.
- Run traffic mirroring at 1% without worrying about side effects on other teams.
- Try wildly different infra patterns — different CIDR ranges, alternative ingress controllers, experimental node types — exactly like production, but isolated.

The first time it paid for itself I discovered an auth edge case: our config caused a short-lived token to expire during a streaming reconnection test. Staging didn’t replicate it because of one subtle VPC route. In the experiment account I could iterate networking repeatedly until I reproduced it. Fix, test, destroy — done.

The mistake that cost me ₹25,000 (and what I changed)
Confidence breeds shortcuts. A month in I spun up an autoscaling group with a custom AMI that downloaded large datasets during bootstrap. I misconfigured the lifecycle hook and the instances kept retrying on failure. The group chewed through spot instance capacity and, because I’d forgotten to set the budget to hard‑freeze, AWS charged me roughly ₹25,000 in 72 hours. Not a company‑ending bill, but enough to trigger an ugly finance call on a Monday.

What I learned the hard way:
- Budgets must be hard, not advisory. My automation now removes the experimenter role as soon as budget > 40% threshold. If you need more, you apply for a temporary bump and sign off on an expected upper bound.
- Simple autoscaling policies need runbooks. I now template a safe autoscaling policy with cooldowns and a max spend tag that our small automation watches.
- Tag everything and enforce tags via SCPs. I wrote a small AWS Config rule that flags any resource without a cost center tag; the automation disables the role until tags are added.
- The scrubber I trusted once failed because a new dataset schema slipped through. I added an explicit data‑approval step before bulk imports.

Constraints and why disposable accounts aren’t a silver bullet
- Compliance: If you work for a company with strict audit requirements (banks, healthcare), a disposable account may be impossible or require extra logging and cross‑account traceability. We had to stop using disposable accounts for anything touching cardholder data.
- Team friction: Some engineers see disposable accounts and think “I can do anything.” That’s true — and dangerous. Trust is not permission. We paired the disposable account model with a short code review rule and a one‑paragraph “what I’m trying to learn” note in PRs.
- Overhead: There’s bookkeeping. Spinning accounts, cleaning S3, rotating roles — it takes time. But the time is predictable and bounded; the alternative was unpredictable fear and stalled experiments.

When I do NOT use a disposable account
- For production migrations that touch live user data. There I use feature flags, canaries, and gradual rollouts inside production with very conservative throttles.
- For long‑running infra (Cassandra clusters, data warehouses) where lifetime costs and state matter. Disposable accounts are for dev experiments, not long‑term services.

Takeaway
The point of a disposable account is not to be reckless; it’s to make failure cheap, visible, and recoverable. That cheap failure lets me iterate faster than long approval loops ever did. But it demands a few guardrails: hard budgets, enforced tags, and a culture that treats sandboxing as responsibility, not permission.

One question I keep asking: what’s the smallest guardrail that prevents the next ₹25,000 mistake without turning every experiment into paperwork? I’m still fine‑tuning that balance.