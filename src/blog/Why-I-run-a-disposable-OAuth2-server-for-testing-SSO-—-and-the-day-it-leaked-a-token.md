---
title: "Why I run a disposable OAuth2 server for testing SSO — and the day it leaked a token"
pubDate: 2026-08-02
description: "I run a small, disposable OAuth2/OpenID provider to reliably test SSO flows. What I run, why it’s worth ₹300/month, and the token leak that changed my defaults."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk showing code on the screen with a coffee cup nearby"
  caption: "Photo by Marcus Wallis on Unsplash"
  creditUrl: "https://unsplash.com/@marcuswallis"
tags: ["developer-tools", "oauth", "testing"]
---

I was in a client Zoom, sharing my screen, walking them through a new SSO flow we'd added for a payroll integration. The demo was simple: login via SSO, get an ID token, exchange it for an API token, show payroll data. It failed. Not vaguely — it returned a 401 from the client app because the ID token's "aud" claim didn't match production. The client asked: "Does this even work with our identity provider?" I did the honest thing and said, "I don't know."

That moment is why I started running a disposable OAuth2/OpenID Connect provider for tests. Not a mock, not stubbed responses, but a standalone identity server I control. It gives me predictable tokens, consistent claims, and the ability to test edge cases simply by changing config. It also cost me a Wednesday night and ₹300 when a mistake leaked a dev token publicly. I learned the hard way what to lock down.

## What I run and why it beats mocks
I wanted three things from a test identity provider: protocol correctness (PKCE, refresh tokens, id_token claims), an interface I could script, and cheap hosting that my whole team could hit from their laptops. I settled on Dex for OIDC and a tiny wrapper service I wrote to auto-provision test clients/clients secrets and user accounts. It lives in docker-compose on a small VPS (₹300–₹600/month) or locally using docker for individual work.

Why not mocks? Because the kinds of bugs that bite are protocol-level: PKCE tests failing, id_token time skew, claim mismatches, or the client not handling refresh_token expiry. Mocks return predetermined JSON and hide these behaviors. A real-ish identity provider produces real JWTs, signs them, and exercises the same code paths as production.

Architecturally it’s trivial: Dex for token flows, sqlite for storage, and a small provisioning API that creates users and clients for a given branch name. CI spins it up in a job using the same docker-compose, runs integration tests, and tears it down. Locally, I start it with one command and a branch-specific env file; my browser logs into the disposable provider and I see the same flows as production.

The cost-benefit is immediate. I stopped shipping login-related bugs to QA every other sprint. I found three issues in a month: a client that refused id_tokens signed with RS256 instead of HS256, a silent PKCE negotiation error, and a session cookie path issue that only showed up when tokens came from a different domain. All caught before the client demo.

## The leak — how I screwed up and what followed
Here's the honest failure: I accidentally committed my provisioning script's .env to a feature branch that later got pushed to the fork and PR'd. The env had an admin API key and an active client secret. A security scanner flagged the secret (thanks, CI), but not before a teammate downloaded the branch for a quick debug and forgot to delete local caches. Within 48 hours, someone used the admin API key to create a throwaway client and issue tokens. No customer data was exposed — this was a test server with synthetic users — but one of the issued tokens was used in a staging environment to call an endpoint that accepted the token (staging lacked proper audience checks). We had a brief scandal, revoked keys, rotated secrets, and I spent an evening writing a post-mortem.

What changed for me materially:

- Secrets never live in repo files. Ever. I moved all credentials into a secrets manager (pass locally, Vault in CI). Locally I use direnv to load a per-branch secrets file that is gitignored.
- The test provider now sits behind Tailscale for all non-CI access. CI still runs it ephemeral inside its own network namespace for integration tests. If I need a shareable demo, I create a one-time public link with short TTL.
- Tokens are short-lived by default (1–5 minutes) and refresh grants are disabled for demo clients unless explicitly needed.
- I added a pre-commit hook that refuses commits containing strings that look like client secrets or API keys. It blocked the next accidental commit and saved my team from another late-night rotation.

The leak taught me the important difference between "sandbox" and "safe." A sandbox is still an attack surface if you treat it like a throwaway.

## The tradeoffs I accepted
Running a disposable provider isn’t friction-free. First, it takes time to keep it close enough to production to be useful. My Dex config is a subset of production — claims, keys, supported grant types — but not every middleware. That means some bugs still slip through, especially around rate limits and certain provider-side consent UX.

Second, availability. My cheap VPS dies or the office VPN blocks it occasionally. That's why CI-run ephemeral instances are critical: tests don't rely on my personal server. The VPS is only for demos and exploratory testing. For demos I keep a ₹300 prepaid VPS running, and a monthly domain (₹800/year) with Let's Encrypt certs. If the VPS goes down during a client call, I have a simple fallback: I flip a DNS record to point to a CI-run demo container for the hour.

Finally, there’s maintenance. Libraries and token signing algorithms evolve. I spend a few hours each quarter updating the provider and rotating keys — a small tax for far fewer late-night fixes.

The real tradeoff is between fidelity and safety. I chose fidelity with strict isolation and short-lived secrets.

The single takeaway I still tell new hires: if you're going to simulate an identity provider, do it like you mean it — run a real server, but treat its secrets as production-grade. Make tokens ephemeral, lock network access, and automate rotation. The mental model "it's only for demos" is the exact attitude that turned a ₹300 VPS into a security headache. Now it saves me hours, and the demos actually work.