---
title: "Why I Run a Personal Status Page (and How It Actually Helped Our On‑Call Nights)"
pubDate: 2026-01-31
description: "A practical, low‑cost playbook for building a personal status page that reduces PagerDuty noise and speeds incident response for small teams in India."
author: "Devika Iyer"
image:
  url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&h=1000&q=80"
  alt: "A laptop screen showing a dashboard and status indicators on a wooden desk"
  caption: "Image credit: Roman Kraft / Unsplash"
  creditUrl: "https://unsplash.com/photos/JVSgcV8_vb4"
tags: ["personal status page", "on-call", "devops"]
---

A year ago our small product team would get woken up by vague pings at 2 a.m.: "Is the app down?" or "Users are reporting slowness." Half the time the alert was for a degraded third‑party and half the time it was a flaky doc‑endpoint. Either way, the on‑call person had to groggily open three dashboards, hunt for clues, and then reassure everyone.

We solved most of that by shipping one small thing: a personal status page. Not a corporate glossy status site — a compact, opinionated page that answers three simple questions for our team and users: Is the service up? Is anything degraded? What are we doing about it?

If you’re a small team in India balancing tight budgets and noisy alerts, here's why a personal status page is worth the few hours it takes to build — and how to make one that stays useful instead of becoming another source of noise.

Why a personal status page works (and when it doesn’t)
- Reduces noise: Instead of a burst of “it’s down” pings, people check the status page or get a single linked update in Slack/WhatsApp. That one canonical place cuts duplicate investigations.
- Lowers cognitive load for on‑call: When an incident hits, the status page already shows the likely scope and whether the issue is third‑party. You start fixing, not guessing.
- Signals intent: Even if fixing will take hours, a quick status update reassures stakeholders and stops escalation.
Downside: It’s not a replacement for monitoring. If your page waits for manual updates, it can lag reality and become misleading. It also needs a little maintenance (certificates, uptime checks) and an honest runbook for when it fails.

What to include (keep it compact)
- Global health indicator: Up / Degraded / Down — this is the single most valuable element.
- Recent incidents: one‑line title, start time, short status (investigating / identified / monitoring / resolved).
- Last deploy time and current commit/tag — helps spot if a release caused the problem.
- Key dependencies: DB, auth provider, payment gateway, third‑party APIs you rely on.
- Contact method: link to the on‑call Slack channel or a single phone number (avoid multiple contact vectors).
- Short link to the incident runbook for the on‑call person.

How I built ours (cheap, pragmatic)
- Hosting: GitHub Pages served our static page (free) on a custom domain with Let's Encrypt. You can do the same with Netlify or a ₹200–₹300/year domain.
- Automated checks: I use Healthchecks.io for simple heartbeat checks and UptimeRobot for HTTP/S and ping. They both have free tiers that are plenty for small teams.
- Status updates: The page is a static app (simple React + Netlify functions originally; later pared down to plain HTML + a tiny client that polls a JSON file in the repo). Incidents are represented by a JSON file stored in the repo; updating it triggers a CI pipeline to deploy the static site.
- Integrations: A webhook from Healthchecks/UptimeRobot updates the incident JSON via a lightweight GitHub Action (authenticated with a deploy key). Slack notifications point to the status page with one line and a link to the runbook.
- Phone/SMS escalation (optional): For critical incidents, we configured an SMS gateway using a small Twilio account — expect ~₹0.5–₹1 per SMS depending on volume and provider. For India‑centric teams, providers like Karix or TextLocal may be cheaper but check delivery reliability.

Practical rules that kept it useful
- One source of truth: Only the deployable JSON file in the repo can change the visible status. No ad‑hoc edits on the site.
- Keep updates short and time‑stamped: Two lines max — problem, who’s owning it, ETA if any.
- Automate what you can: Uptime checks mark a dependency degraded automatically, but the incident owner must still add context (cause and mitigation).
- Minimum SLO transparency: For customer‑facing pages, list SLOs (eg. 99.9% uptime) so users know what to expect and you don’t feel pressured to overrun on non‑critical fixes.
- Rate‑limit notifications: Don’t notify on every check failure — use a 2–3 minute grace to avoid flapping noise.

A few tradeoffs we ran into
- False positives: Some third‑party APIs have brief hiccups that resolve before we act. We tuned checks and increased grace periods to avoid wild goose chases.
- Extra maintenance: Renewing API keys, CI tokens, and keeping the JSON schema sane takes time. If your team is already stretched, expect a small ops debt.
- Public vs private: Our page is public but intentionally minimal. If you need to expose detailed metrics, use authenticated pages or an internal dashboard to avoid leaking operational details.

When this approach makes sense for you
- Small teams (1–20 engineers) that don't need an enterprise status provider.
- Services with clear external dependencies (payment gateways, auth providers) where single‑place visibility saves minutes (and sanity).
- When you want to reduce middle‑of‑night uncertainty without buying a pricey SLA for everyone.

If you want a tiny starter checklist to ship this today
1. Create a repo with a static site template and a JSON "status" file.
2. Add UptimeRobot/Healthchecks for critical endpoints.
3. Add a GitHub Action that updates the site when the JSON changes (protect the branch).
4. Add a Slack webhook that posts a short message linking the status page when an incident is created.
5. Publish with GitHub Pages and add a custom domain + HTTPS.

Closing thought
A personal status page is boring infrastructure — and that's the point. It removes the drama, gives the on‑call person a clear starting point, and turns frantic messages into a calm shared context. It won’t stop every 2 a.m. ping, but when it works, it turns “Is anything wrong?” into “Here’s what we know and what we’re doing.” For small teams in India trying to keep costs low and response times sane, that’s often enough to sleep a little better.