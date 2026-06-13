---
title: "Why I Trust direnv — and the Time It Gave Me Someone Else's AWS Keys"
pubDate: 2026-06-13
description: "I switched to direnv for per‑project environments. It saved me hours, but also once loaded a teammate's prod keys. How I changed my workflow to keep the convenience without the risk."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a desk with a coffee cup, terminal visible on the screen"
  caption: "Photo by Xavier Wendling on Unsplash"
  creditUrl: "https://unsplash.com/@xavierwendling"
tags: ["developer-tools", "local-development", "security"]
---

It was 10:30 on a Monday and I was debugging a flaky payment flow that only failed on my coworker’s machine. He sent me a single message: "just run the tests, it's fine locally." I pulled his branch, ran direnv allow, and watched his shell silently pick up a dozen environment variables. A minute later my local terraform command ran using his AWS keys and began planning resources against our staging account.

I hit ctrl‑c. My heart raced. AWS bill spikes are a real thing. We were lucky — nothing was provisioned. But a few API calls had been made; CloudTrail showed them tied to my laptop's IP. I could have avoided that 20‑minute scramble if I’d treated .envrc like a code change instead of magic.

This is the honest story of why I use direnv everywhere now — and the exact rules I ended up living by after that mistake.

Why direnv felt like magic

Before direnv, I juggled:
- .env files ignored by git, copied manually,
- "source env/bin/activate" rituals,
- ugly scripts that tried to set PATH per project.

Direnv fixes that simple pain in one way I still appreciate: it auto‑loads/unloads project environment when you cd in and out. No more "which node is this using?" or "oh, I forgot to set DB_URL." On a 6‑hour debugging day this saves dozens of tiny context switches.

Practical wins I actually felt in day‑to‑day work:
- Instant local parity: db URL, stripe keys (sandbox), and PATH tweaks come up automatically.
- Small CI parity: we commit a safe .envrc template; CI parses it to set envs for tests.
- Less accidental global installs: I add a layout node or pyenv hook in .envrc and forget about nvm/pyenv shims.

And in India the bandwidth win is real. When CI or a coworker asks for a repo clone, they don't waste time copying env files over slow home connections — they run direnv allow after pulling an audited .envrc and get what they need.

The failure that changed my rules

What broke was simple: my colleague's .envrc used a local include pattern to source ~/.secrets. His machine was set up to copy staging keys there for convenience. I trusted his repo, ran direnv allow without reading the .envrc, and suddenly my environment had his staging AWS credentials.

Two learnings from that hour-long panic:
1. direnv's convenience becomes a liability if you blindly allow .envrcs.
2. Secrets should never be implicitly pulled from outside the repo by .envrc without an explicit, reviewed step.

I could have avoided the whole thing by reading a 6‑line file. But we don't always read. So I changed the workflow.

My practical, non‑ideal rules (that actually stuck)

I hacked together a small, enforceable workflow — opinionated and slightly annoying, but worth it.

1) .envrc is code. Treat it like code.
- Always review a new .envrc in a PR. If it touches anything outside the repo (~, /home, /etc), it needs a comment and approval.
- Our tiny checklist: does this mutate PATH? Does it source external files? Does it export secrets? If yes, it needs an explicit note in the PR.

2) Keep secrets out of .envrc.
- .envrc should only call a controlled loader that is safe and audited. Example I use:
  - .envrc contains: eval "$(direnv export bash || true)" and loads .envrc.local via a whitelisted pattern.
  - .envrc.local is gitignored and created by a small onboarding script that checks for expected keys and warns if any look like prod keys.
- If a repo needs access to credentials, use a documented "setup-keys" script that prompts and stores in ~/.config/<repo>/ — not via a global ~/.secrets.

3) Use allowlist patterns and a repo template.
- I keep a repo template .envrc that teams copy. It only uses layout and dotenv for files inside the repo.
- If you need to reach out-of-repo, the template forces a comment and an explicit "I know what I'm doing" variable so reviewers can't miss it.

4) Automate basic safety checks.
- A small pre-commit hook runs a tiny linter on .envrc and errors if AWS_ACCESS_KEY_ID or other regex‑matched secrets appear.
- We use a CI job that flags PRs which modify .envrc without a "intent" comment.

5) Keep a manual escape hatch for quick tests.
- For one-off debugging, I use direnv allow‑posix (a tiny alias) that prints the envs it would set and requires a second confirm. It adds friction but prevents the "I hastily allowed this" scenario.

Tradeoffs I accepted

- Friction: Asking teammates to review .envrcs added friction. We lost a few minutes on small PRs. But those minutes are cheaper than a mistaken API call against production or staging.
- Onboarding complexity: New hires have one more step. I wrote a 2‑minute onboarding script that sets up the safe local file and runs a validator; that saved the most questions.
- Not bulletproof: This isn't a crypto‑secure secret management system. It's a developer habit and a few small automations. If you need absolute safety, use a secrets manager (Vault, AWS Secrets Manager) and don't expose secrets at all locally.

When direnv still fails me

One limitation I ran into: on our office shared servers and some CI runners with locked shells, direnv needs a shell hook; that doesn't always play nicely with limited /bin/sh setups. On those machines I keep a small wrapper script that sources a vetted env file instead. In other words: direnv is great for personal and laptop‑based dev, less so for heavy restricted environments.

The one thing I actually walked away with

Direnv is fast and delightful. But magic that silently changes your environment is the kind of convenience that bites on the worst day. The single habit that prevented a repeat for me: never run direnv allow without scanning the .envrc for external includes and secrets. Make it a code review item, and automate a linter to make doing the right thing the default.

If you want my onboarding script and the tiny pre-commit linter I use, ping me — it's about 150 lines and saved us a lot of heartburn.