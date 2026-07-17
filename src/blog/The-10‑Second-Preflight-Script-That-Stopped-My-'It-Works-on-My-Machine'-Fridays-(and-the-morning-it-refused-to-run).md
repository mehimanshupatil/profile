---
title: "The 10‑Second Preflight Script That Stopped My 'It Works on My Machine' Fridays (and the morning it refused to run)"
pubDate: 2026-07-17
description: "I built a tiny repo‑local preflight script that checks ports, env vars, migrations, and third‑party stubs in 10 seconds — and the one morning it blocked a hotfix taught me the right defaults."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Close up of hands typing on a laptop with code visible on the screen"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["developer-tools", "local-dev", "workflow"]
---

It was Friday. I had a demo at 4:30 PM for a client in Mumbai and a heap of confidence — because everything worked on my laptop. At 4:25, the payments page failed to load. No errors in the UI, just a blank spinner. The cause: a local mock for the payments gateway hadn't started; our frontend silently waited and timed out after the demo. I left the meeting with a vague promise to fix "it", and a new personal rule: never assume my machine is ready.

I solved it not by more tests or prettier docs, but with a single, tiny tool I keep in every repo: preflight.sh. It’s a fast, opinionated checklist that runs in about 10 seconds and fails loudly. It checks the things that always go wrong for me — missing env vars, required local services, migrations applied, and whether I’m inadvertently hitting a remote API instead of a local stub. After a month, Friday demos stopped failing. After six months I learned where it shouldn’t be strict.

What preflight does (and why it’s quick)
I designed preflight for the developer who launches 5 tabs, a million background services, and then wonders why a demo dies. It needs to be:

- quick: <10s on a typical dev laptop (8–16GB)
- local and repo‑scoped: lives in the repo, committed, runnable without sudo
- practical: fail on things that cause user-visible breakage, not style nits

The actual checks are annoyingly simple:

- env vars: ensures required keys exist and are non-empty:
  - [ -n "$GOOGLE_CLIENT_ID" ] || fail "Missing GOOGLE_CLIENT_ID"
- service ports: nc -z localhost 5432 or curl --fail http://localhost:8081/health
- DB migrations: runs a tiny SQL check to confirm schema_version >= expected
- third‑party routing: checks that HOSTS override is present or local mock is up by hitting /__mock__/ping
- build artifacts: confirms dist/ exists for frontend projects

I keep it POSIX shell (no heavy deps). A typical run looks like:

  ./scripts/preflight.sh
  > OK  env: GOOGLE_CLIENT_ID
  > OK  port: postgres 5432
  > OK  mock payments: http://localhost:9001/health
  > WARNING  migrations: pending 2, run ./scripts/migrate.sh
  > FAIL  remote payments: application is pointed at live gateway — aborting

The "FAIL remote payments" bit saved my demo: a bad config pointed the frontend at the live payments gateway when my mock crashed. Preflight blocks that and forces an explicit decision.

How I kept it useful and stopped it being annoying
Making something that blocks developers is easy. Making something that prevents dumb mistakes without becoming overhead is the trick.

- Fast checks only. If something needs heavy work (like restoring a 10GB DB), preflight prints a one‑liner: "Local DB missing. Run ./scripts/load-sample-db.sh (takes 18m)". It doesn’t try to be the thing that restores the DB.
- Two exit levels. By default it fails on high-severity problems (remote payments, missing secrets). For medium issues (migrations pending, minor mismatches) it warns but exits 0. That saved a lot of interrupted flow.
- One-line overrides. For emergencies you can run ./scripts/preflight.sh --force-with-ack "hotfix demo". That writes a small audit line to .preflight.override so we know why someone bypassed it.
- Keep it in the repo. No global shared script. Each project has its own assumptions (ports, services, APIs). The script evolves with the project and appears in PRs.

The morning it refused to run (and what I learned)
Three months in, we shipped a critical hotfix at 2 AM. My preflight refused to run inside CI containers because the base image didn’t include nc or curl — tools my script relied on. The preflight’s failure aborted the CI job and blocked the hotfix while I scrambled to add the missing utilities to the image. I was annoyed. So were the on-call engineers.

That incident taught me two things:

- Defensive defaults are good — but your preflight must be runnable in environments you actually use. I rewrote checks to avoid non-guaranteed binaries when possible (use /dev/tcp in bash or small Go binaries we vendor), and added a non-blocking "CI mode" that downgrades network checks to warnings if running under CI.
- Explicit is better than magic. The override needs an audit trail. We now have a policy: force overrides only in emergencies, and the audit entry triggers a short postmortem if used on production hotfixes.

Indian context that mattered
Two small realities in my setup shaped what preflight became:

- Spotty office/home internet: sometimes my local mocks or registry mirrors fail. Preflight checks for local mirrors and will suggest fallbacks (npm installs from a local cache at 10.0.0.2) so demos don’t depend on flaky office Wi‑Fi.
- Mobile data concerns: I avoid checks that pull large artifacts during preflight. If a step needs to download >10MB, preflight warns and points to a smaller smoke fixture instead.
- Banking/payment tests: in India you don’t want real UPI/card calls in dev. A single check that the app is pointed at the local payments mock saved me two penalty calls and one ₹1,200 accidental test transaction.

Honest tradeoffs
A repo preflight adds another file to maintain. It’s tech debt: it can bit-rot, duplicate logic from other scripts, and occasionally block. We accepted that because the cost of a failed demo or shipping a config that hits live payments is higher than maintaining a 150‑line shell script. Still, it demands one small habit: review preflight changes in PRs like any other code. When it broke our midnight hotfix, that policy forced the change that fixed it.

One takeaway
If you keep shipping demos that only work on your machine, build a short, repo‑local preflight that checks the actual failure modes — ports, envs, mocks — and make it fast and overrideable. The point isn't to be perfect. It's to make the common, dumb failures noisy enough to stop you before a demo or a deploy. I still get the occasional late‑night override. But they now come with a timestamp, a reason, and a brief follow‑up. That’s enough to make Fridays predictable.