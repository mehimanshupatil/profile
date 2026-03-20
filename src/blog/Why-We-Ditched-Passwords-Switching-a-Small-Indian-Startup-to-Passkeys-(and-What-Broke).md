---
title: "Why We Ditched Passwords: Switching a Small Indian Startup to Passkeys (and What Broke)"
pubDate: 2026-03-20
description: "How a small Indian startup replaced passwords with passkeys—what worked, what failed, and a practical rollout plan with realistic tradeoffs."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1559526324-5705f17f24e6?w=2000&h=1000&fit=crop"
  alt: "A smartphone and laptop on a wooden desk, with someone tapping the phone screen"
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["passkeys", "authentication", "security"]
---

We switched our small product team from passwords to passkeys last year. It started as a security experiment—less phishing, fewer reset tickets—and turned into an operational project that touched recruiting, onboarding, and support. If you’re a developer or engineering lead in India thinking about ditching passwords, here’s the practical story: why we did it, what actually improved, and the messy tradeoffs you need to plan for.

Why we wanted passkeys
- Fewer support tickets. Password reset requests were our single biggest onboarding nuisance. Passkeys eliminated most of those.
- Real phishing resistance. With passkeys, there’s no shared secret to phish or steal through a fake login page.
- Simpler developer ops. We removed password storage risks and simplified our auth logic because we no longer had to handle salted hashes, password rules, and complex reset flows.

In short: passkeys gave us a better security posture with less day-to-day friction. But the day-to-day reality wasn’t magically easier.

What broke (so you can avoid it)
- Device churn and transfers. In India, people change phones, get replacements, or share devices more often. When someone lost a phone and hadn’t exported passkeys, they were locked out. We had to build clear recovery flows.
- Browser and device gaps. Older Android phones and feature phones don’t support passkeys well. Some vendors’ WebView implementations behaved inconsistently, which surprised our testers.
- Family/shared-device setups. Employees who used a family phone for occasional work access struggled. Passkeys are great for personal devices; they’re awkward for shared ones.
- Third‑party integrations. Some legacy tools we relied on (CI dashboards, internal ticketing) didn’t support passkeys. We kept password-based service accounts around longer than we wanted.
- User expectations. For 10–15% of new hires, the concept of passwordless felt threatening. We had to train people and create “what to do when you change phones” guides.

A practical rollout plan for small teams
1. Pick your provider and scope
   - If you use Google Workspace or Okta, enable passkeys there first. For bespoke apps, adopt WebAuthn-backed UIs using established libraries (e.g., simple WebAuthn wrappers or your IDP’s SDK).
   - Start with non-critical apps: developer tooling, internal docs, Slack. Prove the workflow before converting payroll or admin consoles.

2. Provide clear recovery options
   - Require at least one recovery method before you disable passwords: a secondary device, a registered hardware key (YubiKey), or a verified admin reset process.
   - For India-specific realities, assume many will use a single primary phone. Offer a low-cost hardware key (₹1,500–3,000) for senior staff and admins.

3. Keep password fallbacks for service accounts
   - Build machine/service accounts that use short-lived tokens or API keys rather than long-lived passwords. Don’t force humans-only passkeys where automation is involved.

4. Communicate and train
   - Create a one-page “phone change” checklist and a 10-minute onboarding demo. We did live sessions and a recorded walkthrough; both cut initial support queries by 60%.

5. Test for edge cases
   - Test on budget Android devices, older Chrome versions, and WebView implementations common in India. Don’t assume “modern support” if your users include regional contractors.

Costs, ROI, and realistic tradeoffs
- Upfront cost: low to medium. Most of the work is engineering time and documentation. If you buy hardware keys for admins, budget ₹1,500–3,000 per key.
- Support savings: real, but front-loaded. We had an immediate drop in reset tickets, but we also had a short window of higher support load for recovery and education.
- Security gains: large. Phishing- and credential-stuffing risks fell dramatically because there were no reusable secrets to steal.
- Not a silver bullet. Passkeys don’t fix poor device hygiene (unpatched phones, rooted devices) or insider access issues. You still need good device policies and endpoint checks.

When not to switch
- If a sizable fraction of your workforce uses shared devices or feature phones, passkeys may increase friction.
- If many of your critical vendor tools don’t support passwordless auth, the operational complexity of hybrid systems can outweigh the benefits.
- If you have no reliable recovery/asset-tracking process, you’ll introduce outages for people who lose or replace phones.

Final checklist before you flip the switch
- Confirm passkey support across the tools your team actually uses.
- Publish a “change phone” and “lost device” playbook.
- Mandate a recovery option (secondary device or hardware key) for admins.
- Pilot with a single team for 4–6 weeks, monitor support tickets, and iterate.

Conclusion
Passkeys fixed real problems for us: fewer resets, stronger resistance to phishing, and simpler auth code. But they also exposed device-management gaps and forced us to think harder about recovery. If you’re running a small Indian startup, passkeys are worth trying—just treat the rollout as a cross-functional project (engineering, ops, HR) instead of a purely technical upgrade. Do the training, buy a few hardware keys for critical folks, and assume you’ll need a hybrid period where both systems coexist. That’s the honest tradeoff—better security, but only if you’re willing to manage the messy transition.

If you want, I can share the short “phone change” checklist we use internally and the call script our support team follows when someone is stuck.