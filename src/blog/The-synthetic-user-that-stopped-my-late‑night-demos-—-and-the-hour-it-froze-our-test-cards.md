---
title: "The synthetic user that stopped my late‑night demos — and the hour it froze our test cards"
pubDate: 2026-08-14
description: "I built an hourly headless‑Chrome synthetic user on a ₹300 VPS to exercise our critical checkout. It caught bugs before users — and once triggered bank fraud controls. Here’s what I actually built and why."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing on a laptop with a second laptop and notebooks on a wooden desk"
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["testing", "devops", "payments"]
---

It was 9:10 AM, two hours before a product demo with a retail partner in Bengaluru. The engineer on my team pinged: "staging checkout returns 502 intermittently." I opened the checkout and—sure enough—press Pay, wait, crash. No Sentry alert. No obvious deploy. The partner was already on the call.

That was the last straw. We had unit tests, contract tests, synthetic API pings, uptime checks — all green. But the user flow that mattered most (sign in → add to cart → pay → success page) was breaking in ways our monitors never saw. So I built a headless "synthetic user" that runs every hour from a tiny VPS and actually completes the critical flow in staging. It cost ₹300/month to run and, for months, saved us from embarrassing demos. Then one night it triggered bank fraud detection and froze our test virtual cards. Here's how I built it, why it worked, and the hard lessons from that failure.

Why a synthetic user, not another unit test
Unit tests catch logic bugs. Synthetic users catch integration failures: broken CDNs, expired certs, flaky auth tokens, payment gateways that change a response shape. Our production parity for these external integrations was never perfect — Indian payment rails, third‑party widgets, and flaky staging DNS were frequent culprits. A headless browser literally clicking through the UI surfaces those failures.

The rough stack
- A cheap ₹300/month VPS (Mumbai region) with Docker. I used it because our office internet is flaky; an external VPS gives consistent routing and avoids CGNAT oddities.
- Puppeteer running in a container. One script per critical path (checkout, login, subscription flow).
- Secrets stored in SOPS and mounted at runtime. Test cards / UPI IDs live in a dedicated test bank account (more on that).
- Results and snapshots pushed to an S3 bucket (encrypted) and alerts posted to a #synthetic channel in Slack with a screenshot and HAR file.
- A simple "dry‑run" header added to requests so downstream systems can ignore them (this was supposed to be our safety valve).

What it found — and why it mattered
Within the first month the synthetic user found:
- A CDN cache misconfiguration that returned an old JS bundle for some IP ranges — caught before any real users.
- An auth token rotation bug that left staging users logged out silently.
- A payment widget update that broke only when a specific browser feature was unavailable — our headless run used the same Chrome engine as CI and exposed it.

Each time, the synthetic run gave a HAR file and a screenshot. Developer triage time dropped from 90 minutes to 20. We started shipping with more confidence.

The failure (the honest part)
One night I woke to 3 Slack alerts. The synthetic user had started failing on the payment gateway. Investigating, I found two bad things:
1) Our "dry‑run" header wasn't honored due to a regression in a proxy. So the synthetic run unknowingly hit the live payment sandbox endpoints.
2) The sandbox gateway had implemented new anti‑fraud rules. Our synthetic user replayed a payment flow dozens of times during an update window. The bank's fraud system flagged the pattern and temporarily froze the virtual cards attached to our test account. Unfreezing took three business days and a support escalation that cost effort and trust. Financial impact: a ₹1,200 hold and ~6 hours of coordinated support work across the team and the bank.

That failure taught us more than any green run ever could:
- Never assume a "test" flag will be forwarded end‑to‑end. Add independent safeguards.
- Synthetic traffic looks like real traffic to downstream systems unless explicitly white‑listed.
- Banks and payment processors have their own throttles and heuristics — testing strategy must respect them.

What I changed after the freeze
- Isolate test payment instruments: we created a separate test account and a single "faucet" that issues ephemeral virtual cards for the runner, with daily caps (₹500/day) and single‑use flags.
- Network allowlist: the VPS IPs are allowlisted with our payment provider as "synthetic origins".
- Strict idempotency and backoff: the runner uses idempotency keys and exponential backoff to avoid hammering endpoints during updates.
- A true dry‑run mode: synthetic runs now stop before the final authorization step and instead validate the payment token is created successfully, unless a manual override is set.
- Circuit breaker: if the synthetic user sees 5 failures in a row, it pauses runs and pages on‑call rather than retrying endlessly.

Limitations that haven't gone away
- CAPTCHA and phone‑OTP flows remain impossible to fully automate safely — we stub those parts and validate earlier stages. That means we still miss a class of regressions.
- Flaky third‑party widgets cause noisy failures. We tuned thresholds to reduce alert fatigue, but there are false positives.
- Maintenance: the runner needs attention when the UI changes. It’s not zero maintenance — roughly 1–2 hours/month for updates and another hour for any post‑failure investigation.

A practical starter blueprint (what I’d actually recommend)
- Start with one path: the single most critical flow (for us, checkout).
- Run hourly from an external VPS in your region (₹300–₹800/month is enough).
- Capture screenshots + HAR files and post to a channel with a one‑line failure reason.
- Enforce test isolation: separate test bank/cards, IDempotency, IP allowlist with payment partners.
- Make the final payment step optional by default. Explicitly opt in for a run that actually authorizes.

The takeaway I keep telling engineers: synthetic users are cheap insurance, but they’re also live traffic. Treat them like a person in the system — with limits, identity, and an "I am a test" header that downstream systems actually respect. Build the safety fences first. The extra hour it takes to add caps and idempotency is worth a week of frozen test cards and panicked Slack threads.