---
title: "Stop Sharing Keys: A Freelancer's Guide to Cross‑Account IAM Roles for Client AWS Access"
pubDate: 2026-02-16
description: "If you manage multiple client AWS accounts, stop juggling long‑lived keys. Learn a practical cross‑account IAM roles workflow that’s safer and faster."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=2000&h=1000&q=80"
  alt: "A laptop on a desk showing code and cloud diagrams on the screen, with a notebook and coffee nearby."
  caption: "Image credit: Photo by Niels Steeman on Unsplash"
  creditUrl: "https://unsplash.com/photos/1555066931-4365d14bab8c"
tags: ["aws", "security", "freelancing"]
---

I used to keep a spreadsheet of AWS access keys for every client, switching profiles like a frantic DJ changing records. It worked—for a while—until keys expired unexpectedly, a client rotated credentials without telling me, or worse, I accidentally ran a destructive command in the wrong account.

If you do client work on AWS in India (or anywhere), the cleaner, safer pattern is to use cross-account IAM roles. They cut out long‑lived keys, give clients control of permissions, and make switching between accounts predictable. Below I’ll walk through a practical workflow I use—what to ask clients for, how to configure your CLI, and the real tradeoffs you will hit after a few months of running this in production.

Why cross-account IAM roles, quickly

- No long‑lived keys on your machine: assume-role is temporary and auditable.
- Clients retain control: they define the exact permissions and can revoke access instantly.
- Easy context switching: CLI and browser role switching are fast and deterministic.

Main keyword: cross-account IAM roles (used naturally below).

What to ask your client

Before you start, ask the client for:
- A role ARN you can assume (format: arn:aws:iam::ACCOUNT_ID:role/RoleName).
- A trust policy that allows your IAM user or their Identity Provider to assume the role. If they’re reluctant, explain you can still use temporary credentials.
- Optional: an MFA requirement (good), and a short description of the role’s permissions.

If the client can’t create roles (banking, regulated sectors) you’ll need to fall back to short‑lived keys or a dedicated user—more on that later.

How clients should create the role (what to suggest them)

A minimal trust policy they attach to the role might look like:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/your-username" },
      "Action": "sts:AssumeRole",
      "Condition": {}
    }
  ]
}

Better: they allow your team’s role or an external IdP. Encourage them to set a sensible maximum session duration (1 hour is common) and enable CloudTrail for auditability.

CLI setup: practical and reproducible

I prefer not to store user keys locally. Use one of these approaches.

1) aws-vault (local secure keystore)
- Store your personal user creds in an encrypted keystore.
- Configure a profile for each client that references the role:

~/.aws/config
[profile client-a]
role_arn = arn:aws:iam::123456789012:role/ClientDeveloper
source_profile = personal

When you run: aws-vault exec personal -- aws s3 ls --profile client-a
aws-vault handles assume-role and temporary credentials for you.

2) Native AWS CLI profile chaining (no third‑party)
~/.aws/credentials
[personal]
aws_access_key_id = AKIA...
aws_secret_access_key = ...

~/.aws/config
[profile client-a]
role_arn = arn:aws:iam::123456789012:role/ClientDeveloper
source_profile = personal
region = ap-south-1

Then: AWS_PROFILE=client-a aws s3 ls

3) AWS SSO / IAM Identity Center
If either you or the client uses SSO, prefer it—no keys, centralised control, and federated access. Setup differs per tenant but it’s worth pushing clients toward it when possible.

Browser switching
The AWS console also supports switching roles via the “Switch Role” option; keep a bookmark list of console URLs with role session names to avoid confusion. For regular client work I keep role session names like "rohan-freelance" so CloudTrail is readable.

A practical example: rotating into a client account

Say you need to run migrations and deploy a Lambda:

- aws-vault exec personal --profile client-a -- aws sts get-caller-identity
- Confirm the account ID and role session name.
- Run your terraform/apply with AWS_PROFILE=client-a, or export temporary creds for your deployment tool.

Constraints and tradeoffs (real talk)

- Not every client will set this up. Smaller clients sometimes hand out IAM user credentials because it’s "simpler" for them. That’s a security downgrade—treat such creds as ephemeral, push for rotation, and use vaulting tools.
- Session duration limits: default max is 1 hour for consoles and can be up to 12 hours for roles, depending on the role’s MaxSessionDuration. Long-running CI tasks might need separate arrangements.
- Role proliferation and complexity: if a single client creates many roles for different projects, managing profiles gets messy. I prefer a naming convention and a short README in my dotfiles repo.
- Audit and billing confusion: when you assume a role, CloudTrail logs show the assumed role; clients should map sessions to individuals. If clients don’t enable this properly, debugging incidents becomes harder.

A small, India‑specific tip

Many Indian clients have internal compliance requirements—ask early whether they require a signed NDA, IP assignment, or a specific audit trail. Propose cross-account roles as part of onboarding; it’s a low‑cost win for their security team and your sanity.

When cross-account roles aren’t enough

For CI pipelines that must run unattended, I often recommend:
- A dedicated, short-lived service role in the client account that CI assumes via a GitHub Action OIDC provider or an external IdP.
- Or a limited IAM user with strictly scoped permissions and enforced key rotation via automation.

Conclusion

If you freelance with AWS accounts, adopting cross-account IAM roles is one of those small infrastructure changes that pays back in time, fewer surprises, and better security. It’s not perfect—some clients won’t cooperate, and role session limits can bite—but when it’s available it replaces brittle key-spreadsheet workflows with something reliable and revocable.

Try it on your next client onboarding: ask for a role ARN, configure one CLI profile, and notice how much less you worry about keys. If the client resists, you’ve already got a conversation starter that’s framed around auditability and least privilege—two things finance and compliance teams actually like hearing.