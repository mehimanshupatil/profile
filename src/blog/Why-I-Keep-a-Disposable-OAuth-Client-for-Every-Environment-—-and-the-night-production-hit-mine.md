---
title: "Why I Keep a Disposable OAuth Client for Every Environment — and the night production hit mine"
pubDate: 2026-08-15
description: "How I stopped SSO flakiness during local dev and demos by issuing disposable OAuth clients per environment — and the one time a test client caused a real outage."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with hands typing and a cup of coffee nearby"
  caption: "Photo by Christopher Gower on Unsplash"
  creditUrl: "https://unsplash.com/@christophergower"
tags: ["oauth", "developer-tools", "security"]
---

It was 10:42 PM. I was in a client demo, screen-sharing the login flow, and the browser threw back an absurdly unhelpful "redirect_uri_mismatch" error. The product lead leaned in. The client refreshed. My heart did too.

We had spent the afternoon wiring up Google SSO for a prototype. Locally I'd used the same OAuth client the staging app used — because setting up a new client is fiddly on Google Cloud, and "it worked on staging." It did not work on the client's network. Different host header, different port, different redirect. That night I promised myself two things: never rely on a shared OAuth client for demos, and never debug redirect mismatches in front of paying customers.

Over the next six months I formalised a habit: create a disposable OAuth client for every environment and purpose — local dev, CI, staging, demo, and one obvious "break-glass" client. It’s a tiny operational pattern that saved more evenings than a faster laptop or better Wi‑Fi. It also bit me once in a way that forced me to rethink the implementation.

Why disposable clients beat one-shoe-fits-all
- Redirects are environment-specific. Localhosts, custom domains, ngrok/ssh tunnels, even weird corporate proxies change the callback URL. One client with many redirect entries works until someone hits an unknown host.
- Scopes creep. Staging needs read-only scopes. Demo accounts need admin acceptance. If everyone shares a client, it's hard to audit who asked for what.
- Secrets are sensitive. A client used by many developers tends to leak into dotfiles, CI logs, and Slack. Disposable clients reduce blast radius.
- Provider quotas and settings differ. Some providers throttle token exchanges per client_id. Isolating environments avoids contention.

How I set this up (practical, not theoretical)
- Naming convention: org-env-purpose, e.g., acme-dev-localhost, acme-ci-github-actions, acme-demo-karim-2026. This makes it easy to spot dev-made clients in the provider console.
- Low-friction creation: I automated client creation with the provider's APIs where possible. For Google and Microsoft, a tiny script does the create/redirect/secret fetch in ~30s. For others (Okta, custom IdPs) it's a CLI that templatizes the manifest.
- Narrow scopes and short-lived refresh policy: demo clients use the minimum scopes and shorter refresh lifetimes. If a demo client is compromised its usefulness dies fast.
- Per-environment secrets in a vault: each client secret goes into HashiCorp Vault or our git-ignored SOPS file. CI uses vault tokens to fetch the secret at runtime.
- A "kill switch": a tiny /script/ that disables a client by name via provider API. We can revoke a compromised client in under a minute. Keep it in your runbook; you'll use it once and remember it forever.
- A callback-replay sandbox: for flaky networks (looking at you, Indian corporate proxies and public Wi‑Fi), I maintain a lightweight callback recorder on a ₹300/month VPS. The recorder accepts callbacks, stores them, and shows redirect attempts so I can debug mismatches without re-running the whole flow.

One honest failure: when disposable clients become accidental production
The habit wasn't perfect. Six months in, an engineer merged a config that pointed a feature flag service at acme-demo-raj-2026 instead of acme-staging-main. The demo client had weaker redirect restrictions and a different consent screen configuration. Overnight we got a burst of SSO errors and a postman flood of support tickets. Worse, because the demo client had been used publicly in a hack event, its consent screen required extra verification, and Google started rate-limiting exchanges for that client_id. Our login rate dropped by ~30% during business hours.

Why it happened:
- Naming convention helped us find the client quickly. But we lacked deployment-time validation that the client_id belonged to the intended environment.
- A single mistaken env var (and a deployment script that wasn't strict) was enough.

How we changed the pattern after that night
- Enforce a client_id whitelist per environment. Deployment fails if the client_id isn't in that environment's allowed list.
- Don't store client_id in plain config files — we now reference "oauth_client: acme-staging-main" and map it server-side to the actual id. It reduces accidental copy-paste.
- Add a CI job that runs a sanity check: hit the token endpoint with a test code and ensure the redirect URI matches the environment. It costs 2–3 minutes but saved us an on-call.
- Limit public demo clients: any client that's used in public demos must be ephemeral and scheduled for deletion within 14 days.

Tradeoffs you should acknowledge
- Management overhead: more clients means more lines in the provider console and more secrets in your vault. If your org has dozens of microservices and a 50‑person team, this snowballs.
- Provider limits: some IdPs cap the number of OAuth clients per account. We hit that limit once and had to request quota increases — not instant with enterprise support in India.
- Automation complexity: writing secure automation to create clients via APIs introduces attack surface. I weighed this and kept the create/delete scripts behind a short-lived SSH key and an approval step.

A few small, practical rules that worked for me
- If it's for a demo and public, create the client right before and delete it right after.
- Treat OAuth clients like SSH keys: one per person/purpose, rotate regularly.
- Have a validator in deploy pipelines that checks client ownership and redirect patterns.
- Keep a ₹300 VPS callback recorder for redirection debugging — it's cheap, reliable, and saves mobile data when testing on-site.

What I actually walked away with
Treat OAuth clients as first-class infrastructure: they’re not "just config." Name them, automate their lifecycle, and add deployment guards so a demo client can't sneak into production. That single discipline stopped most late-night SSO debugging. The failure we had taught me the real limit: automation and naming are helpful, but without deployment safety nets they're only organized chaos.

I still wonder how this pattern scales beyond a small team. At what size does the management overhead force a central OAuth governance model? For now, disposable clients and a kill switch keep my evenings intact — and my demos mercifully redirect-free.