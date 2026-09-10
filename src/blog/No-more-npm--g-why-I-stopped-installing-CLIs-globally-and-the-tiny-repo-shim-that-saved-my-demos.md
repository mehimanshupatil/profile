---
title: "No more npm -g: why I stopped installing CLIs globally and the tiny repo shim that saved my demos"
pubDate: 2026-09-10
description: "How I stopped depending on global CLIs (npm -g / pip -m) and switched to small repo-local shims that make demos reliable, onboarding faster, and late-night installs irrelevant."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk showing a terminal window with code"
  caption: "Photo by Christina @ wocintechchat on Unsplash"
  creditUrl: "https://unsplash.com/@wocintechchat"
tags: ["developer-tools", "workflow", "india"]
---

I was mid-demo. The client screen was quiet, the team's video boxes were pixelated (Bengaluru office internet being itself), and my terminal printed a smug red error: command not found — serverless.

I had relied on npm -g and pip -m for years. Quick installs on a fresh laptop. One-liners in onboarding docs. But two things kept sabotaging me: mismatched versions and office/home networks that make uninstall/reinstall a ritual that eats an hour (and a ₹300 mobile hotspot recharge if I really panic).

So I stopped. Not gradually. Not in a single meeting. I rewired how my repos expose developer tools: small, repo-local shims that are committed, discoverable, and runnable without global installs. It fixed demos, onboarding, and my late-night panic. It also introduced one predictable tradeoff I accepted.

Why global CLIs were my problem

The obvious pain: version chaos. I had three versions of serverless, one via npm -g, one in a project node_modules, and a system package manager binary. Start a demo, and the PATH chose the wrong one. Or worse — CI used a global binary that had a breaking change and the local dev machine passed.

The less-obvious pain in India: network cost and time. Installing a global npm package on a slow office connection is not 30 seconds. It’s 10 minutes with stalled fetches, then a hope-you-don’t-need-extra-native-deps prayer. On one onboarding day, a new hire wasted a morning waiting for global tools to install over a flaky ISP. A ₹300 prepaid recharge later (for a hotspot) we still didn’t have a working setup. That’s real friction.

And the silent one: implicit mental context-switching. When I needed a CLI, I opened a terminal and typed install, which pulled me into dependency management instead of the problem I wanted to solve.

What I did instead: tiny repo shims

The idea was embarrassingly simple: put a single, tiny executable in the repo that delegates to the tool bundled for that repo (node_modules/.bin, .venv, or a small container). Make it runnable and document-less obvious.

My pattern:

- tools/bin/* — a handful of 1–3 line shell scripts in the repo, committed.
- Make tools/bin the project's local bin dir and add it to PATH when inside the repo via direnv (.envrc) or a tiny wrapper script.
- Prefer not to commit the whole binary; instead commit the shim that runs the project-local install (npm ci or pip install -r) if needed, then exec the local binary.
- CI and onboarding scripts point to tools/bin/<name> directly.

Example shim (node):
#!/usr/bin/env bash
set -e
if [ ! -x node_modules/.bin/serverless ]; then
  echo "Installing local deps..."
  npm ci --silent
fi
exec node_modules/.bin/serverless "$@"

The result is small but practical:

- Demos behave the same on every machine. exec ensures the repo-local binary runs.
- New hires stop asking "should I install global X?" They clone, run tools/bin/dev, and get the right tool.
- No frantic global installs when mobile data is scarce.

An important failure and the tradeoff I accepted

This didn't go perfectly. The first week after switching all our repos to shims, one of my late-night push builds failed. The build agent had an older PATH and the shim wrongly assumed node was available at /usr/bin/node. The shim attempted to install deps but the build agent forbids network access. The result: failed releases at 1:17AM. Not great.

I learned three things the hard way:

1) Don’t assume environments. Shims must detect and fail loudly with actionable messages: "No node in PATH; set NODE_BINARY or use our container image." I added explicit checks and exit codes.

2) CI needs a tiny update. Instead of trying to be clever, I added a one-line setup to our CI images: export PATH="$PWD/tools/bin:$PATH". Done. The small change kept CI hermetic and predictable.

3) Onboarding docs still matter. Even with shims, people will run commands outside the repo. I added a single line to the shell prompt function that shows when you’re inside a repo that has tools/bin — a subtle reminder.

There’s a tradeoff: more committed scripts. Committing shims means you must maintain them. They can become cruft if you stop using a tool. I set a rule: if a shim hasn't been used in 3 months, it gets deleted during the monthly tidy. That kept the repo from becoming a shrine to forgotten CLIs.

Why this matters beyond demos

The gains aren't just for demos. I’ve seen the following benefits across three teams:

- Faster first-week productivity for hires — fewer blocked setup tickets.
- Fewer "works on my machine" excuses because the binary used is the one in the repo.
- Lower mental switching cost. Want to create a test fixture? Run ./tools/bin/make-test — no global shopping trip.
- Cheaper troubleshooting during site-wide slow internet days. No one needs to download a 50MB tarball just to run a formatter.

How I ship this to teams in India-friendly ways

- Make shims tiny and obvious. One- or two-file shims; no opaque wrapper frameworks.
- Add a single line to README: "./tools/bin/{tool} — runs the project's version locally."
- Provide a fallback: a container script (docker run --rm -v "$(pwd)":/app ...) for people who don't want node installed.
- Don’t require direnv. Some companies lock shell configs. The shim should work even if PATH isn’t auto-updated.

What I actually walked away with

The single, small thing I keep repeating to new hires: treat repo tools like part of the code. If you need a CLI for the repo, ship a tiny shim with it. It takes 10 minutes. It saves hours of "why does the demo fail" later.

I didn't make global installs vanish forever. Sometimes a team-level tool still makes sense. But for repo-specific workflows — tests, formatters, demo servers — local, committed shims made my dev life less frantic and my demos reliably boring. And in my experience, boring is a feature.

One last note: if you try this and your CI grumbles at night, add a clear check and a line in the build agent to include tools/bin. Then sleep.